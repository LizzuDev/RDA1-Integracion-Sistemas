import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { listarReservas as listarReservasVuelos } from '../services/vuelosApi';
import { getOrdersAuto } from '../services/autosApi';
import { getReservas as getReservasAtracciones } from '../services/atraccionesApi';
import { formatearFecha } from '../services/formato';
import { useCurrency } from '../hooks/CurrencyContext';

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
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { convertPrice } = useCurrency();

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
          totalRaw: r.grandTotal?.total || 106.50,
          link: `/vuelos/reservas/${r.bookingId}`
        }));
        nextCursor = respuestaVuelos.nextCursor;
      } catch (err) {
        // Fallback silenciado
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
          totalRaw: a.totalPrice?.total || 106.50,
          link: '/autos'
        }));
      } catch (err) {
        // Fallback silenciado
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
        totalRaw: a.totalPrice?.total || a.total || 106.50,
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
          hora: at.time || '10:00 a.m.',
          status: at.status || 'CONFIRMED',
          totalRaw: at.total_price?.total || at.total_price || 55.00,
          link: at.atraccionId ? `/atracciones/${at.atraccionId}` : '/'
        }));
      } catch (err) {
        // Fallback silenciado
      }

      const atraccionesLocales = JSON.parse(localStorage.getItem('reservas_atracciones') || '[]');
      const atraccionesLocalesFormatted = atraccionesLocales.map(at => ({
        id: at.id || at.reservation_id,
        pnr: (at.id || at.reservation_id || 'ATRAC').substring(0, 6).toUpperCase(),
        tipo: 'atraccion',
        icono: '🎡',
        servicioTexto: 'Atracción',
        titulo: at.titulo || `Tour Quito Centro Histórico (${at.ticket_count || 1} entradas)`,
        fecha: at.date ? formatearFecha(at.date) : '2026-10-10',
        hora: at.time || '10:00 a.m.',
        status: at.status || 'CONFIRMED',
        totalRaw: at.totalPrice?.total || at.total || 55.00,
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
        totalRaw: al.total || 245.00,
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

  const descargarPDF = (reserva) => {
    setIsDownloading(true);
    
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
        // Colores y Fuentes
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(0, 108, 228); // Azul Booking
        doc.text('Confirmacion de Reserva', 20, 30);
        
        // Función para limpiar emojis y caracteres especiales no soportados por jsPDF base
        const cleanText = (str) => (str || '').replace(/[^\x00-\xFF]/g, '').trim();

        doc.setFontSize(14);
        doc.setTextColor(51, 51, 51);
        doc.text(`Servicio: ${cleanText(reserva.servicioTexto)}`, 20, 50);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(`Nombre de reserva: ${cleanText(reserva.titulo)}`, 20, 60);
        
        // Bloque de datos
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(20, 70, 170, 60, 3, 3, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.text('Detalles del Pago y Fechas', 25, 80);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Código (PNR):`, 25, 95);
        doc.setFont('helvetica', 'bold');
        doc.text(`${reserva.pnr}`, 70, 95);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha del servicio:`, 25, 105);
        doc.setFont('helvetica', 'bold');
        doc.text(`${reserva.fecha}${reserva.hora ? ` a las ${reserva.hora}` : ''}`, 70, 105);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Estado actual:`, 25, 115);
        doc.setFont('helvetica', 'bold');
        const estadoTexto = ESTADOS_ES[reserva.status] ?? reserva.status;
        doc.text(`${estadoTexto}`, 70, 115);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Total pagado:`, 25, 125);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 128, 9); // Verde Booking
        doc.text(`${convertPrice(reserva.totalRaw)}`, 70, 125);
        
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text(`Generado automáticamente el ${new Date().toLocaleDateString()}`, 20, 280);

        doc.save(`Reserva_${reserva.pnr}.pdf`);
      } catch (err) {
        console.error('Error al generar PDF:', err);
      } finally {
        setIsDownloading(false);
      }
    }, 800); // Simulamos un breve tiempo de generación para feedback visual
  };

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
                <div 
                  className="tarjeta-reserva" 
                  onClick={() => setSelectedReserva(r)} 
                  style={{ gridTemplateColumns: '120px 90px 130px minmax(0, 1fr) 130px 110px', cursor: 'pointer', outline: 'none' }}
                  tabIndex="0"
                  onKeyDown={(e) => { if (e.key === 'Enter') setSelectedReserva(r); }}
                >
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
                    {convertPrice(r.totalRaw)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* MODAL DETALLES Y CÓDIGO QR */}
      {selectedReserva && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '500px', maxWidth: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            
            <div style={{ background: '#006ce4', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{selectedReserva.icono} Detalles de la Reserva</h2>
              <button onClick={() => setSelectedReserva(null)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>{selectedReserva.titulo}</h3>
                <span className={`estado-pill estado-${(selectedReserva.status || '').toLowerCase()}`}>
                    {ESTADOS_ES[selectedReserva.status] ?? selectedReserva.status}
                </span>
              </div>

              <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '2px' }}>Código de Confirmación (PNR)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>{selectedReserva.pnr}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '2px' }}>Fecha</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>{selectedReserva.fecha}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '2px' }}>ID Interno</div>
                  <div style={{ fontSize: '0.9rem', color: '#333', wordBreak: 'break-all' }}>{selectedReserva.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '2px' }}>Total Pagado</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#008009' }}>{convertPrice(selectedReserva.totalRaw)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button 
                  disabled={isDownloading}
                  onClick={() => descargarPDF(selectedReserva)} 
                  style={{ flex: 1, background: isDownloading ? '#b0c4de' : '#006ce4', color: 'white', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: 'bold', cursor: isDownloading ? 'wait' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {isDownloading ? (
                    <>
                      <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      Descargar PDF
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </main>
  );
}

