import { useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AtraccionesPage } from './pages/AtraccionesPage';
import { AtraccionDetail } from './pages/AtraccionDetail';
import { AutosPage } from './pages/AutosPage';
import { AutoDetail } from './pages/AutoDetail';
import { AdminDashboard } from './pages/AdminDashboard';

// --- Modulo de Vuelos (Fase 4: busqueda implementada) ---
import { VuelosPage } from './pages/VuelosPage';
import { MisReservasPage } from './pages/MisReservasPage';
import { DetalleReservaPage } from './pages/DetalleReservaPage';
import { EstadoVueloPage } from './pages/EstadoVueloPage';
import { WebhooksPage } from './pages/WebhooksPage';

// --- Autenticacion: destino del logout forzado por 401 ---
import { LoginPage } from './pages/LoginPage';

// --- Componentes legales (seccion 5 del plan) ---
import { PrivacidadPage } from './pages/PrivacidadPage';
import { TerminosPage } from './pages/TerminosPage';
import { NotFoundPage } from './pages/NotFoundPage';

// --- Banner global de consentimiento (Fase 2) ---
import { BannerCookies } from './components/BannerCookies';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import './index.css';
import { useParams } from 'react-router-dom';

/**
 * Puente entre la ruta y `DetalleReservaPage`.
 *
 * La pagina recibe `bookingId` como prop en lugar de llamar a `useParams` por
 * dentro. Es separacion de responsabilidades: asi la pagina es testeable sin
 * montar un Router, y este wrapper es el unico que conoce la ruta.
 */
function DetalleReservaRoute() {
  const { bookingId } = useParams();
  return <DetalleReservaPage bookingId={bookingId} />;
}

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
    <BrowserRouter>
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido
      </a>

      <div className="app-wrapper">
        <Navbar />

        <Routes>
          <Route path="/" element={<AtraccionesPage />} />
          <Route path="/atracciones/:id" element={<AtraccionDetail />} />
          <Route path="/autos" element={<AutosPage />} />
          <Route path="/autos/:id" element={<AutoDetail />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Modulo de Vuelos */}
          <Route path="/vuelos" element={<VuelosPage />} />
          <Route path="/vuelos/busqueda" element={<VuelosPage />} />

          {/* Fase 10 · Estado de vuelo (PUBLICO, sin sesion) y webhooks.
              El estado de vuelo vive FUERA de `/vuelos` a proposito: es el
              unico endpoint con `security: []` del contrato, y meterlo bajo la
              ruta del modulo de reservas haria que se leyera como parte del
              flujo de compra, que es lo contrario de lo que es. */}
          <Route path="/estado-vuelos" element={<EstadoVueloPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/vuelos/reserva" element={<VuelosPage />} />

          {/* Fase 8 - Listado y detalle de reservas. EL ORDEN IMPORTA: React
              Router evalua las rutas en orden, asi que `/vuelos/reservas` tiene
              que declararse ANTES que `/vuelos/reservas/:bookingId`. Al reves,
              la ruta con parametro se come `/vuelos/reservas` e interpreta
              "reservas" como si fuera un bookingId. */}
          <Route path="/vuelos/reservas" element={<MisReservasPage />} />
          <Route
            path="/vuelos/reservas/:bookingId"
            element={<DetalleReservaRoute />}
          />

          {/* Autenticacion (otro dominio): destino del logout forzado */}
          <Route path="/login" element={<LoginPage />} />

          {/* Paginas legales */}
          <Route path="/privacidad" element={<PrivacidadPage />} />
          <Route path="/terminos" element={<TerminosPage />} />

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
  );
}

export default App;
