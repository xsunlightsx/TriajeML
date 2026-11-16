import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { api } from "../api";
import { Alerta, fmtSeg } from "../ui.jsx";

const TEXTO = { Alta: "Requiere atención médica inmediata", Media: "Atención en espera con reevaluación", Baja: "Atención de menor riesgo" };

export default function Resultado() {
    const { id } = useParams();
    const nav = useNavigate();
    const [a, setA] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => { api.detalle(id).then(setA).catch((e) => setError(e.message)); }, [id]);
    if (error) return <Alerta>{error}</Alerta>;
    if (!a) return <p className="cargando">Cargando…</p>;
    const e = a.entrada, an = a.analisis, p = an.prioridad_sugerida;

    return (
        <>
        <h1 className="titulo">Resultado del análisis</h1>
        <div className="card">
            <p className="etiqueta-rosa">Prioridad sugerida por el modelo ML</p>
            <div className={`banner ${p.toLowerCase()}`}>
            <TriangleAlert size={30} />
            <div><h2>Prioridad {p.toUpperCase()}</h2><span>{TEXTO[p]}</span></div>
            </div>
                    {an.alerta_seguridad && (
            <div className="alerta-critica">
                <b>⚠ Valores críticos detectados</b>
                <p>El modelo no sugirió prioridad Alta, pero hay valores en rango crítico. Se recomienda revisión inmediata por el profesional.</p>
                <ul>{an.criticos.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            )}
            <div className="probs">
            {Object.entries(an.probabilidades).sort((x, y) => y[1] - x[1]).map(([k, v]) => (
                <div key={k} className="prob"><span>{k}</span><div className="bar"><i className={k.toLowerCase()} style={{ width: `${Math.round(v * 100)}%` }} /></div><b>{Math.round(v * 100)} %</b></div>
            ))}
            </div>
            <h3 className="seccion">Resumen de datos</h3>
            <div className="row2">
            <div>
                <h4>Datos del paciente</h4>
                <div className="kv"><small>Nombre</small><b>{a.nombre}</b></div>
                <div className="kv"><small>Edad</small><b>{e.edad} años</b></div>
                <div className="kv"><small>Motivo de consulta</small><b>{a.motivo_consulta || "—"}</b></div>
            </div>
            <div>
                <h4>Signos vitales</h4>
                <div className="kv"><small>Frecuencia cardíaca</small><b>{e.frec_cardiaca} lpm</b></div>
                <div className="kv"><small>Presión arterial</small><b>{e.presion_sistolica}{e.presion_diastolica ? `/${e.presion_diastolica}` : ""} mmHg</b></div>
                <div className="kv"><small>Saturación de oxígeno</small><b>{e.saturacion_o2} %</b></div>
                <div className="kv"><small>Frecuencia respiratoria / Temperatura</small><b>{e.frec_respiratoria} rpm · {e.temperatura} °C</b></div>
            </div>
            </div>
            <h3 className="seccion">Factores considerados</h3>
            {an.factores.length ? <ul className="factores">{an.factores.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="sub">Sin valores fuera de los rangos de referencia.</p>}
            <p className="nota">Los factores se calculan con la tabla de referencia del proyecto (Anexo 4) para apoyar la revisión; no representan la explicación interna del modelo SVM.</p>
            <p className="nota fuerte">{an.aviso}</p>
                    {a.segundos_registro != null && <p className="nota">Tiempo de registro: {fmtSeg(a.segundos_registro)}</p>}
            <div className="acciones">
            <Link className="btn outline" to="/cola">Ver cola</Link>
            <button className="btn primary" onClick={() => nav(`/paciente/${id}/revision`)}>Ir a revisión</button>
            </div>
        </div>
        </>
    );
}
