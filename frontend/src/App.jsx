import { useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AtraccionesPage } from './pages/AtraccionesPage';
import { AtraccionesSearchPage } from './pages/AtraccionesSearchPage';
import { AtraccionDetail } from './pages/AtraccionDetail';
import { HospedajePage } from './pages/HospedajePage';
import { AutosPage } from './pages/AutosPage';
import { AutoDetail } from './pages/AutoDetail';
import { AdminDashboard } from './pages/AdminDashboard';
// --- Modulo de Vuelos (Fase 4: busqueda implementada) ---
import { VuelosPage } from './pages/VuelosPage';
import { MisReservasPage } from './pages/MisReservasPage';
import { EstadoVueloPage } from './pages/EstadoVueloPage';
import { DetalleReservaPage } from './pages/DetalleReservaPage';
import { FacturasPage } from './pages/FacturasPage';
import { WebhooksPage } from './pages/WebhooksPage';

// --- Autenticacion: destino del logout forzado por 401 ---
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// --- Componentes legales (seccion 5 del plan) ---
import { PrivacidadPage } from './pages/PrivacidadPage';
import { TerminosPage } from './pages/TerminosPage';
import { NotFoundPage } from './pages/NotFoundPage';

// --- Banner global de consentimiento (Fase 2) ---
import { BannerCookies } from './components/BannerCookies';

// --- Estado Offline ---
import { OfflineBanner } from './components/OfflineBanner';

// --- Chatbot informativo (flotante, global, solo lectura) ---
import { ChatbotFlotante } from './components/ChatbotFlotante';

import { AuthProvider } from './hooks/useAuth';
import { CurrencyProvider } from './hooks/CurrencyContext';
import { LanguageProvider } from './hooks/LanguageContext';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AdminGuard } from './components/AdminGuard';
import './index.css';
import './vuelos.css';
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
    <AuthProvider>
    <LanguageProvider>
    <CurrencyProvider>
    <BrowserRouter>
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido
      </a>

      <div className="app-wrapper">
        <Navbar />
        <Routes>
          <Route path="/" element={<AtraccionesPage />} />
          <Route path="/hospedaje" element={<HospedajePage />} />
          <Route path="/search" element={<AtraccionesSearchPage />} />
          <Route path="/atracciones/:id" element={<AtraccionDetail />} />
          <Route path="/autos" element={<AutosPage />} />
          <Route path="/autos/:id" element={<AutoDetail />} />
          <Route path="/admin" element={
            <AdminGuard>
              <AdminDashboard />
            </AdminGuard>
          } />
          {/* Modulo de Vuelos */}
          <Route path="/vuelos" element={<VuelosPage />} />
          <Route path="/vuelos/busqueda" element={<VuelosPage />} />
          <Route path="/vuelos/reserva" element={<VuelosPage />} />
          <Route path="/vuelos/reservas" element={<MisReservasPage />} />
          <Route path="/vuelos/reservas/:bookingId" element={<DetalleReservaRoute />} />
          <Route path="/mis-reservas" element={<MisReservasPage />} />

          {/* Otros endpoints de vuelos */}
          <Route path="/estado-vuelos" element={<EstadoVueloPage />} />
          <Route path="/vuelos/estado" element={<EstadoVueloPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />

          {/* Autenticacion */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/facturas" element={<FacturasPage />} />

          {/* Paginas legales */}
          <Route path="/privacidad" element={<PrivacidadPage />} />
          <Route path="/terminos" element={<TerminosPage />} />
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
      <OfflineBanner />
      {/* Chatbot: global y fuera del `app-wrapper`, igual que los banners.
          Montarlo dentro de una Ruta lo haría desaparecer al navegar, y el
          requisito es que esté en TODAS las pantallas. Va después de
          `OfflineBanner` para que en el DOM quede por encima si coincidieran,
          cosa que no ocurre porque `OfflineBanner` devuelve `null` con conexión. */}
      <ChatbotFlotante />
    </BrowserRouter>
    </CurrencyProvider>
    </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
