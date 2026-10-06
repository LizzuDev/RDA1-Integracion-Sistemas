import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarReservas as listarReservasVuelos } from '../services/vuelosApi';
import { getOrdersAuto } from '../services/autosApi';
import { getReservas as getReservasAtracciones } from '../services/atraccionesApi';
import { getReservasAlojamientos } from '../services/alojamientosApi';
import { descargarFactura } from '../utils/facturaPdf';
import { formatearFecha } from '../services/formato';
import { useCurrency } from '../hooks/CurrencyContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import {
  MoreVerticalIcon,
  CheckmarkIcon,
  CloseIcon,
  InfoIcon,
  PinIcon,
  BedIcon,
} from '../components/BookingIcons';
import './MisReservasPage.css';

const ESTADOS_ES = {
  PENDING: 'Pendiente',
  PENDING_PAYMENT: 'Pendiente de pago',
  TICKET_ISSUING: 'Emitiendo billetes',
  CONFIRMED: 'Confirmada',
  FAILED: 'Fallida',
  CHANGE_PENDING: 'Cambio en curso',
  CANCELLATION_PENDING: 'Cancelación en curso',
  CANCELLED: 'Cancelada',
  PENDING_OFFLINE: 'Pendiente (Offline)',
};

const DEFAULT_IMAGES = {
  alojamiento: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/833148758.jpg?k=4af6fee87e75cf2bdb688cfa67e30d77b3282140a0ed4ee22ac61e5be30b95dd&o=&hp=1',
  vuelo: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400',
  auto: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400',
  atraccion: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=400',
};

export function MisReservasPage() {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [avisoDescarga, setAvisoDescarga] = useState('');
  const { convertPrice } = useCurrency();
  const { user } = useAuth();

  // Report form state
  const [modalView, setModalView] = useState('detail'); // 'detail' | 'report'
  const [reportSubject, setReportSubject] = useState('');
  const [reportPriority, setReportPriority] = useState('Media');
  const [reportDescription, setReportDescription] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  // Filters
  const [filtroServicio, setFiltroServicio] = useState(''); // '' | 'alojamiento' | 'vuelo' | 'auto' | 'atraccion'
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const fetchId = useRef(0);

  const cargarTodasLasReservas = useCallback(async () => {
    const currentFetch = ++fetchId.current;
    setCargando(true);
    setError(null);

    try {
      // 1. Vuelos API
      let vuelosItems = [];
      try {
        const respuestaVuelos = await listarReservasVuelos({
          status: filtroStatus || undefined,
          limit: 20,
        });
        vuelosItems = (respuestaVuelos.items || []).map((r) => ({
          id: r.bookingId,
          pnr: r.pnr ?? '—',
          tipo: 'vuelo',
          servicioTexto: 'Vuelo',
          destino: r.destination || 'Quito',
          titulo: r.origin && r.destination ? `${r.origin} a ${r.destination}` : 'Itinerario de Vuelo',
          fechasTexto: r.createdAt ? formatearFecha(r.createdAt.split('T')[0]) : 'Fecha programada',
          fecha: r.createdAt ? formatearFecha(r.createdAt.split('T')[0]) : formatearFecha(new Date().toISOString().split('T')[0]),
          rawDate: r.createdAt ? new Date(r.createdAt).getTime() : new Date().getTime(),
          status: r.status || 'CONFIRMED',
          totalRaw: r.grandTotal?.total || 106.50,
          imagen: DEFAULT_IMAGES.vuelo,
          raw: r,
          link: `/vuelos/reservas/${r.bookingId}`,
        }));
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
          servicioTexto: 'Renta de auto',
          destino: 'Quito',
          titulo: (a.auto_id || a.autoId) ? `Renta de Vehículo (${a.dias_renta || a.diasRenta || 3} días)` : 'Renta de Auto Chevrolet Sail',
          fechasTexto: a.createdAt ? formatearFecha(String(a.createdAt).split('T')[0]) : '3 días de renta',
          fecha: a.createdAt ? formatearFecha(String(a.createdAt).split('T')[0]) : formatearFecha(new Date().toISOString().split('T')[0]),
          rawDate: a.createdAt ? new Date(a.createdAt).getTime() : new Date().getTime(),
          status: a.status || 'CONFIRMED',
          totalRaw: a.total_price?.total || a.totalPrice?.total || 106.50,
          imagen: DEFAULT_IMAGES.auto,
          link: '/autos',
        }));
      } catch (err) {
        // Fallback silenciado
      }

      const autosLocales = JSON.parse(localStorage.getItem('reservas_autos') || '[]');
      const autosLocalesFormatted = autosLocales.map((a) => ({
        id: a.id || a.orderId,
        pnr: (a.id || a.orderId || 'AUTO').substring(0, 6).toUpperCase(),
        tipo: 'auto',
        servicioTexto: 'Renta de auto',
        destino: 'Quito',
        titulo: a.titulo || 'Renta de Auto Chevrolet Sail (3 días)',
        fechasTexto: a.createdAt || a.date ? formatearFecha(String(a.createdAt || a.date).split('T')[0]) : '3 días de renta',
        fecha: a.createdAt || a.date ? formatearFecha(String(a.createdAt || a.date).split('T')[0]) : formatearFecha(new Date().toISOString().split('T')[0]),
        rawDate: a.createdAt || a.date ? new Date(a.createdAt || a.date).getTime() : new Date().getTime(),
        status: a.status || 'CONFIRMED',
        totalRaw: a.totalPrice?.total || a.total || 106.50,
        imagen: DEFAULT_IMAGES.auto,
        link: '/autos',
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
          servicioTexto: 'Atracción',
          destino: 'Quito',
          titulo: at.titulo || `Tour Quito Centro Histórico (${at.ticket_count || 1} entradas)`,
          fechasTexto: at.createdAt ? `${formatearFecha(String(at.createdAt).split('T')[0])} · 10:00 a.m.` : 'Tour guiado',
          fecha: at.createdAt ? formatearFecha(String(at.createdAt).split('T')[0]) : formatearFecha(new Date().toISOString().split('T')[0]),
          rawDate: at.createdAt ? new Date(at.createdAt).getTime() : new Date().getTime(),
          status: at.status || 'CONFIRMED',
          totalRaw: at.total_price?.total || at.total_price || 55.00,
          imagen: at.photoUrl || DEFAULT_IMAGES.atraccion,
          link: at.atraccionId ? `/atracciones/${at.atraccionId}` : '/',
        }));
      } catch (err) {
        // Fallback silenciado
      }

      const atraccionesLocales = JSON.parse(localStorage.getItem('reservas_atracciones') || '[]');
      const atraccionesLocalesFormatted = atraccionesLocales.map((at) => ({
        id: at.id || at.reservation_id,
        pnr: (at.id || at.reservation_id || 'ATRAC').substring(0, 6).toUpperCase(),
        tipo: 'atraccion',
        servicioTexto: 'Atracción',
        destino: 'Quito',
        titulo: at.titulo || `Tour Quito Centro Histórico (${at.ticket_count || 1} entradas)`,
        fechasTexto: at.createdAt ? `${formatearFecha(String(at.createdAt).split('T')[0])} · 10:00 a.m.` : 'Tour guiado',
        fecha: at.createdAt ? formatearFecha(String(at.createdAt).split('T')[0]) : formatearFecha(new Date().toISOString().split('T')[0]),
        rawDate: at.createdAt ? new Date(at.createdAt).getTime() : new Date().getTime(),
        status: at.status || 'CONFIRMED',
        totalRaw: at.totalPrice?.total || at.total || 55.00,
        imagen: at.photoUrl || DEFAULT_IMAGES.atraccion,
        link: '/',
      }));

      // 4. Alojamientos API & Local
      let alojamientosApiItems = [];
      try {
        const respuestaAlojamientos = await getReservasAlojamientos();
        const listaAlojamientos = Array.isArray(respuestaAlojamientos) ? respuestaAlojamientos : (respuestaAlojamientos?.data || []);
        alojamientosApiItems = listaAlojamientos.map((al) => {
          const checkinStr = al.checkin ? formatearFecha(al.checkin) : '10 nov.';
          const checkoutStr = al.checkout ? formatearFecha(al.checkout) : '16 nov.';
          return {
            id: al.reservation_id || al.id,
            pnr: al.codigo_reserva || (al.reservation_id || al.id || 'HOTEL').substring(0, 8).toUpperCase(),
            tipo: 'alojamiento',
            servicioTexto: 'Alojamiento',
            destino: al.destino || 'Quito',
            titulo: al.nombre_alojamiento
              ? `${al.nombre_alojamiento} (${al.huespedes || 1} persona${(al.huespedes || 1) > 1 ? 's' : ''})`
              : 'Alojamiento reservado',
            fechasTexto: `${checkinStr} – ${checkoutStr}`,
            fecha: checkinStr,
            rawDate: al.created_at ? new Date(al.created_at).getTime() : (al.checkin ? new Date(al.checkin).getTime() : new Date().getTime()),
            status: al.status || 'CONFIRMED',
            totalRaw: al.total_price?.total || al.total || 0,
            imagen: al.photo_url || DEFAULT_IMAGES.alojamiento,
            link: al.alojamiento_id ? `/alojamientos/${al.alojamiento_id}` : '/',
          };
        });
      } catch (err) {
        // Fallback silencioso
      }

      const alojamientosLocales = JSON.parse(localStorage.getItem('reservas_alojamientos') || '[]');
      const alojamientosLocalesFormatted = alojamientosLocales.map((al) => {
        const checkinStr = al.checkin ? formatearFecha(al.checkin) : '10 nov.';
        const checkoutStr = al.checkout ? formatearFecha(al.checkout) : '16 nov.';
        return {
          id: al.reservationId || al.id,
          pnr: al.codigoReserva || al.reservationId || (al.id || 'HOTEL').substring(0, 8).toUpperCase(),
          tipo: 'alojamiento',
          servicioTexto: 'Alojamiento',
          destino: al.destino || 'Quito',
          titulo: al.nombreAlojamiento
            ? `${al.nombreAlojamiento} (${al.huespedes || 1} persona${(al.huespedes || 1) > 1 ? 's' : ''})`
            : al.titulo || 'Alojamiento reservado',
          fechasTexto: `${checkinStr} – ${checkoutStr}`,
          fecha: checkinStr,
          rawDate: al.createdAt ? new Date(al.createdAt).getTime() : (al.checkin ? new Date(al.checkin).getTime() : new Date().getTime()),
          status: al.status || 'CONFIRMED',
          totalRaw: al.totalPrice || al.total || 0,
          imagen: al.photoUrl || DEFAULT_IMAGES.alojamiento,
          link: al.alojamientoId ? `/alojamientos/${al.alojamientoId}` : '/',
        };
      });

      if (currentFetch !== fetchId.current) return;

      // Combinar todas las listas eliminando duplicados por ID
      const mapaCombinado = new Map();
      [
        ...alojamientosApiItems,
        ...alojamientosLocalesFormatted,
        ...vuelosItems,
        ...autosItems,
        ...autosLocalesFormatted,
        ...atraccionesItems,
        ...atraccionesLocalesFormatted,
      ].forEach((item) => {
        if (!mapaCombinado.has(item.id)) {
          mapaCombinado.set(item.id, item);
        }
      });

      let listaFinal = Array.from(mapaCombinado.values());
      listaFinal.sort((a, b) => b.rawDate - a.rawDate);

      setReservas(listaFinal);
    } catch (fallo) {
      if (currentFetch !== fetchId.current) return;
      setError('No se pudieron cargar tus reservas.');
    } finally {
      if (currentFetch === fetchId.current) {
        setCargando(false);
      }
    }
  }, [filtroStatus]);

  useEffect(() => {
    cargarTodasLasReservas();
  }, [cargarTodasLasReservas]);

  // Close popup menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const descargarPDF = (reserva) => {
    setIsDownloading(true);
    setTimeout(() => {
      try {
        descargarFactura(reserva);
      } catch (err) {
        setAvisoDescarga('No se pudo generar el PDF de la factura.');
      } finally {
        setIsDownloading(false);
      }
    }, 800);
  };

  const abrirDetalle = (reserva) => {
    setAvisoDescarga('');
    setSelectedReserva(reserva);
    setActiveMenuId(null);
    setModalView('detail');
    setReportSubject('');
    setReportPriority('Media');
    setReportDescription('');
    setReportError('');
    setReportSuccess(false);
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    setReportError('');

    if (!reportSubject.trim() || reportSubject.trim().length < 5) {
      setReportError('El asunto debe tener al menos 5 caracteres.');
      return;
    }
    if (!reportDescription.trim() || reportDescription.trim().length < 15) {
      setReportError('La descripción debe tener al menos 15 caracteres.');
      return;
    }
    const hasSymbols = /[^a-zA-Z0-9\s,.\-ñÑáéíóúÁÉÍÓÚ?]/.test(reportSubject) || /[^a-zA-Z0-9\s,.\-ñÑáéíóúÁÉÍÓÚ?]/.test(reportDescription);
    if (hasSymbols) {
      setReportError('Solo se permiten letras, números y puntuación básica.');
      return;
    }

    setSendingReport(true);
    try {
      const ticket = {
        id: `TK-${Math.floor(Math.random() * 100000)}`,
        client_name: user?.user_metadata?.nombre
          ? `${user.user_metadata.nombre} ${user.user_metadata.apellido || ''}`
          : user?.email || 'Usuario',
        email: user?.email || 'desconocido@email.com',
        entity_name: selectedReserva.titulo,
        pnr_or_id: selectedReserva.pnr,
        type: selectedReserva.servicioTexto,
        subject: reportSubject,
        priority: reportPriority,
        description: reportDescription,
        status: 'PENDING',
      };
      const { error: sbError } = await supabase.from('support_tickets').insert([ticket]);
      if (sbError) throw sbError;
      setReportSuccess(true);
    } catch (err) {
      setReportError('Error al enviar el reporte. Por favor intenta de nuevo.');
    } finally {
      setSendingReport(false);
    }
  };

  useEffect(() => {
    document.title = 'Mis viajes · Booking.com';
    return () => {
      document.title = 'Booking Prototipo';
    };
  }, []);

  // Filtered reservations
  const reservasFiltradas = reservas.filter((item) => {
    if (filtroServicio && item.tipo !== filtroServicio) return false;
    if (filtroStatus && item.status.toUpperCase() !== filtroStatus.toUpperCase()) return false;
    if (busqueda.trim()) {
      const q = busqueda.trim().toUpperCase();
      const matchPnr = item.pnr?.toUpperCase().includes(q);
      const matchTitle = item.titulo?.toUpperCase().includes(q);
      const matchDest = item.destino?.toUpperCase().includes(q);
      if (!matchPnr && !matchTitle && !matchDest) return false;
    }
    return true;
  });

  // Group by destination
  const gruposPorDestino = reservasFiltradas.reduce((acc, res) => {
    const dest = res.destino || 'Quito';
    if (!acc[dest]) acc[dest] = [];
    acc[dest].push(res);
    return acc;
  }, {});

  if (!user) {
    return (
      <main className="trips-page-container">
        <div className="trips-empty-state">
          <h2 className="trips-empty-title">Inicia sesión para ver tus viajes</h2>
          <p className="trips-empty-desc">
            Podrás consultar tus reservas de alojamientos, vuelos, autos y atracciones con toda la información y comprobantes disponibles.
          </p>
          <Link to="/login" className="trips-btn-primary">
            Iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="trips-page-container">
      {/* Top Header */}
      <div className="trips-header">
        <h1 className="trips-title">Mis viajes</h1>
        <button
          type="button"
          className="trips-help-link"
          onClick={() => setShowHelpModal(true)}
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          ¿No encuentras una reserva?
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="trips-controls">
        <div className="trips-filter-pills" role="tablist" aria-label="Filtrar por tipo de servicio">
          <button
            type="button"
            className={`trips-filter-pill ${filtroServicio === '' ? 'active' : ''}`}
            onClick={() => setFiltroServicio('')}
          >
            Todos los viajes ({reservas.length})
          </button>
          <button
            type="button"
            className={`trips-filter-pill ${filtroServicio === 'alojamiento' ? 'active' : ''}`}
            onClick={() => setFiltroServicio('alojamiento')}
          >
            Alojamientos
          </button>
          <button
            type="button"
            className={`trips-filter-pill ${filtroServicio === 'vuelo' ? 'active' : ''}`}
            onClick={() => setFiltroServicio('vuelo')}
          >
            Vuelos
          </button>
          <button
            type="button"
            className={`trips-filter-pill ${filtroServicio === 'auto' ? 'active' : ''}`}
            onClick={() => setFiltroServicio('auto')}
          >
            Renta de autos
          </button>
          <button
            type="button"
            className={`trips-filter-pill ${filtroServicio === 'atraccion' ? 'active' : ''}`}
            onClick={() => setFiltroServicio('atraccion')}
          >
            Atracciones
          </button>
        </div>

        <div className="trips-search-bar">
          <div className="trips-search-input-wrapper">
            <span className="trips-search-icon">
              <PinIcon size={16} />
            </span>
            <input
              type="text"
              placeholder="Buscar por destino, nombre del hotel o código PNR..."
              className="trips-search-input"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {cargando && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#595959' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid #e0e0e0',
              borderTopColor: '#006ce4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px auto',
            }}
          />
          <p>Cargando tus viajes...</p>
        </div>
      )}

      {/* Error state */}
      {!cargando && error && (
        <div style={{ padding: '16px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Empty State */}
      {!cargando && !error && reservasFiltradas.length === 0 && (
        <div className="trips-empty-state">
          <h2 className="trips-empty-title">Todavía no tienes viajes registrados</h2>
          <p className="trips-empty-desc">
            Cuando completes una reserva de alojamiento, vuelo, tour o vehículo, se mostrará automáticamente aquí con su confirmación oficial.
          </p>
          <div className="trips-empty-actions">
            <Link to="/alojamientos" className="trips-btn-primary">
              Buscar alojamientos
            </Link>
            <Link to="/vuelos" className="trips-btn-secondary">
              Buscar vuelos
            </Link>
            <Link to="/atracciones" className="trips-btn-secondary">
              Atracciones
            </Link>
          </div>
        </div>
      )}

      {/* Grouped Trips List (Booking.com style) */}
      {!cargando && !error && reservasFiltradas.length > 0 && (
        <div className="trips-list-container">
          {Object.entries(gruposPorDestino).map(([destino, items]) => (
            <div key={destino} className="trips-group">
              <h2 className="trips-group-title">{destino}</h2>
              <div className="trips-cards-list">
                {items.map((r) => (
                  <div
                    key={r.id}
                    className="trip-card"
                    onClick={() => abrirDetalle(r)}
                  >
                    <div className="trip-card-left">
                      <div className="trip-card-thumb-wrapper">
                        <img
                          src={r.imagen}
                          alt={r.titulo}
                          className="trip-card-thumb"
                          loading="lazy"
                        />
                      </div>
                      <div className="trip-card-info">
                        <h3 className="trip-card-title">{r.titulo}</h3>
                        <p className="trip-card-subtitle">
                          <span>{r.fechasTexto}</span>
                          <span>·</span>
                          <span>{r.destino}</span>
                          <span style={{ color: '#006ce4', fontWeight: 600 }}>({r.pnr})</span>
                        </p>
                        <span className={`trip-card-status ${(r.status || '').toLowerCase()}`}>
                          {ESTADOS_ES[r.status] ?? r.status}
                        </span>
                      </div>
                    </div>

                    <div className="trip-card-right">
                      <div className="trip-card-price">
                        {convertPrice(r.totalRaw)}
                      </div>
                      <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()} tabIndex={-1}>
                        <button
                          type="button"
                          className="trip-card-menu-btn"
                          aria-label="Opciones de reserva"
                          onClick={() => setActiveMenuId(activeMenuId === r.id ? null : r.id)}
                        >
                          <MoreVerticalIcon size={20} color="#1a1a1a" />
                        </button>

                        {activeMenuId === r.id && (
                          <div className="trip-dropdown-menu">
                            <button
                              type="button"
                              className="trip-dropdown-item"
                              onClick={() => abrirDetalle(r)}
                            >
                              Ver confirmación
                            </button>
                            <button
                              type="button"
                              className="trip-dropdown-item"
                              onClick={() => descargarPDF(r)}
                            >
                              Descargar factura (PDF)
                            </button>
                            {r.link && (
                              <Link
                                to={r.link}
                                className="trip-dropdown-item"
                                style={{ textDecoration: 'none' }}
                              >
                                Ver propiedad / servicio
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedReserva && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelectedReserva(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              width: '540px',
              maxWidth: '100%',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: '#003580',
                padding: '18px 24px',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Confirmación de reserva · {selectedReserva.pnr}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedReserva(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <CloseIcon size={20} color="#ffffff" />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* ── DETAIL VIEW ── */}
              {modalView === 'detail' && (
                <>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: '#006ce4', letterSpacing: '0.5px' }}>
                      {selectedReserva.servicioTexto}
                    </span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '4px 0 6px 0', color: '#1a1a1a' }}>
                      {selectedReserva.titulo}
                    </h3>
                    <span className={`trip-card-status ${(selectedReserva.status || '').toLowerCase()}`}>
                      {ESTADOS_ES[selectedReserva.status] ?? selectedReserva.status}
                    </span>
                  </div>

                  <div style={{ background: '#f5f5f5', borderRadius: '6px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#595959', marginBottom: '2px' }}>Código PNR</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a1a1a' }}>{selectedReserva.pnr}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#595959', marginBottom: '2px' }}>Fecha / Estancia</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1a1a' }}>{selectedReserva.fechasTexto}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#595959', marginBottom: '2px' }}>Destino</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1a1a' }}>{selectedReserva.destino}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#595959', marginBottom: '2px' }}>Total Pagado</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#008009' }}>{convertPrice(selectedReserva.totalRaw)}</div>
                    </div>
                  </div>

                  {avisoDescarga && (
                    <div style={{ padding: '10px 14px', borderRadius: '4px', fontSize: '0.85rem', background: '#fdecea', color: '#b71c1c', border: '1px solid #ef9a9a' }}>
                      {avisoDescarga}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <button type="button" disabled={isDownloading} onClick={() => descargarPDF(selectedReserva)} className="trips-btn-primary" style={{ flex: 1, textAlign: 'center' }}>
                      {isDownloading ? 'Generando PDF...' : 'Descargar factura (PDF)'}
                    </button>
                    <button type="button" onClick={() => setSelectedReserva(null)} className="trips-btn-secondary" style={{ flex: 1, textAlign: 'center' }}>
                      Cerrar
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setModalView('report'); setReportError(''); setReportSuccess(false); }}
                    style={{ width: '100%', marginTop: '4px', padding: '10px', background: '#fff5f5', color: '#d32f2f', border: '1px solid #ffcdd2', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    ⚠️ Reportar un problema con esta reserva
                  </button>
                </>
              )}

              {/* ── REPORT VIEW ── */}
              {modalView === 'report' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <button type="button" onClick={() => setModalView('detail')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#006ce4', fontWeight: 600, fontSize: '0.9rem', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ← Volver
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1a1a1a' }}>Reportar problema</h3>
                  </div>

                  <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '6px', padding: '10px 14px', fontSize: '0.83rem', color: '#795548' }}>
                    Estás reportando: <strong>{selectedReserva.titulo}</strong> &middot; PNR: <strong>{selectedReserva.pnr}</strong>
                  </div>

                  {reportSuccess ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>✅</div>
                      <h4 style={{ margin: '0 0 8px', color: '#2e7d32', fontSize: '1.1rem' }}>Reporte enviado con éxito</h4>
                      <p style={{ fontSize: '0.88rem', color: '#595959', margin: '0 0 20px' }}>Nuestro equipo de soporte revisará tu reporte a la brevedad.</p>
                      <button type="button" onClick={() => setSelectedReserva(null)} className="trips-btn-primary" style={{ width: '100%' }}>Cerrar</button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendReport} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {reportError && (
                        <div style={{ background: '#ffebee', color: '#d32f2f', padding: '10px 12px', borderRadius: '5px', fontSize: '0.85rem', fontWeight: 600 }}>{reportError}</div>
                      )}

                      <div>
                        <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 700, marginBottom: '5px', color: '#1a1a1a' }}>Asunto *</label>
                        <input
                          type="text"
                          value={reportSubject}
                          onChange={e => { setReportSubject(e.target.value); setReportError(''); }}
                          placeholder="Ej: Cobro incorrecto, cancelación sin aviso..."
                          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: '5px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 700, marginBottom: '5px', color: '#1a1a1a' }}>Prioridad</label>
                        <select
                          value={reportPriority}
                          onChange={e => setReportPriority(e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: '5px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
                        >
                          <option value="Baja">Baja</option>
                          <option value="Media">Media</option>
                          <option value="Alta">Alta</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 700, marginBottom: '5px', color: '#1a1a1a' }}>Descripción del problema *</label>
                        <textarea
                          value={reportDescription}
                          onChange={e => { setReportDescription(e.target.value); setReportError(''); }}
                          rows={4}
                          placeholder="Describe el inconveniente con detalle para que podamos ayudarte..."
                          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: '5px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={() => setModalView('detail')} className="trips-btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                        <button type="submit" disabled={sendingReport} style={{ flex: 2, padding: '10px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '6px', cursor: sendingReport ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.95rem', opacity: sendingReport ? 0.7 : 1 }}>
                          {sendingReport ? 'Enviando...' : 'Enviar reporte'}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* HELP MODAL "¿No encuentras una reserva?" */}
      {showHelpModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowHelpModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              width: '480px',
              maxWidth: '100%',
              padding: '24px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>¿No encuentras tu reserva?</h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <CloseIcon size={20} color="#1a1a1a" />
              </button>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#595959', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Si realizaste una reserva recientemente o en otro navegador, puedes buscarla directamente introduciendo su código de confirmación (PNR) en el buscador superior.
            </p>
            <div style={{ background: '#f0f7ff', border: '1px solid #cce4ff', borderRadius: '6px', padding: '12px 14px', marginBottom: '20px', fontSize: '0.85rem', color: '#003580' }}>
              Todas las confirmaciones y facturas electrónicas también son enviadas de forma automática a tu correo electrónico al instante de reservar.
            </div>
            <button
              type="button"
              className="trips-btn-primary"
              onClick={() => setShowHelpModal(false)}
              style={{ width: '100%' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
