import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAutos } from '../services/autosApi';
import { AutoCard } from '../components/AutoCard';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export function AutosPage() {
  const navigate = useNavigate();
  const [autos, setAutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search form state
  const [pickupLocation, setPickupLocation] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [sameDropoff, setSameDropoff] = useState(false);
  const [driverAge, setDriverAge] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mockRequest = {
        booker: { country: 'EC' },
        currency: 'USD',
        driver: { age: 30 },
        route: { dropoff: {}, pickup: {} }
      };
      const result = await searchAutos(mockRequest);
      setAutos(result.data || []);
    } catch (err) {
      setError('No se pudo conectar con el servicio de Autos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (pickupLocation) {
      fetchData();
    }
  };

  const marcasPopulares = [
    { nombre: 'Europcar', img: 'https://logo.clearbit.com/europcar.com' },
    { nombre: 'Alamo', img: 'https://logo.clearbit.com/alamo.com' },
    { nombre: 'Localiza', img: 'https://logo.clearbit.com/localiza.com' },
    { nombre: 'Keddy By Europcar', img: 'https://logo.clearbit.com/europcar.com' },
    { nombre: 'Goldcar', img: 'https://logo.clearbit.com/goldcar.es' },
    { nombre: 'Sixt', img: 'https://logo.clearbit.com/sixt.com' },
    { nombre: 'Avis', img: 'https://logo.clearbit.com/avis.com' },
    { nombre: 'Budget', img: 'https://logo.clearbit.com/budget.com' }
  ];

  return (
    <>
      {/* HEADER HERO ESTILO BOOKING */}
      <section className="hero" style={{ background: '#003b95', padding: '60px 0 20px', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
        <div style={{ maxWidth: '1100px', width: '100%', padding: '0 20px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '10px', textAlign: 'left', lineHeight: '1.2' }}>Renta de autos para cualquier tipo de viaje</h1>
          <p style={{ fontSize: '1.4rem', marginBottom: '30px', textAlign: 'left' }}>Excelentes autos a los mejores precios, con las mejores compañías de renta de autos</p>
          
          {/* SEARCH BOX */}
          <div className="search-box-container" style={{ position: 'relative', marginTop: '20px' }}>
            <div style={{ background: '#febb02', padding: '4px', borderRadius: '4px', display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto' }}>
              
              {/* Pickup Location */}
              <div style={{ flex: '1.5', minWidth: '300px', background: 'white', display: 'flex', alignItems: 'center', padding: '4px 12px', borderRadius: '2px', height: '52px' }}>
                <span style={{ fontSize: '1.2rem', color: '#666', marginRight: '10px' }}>🔍</span>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', color: '#333', fontWeight: 'bold' }}>Lugar de recogida</span>
                  <input
                    type="text"
                    placeholder="Aeropuerto, ciudad o estación"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    style={{ border: 'none', padding: '0', width: '100%', outline: 'none', fontSize: '0.9rem', color: '#333' }}
                  />
                </div>
              </div>
              
              {/* Pickup Date */}
              <div style={{ flex: '1', minWidth: '150px', background: 'white', display: 'flex', alignItems: 'center', padding: '4px 12px', borderRadius: '2px', height: '52px' }}>
                <span style={{ fontSize: '1.2rem', color: '#666', marginRight: '10px' }}>📅</span>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', color: '#333', fontWeight: 'bold' }}>Fecha de recogida</span>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setDateRange([date, endDate])}
                    placeholderText="sáb 3 de oct"
                    dateFormat="EEE d 'de' MMM"
                    className="custom-date-picker-input"
                    style={{ border: 'none', padding: '0', width: '100%', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* Pickup Time */}
              <div style={{ flex: '0.8', minWidth: '120px', background: 'white', display: 'flex', alignItems: 'center', padding: '4px 12px', borderRadius: '2px', height: '52px' }}>
                <span style={{ fontSize: '1.2rem', color: '#666', marginRight: '10px' }}>🕒</span>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', color: '#333', fontWeight: 'bold' }}>Hora</span>
                  <select style={{ border: 'none', outline: 'none', background: 'transparent', padding: '0', fontSize: '0.9rem', color: '#333', width: '100%' }}>
                    <option>10:00 a.m.</option>
                  </select>
                </div>
              </div>
              
              {/* Dropoff Date */}
              <div style={{ flex: '1', minWidth: '150px', background: 'white', display: 'flex', alignItems: 'center', padding: '4px 12px', borderRadius: '2px', height: '52px' }}>
                <span style={{ fontSize: '1.2rem', color: '#666', marginRight: '10px' }}>📅</span>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', color: '#333', fontWeight: 'bold' }}>Fecha de devolución</span>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setDateRange([startDate, date])}
                    placeholderText="mar 6 de oct"
                    dateFormat="EEE d 'de' MMM"
                    className="custom-date-picker-input"
                    style={{ border: 'none', padding: '0', width: '100%', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* Dropoff Time */}
              <div style={{ flex: '0.8', minWidth: '120px', background: 'white', display: 'flex', alignItems: 'center', padding: '4px 12px', borderRadius: '2px', height: '52px' }}>
                <span style={{ fontSize: '1.2rem', color: '#666', marginRight: '10px' }}>🕒</span>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', color: '#333', fontWeight: 'bold' }}>Hora</span>
                  <select style={{ border: 'none', outline: 'none', background: 'transparent', padding: '0', fontSize: '0.9rem', color: '#333', width: '100%' }}>
                    <option>10:00 a.m.</option>
                  </select>
                </div>
              </div>
              
              <button 
                onClick={handleSearch}
                style={{ flex: '0.8', minWidth: '120px', background: '#006ce4', color: 'white', border: 'none', height: '52px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '2px', cursor: 'pointer' }}
              >
                Buscar
              </button>
            </div>

            {/* Opciones inferiores */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', color: 'white' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={sameDropoff} onChange={(e) => setSameDropoff(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  Devolver el coche en otra oficina
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={driverAge} onChange={(e) => setDriverAge(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  Conductor entre 30 y 65 años
                </label>
              </div>
              <div style={{ color: '#006ce4', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', background: 'white', padding: '4px 8px', borderRadius: '4px' }}>
                <span>⚙️</span> Filtros rápidos
              </div>
            </div>

          </div>
        </div>
      </section>

      <main className="main-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>
        
        {/* MARCAS POPULARES */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', fontWeight: 'bold', color: '#333' }}>Compañías populares de renta de autos</h2>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {marcasPopulares.map((marca, i) => (
              <div key={i} style={{ border: '1px solid #e7e7e7', borderRadius: '4px', padding: '15px', width: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'white', transition: 'box-shadow 0.2s', height: '90px' }} onMouseOver={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'} onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
                <img src={marca.img} alt={marca.nombre} style={{ maxWidth: '80%', maxHeight: '40px', objectFit: 'contain', marginBottom: '8px' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                <span style={{ fontSize: '0.8rem', color: '#333', textAlign: 'center', display: 'none' }}>{marca.nombre}</span>
              </div>
            ))}
          </div>
        </section>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', fontWeight: 'bold' }}>Vehículos Recomendados</h2>

        {loading && (
          <div className="state-container" style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p className="state-title" style={{ marginTop: '10px' }}>Buscando autos...</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-container" style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="error-icon" style={{ fontSize: '2rem' }}>⚠️</div>
            <p className="state-subtitle">{error}</p>
            <button className="retry-btn" onClick={fetchData} style={{ background: '#006ce4', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', marginTop: '10px', cursor: 'pointer' }}>Reintentar</button>
          </div>
        )}

        {!loading && !error && autos.length === 0 && (
          <div className="state-container" style={{ textAlign: 'center', padding: '40px 0' }}>
            <p className="state-title">No hay autos disponibles para tu búsqueda</p>
          </div>
        )}

        {!loading && !error && autos.length > 0 && (
          <div className="atracciones-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {autos.map((a, i) => (
              <AutoCard key={a.vehicle_id || i} auto={a} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
