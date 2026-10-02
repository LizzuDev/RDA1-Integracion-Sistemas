import { useNavigate } from 'react-router-dom';

export function AutoCard({ auto }) {
  const navigate = useNavigate();
  const id = auto.vehicle_id || Math.random().toString(36).substring(7);
  const precio = auto.price || 113;
  const make = auto.make || 'Chevrolet';
  const model = auto.model || 'Spark';
  const seats = auto.seats || 5;
  const doors = auto.doors || 4;
  const bag_capacity = auto.bag_capacity || 1;
  const supplierId = auto.supplier_id || 1;

  // Mock de proveedor para coincidir con la UI
  const supplierInfo = {
    bg: '#00843D', color: 'white', label: 'Europcar', score: '8.2', scoreText: 'Muy bien', reviews: '300+'
  };

  return (
    <div onClick={() => navigate(`/autos/${id}`)} style={{ border: '1px solid #e7e7e7', borderRadius: '4px', padding: '16px', display: 'flex', background: 'white', marginBottom: '15px', cursor: 'pointer', transition: 'box-shadow 0.2s' }} onMouseOver={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'} onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
      {/* Left: Car image & Supplier */}
      <div style={{ width: '250px', paddingRight: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <img 
          src={auto.images && auto.images.length > 0 ? auto.images[0] : 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=300&q=80'} 
          alt={`${make} ${model}`}
          style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
          <div style={{ background: supplierInfo.bg, color: supplierInfo.color, padding: '4px 8px', borderRadius: '2px', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '-0.5px' }}>{supplierInfo.label}</div>
          <div style={{ background: '#003b95', color: 'white', padding: '6px', borderRadius: '6px 6px 6px 0', fontWeight: 'bold', fontSize: '0.9rem' }}>{supplierInfo.score}</div>
          <div style={{ fontSize: '0.75rem', color: '#333', lineHeight: '1.2' }}><b>{supplierInfo.scoreText}</b><br/><span style={{color: '#666'}}>{supplierInfo.reviews} opiniones</span></div>
        </div>
      </div>
      
      {/* Center: Details */}
      <div style={{ flex: 1, paddingRight: '15px' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#333', margin: '0 0 15px 0' }}>{make} {model} <span style={{ fontSize: '0.9rem', color: '#006ce4', fontWeight: 'normal', cursor: 'pointer' }}>o un coche similar ℹ️</span></h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem', color: '#333', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem', color: '#666' }}>👤</span> {seats} plazas
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem', color: '#666' }}>⚙️</span> Transmisión {auto.transmission || 'Manual'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem', color: '#666' }}>💼</span> {bag_capacity} pieza de equipaje
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem', color: '#666' }}>🚪</span> {doors} puertas
          </div>
        </div>
        <div style={{ color: '#006ce4', fontSize: '0.9rem', fontWeight: 'bold' }}>Quito Aeropuerto</div>
        <div style={{ color: '#666', fontSize: '0.8rem' }}>En el aeropuerto</div>
      </div>
      
      {/* Right: Price & Button */}
      <div style={{ width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', borderLeft: '1px solid #e7e7e7', paddingLeft: '15px' }}>
        <div style={{ textAlign: 'right', width: '100%' }}>
          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px' }}>Precio por 3 días:</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#333', lineHeight: '1' }}>{precio} US$</div>
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); navigate(`/autos/${id}`, { state: { auto } }); }}
            style={{ width: '100%', background: '#006ce4', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = '#0057b8'} 
            onMouseOut={e => e.currentTarget.style.background = '#006ce4'}
          >
            Ver oferta
          </button>
          <div style={{ fontSize: '0.8rem', color: '#006ce4', textAlign: 'center', cursor: 'pointer' }}>ℹ️ Información importante</div>
          <div style={{ fontSize: '0.8rem', color: '#006ce4', textAlign: 'center', cursor: 'pointer' }}>✉️ Enviar presupuesto por email</div>
        </div>
      </div>
    </div>
  );
}
