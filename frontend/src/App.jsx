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

function App() {
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
        <Footer />
      </div>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
