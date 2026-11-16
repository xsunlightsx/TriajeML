import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [cargando, setCargando] = useState(!!getToken());

    useEffect(() => {
        if (!getToken()) return;
        api.yo().then(setUser).catch(() => setToken(null)).finally(() => setCargando(false));
    }, []);

    const entrar = (data) => { setToken(data.token); setUser(data.usuario); };
    const salir = () => { setToken(null); setUser(null); };
    return <Ctx.Provider value={{ user, cargando, entrar, salir }}>{children}</Ctx.Provider>;
}
