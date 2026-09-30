import { Link, useLocation } from 'react-router-dom';

export function Navbar() {
  const location = useLocation();
  const isAutos = location.pathname.startsWith('/autos');

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
          <button className="navbar-btn outline">Regístrate</button>
          <button className="navbar-btn solid">Iniciar sesión</button>
        </div>
      </div>
      <div className="navbar-secondary">
        <div className="navbar-links">
          <Link to="/">🛏️ Hospedajes</Link>
          <Link to="/">✈️ Vuelos</Link>
          <Link to="/autos" className={isAutos ? 'active' : ''}>🚗 Renta de autos</Link>
          <Link to="/" className={!isAutos ? 'active' : ''}>🎡 Atracciones</Link>
          <Link to="/">🚕 Taxis aeropuerto</Link>
        </div>
      </div>
    </nav>
  );
}
