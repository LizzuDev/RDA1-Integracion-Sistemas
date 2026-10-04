import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/LanguageContext';

export function HospedajePage() {
  const { t } = useLanguage();
  const [destino, setDestino] = useState('');
  
  const handleReservar = (hotelNombre, precio) => {
    const existing = JSON.parse(localStorage.getItem('reservas_alojamientos') || '[]');
    const newRes = {
      id: 'HOTEL-' + Math.floor(Math.random() * 1000000),
      titulo: hotelNombre + ' - 3 Noches',
      fecha: new Date().toISOString().split('T')[0],
      status: 'CONFIRMED',
      total: precio
    };
    localStorage.setItem('reservas_alojamientos', JSON.stringify([newRes, ...existing]));
    alert('¡Reserva de hospedaje exitosa! Revisa Mis Reservas.');
  };

  return (
    <div style={{ maxWidth: '1024px', margin: '40px auto', padding: '20px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#003b95', marginBottom: '10px' }}>
        Encuentra tu próximo alojamiento
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#333', marginBottom: '30px' }}>
        Busca ofertas en hoteles, casas y mucho más.
      </p>

      <div style={{ background: '#febb02', padding: '4px', borderRadius: '8px', display: 'flex', gap: '4px', marginBottom: '40px' }}>
        <input 
          type="text" 
          placeholder="¿A dónde vas?" 
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          style={{ flex: 1, padding: '15px', border: 'none', borderRadius: '4px', fontSize: '1rem' }} 
        />
        <button 
          onClick={() => alert('Esto es un prototipo: la búsqueda no está conectada. ¡Haz clic en "Reservar" en alguna de las recomendaciones de abajo!')}
          style={{ background: '#006ce4', color: 'white', padding: '15px 30px', border: 'none', borderRadius: '4px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
          Buscar
        </button>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>Recomendaciones de Hospedaje</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ background: '#e0e0e0', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🏨</div>
          <div style={{ padding: '15px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>Grand Hotel Guayaquil</h3>
            <p style={{ color: '#666', margin: '0 0 15px 0' }}>Centro de Guayaquil, Ecuador</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>$245.00</span>
              <button onClick={() => handleReservar('Grand Hotel Guayaquil', 245)} style={{ background: '#006ce4', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Reservar
              </button>
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ background: '#e0e0e0', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🛏️</div>
          <div style={{ padding: '15px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>Hotel Dan Carlton Quito</h3>
            <p style={{ color: '#666', margin: '0 0 15px 0' }}>La Carolina, Quito</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>$320.00</span>
              <button onClick={() => handleReservar('Hotel Dan Carlton Quito', 320)} style={{ background: '#006ce4', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Reservar
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
