import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import { Alerta, useAccion } from "../ui.jsx";
import { PanelIzquierdo } from "./Login.jsx";

export default function CrearCuenta() {
    const [f, setF] = useState({ nombre: "", correo: "", clave: "", confirmar: "", rol: "" });
    const { entrar } = useAuth();
    const nav = useNavigate();
    const { cargando, error, setError, ejecutar } = useAccion();
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

    const enviar = async (e) => {
        e.preventDefault();
        if (f.clave !== f.confirmar) return setError("Las contraseñas no coinciden");
        const r = await ejecutar(() => api.registro({ nombre: f.nombre, correo: f.correo, clave: f.clave, rol: f.rol }));
        if (r) { entrar(r); nav("/"); }
    };

    return (
        <div className="auth-wrap">
        <PanelIzquierdo />
        <form className="auth-right" onSubmit={enviar}>
            <h1>Crea tu cuenta</h1>
            <p className="sub">Completa tus datos para comenzar.</p>
            <label className="campo"><span>Nombre completo</span><input required placeholder="Ingresa tu nombre" value={f.nombre} onChange={set("nombre")} /></label>
            <label className="campo"><span>Correo electrónico</span><input type="email" required placeholder="Ingresa tu correo electrónico" value={f.correo} onChange={set("correo")} /></label>
            <label className="campo"><span>Contraseña</span><input type="password" required minLength={6} placeholder="Crea una contraseña (mín. 6 caracteres)" value={f.clave} onChange={set("clave")} /></label>
            <label className="campo"><span>Confirmar contraseña</span><input type="password" required placeholder="Repite tu contraseña" value={f.confirmar} onChange={set("confirmar")} /></label>
            <label className="campo"><span>Rol</span>
            <select required value={f.rol} onChange={set("rol")}>
                <option value="">Selecciona tu rol</option>
                <option>Enfermería</option><option>Médico</option><option>Administrador</option>
            </select></label>
            <Alerta>{error}</Alerta>
            <button className="btn primary full" disabled={cargando}>{cargando ? "Registrando…" : "Registrarse"}</button>
            <p className="pie">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
        </form>
        </div>
    );
}
