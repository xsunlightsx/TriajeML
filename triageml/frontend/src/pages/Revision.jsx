import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircleAlert, User } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import { Alerta, Badge, NIVEL, fmtFecha, fmtHora, useAccion } from "../ui.jsx";

export default function Revision() {
    const { id } = useParams();
    const nav = useNavigate();
    const { user } = useAuth();
    const [a, setA] = useState(null);
    const [hist, setHist] = useState([]);
    const [final, setFinal] = useState("Alta");
    const [motivo, setMotivo] = useState("");
    const [ok, setOk] = useState("");
    const [errCarga, setErrCarga] = useState("");
    const { cargando, error, ejecutar } = useAccion();
    const puede = user.rol !== "Administrador";

    const cargar = () => Promise.all([api.detalle(id), api.historial(id)]).then(([d, h]) => {
        setA(d); setHist(h); setFinal(d.prioridad_actual); setMotivo(d.motivo_ajuste || "");
    }).catch((e) => setErrCarga(e.message));
    useEffect(() => { cargar(); }, [id]);

    if (errCarga) return <Alerta>{errCarga}</Alerta>;
    if (!a) return <p className="cargando">Cargando…</p>;
    const modifica = final !== a.prioridad_ml;

    const confirmar = async () => {
        setOk("");
        const r = await ejecutar(() => api.revisar(id, { prioridad_final: final, motivo }));
        if (r) { setOk("Decisión registrada. La prioridad final y el motivo quedaron en el historial del paciente."); cargar(); }
    };

    return (
        <>
        <p className="migas">PACIENTES / REVISIÓN PROFESIONAL</p>
        <h1 className="titulo">Revisión y trazabilidad</h1>
        <p className="sub">Confirma o modifica la sugerencia y registra el motivo de la decisión.</p>

        <div className="card fila">
            <div className="avatar"><User size={20} /></div>
            <div className="grow"><b>{a.nombre}</b><small>{a.entrada.edad} años · {a.sexo || "—"} · ID paciente: P-{String(a.id).padStart(5, "0")}</small></div>
            <span className="chip espera">{a.revisada_en ? "Revisado" : "Caso en revisión"}</span>
        </div>

        <div className="row2">
            <div className="card">
            <h4>Prioridad original sugerida por ML</h4>
            <div className="fila">
                <div className={`caja ${a.prioridad_ml.toLowerCase()}`}><CircleAlert size={18} /><div><b>{a.prioridad_ml.toUpperCase()}</b><small>{NIVEL[a.prioridad_ml]}</small></div></div>
                <div><small>Generada</small><b>{fmtHora(a.generada_en)}</b></div>
            </div>
            </div>
            <div className="card">
            <h4>Prioridad final profesional</h4>
            <div className="fila">
                <select value={final} disabled={!puede} onChange={(e) => setFinal(e.target.value)}>
                {["Alta", "Media", "Baja"].map((p) => <option key={p} value={p}>{p} ({NIVEL[p]})</option>)}
                </select>
                <div><small>Revisada por</small><b>{a.revisada_por || "—"}</b></div>
            </div>
            </div>
        </div>

        <div className="row2">
            <div className="card">
            <h4>Motivo del ajuste</h4>
            <label className="campo"><span>Justificación clínica {modifica ? "(obligatoria)" : "(opcional)"}</span>
                <textarea rows={5} disabled={!puede} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Describe por qué se mantiene o se ajusta la prioridad…" /></label>
            </div>
            <div className="card">
            <h4>Registro de cambios</h4>
            <ul className="timeline">
                {hist.map((h, i) => (
                <li key={i}><i /><div><small>{fmtFecha(h.fecha)}</small><b>{h.accion}</b><small>{h.responsable}</small></div></li>
                ))}
            </ul>
            <p className="ok-trazabilidad">✓ Trazabilidad habilitada</p>
            </div>
        </div>

        <Alerta>{error}</Alerta>
        <Alerta tipo="ok">{ok}</Alerta>
        {!puede && <Alerta tipo="info">El rol Administrador solo puede consultar la trazabilidad.</Alerta>}
        <div className="acciones">
            <small className="grow">Al confirmar, la prioridad final y el motivo quedarán asociados al historial del paciente.</small>
            <button className="btn outline" onClick={() => nav(`/paciente/${id}`)}>Volver al paciente</button>
            {puede && <button className="btn primary" disabled={cargando} onClick={confirmar}>{cargando ? "Guardando…" : "Confirmar y registrar"}</button>}
        </div>
        </>
    );
}
