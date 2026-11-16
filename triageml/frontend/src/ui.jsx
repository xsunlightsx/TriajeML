import { useState } from "react";

export const Logo = () => <div className="logo">Triage<span>ML</span></div>;
export const Badge = ({ p }) => <span className={`badge ${p.toLowerCase()}`}>Prioridad {p.toLowerCase()}</span>;

const SLUG = { "En espera": "espera", "En atención": "atencion", Finalizado: "fin" };
export const Chip = ({ estado }) => <span className={`chip ${SLUG[estado]}`}>{estado}</span>;
export const Alerta = ({ tipo = "error", children }) =>
    children ? <div className={`alerta ${tipo}`}>{children}</div> : null;

export const Campo = ({ label, children, className = "" }) => (
    <label className={`campo ${className}`}>
        <span>{label}</span>
        {children}
    </label>
);

export const NIVEL = { Alta: "Nivel I–II", Media: "Nivel III", Baja: "Nivel IV–V" };

export const fmtSeg = (s) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`);
export const fmtHora = (iso) => (iso ? new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "");
export const fmtFecha = (iso) => (iso ? new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "");

export function useAccion() {
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const ejecutar = async (fn) => {
        setCargando(true); setError("");
        try { return await fn(); } catch (e) { setError(e.message); return null; } finally { setCargando(false); }
    };
    return { cargando, error, setError, ejecutar };
}

export const Heart = () => (
    <svg viewBox="0 0 200 200" width="170" height="170" aria-hidden="true">
        <path d="M30 100 C20 40 90 20 140 40 C175 55 185 95 160 140 C135 185 60 175 30 100Z" fill="none" stroke="#7b8be3" strokeWidth="2.5" />
        <circle cx="150" cy="52" r="9" fill="none" stroke="#7b8be3" strokeWidth="2.5" />
        <path d="M100 148 C60 118 62 80 85 78 C97 77 100 88 100 88 C100 88 103 77 115 78 C138 80 140 118 100 148Z" fill="#f59ac6" />
    </svg>
);
