import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarReservas } from '../services/vuelosApi';
import { formatearFecha, formatearMoneda } from '../services/formato';

/**
 * Pagina "Mis reservas": `GET /bookings` con paginacion por cursor.
 *
 * ── Por que cursor y no "ver mas" con offset ────────────────────────────────
 * El backend devuelve `nextCursor`, y la UI lo reenvia tal cual. Un
 * "mostrar mas" con offset repetiria reservas si entra una nueva entre pagina y
 * pagina; el cursor no, porque es "empieza despues de esta fila".
 *
 * ── Cargar mas NO reemplaza la lista ────────────────────────────────────────
 * Se concatena en vez de sobrescribir: la lista de la izquierda sigue siendo
 * "lo que has pedido", no "la ultima respuesta del servidor". Es la diferencia
 * entre una paginacion acumulativa y una que pierde lo que ya se vio.
 */

const ESTADOS_ES = {
  PENDING: 'Pendiente',
  PENDING_PAYMENT: 'Pendiente de pago',
  TICKET_ISSUING: 'Emitiendo billetes',
  CONFIRMED: 'Confirmada',
  FAILED: 'Fallida',
  CHANGE_PENDING: 'Cambio en curso',
  CANCELLATION_PENDING: 'Cancelación en curso',
  CANCELLED: 'Cancelada',
};

const TAMANOS = [5, 10, 25];

export function MisReservasPage() {
  const [reservas, setReservas] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(null);

  // Filtros. `status` vacio significa "sin filtro" y NO se envia, para que el
  // backend no lo interprete como un valor.
  const [status, setStatus] = useState('');
  const [pnr, setPnr] = useState('');
  const [pcr, setPcr] = useState(10);

  const peticionEnCurso = useRef(false);
  const fetchId = useRef(0);

  const pedir = useCallback(
    async ({ siguiente, acumular }) => {
      // ── Guardia SINCRONO solo para "Cargar más" ──────────────────────────
      if (acumular && peticionEnCurso.current) return;
      if (acumular) peticionEnCurso.current = true;

      const currentFetch = ++fetchId.current;

      if (acumular) setCargandoMas(true);
      else setCargando(true);
      setError(null);
      
      try {
        const respuesta = await listarReservas({
          status: status || undefined,
          pnr: pnr || undefined,
          limit: pcr,
          cursor: siguiente || undefined,
        });
        
        if (currentFetch !== fetchId.current) return;

        setReservas((prev) => (acumular ? [...prev, ...respuesta.items] : respuesta.items));
        setCursor(respuesta.nextCursor);
      } catch (fallo) {
        if (currentFetch !== fetchId.current) return;
        setError(
          fallo?.response?.data?.detail ??
            'No se pudieron cargar tus reservas.',
        );
      } finally {
        if (currentFetch === fetchId.current) {
          setCargando(false);
          setCargandoMas(false);
          if (acumular) peticionEnCurso.current = false;
        }
      }
    },
    [status, pnr, pcr],
  );

  // Recarga desde cero cuando cambia un filtro. Sin este efecto, cambiar el
  // estado solo afectaria a la siguiente peticion "cargar mas" y la lista
  // mostraria los resultados del filtro anterior mezclados.
  useEffect(() => {
    pedir({ siguiente: null, acumular: false });
  }, [pedir]);

  useEffect(() => {
    document.title = 'Mis reservas · Booking Prototipo';
    return () => {
      document.title = 'Booking Prototipo';
    };
  }, []);

  return (
    <main className="main-content main-content-vuelos">
      <h1 className="section-title">Mis reservas</h1>
      <p className="section-subtitle">
        Todas las reservas creadas desde este navegador.
      </p>

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <form className="filtros-reservas" onSubmit={(e) => e.preventDefault()}>
        <div className="campo">
          <label className="modal-label" htmlFor="filtro-pnr">
            Buscar por PNR
          </label>
          <input
            className="modal-input"
            id="filtro-pnr"
            type="text"
            maxLength={6}
            placeholder="Ej. QZXEDP"
            value={pnr}
            onChange={(e) => setPnr(e.target.value.toUpperCase())}
          />
        </div>
        <div className="campo">
          <label className="modal-label" htmlFor="filtro-estado">
            Estado
          </label>
          <select
            className="modal-input"
            id="filtro-estado"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(ESTADOS_ES).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label className="modal-label" htmlFor="filtro-tamano">
            Por pagina
          </label>
          <select
            className="modal-input"
            id="filtro-tamano"
            value={pcr}
            onChange={(e) => setPcr(Number(e.target.value))}
          >
            {TAMANOS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </form>

      {cargando && (
        <p className="state-subtitle" role="status">
          Cargando reservas…
        </p>
      )}

      {!cargando && error && (
        <p className="modal-error" role="alert">
          {error}
        </p>
      )}

      {!cargando && !error && reservas.length === 0 && (
        <div className="state-container">
          <div className="error-icon" aria-hidden="true">
            🎫
          </div>
          <h2 className="state-title">Todavía no tienes reservas</h2>
          <p className="state-subtitle">
            Cuando completes una compra, aparecerá aquí con su PNR.
          </p>
          <Link className="btn-primario" to="/vuelos">
            Buscar vuelos
          </Link>
        </div>
      )}

      {!cargando && !error && reservas.length > 0 && (
        <>
          <p className="state-subtitle" role="status">
            {reservas.length} reserva(s) cargada(s)
          </p>
          <ul className="lista-reservas">
            {reservas.map((r) => (
              <li key={r.bookingId}>
                <Link className="tarjeta-reserva" to={`/vuelos/reservas/${r.bookingId}`}>
                  <span className="tarjeta-reserva-pnr">{r.pnr ?? '—'}</span>
                  <span className={`estado-pill estado-${(r.status || '').toLowerCase()}`}>
                    {ESTADOS_ES[r.status] ?? r.status}
                  </span>
                  <span className="tarjeta-reserva-ruta">
                    {r.origin && r.destination
                      ? `${r.origin} → ${r.destination}`
                      : 'Itinerario sin datos'}
                  </span>
                  <span className="tarjeta-reserva-fecha">
                    {r.departureDate ? formatearFecha(r.departureDate) : '—'}
                  </span>
                  <span className="tarjeta-reserva-total">
                    {formatearMoneda(r.grandTotal?.total, r.grandTotal?.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {cursor && (
            <div className="acciones-paginacion">
              <button
                type="button"
                className="btn-secundario"
                onClick={() => pedir({ siguiente: cursor, acumular: true })}
                disabled={cargandoMas}
              >
                {cargandoMas ? 'Cargando…' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
