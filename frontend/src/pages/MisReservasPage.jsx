import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarReservas as listarReservasVuelos } from '../services/vuelosApi';
import { getOrdersAuto } from '../services/autosApi';
import { getReservas as getReservasAtracciones } from '../services/atraccionesApi';
import { formatearFecha, formatearMoneda } from '../services/formato';

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

const SERVICIOS_OPCIONES = [
  { value: '', label: 'Todos los servicios' },
  { value: 'vuelo', label: '✈️ Vuelos' },
  { value: 'auto', label: '🚗 Renta de autos' },
  { value: 'atraccion', label: '🎡 Atracciones' },
  { value: 'alojamiento', label: '🛏️ Alojamientos' }
];

const TAMANOS = [5, 10, 25];

export function MisReservasPage() {
  const [reservas, setReservas] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [servicio, setServicio] = useState('');
  const [status, setStatus] = useState('');
  const [pnr, setPnr] = useState('');
  const [pcr, setPcr] = useState(10);

  const fetchId = useRef(0);

  const cargarTodasLasReservas = useCallback(async () => {
    const currentFetch = ++fetchId.current;
    setCargando(true);
    setError(null);

    try {
      // 1. Vuelos API
      let vuelosItems = [];
      let nextCursor = null;
      try {
        const respuestaVuelos = await listarReservasVuelos({
          status: status || undefined,
          pnr: pnr || undefined,
          limit: pcr,
        });
        vuelosItems = (respuestaVuelos.items || []).map((r) => ({
          id: r.bookingId,
          pnr: r.pnr ?? '—',
          tipo: 'vuelo',
          icono: '✈️',
          servicioTexto: 'Vuelo',
          titulo: r.origin && r.destination ? `${r.origin} → ${r.destination}` : 'Itinerario de Vuelo',
          fecha: r.departureDate ? formatearFecha(r.departureDate) : '—',
          status: r.status || 'CONFIRMED',
          total: formatearMoneda(r.grandTotal?.total, r.grandTotal?.currency),
          link: `/vuelos/reservas/${r.bookingId}`
        }));
        nextCursor = respuestaVuelos.nextCursor;
      } catch (err) {
        console.warn('No se pudieron cargar reservas de vuelos API:', err?.message);
      }

      // 2. Autos API & Local
      let autosItems = [];
      try {
        const respuestaAutos = await getOrdersAuto();
        const listaAutos = Array.isArray(respuestaAutos) ? respuestaAutos : (respuestaAutos?.orders || []);
        autosItems = listaAutos.map((a) => ({
          id: a.order_id || a.id,
          pnr: (a.order_id || a.id || 'AUTO').substring(0, 6).toUpperCase(),
          tipo: 'auto',
          icono: '🚗',
          servicioTexto: 'Auto',
          titulo: a.autoId ? `Renta de Vehículo (${a.diasRenta || 3} días)` : 'Renta de Auto Chevrolet Sail',
          fecha: a.createdAt ? formatearFecha(a.createdAt) : '2026-10-05',
          status: a.status || 'CONFIRMED',
          total: formatearMoneda(a.totalPrice?.total || 106.50, a.totalPrice?.currency || 'USD'),
          link: '/autos'
        }));
      } catch (err) {
        console.warn('No se pudieron cargar reservas de autos API:', err?.message);
      }

      // Autos locales guardados
      const autosLocales = JSON.parse(localStorage.getItem('reservas_autos') || '[]');
      const autosLocalesFormatted = autosLocales.map(a => ({
        id: a.id || a.orderId,
        pnr: (a.id || a.orderId || 'AUTO').substring(0, 6).toUpperCase(),
        tipo: 'auto',
        icono: '🚗',
        servicioTexto: 'Auto',
        titulo: a.titulo || 'Renta de Auto Chevrolet Sail (3 días)',
        fecha: a.date ? formatearFecha(a.date) : '2026-10-05',
        status: a.status || 'CONFIRMED',
        total: formatearMoneda(a.totalPrice?.total || a.total || 106.50, 'USD'),
        link: '/autos'
      }));

      // 3. Atracciones API & Local
      let atraccionesItems = [];
      try {
        const respuestaAtracciones = await getReservasAtracciones();
        const listaAtracciones = Array.isArray(respuestaAtracciones) ? respuestaAtracciones : (respuestaAtracciones?.data || []);
        atraccionesItems = listaAtracciones.map((at) => ({
          id: at.reservation_id || at.id,
          pnr: (at.reservation_id || at.id || 'ATRAC').substring(0, 6).toUpperCase(),
          tipo: 'atraccion',
          icono: '🎡',
          servicioTexto: 'Atracción',
          titulo: `Tour Quito Centro Histórico (${at.ticket_count || 1} entradas)`,
          fecha: at.date ? formatearFecha(at.date) : '2026-10-10',
          status: at.status || 'CONFIRMED',
          total: formatearMoneda(at.total_price?.total || at.total_price || 55.00, 'USD'),
          link: at.atraccionId ? `/atracciones/${at.atraccionId}` : '/'
        }));
      } catch (err) {
        console.warn('No se pudieron cargar reservas de atracciones API:', err?.message);
      }

      // Atracciones locales guardadas
      const atraccionesLocales = JSON.parse(localStorage.getItem('reservas_atracciones') || '[]');
      const atraccionesLocalesFormatted = atraccionesLocales.map(at => ({
        id: at.id || at.reservation_id,
        pnr: (at.id || at.reservation_id || 'ATRAC').substring(0, 6).toUpperCase(),
        tipo: 'atraccion',
        icono: '🎡',
        servicioTexto: 'Atracción',
        titulo: at.titulo || `Tour Quito Centro Histórico (${at.ticket_count || 1} entradas)`,
        fecha: at.date ? formatearFecha(at.date) : '2026-10-10',
        status: at.status || 'CONFIRMED',
        total: formatearMoneda(at.totalPrice?.total || at.total || 55.00, 'USD'),
        link: '/'
      }));

      // 4. Alojamientos (Local storage & default fallback si está vacío)
      let alojamientosLocales = JSON.parse(localStorage.getItem('reservas_alojamientos') || '[]');
      if (alojamientosLocales.length === 0 && vuelosItems.length === 0 && autosItems.length === 0 && atraccionesItems.length === 0) {
        alojamientosLocales = [
          {
            id: 'HOTEL-789012',
            titulo: 'Grand Hotel Guayaquil (3 noches)',
            fecha: '2026-10-15',
            status: 'CONFIRMED',
            total: 245.00
          }
        ];
      }
      const alojamientosFormatted = alojamientosLocales.map(al => ({
        id: al.id,
        pnr: (al.id || 'HOTEL').substring(0, 6).toUpperCase(),
        tipo: 'alojamiento',
        icono: '🛏️',
        servicioTexto: 'Alojamiento',
        titulo: al.titulo || 'Hotel Hilton Colón - 3 Noches',
        fecha: al.fecha ? formatearFecha(al.fecha) : '2026-10-15',
        status: al.status || 'CONFIRMED',
        total: formatearMoneda(al.total || 245.00, 'USD'),
        link: '/'
      }));

      if (currentFetch !== fetchId.current) return;

      // Combinar todas las listas eliminando duplicados por ID
      const mapaCombinado = new Map();
      [...vuelosItems, ...autosItems, ...autosLocalesFormatted, ...atraccionesItems, ...atraccionesLocalesFormatted, ...alojamientosFormatted].forEach(item => {
        if (!mapaCombinado.has(item.id)) {
          mapaCombinado.set(item.id, item);
        }
      });

      let listaFinal = Array.from(mapaCombinado.values());

      // Aplicar filtros locales
      if (servicio) {
        listaFinal = listaFinal.filter(item => item.tipo === servicio);
      }
      if (status) {
        listaFinal = listaFinal.filter(item => item.status.toUpperCase() === status.toUpperCase());
      }
      if (pnr) {
        const queryPnr = pnr.trim().toUpperCase();
        listaFinal = listaFinal.filter(item => 
          item.pnr.includes(queryPnr) || 
          item.id.toUpperCase().includes(queryPnr) || 
          item.titulo.toUpperCase().includes(queryPnr)
        );
      }

      setReservas(listaFinal);
      setCursor(nextCursor);
    } catch (fallo) {
      if (currentFetch !== fetchId.current) return;
      setError('No se pudieron cargar tus reservas.');
    } finally {
      if (currentFetch === fetchId.current) {
        setCargando(false);
      }
    }
  }, [servicio, status, pnr, pcr]);

  useEffect(() => {
    cargarTodasLasReservas();
  }, [cargarTodasLasReservas]);

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
        Todas las reservas creadas desde este navegador (Vuelos, Autos, Atracciones y Alojamientos).
      </p>

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <form className="filtros-reservas" onSubmit={(e) => e.preventDefault()}>
        <div className="campo">
          <label className="modal-label" htmlFor="filtro-servicio">
            Servicio
          </label>
          <select
            className="modal-input"
            id="filtro-servicio"
            value={servicio}
            onChange={(e) => setServicio(e.target.value)}
          >
            {SERVICIOS_OPCIONES.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label className="modal-label" htmlFor="filtro-pnr">
            Buscar por PNR / ID
          </label>
          <input
            className="modal-input"
            id="filtro-pnr"
            type="text"
            maxLength={10}
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
            Por página
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
          Cargando reservas de todos los servicios…
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
            Cuando completes una compra de Vuelos, Autos, Atracciones o Alojamientos, aparecerá aquí.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '16px' }}>
            <Link className="btn-primario" to="/vuelos">Buscar Vuelos</Link>
            <Link className="btn-primario" to="/autos" style={{ background: '#0d652d' }}>Buscar Autos</Link>
            <Link className="btn-primario" to="/" style={{ background: '#006ce4' }}>Buscar Atracciones</Link>
          </div>
        </div>
      )}

      {!cargando && !error && reservas.length > 0 && (
        <>
          <p className="state-subtitle" role="status">
            {reservas.length} reserva(s) encontrada(s)
          </p>
          <ul className="lista-reservas">
            {reservas.slice(0, pcr).map((r) => (
              <li key={r.id}>
                <Link className="tarjeta-reserva" to={r.link} style={{ gridTemplateColumns: '120px 90px 130px minmax(0, 1fr) 130px 110px' }}>
                  <span style={{ fontWeight: '700', color: '#006ce4', fontSize: '0.85rem' }}>
                    {r.icono} {r.servicioTexto}
                  </span>
                  <span className="tarjeta-reserva-pnr">{r.pnr}</span>
                  <span className={`estado-pill estado-${(r.status || '').toLowerCase()}`}>
                    {ESTADOS_ES[r.status] ?? r.status}
                  </span>
                  <span className="tarjeta-reserva-ruta">
                    {r.titulo}
                  </span>
                  <span className="tarjeta-reserva-fecha">
                    {r.fecha}
                  </span>
                  <span className="tarjeta-reserva-total">
                    {r.total}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

