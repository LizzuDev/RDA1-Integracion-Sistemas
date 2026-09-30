import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  buscarCambioFecha,
  confirmarCambioFecha,
} from '../services/vuelosApi';
import { formatearMoneda, hoyEnIso } from '../services/formato';

/**
 * Modal de cambio de fecha: buscar disponibilidad y aplicar el cambio.
 *
 * ── Tres pasos, no uno ───────────────────────────────────────────────────────
 * `date-change/search` y `date-change` son endpoints distintos porque la oferta
 * CADUCA a 30 minutos. Si se buscara y se confirmara en el mismo clic, el usuario
 * no tendria forma de ver el precio antes de aceptarlo. Aqui la oferta se busca al
 * elegir la fecha, se MUESTRA, y solo se confirma con un boton aparte.
 *
 * ── La `Idempotency-Key` se genera AL ABRIR el modal ─────────────────────────
 * Igual que en `ModalPostventa`, y por el mismo motivo: si se generara en el
 * manejador de "confirmar", cada pulsacion seria una operacion nueva y aplicaria
 * el cambio dos veces. En una ref, todos los reintentos de esa confirmacion
 * comparten clave y el backend reproduce la primera respuesta.
 *
 * ── El `segmentId` NO cambia ─────────────────────────────────────────────────
 * Al mudar de vuelo se reapunta el segmento, no se crea otro. Por eso el boleto y
 * el asiento que ya tenia el pasajero siguen siendo validos, y por eso la UI no
 * pide volver a elegir butaca: se conserva la que ya habia.
 *
 * ── Solo hay importes A PAGAR ────────────────────────────────────────────────
 * El DDL impone `CHECK (ocf_cambioTotalAPagar >= 0)`: este modulo NO devuelve
 * dinero en un cambio de fecha. Si el vuelo nuevo sale mas barato, la diferencia
 * se trunca a 0 y se dice explicitamente, en vez de prometer un reembolso que la
 * API no puede garantizar.
 *
 * ── Accesibilidad ────────────────────────────────────────────────────────────
 * `role="dialog"` + `aria-modal`, foco atrapado, Escape para cerrar, `<label
 * htmlFor>` en el campo de fecha y `aria-live` en el resultado de la busqueda.
 */

/** UUID v4 con la Web Crypto API, con respaldo para contexto no seguro. */
function nuevoIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** `2026-11-12` + la fecha actual -> `12 nov 2026`. */
function fechaLegible(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${m[3]} ${meses[Number(m[2]) - 1]} ${m[1]}`;
}

/** `2026-11-12T15:00:00.000Z` -> `15:00`. Trabaja sobre la cadena, no sobre un Date. */
function hora(iso) {
  if (!iso) return '--:--';
  const m = String(iso).match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '--:--';
}

export function ModalCambioFecha({ bookingId, pnr, reserva, onCerrar, onHecho }) {
  const tituloId = useId();
  const descId = useId();
  const fechaId = useId();

  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [buscando, setBuscando] = useState(false);

  // El itinerario que se va a mover. Por defecto, el primero de la reserva: con un
  // solo itinerario (el caso normal) no hay nada que elegir.
  const itinerarios = reserva?.itineraries ?? [];
  const [itinerarioId, setItinerarioId] = useState(itinerarios[0]?.itineraryId ?? '');

  // Fecha de hoy en `YYYY-MM-DD`, que es el formato que espera el DTO.
  //
  // Se inicializa UNA vez al montar, con la funcion lazy del `useState`. Calcularlo
  // en cada renderaria un valor nuevo en cada repintado, y como `fecha` es
  // dependencia del `useCallback` de la busqueda, dispararia la peticion en bucle.
  const [fecha, setFecha] = useState(hoyEnIso);

  const [ofertas, setOfertas] = useState(null);
  const [elegida, setElegida] = useState(0);

  // UNA clave por apertura. Ref y no `useState`: cambiar la clave no debe
  // provocar un repintado, y su valor solo importa al enviar.
  const claveRef = useRef(nuevoIdempotencyKey());

  const dialogoRef = useRef(null);
  useFocusTrap(true, onCerrar, dialogoRef);

  const cerrar = useCallback(() => {
    // No se cierra en mitad de un envio: si el POST esta en vuelo y el usuario
    // cierra, no hay forma de mostrarle el resultado ni de reintentar con la misma
    // clave.
    if (enviando) return;
    onCerrar();
  }, [enviando, onCerrar]);

  const buscar = useCallback(async () => {
    if (!itinerarioId || !fecha) return;
    setBuscando(true);
    setError(null);
    setOfertas(null);
    setElegida(0);
    try {
      const respuesta = await buscarCambioFecha(bookingId, [
        { itineraryId: itinerarioId, newDepartureDate: fecha },
      ]);
      setOfertas(respuesta ?? []);
    } catch (fallo) {
      setError(
        fallo?.response?.data?.detail ??
          'No se pudo buscar disponibilidad para esa fecha.',
      );
    } finally {
      setBuscando(false);
    }
  }, [bookingId, itinerarioId, fecha]);

  const confirmar = async () => {
    const oferta = (ofertas ?? [])[elegida];
    if (!oferta) {
      setError('Elige un vuelo antes de aplicar el cambio.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const resultado = await confirmarCambioFecha(
        bookingId,
        {
          changeOfferId: oferta.changeOfferId,
          // Se manda SIEMPRE que haya diferencia. El backend exige
          // `paymentReference` cuando `cambioTotalAPagar > 0` y responde 422 si
          // falta; mandarla evita ese 422. La referencia es de otra API de pagos:
          // este modulo no cobra.
          ...(oferta.priceDifference.totalToPay !== '0.00'
            ? { payment: { paymentReference: `cambio_${oferta.changeOfferId.slice(0, 8)}` } }
            : {}),
        },
        claveRef.current,
      );
      onHecho({ resultado, oferta });
    } catch (fallo) {
      setError(fallo?.response?.data?.detail ?? 'No se pudo aplicar el cambio de fecha.');
    } finally {
      setEnviando(false);
    }
  };

  const oferta = (ofertas ?? [])[elegida];
  const hayOfertas = (ofertas ?? []).length > 0;
  const aPagar = oferta?.priceDifference?.totalToPay ?? '0.00';
  const hayDiferencia = aPagar !== '0.00';

  return (
    <div
      className="modal-overlay"
      ref={dialogoRef}
      onClick={(e) => {
        // Solo cierra si el clic fue en el fondo, no si ha bubled desde dentro.
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div
        className="modal modal-postventa"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descId}
      >
        <div className="modal-head">
          <h2 className="modal-title" id={tituloId}>
            Cambiar la fecha
          </h2>
          <button
            type="button"
            className="modal-cerrar"
            onClick={cerrar}
            aria-label="Cerrar"
            disabled={enviando}
          >
            ×
          </button>
        </div>

        <div className="modal-body" id={descId}>
          {error && (
            <p className="modal-error" role="alert">
              {error}
            </p>
          )}

          <p className="modal-texto">
            Vas a cambiar la fecha del vuelo de la reserva{' '}
            <strong>{pnr}</strong>. Tu boleto y tu asiento se conservan: solo se
            mueve el vuelo.
          </p>

          <div className="modal-form">
            {itinerarios.length > 1 && (
              <div className="campo">
                <label className="modal-label" htmlFor={`${fechaId}-it`}>
                  Itinerario
                </label>
                <select
                  className="modal-input"
                  id={`${fechaId}-it`}
                  value={itinerarioId}
                  onChange={(e) => {
                    setItinerarioId(e.target.value);
                    setOfertas(null);
                  }}
                >
                  {itinerarios.map((it) => (
                    <option key={it.itineraryId} value={it.itineraryId}>
                      {it.segments
                        ?.map((s) => `${s.departureIataCode}–${s.arrivalIataCode}`)
                        .join(', ')}{' '}
                      ({it.itineraryId})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="campo">
              <label className="modal-label" htmlFor={fechaId}>
                Nueva fecha de salida
              </label>
              <input
                className="modal-input"
                id={fechaId}
                type="date"
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  setOfertas(null);
                }}
              />
            </div>

            <button
              type="button"
              className="btn-secundario"
              onClick={buscar}
              disabled={buscando || enviando || !fecha}
            >
              {buscando ? 'Buscando…' : 'Buscar vuelos'}
            </button>
          </div>

          {/* `aria-live` para que el lector de pantalla anuncie el resultado: la
              lista aparece sin que el foco se mueva y, sin esto, sería silenciosa. */}
          <div aria-live="polite">
            {ofertas !== null && !hayOfertas && (
              <p className="modal-nota" role="status">
                No hay ningún vuelo con la misma ruta en esa fecha. Prueba con otra.
              </p>
            )}

            {hayOfertas && (
              <>
                <p className="modal-nota">
                  {ofertas.length === 1
                    ? '1 vuelo disponible. Elige y revisa la diferencia.'
                    : `${ofertas.length} vuelos disponibles. Elige uno.`}
                </p>

                <div className="modal-radios" role="radiogroup" aria-label="Vuelo disponible">
                  {ofertas.map((o, i) => {
                    const seg = o.segments?.[0];
                    return (
                      <label
                        key={o.changeOfferId}
                        className={`modal-radio ${elegida === i ? 'activo' : ''}`}
                        htmlFor={`${fechaId}-of-${i}`}
                      >
                        <input
                          type="radio"
                          id={`${fechaId}-of-${i}`}
                          name={`${fechaId}-oferta`}
                          value={i}
                          checked={elegida === i}
                          onChange={() => setElegida(i)}
                        />
                        <span className="modal-radio-nombre">{seg?.flightNumber}</span>
                        <span className="modal-radio-meta">
                          {fechaLegible(o.newDepartureDate)} ·{' '}
                          {hora(seg?.departureAt)}–{hora(seg?.arrivalAt)} ·{' '}
                          {seg?.availableSeats} libres
                        </span>
                      </label>
                    );
                  })}
                </div>

                {oferta && (
                  <div className="cotizacion">
                    <div className="cotizacion-fila">
                      <span>Diferencia de tarifa</span>
                      <span>
                        {formatearMoneda(
                          oferta.priceDifference.fareDifference,
                          oferta.currency,
                        )}
                      </span>
                    </div>
                    <div className="cotizacion-fila">
                      <span>Diferencia de impuestos</span>
                      <span>
                        {formatearMoneda(
                          oferta.priceDifference.taxDifference,
                          oferta.currency,
                        )}
                      </span>
                    </div>
                    <div className="cotizacion-fila">
                      <span>Gastos de cambio</span>
                      <span>
                        {formatearMoneda(
                          oferta.priceDifference.changeFee,
                          oferta.currency,
                        )}
                      </span>
                    </div>
                    <div className="cotizacion-fila cotizacion-fila-total">
                      <span>Total a pagar</span>
                      <span>{formatearMoneda(aPagar, oferta.currency)}</span>
                    </div>
                  </div>
                )}

                <p className="modal-nota">
                  {hayDiferencia
                    ? 'Te cobraremos solo la diferencia. Tu boleto y tu asiento se mantienen.'
                    : 'Este vuelo no tiene diferencia de precio sobre el que tenías. Tu boleto y tu asiento se mantienen.'}
                </p>
                <p className="modal-nota">
                  Esta versión del módulo no devuelve dinero en un cambio de fecha:
                  si el vuelo nuevo saliera más barato, la diferencia se
                  calcularía en cero.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="modal-foot">
          <button
            type="button"
            className="btn-secundario"
            onClick={cerrar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primario"
            onClick={confirmar}
            disabled={enviando || !hayOfertas}
          >
            {enviando
              ? 'Aplicando…'
              : hayDiferencia
                ? `Pagar ${formatearMoneda(aPagar, oferta?.currency)} y cambiar`
                : 'Cambiar sin coste'}
          </button>
        </div>
      </div>
    </div>
  );
}
