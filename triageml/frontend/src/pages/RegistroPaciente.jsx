import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Bell } from "lucide-react";
import { api } from "../api";
import { Alerta, Campo, useAccion } from "../ui.jsx";

// Las 10 variables de síntomas del modelo (mismas columnas del dataset)
export const SINTOMAS = [
    ["dificultad_respiratoria", "Dificultad para respirar"], ["dolor_toracico", "Dolor torácico"],
    ["sangrado", "Sangrado"], ["perdida_conciencia", "Pérdida de conciencia"],
    ["fiebre_persistente", "Fiebre persistente"], ["vomitos", "Vómitos"],
    ["dolor_abdominal", "Dolor abdominal"], ["dolor de cabeza", "Dolor de cabeza"],
    ["tos", "Tos"], ["malestar_general", "Malestar general"],
    ];
    const VITALES = [
    ["temperatura", "Temperatura", "°C", "Ej. 36.5", [30, 45], "0.1"],
    ["frec_cardiaca", "Frecuencia cardíaca", "lpm", "Ej. 78", [20, 250], "1"],
    ["frec_respiratoria", "Frecuencia respiratoria", "rpm", "Ej. 16", [4, 60], "1"],
    ["presion_sistolica", "Presión arterial sistólica", "mmHg", "Ej. 120", [50, 260], "1"],
    ["presion_diastolica", "Presión arterial diastólica (opcional)", "mmHg", "Ej. 80", [30, 150], "1"],
    ["saturacion_o2", "Saturación de oxígeno", "%", "Ej. 98", [50, 100], "1"],
    ];
    const VACIO = {
    nombre: "", edad: "", documento: "", fecha_nacimiento: "", sexo: "Masculino", telefono: "", motivo_consulta: "",
    temperatura: "", frec_cardiaca: "", frec_respiratoria: "", presion_sistolica: "", presion_diastolica: "",
    saturacion_o2: "", observaciones: "", sintomas: {},
};
const PASOS = ["Datos personales", "Signos y síntomas", "Confirmación"];

export default function RegistroPaciente() {
    const [paso, setPaso] = useState(1);
        const inicio = useRef(Date.now());   // para medir el tiempo de registro
    const [f, setF] = useState(VACIO);
    const nav = useNavigate();
    const { cargando, error, setError, ejecutar } = useAccion();
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    const marcar = (k) => setF({ ...f, sintomas: { ...f.sintomas, [k]: !f.sintomas[k] } });

    const validarPaso = (p) => {
        if (p === 1) {
        if (!f.nombre.trim()) return "Ingresa el nombre del paciente";
        if (f.edad === "" || +f.edad < 0 || +f.edad > 120) return "Ingresa una edad válida (0–120)";
        }
        if (p === 2) {
        for (const [k, etiqueta, , , [lo, hi]] of VITALES) {
            if (k === "presion_diastolica" && f[k] === "") continue;
            if (f[k] === "" || +f[k] < lo || +f[k] > hi) return `${etiqueta}: ingresa un valor entre ${lo} y ${hi}`;
        }
        }
        return "";
    };
    const siguiente = () => {
        const err = validarPaso(paso);
        setError(err);
        if (!err) setPaso(paso + 1);
    };
    const enviar = async () => {
        const payload = {
        nombre: f.nombre, documento: f.documento, fecha_nacimiento: f.fecha_nacimiento, sexo: f.sexo,
        telefono: f.telefono, motivo_consulta: f.motivo_consulta, observaciones: f.observaciones, edad: +f.edad,
        temperatura: +f.temperatura, frec_cardiaca: +f.frec_cardiaca, frec_respiratoria: +f.frec_respiratoria,
        presion_sistolica: +f.presion_sistolica, saturacion_o2: +f.saturacion_o2,
        presion_diastolica: f.presion_diastolica === "" ? null : +f.presion_diastolica,
        segundos_registro: Math.round((Date.now() - inicio.current) / 1000),
        };
        SINTOMAS.forEach(([k]) => { payload[k] = f.sintomas[k] ? 1 : 0; });
        const r = await ejecutar(() => api.crear(payload));
        if (r) nav(`/paciente/${r.id}/resultado`);
    };

    const marcados = SINTOMAS.filter(([k]) => f.sintomas[k]).map(([, t]) => t);

    return (
        <>
        <h1 className="titulo">Registro de paciente</h1>
        <div className="stepper">
            {PASOS.map((t, i) => (
            <div key={t} className={`step ${paso === i + 1 ? "on" : ""} ${paso > i + 1 ? "done" : ""}`}><b>{i + 1}</b> {t}</div>
            ))}
        </div>
        <div className="card">
            {paso === 1 && (
            <>
                <h3>Datos generales</h3>
                <div className="row2">
                <Campo label="Nombre completo"><input value={f.nombre} onChange={set("nombre")} placeholder="Ingresa el nombre del paciente" /></Campo>
                <Campo label="Edad"><input type="number" min="0" max="120" value={f.edad} onChange={set("edad")} placeholder="Ej. 35" /></Campo>
                <Campo label="Documento de identidad"><input value={f.documento} onChange={set("documento")} maxLength={20} placeholder="Número de documento" /></Campo>
                <Campo label="Fecha de nacimiento"><input type="date" value={f.fecha_nacimiento} onChange={set("fecha_nacimiento")} /></Campo>
                <Campo label="Sexo">
                    <div className="radios">
                    {["Masculino", "Femenino"].map((s) => (
                        <label key={s}><input type="radio" name="sexo" checked={f.sexo === s} onChange={() => setF({ ...f, sexo: s })} /> {s}</label>
                    ))}
                    </div>
                </Campo>
                <Campo label="Teléfono"><input value={f.telefono} onChange={set("telefono")} maxLength={20} placeholder="Número de contacto" /></Campo>
                </div>
                <Campo label="Motivo de consulta"><textarea rows={3} value={f.motivo_consulta} onChange={set("motivo_consulta")} placeholder="Describe brevemente el motivo de consulta" /></Campo>
                <p className="nota">Los datos de identificación solo sirven para reconocer al paciente en la cola y no ingresan al modelo.</p>
            </>
            )}
            {paso === 2 && (
            <>
                <h3><Activity size={18} /> Signos vitales</h3>
                <p className="sub">Los cinco primeros valores (sin la diastólica) son necesarios para obtener la sugerencia del modelo.</p>
                <div className="row2">
                {VITALES.map(([k, etiqueta, unidad, ph, , step]) => (
                    <Campo key={k} label={etiqueta}>
                    <div className="input-unit"><input type="number" step={step} value={f[k]} onChange={set(k)} placeholder={ph} /><em>{unidad}</em></div>
                    </Campo>
                ))}
                </div>
                <h3 className="seccion"><Bell size={18} /> Síntomas de alarma</h3>
                <div className="checks">
                {SINTOMAS.map(([k, t]) => (
                    <label key={k} className={`check ${f.sintomas[k] ? "on" : ""}`}>
                    <input type="checkbox" checked={!!f.sintomas[k]} onChange={() => marcar(k)} /> {t}
                    </label>
                ))}
                </div>
                <Campo label="Observaciones adicionales"><textarea rows={3} value={f.observaciones} onChange={set("observaciones")} placeholder="Agrega cualquier observación relevante sobre los signos vitales del paciente..." /></Campo>
            </>
            )}
            {paso === 3 && (
            <>
                <h3>Confirmar datos</h3>
                <div className="kvgrid">
                <div><small>Nombre</small><b>{f.nombre}</b></div>
                <div><small>Edad</small><b>{f.edad} años</b></div>
                <div><small>Documento</small><b>{f.documento || "—"}</b></div>
                <div><small>Sexo</small><b>{f.sexo}</b></div>
                <div className="ancho"><small>Motivo de consulta</small><b>{f.motivo_consulta || "—"}</b></div>
                <div><small>Temperatura</small><b>{f.temperatura} °C</b></div>
                <div><small>Frecuencia cardíaca</small><b>{f.frec_cardiaca} lpm</b></div>
                <div><small>Frecuencia respiratoria</small><b>{f.frec_respiratoria} rpm</b></div>
                <div><small>Presión arterial</small><b>{f.presion_sistolica}{f.presion_diastolica && `/${f.presion_diastolica}`} mmHg</b></div>
                <div><small>Saturación de oxígeno</small><b>{f.saturacion_o2} %</b></div>
                <div className="ancho"><small>Síntomas de alarma</small><b>{marcados.length ? marcados.join(", ") : "Ninguno"}</b></div>
                </div>
            </>
            )}
            <Alerta>{error}</Alerta>
            <div className="acciones">
            {paso > 1 && <button className="btn outline" onClick={() => { setError(""); setPaso(paso - 1); }}>Volver</button>}
            {paso < 3 && <button className="btn primary" onClick={siguiente}>{paso === 1 ? "Continuar" : "Siguiente"}</button>}
            {paso === 3 && <button className="btn primary" disabled={cargando} onClick={enviar}>{cargando ? "Analizando…" : "Obtener prioridad sugerida"}</button>}
            </div>
        </div>
        </>
    );
}
