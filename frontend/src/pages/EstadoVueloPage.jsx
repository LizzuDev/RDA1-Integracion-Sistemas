import { useCallback, useEffect, useId, useState } from 'react';
import { consultarEstadoVuelo } from '../services/vuelosPublicApi';
import { extraerFecha, extraerHora, hoyEnIso } from '../services/formato';

/**
 * Pagina publica de estado de vuelo (`/estado-vuelos`).
 *
 * Es la replica del tablero de salidas de un aeropuerto. Dos decisiones:
 *
 * ── Es PUBLICA de verdad ──────────────────────────────────────────────────────
 * El endpoint no lleva `X-Device-Fingerprint` porque el contrato declara
 * `security: []`. El buscador no pide iniciar sesion, y funciona desde una
 * pestaña nueva. Es la pantalla que un pasajero consulta en el vestibulo, con la
 * red del movil y sin cuenta.
 *
 * ── Las tres horas se muestran a la vez ───────────────────────────────────────
 * Un tablero real enseña la hora PROGRAMADA en grande, y la estimada y la real
 * solo cuando difieren. Ocultarlas cuando coinciden reduce ruido, asi que solo
 * se omiten si hay nada que decir: si la estimada es igual que la programada,
 * la fila de retraso no aparece.
 */

/** Textos y tonos de cada estado, para que el color nunca sea el unico indicio. */
const ESTADOS = {
  SCHEDULED: { texto: 'Programado', tono: 'programado' },
  BOARDING: { texto: 'Embarcando', tono: 'embarcando' },
  DEPARTED: { texto: 'En vuelo', tono: 'envuelo' },
  DELAYED: { texto: 'Retrasado', tono: 'retrasado' },
  ARRIVED: { texto: 'Aterrizado', tono: 'aterrizado' },
  CANCELLED: { texto: 'Cancelado', tono: 'cancelado' },
  DIVERTED: { texto: 'Desviado', tono: 'desviado' },
};

/**
 * Minutos de retraso respecto a lo programado, o `null` si no hay Estimada.
 *
 * Se compara en minutos y se redondea: una diferencia de 90 segundos sale
 * "1 min" y no "0.02 h", que es como lo lee un pasajero.
 */
function minutosDeRetraso(ep) {
  if (!ep?.estimatedAt || !ep?.scheduledAt) return null;
  const dif =
    (new Date(ep.estimatedAt).getTime() - new Date(ep.scheduledAt).getTime()) / 60000;
  return Math.round(dif);
}

/** Una celda de hora: la programada siempre, la estimada y la real si existen. */
function CeldaHora({ ep, esSalida }) {
  if (!ep) return null;
  const retraso = esSalida ? minutosDeRetraso(ep) : null;

  return (
    <div className="tablero-hora">
      <span className="tablero-hora-programada">
        {extraerHora(ep.scheduledAt)}
      </span>
      {ep.estimatedAt && retraso !== 0 && (
        <span className="tablero-hora-secundaria">
          est. {extraerHora(ep.estimatedAt)}
        </span>
      )}
      {ep.actualAt && (
        <span className="tablero-hora-real">
          real {extraerHora(ep.actualAt)}
        </span>
      )}
      {retraso !== null && retraso > 0 && (
        <span className="tablero-retraso">+{retraso} min</span>
      )}
    </div>
  );
}

export function EstadoVueloPage() {
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(hoyEnIso());
  const [vuelo, setVuelo] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(null);
  const errorId = useId();

  // El estado del vuelo cambia solo: se consulta cada 60 s mientras haya
  // resultado en pantalla. Sin esto, un tablero de aeropuerto ensenaria un
  // "Salida 11:10" congelado a quien lo mira durante una hora.
  const refrescar = useCallback(async (silencioso) => {
    if (!silencioso) setBuscando(true);
    try {
      const r = await consultarEstadoVuelo(numero, fecha);
      setVuelo(r);
      setError(null);
    } catch (fallo) {
      if (!silencioso) {
        setVuelo(null);
        setError(
          fallo?.response?.data?.detail ??
            'No se pudo consultar el estado del vuelo.',
        );
      }
    } finally {
      setBuscando(false);
    }
  }, [numero, fecha]);

  useEffect(() => {
    if (!vuelo) return undefined;
    const t = setInterval(() => refrescar(true), 60000);
    return () => clearInterval(t);
  }, [vuelo, refrescar]);

  useEffect(() => {
    document.title = 'Estado de vuelos · Booking Prototipo';
    return () => {
      document.title = 'Booking Prototipo';
    };
  }, []);

  const buscar = (e) => {
    e.preventDefault();
    if (!numero.trim() || !fecha) return;
    refrescar(false);
  };

  const estado = vuelo ? (ESTADOS[vuelo.status] ?? { texto: vuelo.status, tono: 'programado' }) : null;

  return (
    <main className="main-content main-content-vuelos">
      <h1 className="section-title">Estado de vuelos</h1>
      <p className="section-subtitle">
        Consulta pública. No necesitas iniciar sesión.
      </p>

      {/* ── Buscador ──────────────────────────────────────────────────────── */}
      <form className="filtros-reservas" onSubmit={buscar}>
        <div className="campo">
          <label className="modal-label" htmlFor="estado-numero">
            Número de vuelo
          </label>
          <input
            className="modal-input"
            id="estado-numero"
            type="text"
            maxLength={10}
            placeholder="LA4041"
            value={numero}
            onChange={(e) => setNumero(e.target.value.toUpperCase())}
            autoComplete="off"
            // `uppercase` en el onChange para que lo tecleado se lea igual a como
            // se guarda, sin depender de que el backend lo normalice.
          />
        </div>
        <div className="campo">
          <label className="modal-label" htmlFor="estado-fecha">
            Fecha de salida
          </label>
          <input
            className="modal-input"
            id="estado-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
        <div className="campo campo-boton">
          <button
            type="submit"
            className="btn-primario"
            disabled={buscando || !numero.trim() || !fecha}
          >
            {buscando ? 'Consultando…' : 'Consultar'}
          </button>
        </div>
      </form>

      {error && (
        <p className="modal-error" role="alert" id={errorId}>
          {error}
        </p>
      )}

      {/* ── Tablero ───────────────────────────────────────────────────────── */}
      {vuelo && (
        <section className="tablero" aria-labelledby="tablero-titulo">
          <header className="tablero-cabecera">
            <div>
              <h2 className="tablero-vuelo" id="tablero-titulo">
                {vuelo.flightNumber}
              </h2>
              <p className="tablero-subtitulo">
                {vuelo.marketingCarrier}
                {vuelo.operatingCarrier !== vuelo.marketingCarrier
                  ? ` · operado por ${vuelo.operatingCarrier}`
                  : ''}
                {vuelo.aircraft ? ` · ${vuelo.aircraft}` : ''}
                {` · ${extraerFecha(vuelo.date)}`}
              </p>
            </div>
            <span className={`tablero-estado tablero-estado-${estado.tono}`}>
              {estado.texto}
            </span>
          </header>

          <div className="tablero-ruta">
            <div className="tablero-par">
              <span className="tablero-etiqueta">Salida</span>
              <span className="tablero-iata">{vuelo.departure.iataCode}</span>
              {vuelo.departure.terminal && (
                <span className="tablero-terminal">
                  Terminal {vuelo.departure.terminal}
                </span>
              )}
              <CeldaHora ep={vuelo.departure} esSalida />
            </div>

            <div className="tablero-flecha" aria-hidden="true">
              ──────✈──────
            </div>

            <div className="tablero-par">
              <span className="tablero-etiqueta">Llegada</span>
              <span className="tablero-iata">{vuelo.arrival.iataCode}</span>
              {vuelo.arrival.terminal && (
                <span className="tablero-terminal">
                  Terminal {vuelo.arrival.terminal}
                </span>
              )}
              <CeldaHora ep={vuelo.arrival} esSalida={false} />
            </div>
          </div>

          <p className="tablero-nota">
            Se actualiza automáticamente cada minuto. Última consulta:{' '}
            {new Date().toLocaleTimeString('es-EC', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            .
          </p>
        </section>
      )}

      {!vuelo && !error && (
        <div className="state-container">
          <div className="error-icon" aria-hidden="true">
            ✈
          </div>
          <h2 className="state-title">Consulta un vuelo</h2>
          <p className="state-subtitle">
            Escribe el número de vuelo y la fecha de salida para ver su estado
            en tiempo real.
          </p>
        </div>
      )}
    </main>
  );
}
