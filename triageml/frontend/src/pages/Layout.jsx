import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ClipboardList, House, LogOut, UserPlus } from "lucide-react";
import { useAuth } from "../auth.jsx";
import { Logo } from "../ui.jsx";

export default function Layout() {
    const { user, salir } = useAuth();
    const nav = useNavigate();
    const items = [
        { to: "/", texto: "Inicio", Icono: House, end: true },
        ...(user.rol !== "Administrador" ? [{ to: "/paciente/nuevo", texto: "Registro paciente", Icono: UserPlus }] : []),
        { to: "/cola", texto: "Cola de atención", Icono: ClipboardList },
    ];
    return (
        <div className="app">
        <aside className="sidebar">
            <Logo />
            <nav>
            {items.map(({ to, texto, Icono, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>
                <Icono size={18} /> {texto}
                </NavLink>
            ))}
            </nav>
            <div className="sidebar-foot">
            <strong>{user.nombre}</strong>
            <small>{user.rol}</small>
            <button className="link" onClick={() => { salir(); nav("/login"); }}><LogOut size={15} /> Cerrar sesión</button>
            </div>
        </aside>
        <main className="main"><Outlet /></main>
        </div>
    );
}
