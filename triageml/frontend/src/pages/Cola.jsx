
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../api";
import { Alerta, Badge, Chip } from "../ui.jsx";

const POR_PAGINA = 8;

export default function Cola() {
    const nav = useNavigate();
    const [q, setQ] = useState("");
    const [prio, setPrio] = useState("");
    const [lista, setLista] = useState([]);
    const [pag, setPag] = useState(1);
    const [error, setError] = useState("");

    useEffect(() => {
        const cargar = () => api.cola(q, prio).then((d) => { setLista(d); setError(""); }).catch((e) => setError(e.message));
        cargar();
        const t = setInterval(cargar, 15000);   // refresca la cola cada 15 s
        return () => clearInterval(t);
    }, [q, prio]);
    useEffect(() => setPag(1), [q, prio]);

    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    const vista = lista.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA);

    return (
        <>
        <h1 className="titulo">Cola de atención</h1>
        <div className="toolbar">
            <div className="buscar"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o documento..." /></div>
            <select value={prio} onChange={(e) => setPrio(e.target.value)}>
            <option value="">Todas las prioridades</option>
            <option value="Alta">Prioridad alta</option><option value="Media">Prioridad media</option><option value="Baja">Prioridad baja</option>
            </select>
        </div>
        <Alerta>{error}</Alerta>
        <div className="card tabla-wrap">
            <table className="tabla">
            <thead><tr><th>N°</th><th>Nombre</th><th>Edad</th><th>Prioridad</th><th>Hora de llegada</th><th>Estado</th></tr></thead>
            <tbody>
                {vista.map((p, i) => (
                <tr key={p.id} onClick={() => nav(`/paciente/${p.id}`)}>
                    <td>{String((pag - 1) * POR_PAGINA + i + 1).padStart(2, "0")}</td>
                    <td><b>{p.nombre}</b></td>
                    <td>{p.edad} años</td>
                    <td><Badge p={p.prioridad} />{p.revisada && <small className="rev"> revisada</small>}</td>
                    <td>{p.hora}</td>
                    <td><Chip estado={p.estado} /></td>
                </tr>
                ))}
                {!vista.length && <tr><td colSpan={6} className="vacio">No hay pacientes en la cola.</td></tr>}
            </tbody>
            </table>
        </div>
        <div className="pager">
            <small>Mostrando {lista.length ? (pag - 1) * POR_PAGINA + 1 : 0} a {Math.min(pag * POR_PAGINA, lista.length)} de {lista.length} pacientes</small>
            <div>
            <button disabled={pag === 1} onClick={() => setPag(pag - 1)}>‹</button>
            {Array.from({ length: paginas }, (_, i) => <button key={i} className={pag === i + 1 ? "on" : ""} onClick={() => setPag(i + 1)}>{i + 1}</button>)}
            <button disabled={pag === paginas} onClick={() => setPag(pag + 1)}>›</button>
            </div>
        </div>
        </>
    );
}
