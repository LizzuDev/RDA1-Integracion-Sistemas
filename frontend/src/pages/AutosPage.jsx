import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAutos } from '../services/autosApi';
import { AutoCard } from '../components/AutoCard';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export function AutosPage() {
  const navigate = useNavigate();
  const [autos, setAutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Search form state
  const [pickupLocation, setPickupLocation] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [sameDropoff, setSameDropoff] = useState(false);
  const [driverAge, setDriverAge] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

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
      setHasSearched(true);
    }
  }, []);

  const timeOptions = [];
  for(let i=0; i<24; i++) {
    const h = i.toString().padStart(2, '0');
    timeOptions.push(`${h}:00`, `${h}:30`);
  }

  const handleSearch = (e) => {
    e.preventDefault();
    if (pickupLocation) {
      fetchData();
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  };

  const marcasPopulares = [
    { nombre: 'Europcar', bg: '#00843D', color: 'white', label: 'Europcar' },
    { nombre: 'Alamo', bg: '#00266b', color: '#ffb700', label: 'Alamo' },
    { nombre: 'Localiza', bg: '#00974a', color: 'white', label: 'Localiza' },
    { nombre: 'Keddy By Europcar', bg: '#6a1b9a', color: 'white', label: 'Keddy By Europcar' },
    { nombre: 'Goldcar', bg: '#fdd306', color: '#000', label: 'Goldcar' },
    { nombre: 'Sixt', bg: '#ff5f00', color: '#000', label: 'Sixt' },
    { nombre: 'Avis', bg: 'white', color: '#d40000', label: 'Avis' },
    { nombre: 'Budget', bg: 'white', color: '#002244', label: 'Budget' }
  ];

  const marcasLoading = [
    { nombre: 'Alamo', bg: '#00266b', color: '#ffb700', label: 'Alamo' },
    { nombre: 'Europcar', bg: '#00843D', color: 'white', label: 'Europcar' },
    { nombre: 'Enterprise', bg: '#004a32', color: 'white', label: 'enterprise' },
    { nombre: 'Dollar', bg: 'white', color: '#de002a', label: 'dollar.' },
    { nombre: 'Budget', bg: 'white', color: '#002244', label: 'Budget' },
    { nombre: 'Avis', bg: 'white', color: '#d40000', label: 'AVIS' },
    { nombre: 'Sixt', bg: '#ff5f00', color: '#000', label: 'SIXT' },
    { nombre: 'Hertz', bg: '#fdd306', color: '#000', label: 'Hertz' },
    { nombre: 'Record go', bg: '#e50000', color: 'white', label: 'record go' },
    { nombre: 'Thrifty', bg: 'white', color: '#005b9b', label: 'Thrifty' },
    { nombre: 'Green Motion', bg: 'white', color: '#88c63f', label: 'green motion' },
    { nombre: 'Keddy', bg: '#6a1b9a', color: 'white', label: 'keddy' }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '100px 20px', minHeight: '80vh', background: 'white' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '40px', textAlign: 'center' }}>Buscando las mejores ofertas entre cientos de marcas</h2>
        
        {/* Progress bar */}
        <div style={{ width: '100%', maxWidth: '800px', height: '8px', background: '#f0f0f0', borderRadius: '4px', marginBottom: '60px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: '#006ce4', width: '40%', animation: 'loading-slide 1.5s infinite ease-in-out' }}></div>
        </div>

        {/* Logos Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '20px', maxWidth: '800px', marginBottom: '80px' }}>
            {marcasLoading.map((marca, i) => (
              <div key={`load-${i}`} style={{ width: '110px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: marca.bg, color: marca.color, fontWeight: '900', borderRadius: '4px', fontSize: '1rem', border: '1px solid #e7e7e7', letterSpacing: '-0.5px' }}>
                 {marca.label}
              </div>
            ))}
        </div>

        {/* Bottom indicator */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <img src="https://cf.bstatic.com/static/img/cars/icons/car_icon/d261ad47db337611bdcb4914da6b553c3eefbba5.png" alt="car" style={{ height: '40px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
          <span style={{ fontSize: '2.5rem', display: 'none' }}>🚙</span>
          <div>
            <h4 style={{ fontWeight: 'bold', color: '#333', margin: 0, fontSize: '1.1rem' }}>Coches de todos los tamaños</h4>
            <p style={{ color: '#666', margin: 0, fontSize: '1rem' }}>para todo tipo de viajes</p>
          </div>
        </div>

        <style>
          {`
            @keyframes loading-slide {
              0% { left: -40%; }
              100% { left: 100%; }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <>
      {/* HEADER HERO ESTILO BOOKING */}
      <section className="hero" style={{ background: '#003b95', padding: '60px 0 20px', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
        <div style={{ maxWidth: '1100px', width: '100%', padding: '0 20px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '10px', textAlign: 'left', lineHeight: '1.2' }}>Alquiler de coches para cualquier tipo de viaje</h1>
          <p style={{ fontSize: '1.4rem', marginBottom: '30px', textAlign: 'left' }}>Coches fantásticos a precios increíbles de las principales empresas de alquiler</p>
          
          {/* SEARCH BOX */}
          <form className="search-box-container" onSubmit={handleSearch} style={{ position: 'relative', marginTop: '20px' }}>
            <div style={{ background: '#febb02', padding: '4px', borderRadius: '4px', display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto' }}>
              
              {/* Pickup Location */}
              <div style={{ flex: '1.5', minWidth: '300px', background: 'white', display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: '2px', height: '60px', border: '3px solid transparent', transition: 'border 0.2s', outline: 'none' }} onFocus={(e) => e.currentTarget.style.border = '3px solid #febb02'} onBlur={(e) => e.currentTarget.style.border = '3px solid transparent'}>
                <span style={{ fontSize: '1.2rem', color: '#333', marginRight: '10px' }}>🚗</span>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '500', marginBottom: '2px' }}>Lugar de recogida</span>
                  <input
                    type="text"
                    required
                    placeholder="Aeropuerto, ciudad o estación"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    style={{ border: 'none', padding: '0', width: '100%', outline: 'none', fontSize: '0.95rem', color: '#333', fontWeight: '500' }}
                  />
                </div>
              </div>
              
              {/* Pickup Date */}
              <div style={{ flex: '1', minWidth: '150px', background: 'white', display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: '2px', height: '60px' }}>
                <span style={{ fontSize: '1.2rem', color: '#333', marginRight: '10px' }}>📅</span>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '500', marginBottom: '2px' }}>Fecha de recogida</span>
                  <div style={{ width: '100%' }}>
                    <DatePicker
                      selected={startDate}
                      onChange={(date) => setDateRange([date, endDate])}
                      placeholderText="sáb 3 de oct"
                      dateFormat="EEE d 'de' MMM"
                      className="custom-date-picker-input"
                      style={{ border: 'none', padding: '0', width: '100%', outline: 'none', fontSize: '0.95rem', color: '#333', fontWeight: '500' }}
                    />
                  </div>
                </div>
              </div>

              {/* Pickup Time */}
              <div style={{ flex: '0.8', minWidth: '100px', background: 'white', display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: '2px', height: '60px' }}>
                <span style={{ fontSize: '1.2rem', color: '#333', marginRight: '10px' }}>🕒</span>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '500', marginBottom: '2px' }}>Hora</span>
                  <select style={{ border: 'none', outline: 'none', background: 'transparent', padding: '0', fontSize: '0.95rem', color: '#333', width: '100%', fontWeight: '500', cursor: 'pointer' }}>
                    {timeOptions.map(t => <option key={`pickup-${t}`} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              
              {/* Dropoff Date */}
              <div style={{ flex: '1', minWidth: '150px', background: 'white', display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: '2px', height: '60px' }}>
                <span style={{ fontSize: '1.2rem', color: '#333', marginRight: '10px' }}>📅</span>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '500', marginBottom: '2px' }}>Fecha de devolución</span>
                  <div style={{ width: '100%' }}>
                    <DatePicker
                      selected={endDate}
                      onChange={(date) => setDateRange([startDate, date])}
                      placeholderText="mar 6 de oct"
                      dateFormat="EEE d 'de' MMM"
                      className="custom-date-picker-input"
                      style={{ border: 'none', padding: '0', width: '100%', outline: 'none', fontSize: '0.95rem', color: '#333', fontWeight: '500' }}
                    />
                  </div>
                </div>
              </div>

              {/* Dropoff Time */}
              <div style={{ flex: '0.8', minWidth: '100px', background: 'white', display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: '2px', height: '60px' }}>
                <span style={{ fontSize: '1.2rem', color: '#333', marginRight: '10px' }}>🕒</span>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '500', marginBottom: '2px' }}>Hora</span>
                  <select style={{ border: 'none', outline: 'none', background: 'transparent', padding: '0', fontSize: '0.95rem', color: '#333', width: '100%', fontWeight: '500', cursor: 'pointer' }}>
                    {timeOptions.map(t => <option key={`dropoff-${t}`} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              
              <button 
                type="submit"
                style={{ flex: '0.8', minWidth: '120px', background: '#006ce4', color: 'white', border: 'none', height: '60px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '2px', cursor: 'pointer' }}
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

          </form>
        </div>
      </section>

      <main className="main-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>
        
        {!hasSearched && (
          <>
            {/* MARCAS POPULARES */}
            <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', fontWeight: 'bold', color: '#333' }}>Empresas populares de alquiler de coches</h2>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {marcasPopulares.map((marca, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ border: '1px solid #e7e7e7', borderRadius: '4px', padding: '15px', width: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: marca.bg, color: marca.color, transition: 'box-shadow 0.2s', height: '60px', fontWeight: '900', fontSize: '1.1rem', textAlign: 'center', letterSpacing: '-0.5px' }} onMouseOver={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'} onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
                  {marca.label}
                </div>
                <span style={{ fontSize: '0.85rem', color: '#333' }}>{marca.nombre}</span>
              </div>
            ))}
          </div>
        </section>

        {/* VIAJA MAS Y GASTA MENOS */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '15px', fontWeight: 'bold', color: '#333' }}>Viaja más y gasta menos</h2>
          <div style={{ border: '1px solid #e7e7e7', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '8px' }}>Inicia sesión y ahorra</h3>
              <p style={{ color: '#333', fontSize: '0.9rem', marginBottom: '16px' }}>Ahorra un 10% en coches de alquiler seleccionados. Busca la etiqueta azul de Genius.</p>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <button style={{ background: '#006ce4', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate('/login')}>Inicia sesión</button>
                <span style={{ color: '#006ce4', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => navigate('/register')}>Hazte una cuenta</span>
              </div>
            </div>
            <div style={{ paddingRight: '20px' }}>
              <img src="https://cf.bstatic.com/static/img/genius-globe-with-badge_large/d8b7ea84752b04f7bdc76d05f32cb72c696e5792.png" alt="Genius" style={{ height: '80px', objectFit: 'contain' }} />
            </div>
          </div>
        </section>
      </main>

      <div style={{ background: '#f5f5f5', width: '100%', padding: '40px 0', borderTop: '1px solid #e7e7e7', borderBottom: '1px solid #e7e7e7' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '2.5rem' }}>👩🏽‍💼</div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Estamos aquí para lo que necesites</h4>
              <p style={{ fontSize: '0.9rem', color: '#666' }}>Atención al cliente en más de 30 idiomas</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '2.5rem' }}>📝</div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Cancelación gratis</h4>
              <p style={{ fontSize: '0.9rem', color: '#666' }}>Hasta 48 horas antes de la recogida, en la mayoría de las reservas</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '2.5rem' }}>👍</div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Más de 5 millones de comentarios</h4>
              <p style={{ fontSize: '0.9rem', color: '#666' }}>De clientes reales y verificados</p>
            </div>
          </div>
        </div>
      </div>

      <main className="main-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>
        
        {/* PREGUNTAS FRECUENTES */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', fontWeight: 'bold', color: '#333' }}>Preguntas frecuentes</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                {q: '¿Cuánto cuesta alquilar un coche en Ecuador durante una semana?', a: 'En promedio, alquilar un coche en Ecuador cuesta alrededor de US$350 a US$450 por semana, dependiendo de la ciudad y el tipo de vehículo.'}, 
                {q: '¿Cuánto cuesta alquilar un coche en Ecuador durante un mes?', a: 'El costo mensual suele ser más económico en promedio diario, rondando los US$1,200 a US$1,500.'}, 
                {q: '¿Cuál es el coche que más se alquila en Ecuador?', a: 'Los vehículos SUV y los compactos económicos son los más populares debido a la topografía del país y el tráfico en las ciudades.'}, 
                {q: '¿Cuánto cuesta alquilar un vehículo del tipo "SUV" en Ecuador?', a: 'Un SUV estándar puede costar entre US$60 y US$90 al día, ideal para viajes largos o terrenos irregulares.'}
              ].map((faq, i) => (
                <div key={`faq1-${i}`} style={{ border: '1px solid #e7e7e7', borderRadius: '4px', background: 'white', overflow: 'hidden' }}>
                  <div onClick={() => toggleFaq(`l-${i}`)} style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', background: 'white' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#333' }}>{faq.q}</span>
                    <span style={{ transform: openFaq === `l-${i}` ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                  </div>
                  {openFaq === `l-${i}` && (
                    <div style={{ padding: '0 16px 16px', fontSize: '0.9rem', color: '#666', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                {q: '¿Puedo recoger el coche en un lugar y devolverlo en otro distinto en Ecuador?', a: 'Sí, la mayoría de agencias permiten devoluciones en otra sucursal, aunque suele aplicar un cargo adicional conocido como "tarifa de solo ida".'}, 
                {q: '¿Con cuánto tiempo de antelación debo reservar un coche de alquiler en Ecuador?', a: 'Se recomienda reservar al menos con 1 a 2 semanas de anticipación, especialmente durante temporada alta (vacaciones y feriados).'}, 
                {q: '¿Por qué debería reservar un coche de alquiler en Ecuador con Booking.com?', a: 'Ofrecemos cancelación gratuita en la mayoría de reservas, sin cargos ocultos y un servicio de atención al cliente disponible 24/7 en múltiples idiomas.'}
              ].map((faq, i) => (
                <div key={`faq2-${i}`} style={{ border: '1px solid #e7e7e7', borderRadius: '4px', background: 'white', overflow: 'hidden' }}>
                  <div onClick={() => toggleFaq(`r-${i}`)} style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', background: 'white' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#333' }}>{faq.q}</span>
                    <span style={{ transform: openFaq === `r-${i}` ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                  </div>
                  {openFaq === `r-${i}` && (
                    <div style={{ padding: '0 16px 16px', fontSize: '0.9rem', color: '#666', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DESTINOS POPULARES */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Destinos populares en los que alquilar un coche</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>Descubre más opciones para alquilar un coche económico</p>
          
          <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #e7e7e7', paddingBottom: '10px', marginBottom: '20px', overflowX: 'auto' }}>
            <button style={{ background: 'white', color: '#006ce4', border: '1px solid #006ce4', padding: '8px 16px', borderRadius: '32px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Ciudades de Ecuador</button>
            <button style={{ background: 'transparent', color: '#333', border: 'none', padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Aeropuertos de Ecuador</button>
            <button style={{ background: 'transparent', color: '#333', border: 'none', padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Regiones de Ecuador</button>
            <button style={{ background: 'transparent', color: '#333', border: 'none', padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Ciudades de todo el mundo</button>
            <button style={{ background: 'transparent', color: '#333', border: 'none', padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Aeropuertos de todo el mundo</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', cursor: 'pointer' }}>
              <img src="https://picsum.photos/id/10/60/60" alt="Quito" style={{ width: '60px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
              <div>
                <h4 style={{ fontWeight: 'bold', color: '#333', margin: 0 }}>Quito</h4>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>15 puntos de alquiler de coches</div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>Precio medio de <strong>US$57,79</strong> al día</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', cursor: 'pointer' }}>
              <img src="https://picsum.photos/id/11/60/60" alt="Cuenca" style={{ width: '60px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
              <div>
                <h4 style={{ fontWeight: 'bold', color: '#333', margin: 0 }}>Cuenca</h4>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>3 puntos de alquiler de coches</div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>Precio medio de <strong>US$46,65</strong> al día</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', cursor: 'pointer' }}>
              <img src="https://picsum.photos/id/12/60/60" alt="Guayaquil" style={{ width: '60px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
              <div>
                <h4 style={{ fontWeight: 'bold', color: '#333', margin: 0 }}>Guayaquil</h4>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>3 puntos de alquiler de coches</div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>Precio medio de <strong>US$47,70</strong> al día</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', cursor: 'pointer' }}>
              <img src="https://picsum.photos/id/13/60/60" alt="Manta" style={{ width: '60px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
              <div>
                <h4 style={{ fontWeight: 'bold', color: '#333', margin: 0 }}>Manta</h4>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>2 puntos de alquiler de coches</div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>Precio medio de <strong>US$52,64</strong> al día</div>
              </div>
            </div>
          </div>
        </section>
        </>
        )}

        {hasSearched && error && (
          <div className="state-container" style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="error-icon" style={{ fontSize: '2rem' }}>⚠️</div>
            <p className="state-subtitle">{error}</p>
            <button className="retry-btn" onClick={fetchData} style={{ background: '#006ce4', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', marginTop: '10px', cursor: 'pointer' }}>Reintentar</button>
          </div>
        )}

        {hasSearched && !error && autos.length === 0 && (
          <div className="state-container" style={{ textAlign: 'center', padding: '40px 0' }}>
            <p className="state-title">No hay autos disponibles para tu búsqueda</p>
          </div>
        )}

        {hasSearched && !error && autos.length > 0 && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* Sidebar */}
            <div style={{ width: '280px', flexShrink: 0 }}>
              <div style={{ background: '#e0e0e0', height: '150px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                <button style={{ background: '#006ce4', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>Mostrar en el Mapa</button>
              </div>
              <div style={{ border: '1px solid #e7e7e7', borderRadius: '4px', padding: '16px', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: '#333' }}>Filtrar</h3>
                  <span style={{ fontSize: '0.8rem', color: '#006ce4', cursor: 'pointer' }}>Borrar todos los filtros</span>
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px', color: '#333' }}>Compañía</h4>
                  {marcasPopulares.map((m, idx) => (
                     <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', marginBottom: '8px', cursor: 'pointer' }}>
                       <input type="checkbox" style={{ width: '18px', height: '18px' }} /> {m.label} <span style={{ marginLeft: 'auto', color: '#666', fontSize: '0.8rem' }}>10</span>
                     </label>
                  ))}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px', color: '#333' }}>Categoría del vehículo</h4>
                  {['Coche pequeño', 'Coche mediano', 'Coche grande', 'SUV'].map((c, idx) => (
                     <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', marginBottom: '8px', cursor: 'pointer' }}>
                       <input type="checkbox" style={{ width: '18px', height: '18px' }} /> {c} <span style={{ marginLeft: 'auto', color: '#666', fontSize: '0.8rem' }}>5</span>
                     </label>
                  ))}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px', color: '#333' }}>Precio por día</h4>
                  {['0 US$ - 50 US$', '50 US$ - 100 US$', '100 US$ - 150 US$'].map((p, idx) => (
                     <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', marginBottom: '8px', cursor: 'pointer' }}>
                       <input type="checkbox" style={{ width: '18px', height: '18px' }} /> {p}
                     </label>
                  ))}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px', color: '#333' }}>Número de plazas</h4>
                  {['4 plazas', '5 plazas', '7 o más plazas'].map((p, idx) => (
                     <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', marginBottom: '8px', cursor: 'pointer' }}>
                       <input type="checkbox" style={{ width: '18px', height: '18px' }} /> {p}
                     </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Column */}
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '20px' }}>
                 <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', margin: '0 0 15px 0' }}>{autos.length} coches disponibles</h2>
                 <div style={{ display: 'inline-flex', border: '1px solid #666', borderRadius: '32px', padding: '6px 16px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', alignItems: 'center', gap: '5px' }}>
                   <span style={{ fontSize: '0.8rem' }}>↓↑</span> Ordenar por: Recomendado <span style={{ fontSize: '0.7rem', marginLeft: '5px' }}>▼</span>
                 </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {autos.map((a, i) => (
                  <AutoCard key={a.vehicle_id || i} auto={a} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
