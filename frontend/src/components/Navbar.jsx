import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

export function Navbar() {
  const { pathname } = useLocation();
  const [menuVuelosAbierto, setMenuVuelosAbierto] = useState(false);

  const esActivo = (prefijo) =>
    prefijo === '/' ? pathname === '/' : pathname.startsWith(prefijo);

  return (
    <nav className="navbar" aria-label="Navegacion principal">
      <div className="navbar-inner">
        <div className="navbar-logo">
          Booking<span>.com</span>
          <span
            style={{
              fontSize: '0.55rem',
              fontWeight: 400,
              opacity: 0.7,
              marginLeft: 6,
            }}
          >
            Prototipo
          </span>
        </div>

        <div className="navbar-links">
          <Link
            to="/"
            aria-current={esActivo('/') ? 'page' : undefined}
            style={esActivo('/') ? { color: '#febb02', fontWeight: 700 } : {}}
          >
            🏨 Alojamientos
          </Link>
          <Link
            to="/atracciones"
            aria-current={esActivo('/atracciones') ? 'page' : undefined}
            style={esActivo('/atracciones') ? { color: '#febb02', fontWeight: 700 } : {}}
          >
            🎡 Atracciones
          </Link>
          
          <div 
            className="navbar-dropdown-container"
            onMouseEnter={() => setMenuVuelosAbierto(true)}
            onMouseLeave={() => setMenuVuelosAbierto(false)}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}
          >
            <Link
              to="/vuelos"
              aria-current={esActivo('/vuelos') && !esActivo('/estado-vuelos') && !esActivo('/mis-reservas') ? 'page' : undefined}
              style={(esActivo('/vuelos') || esActivo('/estado-vuelos') || esActivo('/mis-reservas')) ? { color: '#febb02', fontWeight: 700 } : {}}
            >
              ✈️ Vuelos ▾
            </Link>
            
            {menuVuelosAbierto && (
              <div className="navbar-dropdown-menu">
                <Link to="/vuelos" className="navbar-dropdown-item">Buscar Vuelos</Link>
                <Link to="/vuelos/reservas" className="navbar-dropdown-item">Mis Reservas</Link>
                <Link to="/estado-vuelos" className="navbar-dropdown-item">Estado de Vuelos</Link>
              </div>
            )}
          </div>

          <Link
            to="/autos"
            aria-current={esActivo('/autos') ? 'page' : undefined}
            style={esActivo('/autos') ? { color: '#febb02', fontWeight: 700 } : {}}
          >
            🚗 Autos
          </Link>
        </div>

        <button className="navbar-btn" type="button">
          Registrarse
        </button>
      </div>
    </nav>
  );
}
