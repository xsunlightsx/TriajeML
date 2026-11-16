const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";
let token = localStorage.getItem("token");

export const getToken = () => token;
export const setToken = (t) => {
    token = t;
    if (t) localStorage.setItem("token", t);
    else localStorage.removeItem("token");
};

async function req(path, opts = {}) {
    let res;
    try {
        res = await fetch(API + path, {
        ...opts,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
    } catch {
        throw new Error("No se pudo conectar con la API. ¿Está corriendo el backend (python backend\\app.py)?");
    }
    let data = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    if (res.status === 401 && token) {
        setToken(null);
        window.location.assign("/login");
    }
    if (!res.ok) throw new Error(data?.errores?.join(". ") || "Error del servidor");
    return data;
}

const send = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
    login: (b) => 
        req("/auth/login", send("POST", b)),
    registro: (b) => req("/auth/registro", send("POST", b)),
    yo: () => req("/auth/yo"),
    resumen: () => req("/resumen"),
    cola: (q = "", prioridad = "") =>
        req(`/cola?q=${encodeURIComponent(q)}&prioridad=${encodeURIComponent(prioridad)}`),
    crear: (b) => req("/atenciones", send("POST", b)),
    detalle: (id) => req(`/atenciones/${id}`),
    historial: (id) => req(`/atenciones/${id}/historial`),
    revisar: (id, b) => req(`/atenciones/${id}/revision`, send("PATCH", b)),
    estado: (id, estado) => req(`/atenciones/${id}/estado`, send("PATCH", { estado })),
};
