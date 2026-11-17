"""Datos de demostración (cuentas y pacientes de ejemplo).
Uso, desde la raíz del proyecto:   python backend/seed_demo.py
Cuentas: enfermera@demo.pe / medico@demo.pe / admin@demo.pe   (clave: demo1234)"""
import json
import sys
from datetime import datetime, timedelta

from werkzeug.security import generate_password_hash

from app import FEATURES, Atencion, Evento, Usuario, analizar, app, db

USUARIOS = [("Ana Torres", "enfermera@demo.pe", "Enfermería"),
            ("Dr. Ruiz", "medico@demo.pe", "Médico"),
            ("Admin Demo", "admin@demo.pe", "Administrador")]

# nombre, edad, sexo, documento, motivo, temp, FC, FR, SpO2, PAS, PAD, síntomas, minutos atrás, seg. registro, estado, revisión
# revisión: None | "confirmar" | (prioridad_final, motivo)
CASOS = [
    ("Carlos Pérez", 45, "Masculino", "12345678", "Dolor torácico y dificultad respiratoria", 37.2, 110, 24, 92, 150, 95,
     ["dificultad_respiratoria", "dolor_toracico"], 80, 95, "En espera", None),
    ("María López", 32, "Femenino", "23456789", "Fiebre y tos de 3 días", 38.4, 98, 20, 96, 118, 76,
     ["fiebre_persistente", "tos", "malestar_general"], 70, 70, "En atención", "confirmar"),
    ("Juan García", 58, "Masculino", "34567890", "Falta de aire intensa", 36.8, 128, 28, 89, 85, 55,
     ["dificultad_respiratoria"], 62, 110, "En espera", "confirmar"),
    ("Ana Martínez", 26, "Femenino", "45678901", "Tos leve", 36.6, 74, 16, 98, 115, 72,
     ["tos"], 55, 55, "Finalizado", "confirmar"),
    ("Luis Rodríguez", 67, "Masculino", "56789012", "Malestar general", 37.8, 102, 22, 94, 152, 90,
     ["malestar_general"], 48, 130, "En espera", ("Alta", "Adulto mayor con signos alterados y cambio de estado")),
    ("Rosa Quispe", 74, "Femenino", "67890123", "Mareos", 36.4, 48, 14, 93, 95, 60,
     [], 40, 85, "En espera", None),
    ("Pedro Salazar", 8, "Masculino", "78901234", "Fiebre y vómitos", 38.9, 118, 24, 97, 100, 65,
     ["fiebre_persistente", "vomitos"], 32, 75, "En espera", None),
    ("Lucía Torres", 29, "Femenino", "89012345", "Dolor de cabeza", 36.7, 80, 16, 99, 112, 70,
     ["dolor de cabeza"], 25, 50, "En espera", None),
    ("Diego Ramos", 51, "Masculino", "90123456", "Dolor en el pecho", 37.0, 90, 18, 90, 125, 80,
     ["dolor_toracico"], 15, 100, "En espera", None),
    ("Carmen Flores", 39, "Femenino", "01234567", "Dolor abdominal y vómitos", 37.1, 82, 17, 97, 120, 78,
     ["dolor_abdominal", "vomitos"], 8, 65, "En espera", None),
]


def main():
    with app.app_context():
        if Atencion.query.count() and "--agregar" not in sys.argv:
            print("Ya hay pacientes en la base. Usa --agregar para añadir los de demostración igualmente.")
            return
        cuentas = {}
        for nombre, correo, rol in USUARIOS:
            u = Usuario.query.filter_by(correo=correo).first()
            if not u:
                u = Usuario(nombre=nombre, correo=correo, clave_hash=generate_password_hash("demo1234"), rol=rol)
                db.session.add(u)
            cuentas[rol] = u
        db.session.commit()
        ahora = datetime.now()
        for (nombre, edad, sexo, doc, motivo, temp, fc, fr, sat, pas_, pad, sint, minutos, seg, estado, rev) in CASOS:
            entrada = {"edad": edad, "temperatura": temp, "frec_cardiaca": fc, "frec_respiratoria": fr,
                       "saturacion_o2": sat, "presion_sistolica": pas_}
            for k in FEATURES[6:]:
                entrada[k] = 1 if k in sint else 0
            entrada = {k: float(v) for k, v in entrada.items()}
            an = analizar(entrada)
            entrada["presion_diastolica"] = float(pad)
            hora = ahora - timedelta(minutes=minutos)
            a = Atencion(nombre=nombre, documento=doc, sexo=sexo, motivo_consulta=motivo, entrada=json.dumps(entrada),
                         analisis=json.dumps(an, ensure_ascii=False), prioridad_ml=an["prioridad_sugerida"],
                         generada_en=hora, registrada_por=cuentas["Enfermería"].nombre, segundos_registro=seg, estado=estado)
            db.session.add(a)
            db.session.flush()
            db.session.add(Evento(atencion_id=a.id, accion=f"El modelo sugiere prioridad {a.prioridad_ml}", responsable="Modelo ML", fecha=hora))
            if rev:
                quien = f"{cuentas['Médico'].nombre} (Médico)"
                final, motivo_aj = (a.prioridad_ml, None) if rev == "confirmar" else rev
                a.prioridad_final, a.motivo_ajuste, a.revisada_por, a.revisada_en = final, motivo_aj, quien, hora + timedelta(minutes=3)
                accion = "Confirmó la prioridad sugerida" if final == a.prioridad_ml else f"Modificó {a.prioridad_ml} → {final}. {motivo_aj}"
                db.session.add(Evento(atencion_id=a.id, accion=accion, responsable=quien, fecha=a.revisada_en))
            if estado != "En espera":
                db.session.add(Evento(atencion_id=a.id, accion=f"Estado: {estado}", responsable=f"{cuentas['Enfermería'].nombre} (Enfermería)", fecha=hora + timedelta(minutes=5)))
        db.session.commit()
        print(f"Listo: {len(CASOS)} pacientes de demostración. Cuentas: enfermera@demo.pe, medico@demo.pe, admin@demo.pe (clave demo1234)")


if __name__ == "__main__":
    main()