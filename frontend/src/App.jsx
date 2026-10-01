import { useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AtraccionesPage } from './pages/AtraccionesPage';
import { AtraccionesSearchPage } from './pages/AtraccionesSearchPage';
import { AtraccionDetail } from './pages/AtraccionDetail';
import { AutosPage } from './pages/AutosPage';
import { AutoDetail } from './pages/AutoDetail';
import { AdminDashboard } from './pages/AdminDashboard';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MisReservasPage } from './pages/MisReservasPage';
import { VuelosPage } from './pages/VuelosPage';
import { EstadoVueloPage } from './pages/EstadoVueloPage';
import { DetalleReservaPage } from './pages/DetalleReservaPage';
import { FacturasPage } from './pages/FacturasPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { PrivacidadPage } from './pages/PrivacidadPage';
import { TerminosPage } from './pages/TerminosPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthProvider } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import './index.css';
import './vuelos.css';

/**
 * Raiz de la aplicacion.
 *
 * ## Banner de Cookies
 * Se monta UNA sola vez aqui, por encima de Navbar, Routes y Footer. Si se
 * montara dentro de una ruta, dejaria de existir al navegar y volveria a
 * aparecer en cada pantalla.
 *
 * ## Accesibilidad del salto de contenido
 * El enlace "Saltar al contenido" es el primer elemento enfocable de la pagina
 * y permite al usuario de teclado saltarse la navegacion. Solo se ve al
 * recibir el foco, para no cargar visualmente el diseno.
 */
function App() {
  // Controla la apertura del panel de preferencias desde el Footer.
  const [preferenciasCookies, setPreferenciasCookies] = useState(false);
  const cerrarPreferencias = useCallback(() => setPreferenciasCookies(false), []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-wrapper">
          <Navbar />
        <Routes>
          <Route path="/" element={<AtraccionesPage />} />
          <Route path="/search" element={<AtraccionesSearchPage />} />
          <Route path="/atracciones/:id" element={<AtraccionDetail />} />
          <Route path="/autos" element={<AutosPage />} />
          <Route path="/autos/:id" element={<AutoDetail />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/mis-reservas" element={<MisReservasPage />} />
          <Route path="/vuelos" element={<VuelosPage />} />
          <Route path="/vuelos/estado" element={<EstadoVueloPage />} />
          <Route path="/vuelos/reservas/:id" element={<DetalleReservaPage />} />
          <Route path="/facturas" element={<FacturasPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/legal/privacidad" element={<PrivacidadPage />} />
          <Route path="/legal/terminos" element={<TerminosPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        <Footer onAbrirPreferenciasCookies={() => setPreferenciasCookies(true)} />
      </div>

      {/* Global, fuera del router visual pero dentro de la app */}
      <BannerCookies
        abiertoExternamente={preferenciasCookies}
        onCerrarExterno={cerrarPreferencias}
      />
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
