import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth.jsx";
import Layout from "./pages/Layout.jsx";
import Login from "./pages/Login.jsx";
import CrearCuenta from "./pages/CrearCuenta.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import RegistroPaciente from "./pages/RegistroPaciente.jsx";
import Cola from "./pages/Cola.jsx";
import Detalle from "./pages/Detalle.jsx";
import Resultado from "./pages/Resultado.jsx";
import Revision from "./pages/Revision.jsx";

function Privada() {
  const { user, cargando } = useAuth();
  if (cargando) return <p className="cargando">Cargando…</p>;
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

function Publica({ children }) {
  const { user, cargando } = useAuth();
  if (cargando) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Publica><Login /></Publica>} />
          <Route path="/crear-cuenta" element={<Publica><CrearCuenta /></Publica>} />
          <Route element={<Privada />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/paciente/nuevo" element={<RegistroPaciente />} />
            <Route path="/cola" element={<Cola />} />
            <Route path="/paciente/:id" element={<Detalle />} />
            <Route path="/paciente/:id/resultado" element={<Resultado />} />
            <Route path="/paciente/:id/revision" element={<Revision />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
