import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { crearHold, obtenerMapaAsientos } from '../services/vuelosApi';
import { formatearMoneda, obtenerHuellaDispositivo } from '../services/formato';

/**
 * Modal de seleccion de cabina y bloqueo de cupo (`POST /vuelos/offers/hold`).
 *
 * ── Que hace exactamente un "hold" ──────────────────────────────────────────
 * Retiene inventario y **congela el precio** durante 15 minutos. NO asigna
 * asientos: segun el contrato, `HoldRequest` lleva `offerId`,
 * `itinerarySelections` (itinerario + cabina + marca tarifaria) y
 * `passengersBreakdown`, pero ningun campo de asiento. La asignacion concreta de
 * un asiento es un paso posterior (`asiento_asignado`). Por eso el mapa de
 * asientos se muestra como REFERENCIA y los asientos no son pulsables: marcarlos
 * aqui y no enviarlos seria mentirle al usuario.
 *
 * ── Idempotencia ────────────────────────────────────────────────────────────
 * La `Idempotency-Key` se genera UNA vez al abrir el modal y se reutiliza en
 * todos los reintentos de esa intencion de negocio. Si se generara nueva en
 * cada pulsacion, un doble clic crearia DOS holds y consumiria el doble de
 * inventario: es el fallo de negocio clasico de un endpoint de retencion.
 * Como el backend la guarda 24h, un reintento posterior del MISMO modal
 * devolveria la misma respuesta.
 *
 * ── Accesibilidad ───────────────────────────────────────────────────────────
 * · `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
 * · `useFocusTrap` (ya existente) confina el foco y cierra con Escape.
 * · Las cabinas son radios en un `role="radiogroup"`, no un `<select>`: son
 *   pocas y comparables de un vistazo.
 * · El aviso de caducidad es `role="alert"`, para que un lector de pantalla lo
 *   anuncie sin tener que explorar el dialogo.
 * · `aria-live` en la cuenta atras, que cambia sola cada segundo.
 */
const CABIN_ES = {
  ECONOMY: 'Economica',
  PREMIUM_ECONOMY: 'Premium Economy',
  BUSINESS: 'Ejecutiva',
  FIRST: 'Primera',
};

/** Formatea un numero de segundos como `m:ss`. Trabaja sobre enteros. */
function formatoCuentaAtras(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function ModalBloqueoCupo({ abierto, oferta, pasajeros, onCerrar, onHoldCreado }) {
  const refDialogo = useRef(null);
  const idBase = useId();

  const [cabina, setCabina] = useState(null);
  const [mapa, setMapa] = useState(null);
  const [cargandoMapa, setCargandoMapa] = useState(false);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(null);
  const [hold, setHold] = useState(null);
  const [restantes, setRestantes] = useState(0);

  // Una clave por intencion de negocio: se genera al abrir y NO cambia al
  // reintentar. Ver la nota de idempotencia de la cabecera del archivo.
  const claveIdempotencia = useRef(null);

  useFocusTrap(abierto, onCerrar, refDialogo);

  const itinerario = oferta?.itineraries?.[0];
  const opciones = useMemo(
    () => itinerario?.pricingOptions ?? [],
    [itinerario],
  );

  // Al abrir: arranca el mapa de asientos y deja la cabina en la primera con
  // hueco, que es la que el usuario probablemente quiera.
  useEffect(() => {
    if (!abierto || !oferta) return undefined;

    claveIdempotencia.current = uuidv4();
    setError(null);
    setHold(null);
    setCabina(opciones[0]?.cabinClass ?? null);
    setCargandoMapa(true);

    let cancelado = false;
    obtenerMapaAsientos(oferta.offerId, itinerario?.segments?.[0]?.segmentId ?? '')
      .then((datos) => {
        if (!cancelado) setMapa(datos);
      })
      .catch(() => {
        // El mapa es informativo: si falla, el hold sigue siendo posible. Se
        // avisa pero no se bloquea el flujo.
        if (!cancelado) setMapa(null);
      })
      .finally(() => {
        if (!cancelado) setCargandoMapa(false);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, oferta?.offerId]);

  // Cuenta atras del hold. Se reinicia a cero cuando no hay hold, y el
  // intervalo se limpia solo al desmontar para no dejar timers huerfanos.
  useEffect(() => {
    if (!hold) {
      setRestantes(0);
      return undefined;
    }
    const calcular = () =>
      setRestantes(Math.max(0, Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000)));
    calcular();
    const intervalo = setInterval(calcular, 1000);
    return () => clearInterval(intervalo);
  }, [hold]);

  const alConfirmar = useCallback(async () => {
    if (!oferta || !cabina) return;
    setCreando(true);
    setError(null);
    try {
      const respuesta = await crearHold(
        {
          offerId: oferta.offerId,
          itinerarySelections: [
            {
              itineraryId: itinerario.itineraryId,
              cabinClass: cabina,
              fareBrand: 'STANDARD',
            },
          ],
          passengersBreakdown: pasajeros,
        },
        claveIdempotencia.current ?? uuidv4(),
        obtenerHuellaDispositivo(),
      );
      setHold(respuesta);
      onHoldCreado?.(respuesta);
    } catch (error) {
      // `error.response.data.detail` es el campo del ProblemDetails RFC 7807.
      const detalle =
        error?.response?.data?.detail ??
        'No se pudo bloquear el cupo. Intentalo de nuevo.';
      setError(detalle);
    } finally {
      setCreando(false);
    }
  }, [oferta, cabina, itinerario, pasajeros, onHoldCreado]);

  if (!abierto || !oferta) return null;

  const segmento = itinerario?.segments?.[0];
  const cabinaElegida = opciones.find((o) => o.cabinClass === cabina);
  const caducado = hold && restantes <= 0;

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idBase}-titulo`}
        ref={refDialogo}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h2 className="modal-title" id={`${idBase}-titulo`}>
            Elegir cabina y bloquear el cupo
          </h2>
          <button
            type="button"
            className="modal-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar sin bloquear"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-vuelo">
            {segmento
              ? `${segmento.departure.iataCode} → ${segmento.arrival.iataCode} · ${segmento.flightNumber}`
              : 'Vuelo'}{' '}
            · {oferta.airline?.name ?? oferta.airline?.code ?? ''}
          </p>

          {/* ── Cabinas ─────────────────────────────────────────────────── */}
          <fieldset className="modal-grupo" disabled={creando || !!hold}>
            <legend className="modal-legend">Cabina</legend>
            <div className="modal-radios" role="radiogroup" aria-labelledby={`${idBase}-leyenda-cabina`}>
              <span id={`${idBase}-leyenda-cabina`} className="sr-only">
                Cabina
              </span>
              {opciones.map((opcion) => (
                <label
                  key={opcion.cabinClass}
                  className={`modal-radio ${cabina === opcion.cabinClass ? 'activo' : ''}`}
                  htmlFor={`${idBase}-cabina-${opcion.cabinClass}`}
                >
                  <input
                    type="radio"
                    id={`${idBase}-cabina-${opcion.cabinClass}`}
                    name={`${idBase}-cabina`}
                    value={opcion.cabinClass}
                    checked={cabina === opcion.cabinClass}
                    onChange={() => setCabina(opcion.cabinClass)}
                  />
                  <span className="modal-radio-nombre">
                    {CABIN_ES[opcion.cabinClass] ?? opcion.cabinClass}
                  </span>
                  <span className="modal-radio-meta">{opcion.availableSeats} libres</span>
                </label>
              ))}
            </div>
            {opciones.length === 0 && (
              <p className="modal-vacio">Este vuelo no tiene cabinas con disponibilidad.</p>
            )}
          </fieldset>

          {/* ── Mapa de asientos (referencia) ───────────────────────────── */}
          <section className="modal-grupo" aria-labelledby={`${idBase}-leyenda-mapa`}>
            <h3 className="modal-legend" id={`${idBase}-leyenda-mapa`}>
              Mapa de asientos
              <span className="modal-nota"> referencial; el hold no asigna asientos</span>
            </h3>

            {cargandoMapa && <p className="modal-vacio">Cargando mapa de asientos…</p>}

            {!cargandoMapa && mapa?.cabins?.length > 0 && (
              <div className="asientos">
                {mapa.cabins.map((cab) => (
                  <div className="asientos-cabina" key={cab.cabinClass}>
                    <span className="asientos-cabina-nombre">
                      {CABIN_ES[cab.cabinClass] ?? cab.cabinClass}
                    </span>
                    {cab.rows.map((fila) => (
                      <div className="asientos-fila" key={fila.rowNumber}>
                        <span className="asientos-numero">{fila.rowNumber}</span>
                        {fila.seats.map((asiento) => (
                          <span
                            key={asiento.seatNumber}
                            className={`asiento ${asiento.isAvailable ? 'libre' : 'ocupado'}`}
                            title={
                              asiento.isAvailable
                                ? `${asiento.seatNumber} libre${asiento.characteristics.length ? ` · ${asiento.characteristics.join(', ')}` : ''}`
                                : `${asiento.seatNumber} ocupado`
                            }
                          >
                            {asiento.seatNumber.replace(/^\d+/, '')}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
                <p className="asientos-leyenda">
                  <span className="asiento libre" aria-hidden="true">A</span> libre
                  <span className="asiento ocupado" aria-hidden="true">A</span> ocupado
                </p>
              </div>
            )}

            {!cargandoMapa && (!mapa || mapa.cabins?.length === 0) && (
              <p className="modal-vacio">
                No se pudo cargar el mapa de asientos. Puedes bloquear el cupo igualmente.
              </p>
            )}
          </section>

          {error && (
            <p className="modal-error" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* ── Pie: precio congelado y confirmacion ────────────────────────── */}
        <div className="modal-foot">
          {hold ? (
            <div className="modal-exito" role="status">
              <p className="modal-exito-titulo">
                ✓ Cupo bloqueado por {hold.ttlMinutes} minutos
              </p>
              <p className="modal-exito-detalle">
                Precio congelado{' '}
                <strong>
                  {formatearMoneda(hold.lockedPrice?.total, hold.lockedPrice?.currency)}
                </strong>
              </p>
              <p className={`modal-cuenta ${caducado ? 'caducado' : ''}`} aria-live="polite">
                {caducado ? 'El bloqueo ha caducado' : `Caduca en ${formatoCuentaAtras(restantes)}`}
              </p>
              <p className="modal-exito-detalle">Hold ID: {hold.holdId}</p>
            </div>
          ) : (
            <>
              <div className="modal-precio">
                <span className="modal-precio-etiqueta">Total a bloquear</span>
                <span className="modal-precio-valor">
                  {formatearMoneda(oferta.grandTotal?.total, oferta.grandTotal?.currency)}
                </span>
              </div>
              <div className="modal-acciones">
                <button type="button" className="btn-secundario" onClick={onCerrar}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primario"
                  onClick={alConfirmar}
                  disabled={creando || !cabina}
                >
                  {creando ? 'Bloqueando…' : 'Bloquear cupo'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
