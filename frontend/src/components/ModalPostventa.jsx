import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  agregarEquipaje,
  cancelarReserva,
  cotizarCancelacion,
  hacerCheckIn,
} from '../services/vuelosApi';
import { formatearMoneda } from '../services/formato';

/**
 * Modal de postventa: check-in, equipaje y cancelacion.
 *
 * ── Por que un solo componente ──────────────────────────────────────────────
 * Los tres flujos comparten estructura (dialogo, foco atrapado, Escape, estado
 * de error) y la misma trampa de la clave de idempotencia. Tres componentes
 * parejos acabarian con tres copias de la trampa.
 *
 * ── La `Idempotency-Key` se genera AL ABRIR el modal ─────────────────────────
 * Es lo que evita el cobro doble: si se generara en el manejador de "confirmar",
 * cada pulsacion seria una operacion nueva y el doble clic cobraria dos veces.
 * Guardandola en una ref desde el montaje, todos los reintentos de esa
 * confirmacion comparten clave y el backend reproduce la primera respuesta.
 *
 * ── La cotizacion se pide al ABRIR, no al confirmar ─────────────────────────
 * `/cancellation-quote` crea una fila nueva cada vez que se llama y caduca a 15
 * minutos. Si se pidiera al confirmar, el usuario veria una cifra y se ejecutaria
 * otra. El backend rechaza con 409 una cotizacion caducada, y ese error se
 * muestra para que el usuario pueda volver a cotizar.
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

const TITULOS = {
  checkin: 'Hacer check-in',
  equipaje: 'Anadir equipaje',
  cancelar: 'Cancelar reserva',
};

export function ModalPostventa({
  tipo,
  bookingId,
  pnr,
  opcionesEquipaje,
  pasajeros,
  onCerrar,
  onHecho,
}) {
  const tituloId = useId();
  const descId = useId();
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const [cotizacion, setCotizacion] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [opcion, setOpcion] = useState(0);
  const [cantidad, setCantidad] = useState(1);

  // UNA clave por apertura. Es una ref y no un `useState` a proposito: cambiar la
  // clave no debe provocar un repintado, y su valor solo importa al enviar.
  const claveRef = useRef(nuevoIdempotencyKey());

  const dialogoRef = useRef(null);
  useFocusTrap(true, onCerrar, dialogoRef);

  const cerrar = useCallback(() => {
    // No se cierra en mitad de un envio: si el POST esta en vuelo y el usuario
    // cierra el modal, no hay forma de mostrarle el resultado ni de reintentar
    // con la misma clave.
    if (enviando) return;
    onCerrar();
  }, [enviando, onCerrar]);

  // Al abrir, pedir la cotizacion. Las dependencias son solo `tipo` y
  // `bookingId`: volver a pedirla en cada pulsacion de teclado generaria una
  // cotizacion distinta por cada caracter del motivo.
  useEffect(() => {
    if (tipo !== 'cancelar') return undefined;
    let vivo = true;
    setCotizacion(null);
    setError(null);
    cotizarCancelacion(bookingId)
      .then((c) => {
        if (vivo) setCotizacion(c);
      })
      .catch((fallo) => {
        if (!vivo) return;
        setError(
          fallo?.response?.data?.detail ?? 'No se pudo calcular la penalidad.',
        );
      });
    return () => {
      vivo = false;
    };
  }, [tipo, bookingId]);

  const confirmarCheckIn = async () => {
    setEnviando(true);
    setError(null);
    try {
      const resultado = await hacerCheckIn(bookingId);
      onHecho({ tipo: 'checkin', resultado });
    } catch (fallo) {
      setError(fallo?.response?.data?.detail ?? 'No se pudo hacer el check-in.');
    } finally {
      setEnviando(false);
    }
  };

  const confirmarEquipaje = async () => {
    const elegida = opcionesEquipaje?.[opcion];
    if (!elegida) {
      setError('Elige un pasajero.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const resultado = await agregarEquipaje(
        bookingId,
        {
          passengerId: elegida.passengerId,
          itineraryId: elegida.itineraryId,
          quantity: Number(cantidad),
          // Referencia de la Payment API. Esta API no procesa tarjetas: solo
          // reenvia el identificador que ya tiene el cliente.
          payment: { paymentReference: `PAY-WEB-${claveRef.current.slice(0, 8)}` },
        },
        claveRef.current,
      );
      onHecho({ tipo: 'equipaje', resultado });
    } catch (fallo) {
      setError(fallo?.response?.data?.detail ?? 'No se pudo anadir la maleta.');
    } finally {
      setEnviando(false);
    }
  };

  const confirmarCancelacion = async () => {
    if (!cotizacion) return;
    setEnviando(true);
    setError(null);
    try {
      const resultado = await cancelarReserva(
        bookingId,
        { quoteId: cotizacion.quoteId, reason: motivo || undefined },
        claveRef.current,
      );
      onHecho({ tipo: 'cancelar', resultado });
    } catch (fallo) {
      setError(fallo?.response?.data?.detail ?? 'No se pudo cancelar la reserva.');
    } finally {
      setEnviando(false);
    }
  };

  const totalCotizado = cotizacion
    ? Number(cotizacion.refundAmount) + Number(cotizacion.penaltyAmount)
    : 0;

  const elegida = opcionesEquipaje?.[opcion];
  const precioUnitario = elegida ? Number(elegidoTotal(elegida)) : 0;
  const totalEquipaje = precioUnitario * Number(cantidad || 0);

  const acciones = {
    checkin: confirmarCheckIn,
    equipaje: confirmarEquipaje,
    cancelar: confirmarCancelacion,
  };

  const textoConfirmar = {
    checkin: 'Confirmar check-in',
    equipaje: 'Anadir maleta',
    cancelar: 'Cancelar definitivamente',
  };

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
            {TITULOS[tipo]}
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

          {tipo === 'checkin' && (
            <>
              <p className="modal-texto">
                Vas a presentar el documento de viaje de la reserva{' '}
                <strong>{pnr}</strong>. El check-in queda registrado y ya no
                podrás repetirlo.
              </p>
              <ul className="modal-lista">
                {(pasajeros ?? []).map((p) => (
                  <li key={p.passengerId}>
                    {p.firstName} {p.lastName} —{' '}
                    {p.documentType === 'PASSPORT' ? 'Pasaporte' : 'Cédula'}{' '}
                    {p.documentNumber}
                  </li>
                ))}
              </ul>
              <p className="modal-nota">
                El check-in abre 48 horas antes de la salida.
              </p>
            </>
          )}

          {tipo === 'equipaje' && (
            <div className="modal-form">
              <div className="campo">
                <label className="modal-label" htmlFor="pv-pasajero">
                  Pasajero
                </label>
                <select
                  className="modal-input"
                  id="pv-pasajero"
                  value={opcion}
                  onChange={(e) => setOpcion(Number(e.target.value))}
                >
                  {(opcionesEquipaje ?? []).map((o, i) => {
                    const pax = (pasajeros ?? []).find(
                      (p) => p.passengerId === o.passengerId,
                    );
                    return (
                      <option key={`${o.passengerId}-${o.itineraryId}`} value={i}>
                        {pax ? `${pax.firstName} ${pax.lastName}` : o.passengerId}{' '}
                        — incluye {o.maxAllowed}
                        {o.alreadyPurchased > 0
                          ? `, lleva ${o.alreadyPurchased}`
                          : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="campo">
                <label className="modal-label" htmlFor="pv-cantidad">
                  Maletas extra
                </label>
                <input
                  className="modal-input"
                  id="pv-cantidad"
                  type="number"
                  min={1}
                  max={10}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                />
              </div>

              <div className="modal-precio">
                <span className="modal-precio-etiqueta">Total a pagar</span>
                <span className="modal-precio-valor">
                  {formatearMoneda(String(totalEquipaje), elegida?.price?.currency)}
                </span>
              </div>
              <p className="modal-nota">
                Las maletas se cobran aparte del vuelo y no son reembolsables.
              </p>
            </div>
          )}

          {tipo === 'cancelar' && (
            <>
              {!cotizacion ? (
                <p className="modal-texto" role="status">
                  Calculando la penalidad…
                </p>
              ) : (
                <>
                  <div className="cotizacion">
                    <div className="cotizacion-fila">
                      <span>Importe de la reserva</span>
                      <span>
                        {formatearMoneda(String(totalCotizado), cotizacion.currency)}
                      </span>
                    </div>
                    <div className="cotizacion-fila cotizacion-fila-penalidad">
                      <span>Penalidad por cancelación</span>
                      <span>
                        −
                        {formatearMoneda(
                          cotizacion.penaltyAmount,
                          cotizacion.currency,
                        )}
                      </span>
                    </div>
                    <div className="cotizacion-fila cotizacion-fila-total">
                      <span>Te devolveríamos</span>
                      <span>
                        {formatearMoneda(
                          cotizacion.refundAmount,
                          cotizacion.currency,
                        )}
                      </span>
                    </div>
                  </div>

                  {!cotizacion.isRefundable && (
                    <p className="modal-aviso" role="note">
                      Esta reserva <strong>no admite reembolso</strong>. Se
                      enviará a revisión manual y quedará pendiente de
                      cancelación.
                    </p>
                  )}

                  <div className="campo">
                    <label className="modal-label" htmlFor="pv-motivo">
                      Motivo (opcional)
                    </label>
                    <input
                      className="modal-input"
                      id="pv-motivo"
                      type="text"
                      maxLength={200}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Por ejemplo: cambio de planes"
                    />
                  </div>

                  <p className="modal-nota">
                    Cotización válida hasta las{' '}
                    {new Date(cotizacion.expiresAt).toLocaleTimeString('es-EC', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    .
                  </p>
                </>
              )}
            </>
          )}
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="btn-secundario"
            onClick={cerrar}
            disabled={enviando}
          >
            {tipo === 'cancelar' ? 'Conservar reserva' : 'Cerrar'}
          </button>
          <button
            type="button"
            className={tipo === 'cancelar' ? 'btn-peligro' : 'btn-primario'}
            onClick={acciones[tipo]}
            disabled={
              enviando ||
              (tipo === 'cancelar' && !cotizacion) ||
              (tipo === 'equipaje' && !opcionesEquipaje?.length)
            }
          >
            {enviando ? 'Procesando…' : textoConfirmar[tipo]}
          </button>
        </footer>
      </div>
    </div>
  );
}

/** El total de la opcion de equipaje, o 0 si la tarifa no trajo precio. */
function elegidoTotal(opcion) {
  return opcion?.price?.total ?? 0;
}
