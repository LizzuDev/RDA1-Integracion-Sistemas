/**
 * Pagina 404.
 *
 * Existe para que las rutas legales (/privacidad, /terminos) y las de vuelos
 * (/vuelos, /vuelos/busqueda, /vuelos/reserva) no terminen en una pantalla
 * vacia si el usuario escribe mal una URL.
 */
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="main-content" id="contenido-principal">
      <div className="state-container">
        <div className="error-icon" aria-hidden="true">
          🧭
        </div>
        <h1 className="state-title">Pagina no encontrada</h1>
        <p className="state-subtitle">
          La direccion que buscas no existe o fue movida.
        </p>
        <Link className="retry-btn" to="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
