import { useEffect } from 'react';
import { formatearFecha, formatearMoneda } from '../services/formato';

/**
 * Pantalla de "Reserva confirmada" (`BookingDetail`).
 *
 * Muestra el PNR, que es lo que el usuario necesita para Nicholson, y el
 * resumen de pasajeros e itinerarios. El PNR se saca del DTO de la respuesta,
 * nunca se genera en el cliente: si el servidor devuelve un PNR, el que se
 * pinta ES ese, porque inventar otro en el navegador dejaria dos referencias
 * distintas para la misma reserva.
 *
 * ── Por que `tickets` aparece vacio ──────────────────────────────────────────
 * El contrato declara `tickets[]` y este endpoint devuelve `[]` porque la
 * emision es un endpoint posterior (`POST /bookings/{bookingId}/tickets`).
 * Decirlo evita que el usuario busque un numero de billete que no existe aun.
 */
export function PantallaReservaConfirmada({ reserva, onVolver }) {
  // El titulo del documento cambia con la vista: el usuario tiene varias
  // pestanas y "Booking Prototipo" no dice en que esta.
  useEffect(() => {
    document.title = `Reserva ${reserva?.pnr ?? ''} confirmada · Booking Prototipo`;
    return () => {
      document.title = 'Booking Prototipo';
    };
  }, [reserva?.pnr]);

  if (!reserva) return null;

  const iterarios = reserva.itineraries ?? [];

  return (
    <main className="main-content main-content-vuelos">
      <div className="confirmacion">
        <div className="confirmacion-cabecera">
          <span className="confirmacion-icono" aria-hidden="true">
            ✓
          </span>
          <div>
            <h1 className="section-title">Reserva confirmada</h1>
            <p className="section-subtitle">
              Guarda tu código PNR: es lo que necesitas para presentarte en el
              aeropuerto.
            </p>
          </div>
        </div>

        <div className="pnr-caja">
          <span className="pnr-etiqueta" id="pnr-etiqueta">
            Código de reserva (PNR)
          </span>
          <p className="pnr-valor" aria-labelledby="pnr-etiqueta">
            {reserva.pnr}
          </p>
          <p className="pnr-estado">
            Estado: <strong>{reserva.status}</strong> ·{' '}
            {formatearMoneda(reserva.grandTotal?.total, reserva.grandTotal?.currency)}{' '}
            {reserva.grandTotal?.currency}
          </p>
          <p className="pnr-fecha">
            Reservado el {formatearFecha(reserva.createdAt?.slice(0, 10))}
          </p>
        </div>

        {iterarios.length > 0 && (
          <section className="card" aria-labelledby="titulo-itinerarios">
            <div className="card-body">
              <h2 className="card-title" id="titulo-itinerarios">
                Itinerario reservado
              </h2>
              {iterarios.map((itin) => (
                <ol className="vuelo-segmentos" key={itin.itineraryId} aria-label="Tramos reservados">
                  {(itin.segments ?? []).map((seg) => (
                    <li className="vuelo-segmento" key={seg.segmentId}>
                      <span className="vuelo-hora">
                        {new Date(seg.departureAt).toISOString().slice(11, 16)}
                      </span>
                      <span className="vuelo-aeropuerto">{seg.departureIataCode}</span>
                      <span className="vuelo-linea" aria-hidden="true">
                        ─────────
                      </span>
                      <span className="vuelo-hora">
                        {new Date(seg.arrivalAt).toISOString().slice(11, 16)}
                      </span>
                      <span className="vuelo-aeropuerto">{seg.arrivalIataCode}</span>
                      <span className="vuelo-numero">· {seg.flightNumber}</span>
                    </li>
                  ))}
                </ol>
              ))}
            </div>
          </section>
        )}

        <section className="card" aria-labelledby="titulo-pasajeros">
          <div className="card-body">
            <h2 className="card-title" id="titulo-pasajeros">
              Pasajeros ({reserva.passengers?.length ?? 0})
            </h2>
            <ul className="lista-pasajeros">
              {(reserva.passengers ?? []).map((p) => (
                <li key={p.passengerId} className="lista-pasajero">
                  <span className="lista-pasajero-nombre">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="lista-pasajero-detalle">
                    {p.documentType === 'PASSPORT' ? 'Pasaporte' : 'Cédula'}{' '}
                    {p.documentNumber} · {p.nationality}
                  </span>
                  <span className="lista-pasajero-contacto">
                    {p.contact?.email}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {reserva.tickets?.length === 0 && (
          <p className="aviso-tickets" role="note">
            Los billetes aún no se han emitido. El número de billete aparecerá
            aquí en cuanto se complete la emisión.
          </p>
        )}

        <div className="confirmacion-acciones">
          <button type="button" className="btn-primario" onClick={onVolver}>
            Buscar otro vuelo
          </button>
        </div>
      </div>
    </main>
  );
}
