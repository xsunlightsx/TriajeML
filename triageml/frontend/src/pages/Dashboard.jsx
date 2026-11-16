import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck, ClipboardList, Hourglass, ShieldAlert, UserPlus, Users } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import { Alerta, Badge, Chip, fmtSeg } from "../ui.jsx";

const TARJETAS = [
    ["Pacientes hoy", "pacientes_hoy", Users, "azul"],
    ["En espera", "en_espera", Hourglass, "rosa"],
    ["En atención", "en_atencion", ClipboardCheck, "verde"],
    ["Prioridad alta", "prioridad_alta", ShieldAlert, "ambar"],
    ];

    export default function Dashboard() {
    const { user } = useAuth();
    const nav = useNavigate();
    const [r, setR] = useState(null);
    const [proximos, setProximos] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        api.resumen().then(setR).catch((e) => setError(e.message));
        api.cola().then((d) => setProximos(d.filter((p) => p.estado !== "Finalizado").slice(0, 5))).catch(() => {});
    }, []);

    return (
        <>
        <h1 className="titulo">¡Hola, {user.nombre.split(" ")[0]}!</h1>
        <p className="sub">Aquí tienes un resumen del día</p>
        <Alerta>{error}</Alerta>
        <div className="grid2">
            {TARJETAS.map(([t, k, Icono, color]) => (
            <div key={k} className={`stat ${color}`}>
                <Icono size={30} />
                <div><small>{t}</small><strong>{r ? r[k] : "–"}</strong></div>
            </div>
            ))}
        </div>
        {r && r.mediana_registro_seg != null && (
            <p className="nota">Tiempo mediano de registro hoy: <b>{fmtSeg(r.mediana_registro_seg)}</b> ({r.con_tiempo} pacientes). Meta del APF2: ≤ 2 min.</p>
        )}

        <h3 className="seccion">Accesos rápidos</h3>
        <div className="grid2">
            {user.rol !== "Administrador" && <Link to="/paciente/nuevo" className="quick"><UserPlus size={20} /> Registrar paciente</Link>}
            <Link to="/cola" className="quick"><ClipboardList size={20} /> Ver cola de atención</Link>
        </div>

        <h3 className="seccion">Próximos en la cola</h3>
        <div className="card tabla-wrap">
            <table className="tabla">
            <thead><tr><th>Paciente</th><th>Prioridad</th><th>Hora</th><th>Estado</th></tr></thead>
            <tbody>
                {proximos.map((p) => (
                <tr key={p.id} onClick={() => nav(`/paciente/${p.id}`)}>
                    <td><b>{p.nombre}</b> <small>· {p.edad} años</small></td>
                    <td><Badge p={p.prioridad} /></td>
                    <td>{p.hora}</td>
                    <td><Chip estado={p.estado} /></td>
                </tr>
                ))}
                {!proximos.length && <tr><td colSpan={4} className="vacio">No hay pacientes pendientes.</td></tr>}
            </tbody>
            </table>
        </div>
        </>
    );
}