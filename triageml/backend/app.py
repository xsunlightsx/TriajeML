import json, os, statistics
from datetime import date, datetime
from functools import wraps

import joblib
import pandas as pd
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

BASE = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE, "..", ".env"))
MODELS = os.path.join(BASE, "..", "models")

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///triageml.db")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "cambiar-en-produccion")
db = SQLAlchemy(app)
tokens = URLSafeTimedSerializer(app.config["SECRET_KEY"])

model = joblib.load(os.path.join(MODELS, "svm_triaje.joblib"))
card = json.load(open(os.path.join(MODELS, "model_card.json"), encoding="utf-8"))
FEATURES = card["features"]                       # mismo orden del entrenamiento
LABELS = {int(k): v for k, v in card["clases"].items()}
ORDEN = {"Alta": 0, "Media": 1, "Baja": 2}
ROLES = ("Enfermería", "Médico", "Administrador")
ESTADOS = ("En espera", "En atención", "Finalizado")
SINT_TXT = {"dificultad_respiratoria": "dificultad para respirar", "dolor_toracico": "dolor torácico",
            "sangrado": "sangrado", "perdida_conciencia": "pérdida de conciencia",
            "fiebre_persistente": "fiebre persistente", "vomitos": "vómitos", "dolor_abdominal": "dolor abdominal",
            "dolor de cabeza": "dolor de cabeza", "tos": "tos", "malestar_general": "malestar general"}
RANGOS = {"edad": (0, 120), "temperatura": (30, 45), "frec_cardiaca": (20, 250),
            "frec_respiratoria": (4, 60), "saturacion_o2": (50, 100),
            "presion_sistolica": (50, 260)}
AVISO = "Sugerencia orientativa de apoyo a la decisión. No es un diagnóstico; la decisión final es del profesional."


class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    correo = db.Column(db.String(120), unique=True, nullable=False)
    clave_hash = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.String(20), nullable=False)


class Atencion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Datos 
    nombre = db.Column(db.String(120), nullable=False)
    documento = db.Column(db.String(20))
    fecha_nacimiento = db.Column(db.String(10))
    sexo = db.Column(db.String(10))
    telefono = db.Column(db.String(20))
    motivo_consulta = db.Column(db.Text)
    observaciones = db.Column(db.Text)
    
    # Entrada del modelo y resultado
    entrada = db.Column(db.Text, nullable=False)
    analisis = db.Column(db.Text, nullable=False)
    prioridad_ml = db.Column(db.String(10), nullable=False)
    generada_en = db.Column(db.DateTime, default=datetime.now)
    registrada_por = db.Column(db.String(120))
    
    # Revisión profesional
    prioridad_final = db.Column(db.String(10))
    motivo_ajuste = db.Column(db.Text)
    revisada_por = db.Column(db.String(120))
    revisada_en = db.Column(db.DateTime)
    estado = db.Column(db.String(20), default="En espera")
    segundos_registro = db.Column(db.Integer)    

class Evento(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    atencion_id = db.Column(db.Integer, db.ForeignKey("atencion.id"), nullable=False)
    accion = db.Column(db.String(300), nullable=False)
    responsable = db.Column(db.String(120), nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.now)


# Autenticacion
def auth(*roles):
    def deco(f):
        @wraps(f)
        def wrapper(*a, **k):
            h = request.headers.get("Authorization", "")
            if not h.startswith("Bearer "):
                return jsonify(errores=["No autenticado"]), 401
            try:
                uid = tokens.loads(h[7:], max_age=12 * 3600)["id"]
            except (BadSignature, SignatureExpired):
                return jsonify(errores=["Sesión inválida o vencida"]), 401
            u = db.session.get(Usuario, uid)
            if not u:
                return jsonify(errores=["Usuario no encontrado"]), 401
            if roles and u.rol not in roles:
                return jsonify(errores=[f"El rol {u.rol} no tiene permiso para esta acción"]), 403
            g.user = u
            return f(*a, **k)
        return wrapper
    return deco


def usuario_json(u):
    return {"id": u.id, "nombre": u.nombre, "correo": u.correo, "rol": u.rol}


@app.post("/api/auth/registro")
def registro():
    d = request.get_json(force=True, silent=True) or {}
    nombre, correo = str(d.get("nombre", "")).strip(), str(d.get("correo", "")).strip().lower()
    clave, rol = str(d.get("clave", "")), d.get("rol")
    errores = []
    if not nombre: errores.append("Falta el nombre")
    if "@" not in correo: errores.append("Correo inválido")
    if len(clave) < 6: errores.append("La contraseña debe tener al menos 6 caracteres")
    if rol not in ROLES: errores.append("Selecciona un rol válido")
    if errores:
        return jsonify(errores=errores), 400
    if Usuario.query.filter_by(correo=correo).first():
        return jsonify(errores=["Ya existe una cuenta con ese correo"]), 409
    u = Usuario(nombre=nombre, correo=correo, clave_hash=generate_password_hash(clave), rol=rol)
    db.session.add(u)
    db.session.commit()
    return jsonify(token=tokens.dumps({"id": u.id}), usuario=usuario_json(u)), 201


@app.post("/api/auth/login")
def login():
    d = request.get_json(force=True, silent=True) or {}
    u = Usuario.query.filter_by(correo=str(d.get("correo", "")).strip().lower()).first()
    if not u or not check_password_hash(u.clave_hash, str(d.get("clave", ""))):
        return jsonify(errores=["Correo o contraseña incorrectos"]), 401
    return jsonify(token=tokens.dumps({"id": u.id}), usuario=usuario_json(u))


@app.get("/api/auth/yo")
@auth()
def yo():
    return jsonify(usuario_json(g.user))


# Modelo
def validar(d):
    errores = []
    for f in FEATURES:
        if f not in d or d[f] in (None, ""):
            errores.append(f"Falta el campo '{f}'")
            continue
        try:
            v = float(d[f])
        except (TypeError, ValueError):
            errores.append(f"'{f}' debe ser numérico")
            continue
        if f in RANGOS:
            lo, hi = RANGOS[f]
            if not lo <= v <= hi:
                errores.append(f"'{f}' fuera de rango ({lo}-{hi})")
        elif v not in (0, 1):
            errores.append(f"'{f}' debe ser 0 o 1")
    dia = d.get("presion_diastolica")
    if dia not in (None, ""):
        try:
            if not 30 <= float(dia) <= 150:
                errores.append("'presion_diastolica' fuera de rango (30-150)")
        except (TypeError, ValueError):
            errores.append("'presion_diastolica' debe ser numérico")
    return errores


def factores(d):
    """Valores alterados según la tabla de referencia (Anexo 4 APF2).
    Reglas de apoyo para la revisión; NO son la atribución interna del SVM."""
    f = []
    if d["saturacion_o2"] <= 94: f.append(f"Saturación de O2 baja: {d['saturacion_o2']:.0f} %")
    if d["frec_respiratoria"] >= 21 or d["frec_respiratoria"] < 10: f.append(f"Frecuencia respiratoria alterada: {d['frec_respiratoria']:.0f} rpm")
    if d["frec_cardiaca"] >= 101 or d["frec_cardiaca"] < 60: f.append(f"Frecuencia cardíaca alterada: {d['frec_cardiaca']:.0f} lpm")
    if d["presion_sistolica"] < 100 or d["presion_sistolica"] >= 140: f.append(f"Presión sistólica alterada: {d['presion_sistolica']:.0f} mmHg")
    if d["temperatura"] >= 38.0 or d["temperatura"] <= 35.0: f.append(f"Temperatura alterada: {d['temperatura']} °C")
    if d["edad"] >= 65 or d["edad"] <= 1: f.append(f"Edad de mayor riesgo: {d['edad']:.0f} años")
    sint = [SINT_TXT.get(k, k) for k in FEATURES[6:] if d[k] == 1]
    if sint: f.append("Síntomas presentes: " + ", ".join(sint))
    return f


SINTOMAS_CRITICOS = {"perdida_conciencia": "pérdida de conciencia", "sangrado": "sangrado",
                        "dolor_toracico": "dolor torácico", "dificultad_respiratoria": "dificultad para respirar"}


def criticos(d):
    """Valores en rango de prioridad Alta según la tabla del Anexo 4.
    Regla de seguridad independiente del modelo: solo advierte, no cambia la prioridad."""
    c = []
    if d["saturacion_o2"] <= 90: c.append(f"Saturación de O2 ≤ 90 %: {d['saturacion_o2']:.0f} %")
    if d["frec_respiratoria"] >= 30 or d["frec_respiratoria"] < 10: c.append(f"Frecuencia respiratoria crítica: {d['frec_respiratoria']:.0f} rpm")
    if d["frec_cardiaca"] >= 130 or d["frec_cardiaca"] < 50: c.append(f"Frecuencia cardíaca crítica: {d['frec_cardiaca']:.0f} lpm")
    if d["presion_sistolica"] < 90 or d["presion_sistolica"] >= 180: c.append(f"Presión sistólica crítica: {d['presion_sistolica']:.0f} mmHg")
    if d["temperatura"] >= 39.5 or d["temperatura"] <= 35.0: c.append(f"Temperatura crítica: {d['temperatura']} °C")
    c += [f"Síntoma crítico: {t}" for k, t in SINTOMAS_CRITICOS.items() if d[k] == 1]
    return c


def analizar(entrada):
    x = pd.DataFrame([entrada], columns=FEATURES)
    pred = LABELS[int(model.predict(x)[0])]
    probs = {LABELS[int(c)]: round(float(p), 3) for c, p in zip(model.classes_, model.predict_proba(x)[0])}
    datos = {k: entrada[k] for k in FEATURES}
    crit = criticos(datos)
    return {"prioridad_sugerida": pred, "probabilidades": probs, "factores": factores(datos),
            "criticos": crit, "alerta_seguridad": bool(crit) and pred != "Alta", "aviso": AVISO}

def actual(a):
    return a.prioridad_final or a.prioridad_ml


def iso(dt):
    return dt.isoformat(timespec="seconds") if dt else None


def serializar(a):
    return {"id": a.id, "nombre": a.nombre, "documento": a.documento, "fecha_nacimiento": a.fecha_nacimiento,
            "sexo": a.sexo, "telefono": a.telefono, "motivo_consulta": a.motivo_consulta,
            "observaciones": a.observaciones, "entrada": json.loads(a.entrada),
            "analisis": json.loads(a.analisis), "prioridad_ml": a.prioridad_ml, "generada_en": iso(a.generada_en),
            "registrada_por": a.registrada_por, "prioridad_final": a.prioridad_final,
            "motivo_ajuste": a.motivo_ajuste, "revisada_por": a.revisada_por,
            "revisada_en": iso(a.revisada_en),             "prioridad_actual": actual(a), "estado": a.estado,
            "segundos_registro": a.segundos_registro}


def evento(aid, accion, quien):
    db.session.add(Evento(atencion_id=aid, accion=accion[:300], responsable=quien))

# API
@app.get("/api/health")
def health():
    return {"status": "ok", "modelo": "SVM RBF", "variables": len(FEATURES)}


@app.post("/api/atenciones")
@auth("Enfermería", "Médico")
def crear():
    d = request.get_json(force=True, silent=True) or {}
    nombre = str(d.get("nombre", "")).strip()
    errores = ([] if nombre else ["Falta el nombre del paciente"]) + validar(d)
    if errores:
        return jsonify(errores=errores), 400
    entrada = {f: float(d[f]) for f in FEATURES}
    if d.get("presion_diastolica") not in (None, ""):
        entrada["presion_diastolica"] = float(d["presion_diastolica"])  
    an = analizar(entrada)

    def txt(k, n):
        return str(d.get(k) or "").strip()[:n] or None

    try:
        seg = int(d.get("segundos_registro"))
        seg = seg if 0 <= seg <= 3600 else None
    except (TypeError, ValueError):
        seg = None
    a = Atencion(nombre=nombre[:120], documento=txt("documento", 20), fecha_nacimiento=txt("fecha_nacimiento", 10),
                    sexo=d.get("sexo") if d.get("sexo") in ("Masculino", "Femenino") else None,
                    telefono=txt("telefono", 20), motivo_consulta=txt("motivo_consulta", 2000),
                    observaciones=txt("observaciones", 2000), entrada=json.dumps(entrada),
                    analisis=json.dumps(an, ensure_ascii=False), prioridad_ml=an["prioridad_sugerida"],
                    registrada_por=g.user.nombre, segundos_registro=seg)
    db.session.add(a)
    db.session.flush()
    evento(a.id, f"El modelo sugiere prioridad {a.prioridad_ml}", "Modelo ML")
    db.session.commit()
    return jsonify(id=a.id, **an), 201


@app.get("/api/atenciones/<int:aid>")
@auth()
def detalle(aid):
    return jsonify(serializar(db.get_or_404(Atencion, aid)))


@app.patch("/api/atenciones/<int:aid>/revision")
@auth("Enfermería", "Médico")
def revisar(aid):
    a = db.get_or_404(Atencion, aid)
    d = request.get_json(force=True, silent=True) or {}
    final, motivo = d.get("prioridad_final"), str(d.get("motivo") or "").strip()
    if final not in ORDEN:
        return jsonify(errores=["'prioridad_final' debe ser Alta, Media o Baja"]), 400
    if final != a.prioridad_ml and not motivo:
        return jsonify(errores=["El motivo es obligatorio al modificar la prioridad sugerida"]), 400
    quien = f"{g.user.nombre} ({g.user.rol})"
    a.prioridad_final, a.motivo_ajuste, a.revisada_por, a.revisada_en = final, motivo or None, quien, datetime.now()
    accion = "Confirmó la prioridad sugerida" if final == a.prioridad_ml else f"Modificó {a.prioridad_ml} → {final}"
    evento(a.id, f"{accion}. {motivo}".strip(), quien)
    db.session.commit()
    return jsonify(serializar(a))


@app.patch("/api/atenciones/<int:aid>/estado")
@auth("Enfermería", "Médico")
def estado(aid):
    a = db.get_or_404(Atencion, aid)
    nuevo = (request.get_json(force=True, silent=True) or {}).get("estado")
    if nuevo not in ESTADOS:
        return jsonify(errores=["Estado inválido"]), 400
    a.estado = nuevo
    evento(a.id, f"Estado: {nuevo}", f"{g.user.nombre} ({g.user.rol})")
    db.session.commit()
    return jsonify(serializar(a))


@app.get("/api/cola")
@auth()
def cola():
    q, fil = request.args.get("q", "").strip().lower(), request.args.get("prioridad", "")
    lista = Atencion.query.order_by(Atencion.generada_en.desc()).limit(500).all()
    if q:
        lista = [a for a in lista if q in a.nombre.lower() or q in (a.documento or "")]
    if fil in ORDEN:
        lista = [a for a in lista if actual(a) == fil]
    lista.sort(key=lambda a: (a.estado == "Finalizado", ORDEN[actual(a)], a.generada_en))
    return jsonify([{"id": a.id, "nombre": a.nombre, "documento": a.documento,
                        "edad": int(json.loads(a.entrada)["edad"]), "prioridad": actual(a),
                        "revisada": a.prioridad_final is not None,
                        "hora": a.generada_en.strftime("%H:%M"), "estado": a.estado} for a in lista])


@app.get("/api/resumen")
@auth()
def resumen():
    hoy = datetime.combine(date.today(), datetime.min.time())
    hoy_l = Atencion.query.filter(Atencion.generada_en >= hoy).all()
    tiempos = [a.segundos_registro for a in hoy_l if a.segundos_registro is not None]
    return jsonify(pacientes_hoy=len(hoy_l),
                    en_espera=sum(a.estado == "En espera" for a in hoy_l),
                    en_atencion=sum(a.estado == "En atención" for a in hoy_l),
                    prioridad_alta=sum(a.estado != "Finalizado" and actual(a) == "Alta" for a in hoy_l),
                    mediana_registro_seg=round(statistics.median(tiempos)) if tiempos else None,
                    con_tiempo=len(tiempos))

@app.get("/api/atenciones/<int:aid>/historial")
@auth()
def historial(aid):
    db.get_or_404(Atencion, aid)
    ev = Evento.query.filter_by(atencion_id=aid).order_by(Evento.id).all()
    return jsonify([{"fecha": iso(e.fecha), "accion": e.accion, "responsable": e.responsable} for e in ev])


with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
