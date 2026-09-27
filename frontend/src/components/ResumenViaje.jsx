import { formatearMoneda, formatearFecha, extraerHora } from '../services/formato';

export function ResumenViaje({ oferta, tarifaSeleccionada, onContinuar, onModificar }) {
  if (!oferta) return null;

  const ida = oferta.itineraries?.[0];
  const vuelta = oferta.itineraries?.[1];

  const renderItinerario = (itinerario, etiqueta) => {
    if (!itinerario) return null;
    const primerSegmento = itinerario.segments?.[0];
    const ultimoSegmento = itinerario.segments?.[itinerario.segments.length - 1];
    const tarifa = tarifaSeleccionada || itinerario.pricingOptions?.[0];

    return (
      <div className="resumen-itinerario">
        <div className="resumen-itinerario-head">
          <span className="resumen-itinerario-label">🛫 {etiqueta}</span>
          <span className="resumen-itinerario-date">
            {formatearFecha(primerSegmento?.departure.at)}
          </span>
        </div>
        <div className="resumen-itinerario-body">
          <div className="resumen-flight-info">
            <strong>{extraerHora(primerSegmento?.departure.at)}</strong> {primerSegmento?.departure.iataCode}
            <span className="resumen-arrow"> → </span>
            <strong>{extraerHora(ultimoSegmento?.arrival.at)}</strong> {ultimoSegmento?.arrival.iataCode}
          </div>
          <div className="resumen-fare-info">
            <span className="resumen-fare-badge">{tarifa?.cabinClass || 'Economy'}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="resumen-viaje-container">
      <div className="resumen-viaje-card">
        <div className="resumen-viaje-content">
          <div className="resumen-viaje-flights">
            <h3 className="resumen-title">Tu Selección</h3>
            {renderItinerario(ida, 'Ida')}
            {renderItinerario(vuelta, 'Vuelta')}
          </div>
          
          <div className="resumen-viaje-total">
            <div className="resumen-price-breakdown">
              <span className="resumen-total-label">Total de tu reserva:</span>
              <span className="resumen-total-amount">
                {formatearMoneda(tarifaSeleccionada?.pricePerPassengerType?.[0]?.price?.total || oferta.grandTotal?.total, 'USD')}
              </span>
              <span className="resumen-taxes-note">Impuestos y cargos incluidos</span>
            </div>
            
            <div className="resumen-actions">
              <button className="resumen-btn-outline" onClick={onModificar}>
                Modificar
              </button>
              <button className="resumen-btn-primary" onClick={() => onContinuar(oferta)}>
                Continuar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
