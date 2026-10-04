import { useState, useEffect } from 'react';
import { getAtracciones, crearAtraccion, eliminarAtraccion, getReservas } from '../services/atraccionesApi';
import { searchAutos, createAutoLocal, deleteAutoLocal, getOrdersAuto } from '../services/autosApi';
import { getAlojamientos, crearAlojamiento, eliminarAlojamiento, getReservasAlojamientos } from '../services/alojamientosApi';

export function AdminDashboard() {
  const [moduleSelected, setModuleSelected] = useState('observabilidad'); // 'atracciones' | 'autos' | 'alojamientos' | 'observabilidad'
  const [tab, setTab] = useState('catalogo'); // 'catalogo' | 'reservas'
  const [loading, setLoading] = useState(true);

  // Observabilidad State
  const [usuariosDb, setUsuariosDb] = useState([]);
  const [facturasDb, setFacturasDb] = useState([]);

  // Atracciones State
  const [atracciones, setAtracciones] = useState([]);
  const [reservasAtracciones, setReservasAtracciones] = useState([]);
  const [formAtraccion, setFormAtraccion] = useState({ name: '', long_description: '', price: 0, duration: 'PT2H' });

  // Autos State
  const [autos, setAutos] = useState([]);
  const [reservasAutos, setReservasAutos] = useState([]);
  const [formAuto, setFormAuto] = useState({ supplier_name: '', price: 0, category: 'SUV' });

  // Alojamientos State
  const [alojamientos, setAlojamientos] = useState([]);
  const [reservasAlojamientos, setReservasAlojamientos] = useState([]);
  const [formAlojamiento, setFormAlojamiento] = useState({
    nombre: '',
    descripcion: '',
    destino: 'Quito',
    tipoPropiedad: 'Hotel / Resort',
    precioPorNoche: 120,
    habitaciones: 1,
    capacidadAdultos: 2,
    tienePiscina: false,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (moduleSelected === 'observabilidad') {
        // Obtenemos facturas usando el endpoint de facturas ya hecho en supabase, o simulado
        const res = await fetch('http://localhost:3000/vuelos/bookings'); // Solo como ejemplo para el panel
        // Realmente para observabilidad podriamos llamar a Supabase directo si tuvieramos la SDK aqui
        // Por simplicidad en la demo frontend:
        setUsuariosDb([
          { id: '247b01bf-64eb-4d46-b8cf-f3f55ec36147', email: 'admin@booking.com', role: 'admin', created_at: new Date().toISOString() },
          { id: 'e4c928aa-7831-469c-8b8b-2c1a62de17cb', email: 'prueba@booking.com', role: 'user', created_at: new Date().toISOString() }
        ]);
        setFacturasDb([]); // Se podrian cargar facturas globales si hay endpoint
      } else if (moduleSelected === 'atracciones') {
        const [resAttr, resResv] = await Promise.all([
          getAtracciones({ limit: 50 }),
          getReservas()
        ]);
        setAtracciones(resAttr.data || resAttr);
        setReservasAtracciones(resResv);
      } else if (moduleSelected === 'alojamientos') {
        const [resAlojamientos, resReservas] = await Promise.all([
          getAlojamientos({ limit: 50 }),
          getReservasAlojamientos(),
        ]);
        const listaAloj = Array.isArray(resAlojamientos) ? resAlojamientos : (resAlojamientos.data || []);
        const listaResv = Array.isArray(resReservas) ? resReservas : (resReservas.data || []);
        setAlojamientos(listaAloj);
        setReservasAlojamientos(listaResv);
      } else {
        const [resAutos, resOrders] = await Promise.all([
          searchAutos({ booker: { country: 'EC' }, currency: 'USD', driver: { age: 30 }, route: { dropoff: {}, pickup: {} } }),
          getOrdersAuto()
        ]);
        setAutos(resAutos.data || []);
        setReservasAutos(resOrders || []);
      }
    } catch (error) {
      console.error('Error fetching admin data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [moduleSelected]);

  // --- Alojamientos Logic ---
  const handleCreateAlojamiento = async (e) => {
    e.preventDefault();
    try {
      await crearAlojamiento({
        id: `prop-${Date.now().toString().slice(-6)}`,
        nombre: formAlojamiento.nombre,
        descripcion: formAlojamiento.descripcion,
        destino: formAlojamiento.destino,
        tipoPropiedad: formAlojamiento.tipoPropiedad,
        precioPorNoche: parseFloat(formAlojamiento.precioPorNoche),
        habitaciones: parseInt(formAlojamiento.habitaciones, 10),
        capacidadAdultos: parseInt(formAlojamiento.capacidadAdultos, 10),
        tienePiscina: Boolean(formAlojamiento.tienePiscina),
      });
      setFormAlojamiento({
        nombre: '',
        descripcion: '',
        destino: 'Quito',
        tipoPropiedad: 'Hotel / Resort',
        precioPorNoche: 120,
        habitaciones: 1,
        capacidadAdultos: 2,
        tienePiscina: false,
      });
      fetchData();
      alert('Alojamiento registrado exitosamente');
    } catch (error) {
      alert('Error al registrar alojamiento');
    }
  };

  const handleDeleteAlojamiento = async (id) => {
    if (!confirm('¿Deseas eliminar este alojamiento del sistema?')) return;
    try {
      await eliminarAlojamiento(id);
      fetchData();
    } catch (error) {
      alert('Error al eliminar el alojamiento');
    }
  };

  // --- Atracciones Logic ---
  const handleCreateAtraccion = async (e) => {
    e.preventDefault();
    try {
      await crearAtraccion({
        name: formAtraccion.name,
        long_description: formAtraccion.long_description,
        duration: formAtraccion.duration,
        price: { currency: 'USD', total: parseFloat(formAtraccion.price) },
        categories: ['general']
      });
      setFormAtraccion({ name: '', long_description: '', price: 0, duration: 'PT2H' });
      fetchData();
      alert('Atracción creada localmente');
    } catch (error) {
      alert('Error creando atracción');
    }
  };

  const handleDeleteAtraccion = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar esta atracción local?')) return;
    try {
      await eliminarAtraccion(id);
      fetchData();
    } catch (error) {
      alert('No se puede eliminar. Probablemente sea externa.');
    }
  };

  // --- Autos Logic ---
  const handleCreateAuto = async (e) => {
    e.preventDefault();
    try {
      await createAutoLocal({
        supplier_name: formAuto.supplier_name,
        price: parseFloat(formAuto.price),
        vehicle_info: { category: formAuto.category, transmission: 'AUTOMATIC' }
      });
      setFormAuto({ supplier_name: '', price: 0, category: 'SUV' });
      fetchData();
      alert('Auto creado localmente');
    } catch (error) {
      alert('Error creando auto');
    }
  };

  const handleDeleteAuto = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este auto local?')) return;
    try {
      await deleteAutoLocal(id);
      fetchData();
    } catch (error) {
      alert('No se puede eliminar. Probablemente sea externo.');
    }
  };

  if (loading && atracciones.length === 0 && autos.length === 0) {
    return <div className="state-container"><div className="spinner" /></div>;
  }

  return (
    <main className="main-content">
      {/* Top Level Module Switcher */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '2px solid #eee', paddingBottom: 16 }}>
        <button 
          onClick={() => { setModuleSelected('observabilidad'); setTab('catalogo'); }} 
          style={{ fontSize: '1.2rem', padding: '8px 16px', border: 'none', background: moduleSelected === 'observabilidad' ? '#003580' : '#eee', color: moduleSelected === 'observabilidad' ? 'white' : 'black', borderRadius: 8, cursor: 'pointer' }}
        >
          Módulo Observabilidad
        </button>
        <button 
          onClick={() => { setModuleSelected('atracciones'); setTab('catalogo'); }} 
          style={{ fontSize: '1.2rem', padding: '8px 16px', border: 'none', background: moduleSelected === 'atracciones' ? '#003580' : '#eee', color: moduleSelected === 'atracciones' ? 'white' : 'black', borderRadius: 8, cursor: 'pointer' }}
        >
          Módulo Atracciones
        </button>
        <button 
          onClick={() => { setModuleSelected('autos'); setTab('catalogo'); }} 
          style={{ fontSize: '1.2rem', padding: '8px 16px', border: 'none', background: moduleSelected === 'autos' ? '#003580' : '#eee', color: moduleSelected === 'autos' ? 'white' : 'black', borderRadius: 8, cursor: 'pointer' }}
        >
          Módulo Autos
        </button>
        <button 
          onClick={() => { setModuleSelected('alojamientos'); setTab('catalogo'); }} 
          style={{ fontSize: '1.2rem', padding: '8px 16px', border: 'none', background: moduleSelected === 'alojamientos' ? '#003580' : '#eee', color: moduleSelected === 'alojamientos' ? 'white' : 'black', borderRadius: 8, cursor: 'pointer' }}
        >
          Módulo Alojamientos
        </button>
      </div>

      {/* Second Level Tab Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem' }}>
          Administración - {moduleSelected === 'atracciones' ? 'Atracciones' : moduleSelected === 'autos' ? 'Autos' : moduleSelected === 'alojamientos' ? 'Alojamientos' : 'Observabilidad'}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('catalogo')} className={tab === 'catalogo' ? 'card-btn' : 'retry-btn'}>Catálogo Híbrido</button>
          <button onClick={() => setTab('reservas')} className={tab === 'reservas' ? 'card-btn' : 'retry-btn'}>Historial de Reservas</button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}

      {/* OBSERVABILIDAD */}
      {moduleSelected === 'observabilidad' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: 'var(--card-shadow)' }}>
            <h2>Panel de Observabilidad - Usuarios de la Plataforma</h2>
            <p>Monitoreo de accesos y roles de administración.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <div style={{ display: 'flex', borderBottom: '2px solid #eee', paddingBottom: '8px', fontWeight: 'bold' }}>
                <div style={{ flex: 1 }}>ID</div>
                <div style={{ flex: 2 }}>Email</div>
                <div style={{ flex: 1 }}>Rol</div>
                <div style={{ flex: 1 }}>Registro</div>
                <div style={{ flex: 1 }}>Acciones</div>
              </div>
              {usuariosDb.map(u => (
                <div key={u.id} style={{ display: 'flex', borderBottom: '1px solid #eee', paddingBottom: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1, fontSize: '0.8rem', color: '#666' }}>{u.id.substring(0,8)}...</div>
                  <div style={{ flex: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                  <div style={{ flex: 1 }}><span style={{ padding: '4px 8px', borderRadius: 4, background: u.role === 'admin' ? '#e6f4ea' : '#eee', color: u.role === 'admin' ? '#137333' : '#333' }}>{u.role}</span></div>
                  <div style={{ flex: 1 }}>{new Date(u.created_at).toLocaleDateString()}</div>
                  <div style={{ flex: 1 }}><button style={{ color: '#0066cc', cursor: 'pointer', background: 'none', border: 'none' }}>Editar Rol</button></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CATALOGO */}
      {tab === 'catalogo' && moduleSelected === 'atracciones' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: 'var(--card-shadow)' }}>
            <h2>Lista de Atracciones</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <div style={{ display: 'flex', borderBottom: '2px solid #eee', paddingBottom: '8px', fontWeight: 'bold' }}>
                <div style={{ flex: 1 }}>ID</div>
                <div style={{ flex: 2 }}>Nombre</div>
                <div style={{ flex: 1 }}>Precio</div>
                <div style={{ flex: 1 }}>Acciones</div>
              </div>
              {atracciones.map(a => (
                <div key={a.id} style={{ display: 'flex', borderBottom: '1px solid #eee', paddingBottom: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1, fontSize: '0.8rem', color: '#666' }}>{String(a.id).substring(0, 8)}...</div>
                  <div style={{ flex: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre || a.name || a.title}</div>
                  <div style={{ flex: 1 }}>${parseFloat(a.precio_unitario || a.price?.total || 0).toFixed(2)}</div>
                  <div style={{ flex: 1 }}><button onClick={() => handleDeleteAtraccion(a.id)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none' }}>🗑️ Eliminar</button></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: 'var(--card-shadow)', height: 'fit-content' }}>
            <h2>Crear Atracción</h2>
            <form onSubmit={handleCreateAtraccion} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <input required name="name" value={formAtraccion.name} onChange={(e) => setFormAtraccion({...formAtraccion, name: e.target.value})} placeholder="Nombre" style={{ padding: 8, border: '1px solid #ccc' }} />
              <textarea required name="long_description" value={formAtraccion.long_description} onChange={(e) => setFormAtraccion({...formAtraccion, long_description: e.target.value})} placeholder="Descripción" rows={3} style={{ padding: 8, border: '1px solid #ccc' }} />
              <input required type="number" name="price" value={formAtraccion.price} onChange={(e) => setFormAtraccion({...formAtraccion, price: e.target.value})} placeholder="Precio" style={{ padding: 8, border: '1px solid #ccc' }} />
              <button type="submit" className="card-btn">Guardar</button>
            </form>
          </div>
        </div>
      )}

      {tab === 'catalogo' && moduleSelected === 'autos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: 'var(--card-shadow)' }}>
            <h2>Lista de Autos</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <div style={{ display: 'flex', borderBottom: '2px solid #eee', paddingBottom: '8px', fontWeight: 'bold' }}>
                <div style={{ flex: 1 }}>ID</div>
                <div style={{ flex: 1 }}>Agencia</div>
                <div style={{ flex: 1 }}>Categoría</div>
                <div style={{ flex: 1 }}>Precio/Día</div>
                <div style={{ flex: 1 }}>Acciones</div>
              </div>
              {autos.map(a => (
                <div key={a.vehicle_id} style={{ display: 'flex', borderBottom: '1px solid #eee', paddingBottom: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1, fontSize: '0.8rem', color: '#666' }}>{String(a.vehicle_id).substring(0, 8)}...</div>
                  <div style={{ flex: 1 }}>{a.supplier_id === 1 ? 'GDS Local' : 'Hertz Mock'}</div>
                  <div style={{ flex: 1 }}>{a.vehicle_info?.category}</div>
                  <div style={{ flex: 1 }}>${parseFloat(a.price || 0).toFixed(2)}</div>
                  <div style={{ flex: 1 }}><button onClick={() => handleDeleteAuto(a.vehicle_id)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none' }}>🗑️ Eliminar</button></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: 'var(--card-shadow)', height: 'fit-content' }}>
            <h2>Crear Auto</h2>
            <form onSubmit={handleCreateAuto} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <input required value={formAuto.supplier_name} onChange={(e) => setFormAuto({...formAuto, supplier_name: e.target.value})} placeholder="Nombre Agencia Local" style={{ padding: 8, border: '1px solid #ccc' }} />
              <input required value={formAuto.category} onChange={(e) => setFormAuto({...formAuto, category: e.target.value})} placeholder="Categoría (ej. SUV, Sedan)" style={{ padding: 8, border: '1px solid #ccc' }} />
              <input required type="number" value={formAuto.price} onChange={(e) => setFormAuto({...formAuto, price: e.target.value})} placeholder="Precio por día" style={{ padding: 8, border: '1px solid #ccc' }} />
              <button type="submit" className="card-btn">Guardar</button>
            </form>
          </div>
        </div>
      )}

      {tab === 'catalogo' && moduleSelected === 'alojamientos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: 'var(--card-shadow)' }}>
            <h2>Lista de Alojamientos Registrados</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <div style={{ display: 'flex', borderBottom: '2px solid #eee', paddingBottom: '8px', fontWeight: 'bold' }}>
                <div style={{ flex: 1 }}>ID</div>
                <div style={{ flex: 2 }}>Propiedad</div>
                <div style={{ flex: 1 }}>Destino</div>
                <div style={{ flex: 1 }}>Precio/Noche</div>
                <div style={{ flex: 1 }}>Acciones</div>
              </div>
              {alojamientos.map(a => (
                <div key={a.id} style={{ display: 'flex', borderBottom: '1px solid #eee', paddingBottom: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1, fontSize: '0.8rem', color: '#666' }}>{String(a.id).substring(0, 8)}...</div>
                  <div style={{ flex: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre}</div>
                  <div style={{ flex: 1 }}>{a.destino}</div>
                  <div style={{ flex: 1 }}>${parseFloat(a.precioPorNoche || a.price?.total || 0).toFixed(2)} USD</div>
                  <div style={{ flex: 1 }}>
                    <button onClick={() => handleDeleteAlojamiento(a.id)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none' }}>
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: 'var(--card-shadow)', height: 'fit-content' }}>
            <h2>Registrar Alojamiento</h2>
            <form onSubmit={handleCreateAlojamiento} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <input required value={formAlojamiento.nombre} onChange={(e) => setFormAlojamiento({...formAlojamiento, nombre: e.target.value})} placeholder="Nombre de la propiedad" style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
              <textarea required value={formAlojamiento.descripcion} onChange={(e) => setFormAlojamiento({...formAlojamiento, descripcion: e.target.value})} placeholder="Descripción general" rows={3} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
              <input required value={formAlojamiento.destino} onChange={(e) => setFormAlojamiento({...formAlojamiento, destino: e.target.value})} placeholder="Destino / Ciudad (ej. Quito)" style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
              <select value={formAlojamiento.tipoPropiedad} onChange={(e) => setFormAlojamiento({...formAlojamiento, tipoPropiedad: e.target.value})} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}>
                <option value="Hotel / Resort">Hotel / Resort</option>
                <option value="Departamento">Departamento</option>
                <option value="Villa">Villa</option>
              </select>
              <input required type="number" value={formAlojamiento.precioPorNoche} onChange={(e) => setFormAlojamiento({...formAlojamiento, precioPorNoche: e.target.value})} placeholder="Precio por noche (USD)" style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                <input type="checkbox" checked={formAlojamiento.tienePiscina} onChange={(e) => setFormAlojamiento({...formAlojamiento, tienePiscina: e.target.checked})} />
                Cuenta con piscina
              </label>
              <button type="submit" className="card-btn">Guardar Alojamiento</button>
            </form>
          </div>
        </div>
      )}

      {/* RESERVAS */}
      {tab === 'reservas' && moduleSelected === 'atracciones' && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: 'var(--card-shadow)' }}>
          <h2>Reservas de Atracciones</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            <div style={{ display: 'flex', borderBottom: '2px solid #eee', paddingBottom: '8px', fontWeight: 'bold' }}>
              <div style={{ flex: 2 }}>ID Reserva</div>
              <div style={{ flex: 1 }}>Tickets</div>
              <div style={{ flex: 1 }}>Total</div>
              <div style={{ flex: 1 }}>Estado</div>
            </div>
            {reservasAtracciones.map(r => (
              <div key={r.reservation_id} style={{ display: 'flex', borderBottom: '1px solid #eee', paddingBottom: '8px', alignItems: 'center' }}>
                <div style={{ flex: 2, fontSize: '0.8rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reservation_id}</div>
                <div style={{ flex: 1 }}>{r.ticket_count}</div>
                <div style={{ flex: 1 }}>${parseFloat(r.total_price?.total || 0).toFixed(2)}</div>
                <div style={{ flex: 1 }}><span style={{ padding: '4px 8px', borderRadius: 4, fontSize: '0.85rem', background: r.status === 'CONFIRMED' ? '#e6f4ea' : '#fce8e6', color: r.status === 'CONFIRMED' ? '#137333' : '#c5221f' }}>{r.status}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'reservas' && moduleSelected === 'autos' && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: 'var(--card-shadow)' }}>
          <h2>Órdenes de Autos</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            <div style={{ display: 'flex', borderBottom: '2px solid #eee', paddingBottom: '8px', fontWeight: 'bold' }}>
              <div style={{ flex: 2 }}>ID Orden</div>
              <div style={{ flex: 1 }}>Días Renta</div>
              <div style={{ flex: 1 }}>Total</div>
              <div style={{ flex: 1 }}>Estado</div>
            </div>
            {reservasAutos.map(r => (
              <div key={r.order_id} style={{ display: 'flex', borderBottom: '1px solid #eee', paddingBottom: '8px', alignItems: 'center' }}>
                <div style={{ flex: 2, fontSize: '0.8rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.order_id}</div>
                <div style={{ flex: 1 }}>{r.dias_renta}</div>
                <div style={{ flex: 1 }}>${parseFloat(r.total_price?.total || 0).toFixed(2)}</div>
                <div style={{ flex: 1 }}><span style={{ padding: '4px 8px', borderRadius: 4, fontSize: '0.85rem', background: r.status === 'CONFIRMED' ? '#e6f4ea' : '#fce8e6', color: r.status === 'CONFIRMED' ? '#137333' : '#c5221f' }}>{r.status}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'reservas' && moduleSelected === 'alojamientos' && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: 'var(--card-shadow)' }}>
          <h2>Historial de Reservas de Alojamientos</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            <div style={{ display: 'flex', borderBottom: '2px solid #eee', paddingBottom: '8px', fontWeight: 'bold' }}>
              <div style={{ flex: 2 }}>Código / ID Reserva</div>
              <div style={{ flex: 2 }}>Huésped</div>
              <div style={{ flex: 1 }}>Estadía</div>
              <div style={{ flex: 1 }}>Total</div>
              <div style={{ flex: 1 }}>Estado</div>
            </div>
            {reservasAlojamientos.map(r => (
              <div key={r.reservation_id || r.id} style={{ display: 'flex', borderBottom: '1px solid #eee', paddingBottom: '8px', alignItems: 'center' }}>
                <div style={{ flex: 2, fontSize: '0.8rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.codigo_reserva || r.reservation_id || r.id}</div>
                <div style={{ flex: 2 }}>{r.customer_name || r.huesped || 'Huésped'}</div>
                <div style={{ flex: 1, fontSize: '0.85rem' }}>{r.checkin ? `${r.checkin}` : '—'}</div>
                <div style={{ flex: 1 }}>${parseFloat(r.total_price?.total || r.total || 0).toFixed(2)}</div>
                <div style={{ flex: 1 }}><span style={{ padding: '4px 8px', borderRadius: 4, fontSize: '0.85rem', background: r.status === 'CONFIRMED' ? '#e6f4ea' : '#fce8e6', color: r.status === 'CONFIRMED' ? '#137333' : '#c5221f' }}>{r.status}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
