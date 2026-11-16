import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import { Alerta, Badge, Chip, fmtFecha, fmtHora, useAccion } from "../ui.jsx";
import { SINTOMAS } from "./RegistroPaciente.jsx";

export default function Detalle() {
    const { id } = useParams();
    const { user } = useAuth();
    const [a, setA] = useState(null);
    const [hist, setHist] = useState([]);
    const [tab, setTab] = useState("info");
    const [errCarga, setErrCarga] = useState("");
    const { cargando, error, ejecutar } = useAccion();
    const puede = user.rol !== "Administrador";

    const cargar = () => Promise.all([api.detalle(id), api.historial(id)]).then(([d, h]) => { setA(d); setHist(h); }).catch((e) => setErrCarga(e.message));
    useEffect(() => { cargar(); }, [id]);
    if (errCarga) return <Alerta>{errCarga}</Alerta>;
    if (!a) return <p className="cargando">Cargando…</p>;
    const e = a.entrada;
    const sint = SINTOMAS.filter(([k]) => e[k] === 1).map(([, t]) => t);
    const cambiar = async (estado) => { if (await ejecutar(() => api.estado(id, estado))) cargar(); };

    return (
        <>
        <h1 className="titulo">Detalle del paciente</h1>
        <Link to="/cola" className="volver"><ArrowLeft size={15} /> Volver a la cola</Link>
        <div className="card">
            <div className="fila">
            <div className="avatar grande"><User size={28} /></div>
            <div className="grow"><h2>{a.nombre}</h2><small>{e.edad} años · {a.sexo || "—"} · DNI: {a.documento || "—"}</small></div>
            <Badge p={a.prioridad_actual} />
            </div>
            <div className="tabs">
            <button className={tab === "info" ? "on" : ""} onClick={() => setTab("info")}>Información general</button>
            <button className={tab === "hist" ? "on" : ""} onClick={() => setTab("hist")}>Historial de decisiones</button>
            </div>
            {tab === "info" ? (
            <div className="row2">
                <div>
                <h3>Información del paciente</h3>
                <div className="kv"><small>Nombre completo</small><b>{a.nombre}</b></div>
                <div className="kv"><small>Edad</small><b>{e.edad} años</b></div>
                <div className="kv"><small>Sexo</small><b>{a.sexo || "—"}</b></div>
                <div className="kv"><small>Documento de identidad</small><b>{a.documento || "—"}</b></div>
                <div className="kv"><small>Teléfono</small><b>{a.telefono || "—"}</b></div>
                </div>
                <div>
                <h3>Motivo de consulta</h3>
                <p className="sub">{a.motivo_consulta || "—"}</p>
                <h3>Signos vitales</h3>
                <div className="row2">
                    <div className="kv"><small>Presión arterial</small><b>{e.presion_sistolica}{e.presion_diastolica ? `/${e.presion_diastolica}` : ""} mmHg</b></div>
                    <div className="kv"><small>Frecuencia cardíaca</small><b>{e.frec_cardiaca} lpm</b></div>
                    <div className="kv"><small>Temperatura</small><b>{e.temperatura} °C</b></div>
                    <div className="kv"><small>Saturación de oxígeno</small><b>{e.saturacion_o2} %</b></div>
                    <div className="kv"><small>Frecuencia respiratoria</small><b>{e.frec_respiratoria} rpm</b></div>
                </div>
                <div className="kv"><small>Síntomas de alarma</small><b>{sint.length ? sint.join(", ") : "Ninguno"}</b></div>
                {a.observaciones && <div className="kv"><small>Observaciones</small><b>{a.observaciones}</b></div>}
                </div>
            </div>
            ) : (
            <ul className="timeline">
                {hist.map((h, i) => <li key={i}><i /><div><small>{fmtFecha(h.fecha)}</small><b>{h.accion}</b><small>{h.responsable}</small></div></li>)}
            </ul>
            )}
            <Alerta>{error}</Alerta>
            <div className="acciones">
            <small className="grow">Hora de ingreso: {fmtHora(a.generada_en)} · Estado: <Chip estado={a.estado} /></small>
            <Link className="btn outline" to={`/paciente/${id}/resultado`}>Ver resultado ML</Link>
            <Link className="btn outline" to={`/paciente/${id}/revision`}>{puede ? "Revisar prioridad" : "Ver trazabilidad"}</Link>
            {puede && a.estado === "En espera" && <button className="btn primary" disabled={cargando} onClick={() => cambiar("En atención")}>Iniciar atención</button>}
            {puede && a.estado === "En atención" && <button className="btn primary" disabled={cargando} onClick={() => cambiar("Finalizado")}>Finalizar atención</button>}
            </div>
        </div>
        </>
    );
}
