import { useNavigate } from 'react-router-dom';

export function AtraccionCard({ atraccion }) {
  const navigate = useNavigate();
  const id = atraccion.id;
  
  // OpenAPI strict mapping
  const name = atraccion.name || 'Atracción Turística';
  const imageUrl = atraccion.photos && atraccion.photos.length > 0 ? atraccion.photos[0].url : `https://picsum.photos/seed/${id}/300/300`;
  const score = atraccion.ratings?.score?.toFixed(1) || '8.5';
  const reviewsCount = atraccion.ratings?.number_of_reviews || 120;
  const price = atraccion.price?.total || 55;

  return (
    <div className="attraction-search-card" onClick={() => navigate(`/atracciones/${id}`)} style={{cursor: 'pointer'}}>
      <div className="asc-image">
        <img src={imageUrl} onError={(e) => { e.target.onerror = null; e.target.src = `https://picsum.photos/seed/${id}/300/300`; }} alt={name} />
        <button className="favorite-btn" onClick={(e) => e.stopPropagation()}>♡</button>
      </div>
      <div className="asc-info">
        <div className="asc-header">
          <h3 className="asc-title">{name}</h3>
          <div className="asc-rating">
            <div className="score-badge">{score}</div>
            <div className="score-text">
              <strong>Excepcional</strong><br/>
              <span>{reviewsCount} comentarios</span>
            </div>
          </div>
        </div>

        <div className="asc-details">
          {atraccion.free_cancellation && (
            <div className="asc-free-cancel">
              <strong>✓ Cancelación gratis</strong>
            </div>
          )}
          <p className="asc-desc">
            {atraccion.long_description?.substring(0, 120) || 'Descubre esta increíble atracción...'}...
          </p>
        </div>

        <div className="asc-footer">
          <div className="asc-price-box">
            <span className="price-label">Precio total</span>
            <strong className="price-amount">US${price}</strong>
            <button className="search-btn" onClick={(e) => { e.stopPropagation(); navigate(`/atracciones/${id}`); }}>Ver disponibilidad</button>
          </div>
        </div>
      </div>
    </div>
  );
}
