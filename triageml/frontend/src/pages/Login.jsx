import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import { Alerta, Heart, Logo, useAccion } from "../ui.jsx";

export function PanelIzquierdo() {
    return (
        <div className="auth-left">
        <Logo />
        <p className="tag">Tu aliado en la atención de pacientes</p>
        <Heart />
        <h3>Juntos por una atención<br />más oportuna.</h3>
        </div>
    );
}

export default function Login() {
    const [f, setF] = useState({ correo: "", clave: "" });
    const { entrar } = useAuth();
    const nav = useNavigate();
    const { cargando, error, ejecutar } = useAccion();

    const enviar = async (e) => {
        e.preventDefault();
        const r = await ejecutar(() => api.login(f));
        if (r) { entrar(r); nav("/"); }
    };

    return (
        <div className="auth-wrap">
        <PanelIzquierdo />
        <form className="auth-right" onSubmit={enviar}>
            <h1>¡Bienvenido!</h1>
            <p className="sub">Ingresa a tu cuenta y sé parte de una atención más ágil e inteligente.</p>
            <label className="campo"><span>Correo electrónico</span>
            <input type="email" required placeholder="Ingresa tu correo electrónico" value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} /></label>
            <label className="campo"><span>Contraseña</span>
            <input type="password" required placeholder="Ingresa tu contraseña" value={f.clave} onChange={(e) => setF({ ...f, clave: e.target.value })} /></label>
            <Alerta>{error}</Alerta>
            <button className="btn primary full" disabled={cargando}>{cargando ? "Ingresando…" : "Ingresar"}</button>
            <p className="pie">¿Aún no tienes cuenta? <Link to="/crear-cuenta">Regístrate</Link></p>
        </form>
        </div>
    );
}
