import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export function Navbar() {
  const location = useLocation();
  const isAutos = location.pathname.startsWith('/autos');
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo">
          Booking<span>.com</span>
        </div>
        <div className="navbar-actions">
          <span className="nav-currency">USD</span>
          <span className="nav-flag">🇪🇨</span>
          <span className="nav-help">?</span>
          {user ? (
            <>
              <span style={{ fontSize: '0.9rem', color: '#fff', marginRight: '1rem' }}>
                {user.user_metadata?.nombre ? `¡Hola, ${user.user_metadata.nombre}!` : user.email}
              </span>
              <Link to="/facturas" className="navbar-btn outline" style={{textDecoration: 'none'}}>Mis Facturas</Link>
              <Link to="/mis-reservas" className="navbar-btn outline" style={{textDecoration: 'none'}}>Mis reservas</Link>
              <button className="navbar-btn solid" onClick={handleLogout}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <Link to="/register" className="navbar-btn outline" style={{textDecoration: 'none'}}>Regístrate</Link>
              <Link to="/login" className="navbar-btn solid" style={{textDecoration: 'none'}}>Iniciar sesión</Link>
            </>
          )}
        </div>
      </div>
      <div className="navbar-secondary">
        <div className="navbar-links">
          <Link to="/">🛏️ Hospedajes</Link>
          <Link to="/vuelos">✈️ Vuelos</Link>
          <Link to="/autos" className={isAutos ? 'active' : ''}>🚗 Renta de autos</Link>
          <Link to="/" className={!isAutos ? 'active' : ''}>🎡 Atracciones</Link>
          <Link to="/">🚕 Taxis aeropuerto</Link>
        </div>
      </div>
    </nav>
  );
}
