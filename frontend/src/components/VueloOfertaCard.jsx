import {
  extraerFecha,
  extraerHora,
  formatearFecha,
  formatearMoneda,
} from '../services/formato';

/**
 * Tarjeta de una oferta de vuelo (`FlightOffer`).
 *
 * ── Integracion visual ──────────────────────────────────────────────────────
 * Reutiliza las CLASES EXISTENTES de `index.css` (`.card`, `.card-img-wrapper`,
 * `.card-img`, `.card-badge`, `.card-body`, `.card-title`, `.card-desc`,
 * `.card-footer`, `.card-price`, `.card-btn`) en lugar de inventar un estilo
 * nuevo. Es la misma estructura que `AtraccionCard.jsx` / `AutoCard.jsx`, de
 * modo que la cuadricula de resultados comparte lenguaje visual con el resto de
 * la aplicacion. Solo se anaden dos clases nuevas y minimas para el tramo de
 * segmentos, porque la retícula existente no tiene equivalente.
 *
 * ── Accesibilidad ───────────────────────────────────────────────────────────
 * · El articulo es un `<article>` con `aria-labelledby` propio.
 * · Los tramos del itinerario son una `<ol>`: un screen reader anuncia
 *   "lista de 2 elementos", que es informacion real y no un adorno.
 * · El boton es un `<button>`, no un `<div onClick>`: es enfocable, responde a
 *   Enter y Espacio, y se anuncia como "boton". El `div` con `onClick` que usan
 *   las tarjetas existentes NO es accesible por teclado; aqui se corrige.
 * · Los estados (`SCHEDULED`, `DELAYED`...) se traducen a texto legible y se
 *   acompanian de un indicador visual, para no depender solo del color.
 *
 * ── Datos ───────────────────────────────────────────────────────────────────
 * Los importes llegan como `string` (contrato) y se formatean con
 * `formato.js`, que trabaja sobre texto. No se convierten a `number`.
 */
const ESTADOS_ES = {
  SCHEDULED: { texto: 'Programado', icono: '🗓️' },
  BOARDING: { texto: 'Embarcando', icono: '🛫' },
  DEPARTED: { texto: 'En vuelo', icono: '✈️' },
  DELAYED: { texto: 'Retrasado', icono: '⏰' },
  ARRIVED: { texto: 'Aterrizado', icono: '🛬' },
  CANCELLED: { texto: 'Cancelado', icono: '❌' },
  DIVERTED: { texto: 'Desviado', icono: '↪️' },
};

const CLASES_ES = {
  ECONOMY: 'Economica',
  PREMIUM_ECONOMY: 'Premium',
  BUSINESS: 'Ejecutiva',
  FIRST: 'Primera',
};

function formatearDuracion(minutos) {
  if (typeof minutos !== 'number' || Number.isNaN(minutos)) return '--';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}

export function VueloOfertaCard({ oferta, indice = 0, onSeleccionar }) {
  // `headingId` unico por tarjeta: los `aria-labelledby` no pueden repetirse,
  // o el lector de pantalla anunciaria siempre el mismo titulo.
  const headingId = `oferta-${indice}-${oferta?.offerId ?? 'sin-id'}`;

  if (!oferta) return null;

  const primerItinerario = oferta.itineraries?.[0];
  const segmentos = primerItinerario?.segments ?? [];
  const primeraTarifa = primerItinerario?.pricingOptions?.[0];
  const segmento = segmentos[0];

  return (
    <article className="card vuelo-card" aria-labelledby={headingId}>
      <div className="card-img-wrapper">
        <div className="card-img" aria-hidden="true">
          {oferta.airline?.code ?? '✈️'}
        </div>
        <span className="card-badge">{oferta.airline?.name ?? 'Vuelo'}</span>
      </div>

      <div className="card-body">
        <h3 className="card-title" id={headingId}>
          {segmento ? `${segmento.departure.iataCode} → ${segmento.arrival.iataCode}` : 'Vuelo'}
          {segmento?.flightNumber && (
            <span className="vuelo-numero"> · {segmento.flightNumber}</span>
          )}
        </h3>

        {primerItinerario && (
          <p className="card-desc vuelo-desc">
            {/* `departure.at` es date-time; `formatearFecha` espera `format: date`,
                asi que se normaliza antes con `extraerFecha`. */}
            {formatearFecha(extraerFecha(segmento?.departure.at))} ·{' '}
            {formatearDuracion(primerItinerario.totalDurationMinutes)} ·{' '}
            {primerItinerario.stopsCount === 0
              ? 'Directo'
              : `${primerItinerario.stopsCount} ${primerItinerario.stopsCount === 1 ? 'escala' : 'escalas'}`}
            {primeraTarifa && (
              <>
                {' '}
                · {CLASES_ES[primeraTarifa.cabinClass] ?? primeraTarifa.cabinClass}
              </>
            )}
          </p>
        )}

        {segmentos.length > 0 && (
          <ol className="vuelo-segmentos" aria-label="Tramos del itinerario">
            {segmentos.map((seg) => {
              const estado = ESTADOS_ES[seg.status];
              return (
                <li className="vuelo-segmento" key={seg.segmentId}>
                  <span className="vuelo-hora">{extraerHora(seg.departure.at)}</span>
                  <span className="vuelo-aeropuerto">{seg.departure.iataCode}</span>
                  <span className="vuelo-linea" aria-hidden="true">
                    ─────────
                  </span>
                  <span className="vuelo-hora">{extraerHora(seg.arrival.at)}</span>
                  <span className="vuelo-aeropuerto">{seg.arrival.iataCode}</span>
                  {estado && (
                    <span className={`vuelo-estado vuelo-estado-${seg.status.toLowerCase()}`}>
                      <span aria-hidden="true">{estado.icono}</span> {estado.texto}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {primeraTarifa && (
          <ul className="vuelo-detalles" aria-label="Condiciones de la tarifa">
            <li>
              {primeraTarifa.fareRules?.isRefundable ? 'Reembolsable' : 'No reembolsable'}
            </li>
            <li>
              {primeraTarifa.fareRules?.isChangeable ? 'Modificable' : 'No modificable'}
            </li>
            {typeof primeraTarifa.baggageAllowance?.checkedBaggageIncluded === 'number' && (
              <li>
                {primeraTarifa.baggageAllowance.checkedBaggageIncluded} maleta(s) incluida(s)
              </li>
            )}
          </ul>
        )}

        <div className="card-footer">
          <div className="card-price">
            {formatearMoneda(oferta.grandTotal?.total, oferta.grandTotal?.currency)}
            <span> / total</span>
          </div>
          {/* Un solo boton, y es un `<button>` de verdad. Antes este componente
              navegaba a `/vuelos/reserva?offerId=`, una ruta que no existe en el
              router: el clic no hacia nada visible. Ahora abre el modal de
              bloqueo, que si esta implementado contra el backend. */}
          <button
            className="card-btn"
            type="button"
            onClick={() => onSeleccionar(oferta)}
          >
            Bloquear cupo
          </button>
        </div>
      </div>
    </article>
  );
}
