import { useCallback, useEffect, useId, useState } from 'react';
import {
  EVENTOS_WEBHOOK,
  eliminarWebhook,
  listarWebhooks,
  registrarWebhook,
} from '../services/vuelosPublicApi';

/**
 * Gestion de suscripciones a webhooks, la cara B2B de la Fase 10.
 *
 * ── El secreto se escribe UNA vez y no se vuelve a mostrar ───────────────────
 * La API lo recibe al crear y devuelve una mascara (`whsec_...a1b2`). El campo
 * queda deshabilitado y con un aviso explicito, en vez de un input que parece
 * editable y cuyo valor real nadie conoce. Un integrador que pierde el secreto
 * tiene que crear otra suscripcion, y conviene que lo sepa antes de que lo
 * pierda.
 *
 * ── Solo HTTPS, y la UI lo dice ANTES de que el usuario lo descubra ──────────
 * El DDL impone `CHECK (swb_url ~ '^https://')`. Aceptar `http://localhost` en
 * el formulario y devolver un 400 es una forma de gastar el intento del
 * integrador; el aviso esta junto al campo.
 */

const PREFIJO = 'whsec_';

function generarSecretoSugerido() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return PREFIJO + crypto.randomUUID().replace(/-/g, '');
  }
  return PREFIJO + Math.random().toString(16).slice(2).padEnd(32, '0');
}

export function WebhooksPage() {
  const [suscripciones, setSuscripciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Formulario
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState(generarSecretoSugerido);
  const [eventos, setEventos] = useState(['booking.cancelled']);
  const [borrando, setBorrando] = useState(null);

  const helpId = useId();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await listarWebhooks();
      setSuscripciones(r);
      setError(null);
    } catch (fallo) {
      setError(
        fallo?.response?.data?.detail ??
          'No se pudieron cargar las suscripciones.',
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    document.title = 'Webhooks · Booking Prototipo';
    return () => {
      document.title = 'Booking Prototipo';
    };
  }, []);

  const alternarEvento = (valor) => {
    setEventos((prev) =>
      prev.includes(valor)
        ? prev.filter((v) => v !== valor)
        : [...prev, valor],
    );
  };

  const esHttps = url.trim().toLowerCase().startsWith('https://');
  const puedeEnviar = esHttps && eventos.length > 0 && secret.length >= 16 && !guardando;

  const enviar = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;
    setGuardando(true);
    setError(null);
    setExito(null);
    try {
      const creada = await registrarWebhook({ url: url.trim(), events: eventos, secret });
      setExito(
        `Suscripción creada. Guarda el secreto ahora: la API solo devuelve ` +
          `una máscara (${creada.secret}) y no podrás recuperarlo.`,
      );
      setUrl('');
      setSecret(generarSecretoSugerido());
      setEventos(['booking.cancelled']);
      await cargar();
    } catch (fallo) {
      setError(
        fallo?.response?.data?.detail ??
          'No se pudo registrar la suscripción.',
      );
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (id) => {
    setBorrando(id);
    setError(null);
    try {
      await eliminarWebhook(id);
      await cargar();
    } catch (fallo) {
      setError(fallo?.response?.data?.detail ?? 'No se pudo eliminar.');
    } finally {
      setBorrando(null);
    }
  };

  return (
    <main className="main-content main-content-vuelos">
      <h1 className="section-title">Webhooks</h1>
      <p className="section-subtitle">
        Recibe avisos de tus reservas en tu propio sistema. Se envían eventos
        firmados; este prototipo los registra pero todavía no los entrega.
      </p>

      {error && (
        <p className="modal-error" role="alert">
          {error}
        </p>
      )}
      {exito && (
        <p className="postventa-exito" role="status">
          {exito}
        </p>
      )}

      {/* ── Formulario ────────────────────────────────────────────────────── */}
      <form className="card" onSubmit={enviar}>
        <div className="card-body">
          <h2 className="card-title">Nueva suscripción</h2>

          <div className="campo">
            <label className="modal-label" htmlFor="wh-url">
              URL de destino
            </label>
            <input
              className="modal-input"
              id="wh-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://mi-empresa.example.com/hooks/vuelos"
              aria-describedby={helpId}
              required
            />
            <p className="modal-nota" id={helpId}>
              Solo <strong>https</strong>. El protocolo http está rechazado por la
              base de datos, así que <code>http://localhost</code> no sirve
              tampoco en desarrollo.
            </p>
          </div>

          <fieldset className="modal-grupo">
            <legend className="modal-legend">Eventos</legend>
            <div className="webhooks-eventos">
              {EVENTOS_WEBHOOK.map((e) => (
                <label className="webhooks-evento" key={e.valor}>
                  <input
                    type="checkbox"
                    checked={eventos.includes(e.valor)}
                    onChange={() => alternarEvento(e.valor)}
                  />
                  <span>{e.texto}</span>
                  <code>{e.valor}</code>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="campo">
            <label className="modal-label" htmlFor="wh-secret">
              Secreto de firma
            </label>
            <input
              className="modal-input"
              id="wh-secret"
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              minLength={16}
              required
            />
            <p className="modal-nota">
              Se envía una sola vez y la API guarda su hash. Después solo verás
              una máscara, así que cópialo antes de registrar.
            </p>
          </div>

          <div className="postventa-acciones">
            <button type="submit" className="btn-primario" disabled={!puedeEnviar}>
              {guardando ? 'Registrando…' : 'Registrar suscripción'}
            </button>
          </div>
        </div>
      </form>

      {/* ── Listado ───────────────────────────────────────────────────────── */}
      <section className="card" aria-labelledby="wh-lista">
        <div className="card-body">
          <h2 className="card-title" id="wh-lista">
            Suscripciones activas
            <span className="card-title-nota">
              {' '}
              · {suscripciones.length}
            </span>
          </h2>

          {cargando && (
            <p className="state-subtitle" role="status">
              Cargando suscripciones…
            </p>
          )}

          {!cargando && suscripciones.length === 0 && (
            <p className="aviso-tickets" role="note">
              Todavía no tienes suscripciones. Registra una arriba para empezar a
              recibir eventos.
            </p>
          )}

          <ul className="webhooks-lista">
            {suscripciones.map((s) => (
              <li key={s.id} className="webhooks-item">
                <div className="webhooks-item-cabecera">
                  <a className="webhooks-url" href={s.url} rel="noreferrer noopener">
                    {s.url}
                  </a>
                  <button
                    type="button"
                    className="btn-peligro btn-pequeno"
                    onClick={() => borrar(s.id)}
                    disabled={borrando === s.id}
                  >
                    {borrando === s.id ? 'Eliminando…' : 'Eliminar'}
                  </button>
                </div>
                <div className="webhooks-datos">
                  <span>
                    <strong>Secreto:</strong>{' '}
                    <code>{s.secret}</code>
                  </span>
                  <span>
                    Creada el{' '}
                    {new Date(s.createdAt).toLocaleDateString('es-EC')}
                  </span>
                </div>
                <div className="webhooks-chips">
                  {s.events.map((e) => (
                    <span className="webhooks-chip" key={e}>
                      {e}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
