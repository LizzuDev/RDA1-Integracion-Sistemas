/**
 *Gestion del consentimiento de cookies.
 *
 * ── Modelo de consentimiento ───────────────────────────────────────────────
 * `null`    → el usuario todavia no ha decidido. El banner se muestra.
 * `'all'`   → acepto todas, incluidas las no esenciales (medicion).
 * `'essential'` → acepto solo las imprescindibles. Es el default
 *             conservador: si el usuario cierra el banner sin decidir, se
 *             asume este valor y NO se carga ningun rastreador.
 *
 * ── Por que localStorage y no viola la regla de PII ───────────────────────
 * El FRONTEND_IMPLEMENTATION_PLAN.md (seccion 3) prohibe guardar PII en
 * localStorage. Aqui NO se guarda ningun dato personal: se guarda una
 * preferencia de configuracion booleana y una marca de tiempo. Eso es
 * exactamente lo que elRGPD y la LOPDP permiten conservar sin consentimiento
 * previo, ya que no permite identificar a nadie.
 *
 * El token JWT NO se guarda aqui, ni en localStorage, ni en sessionStorage:
 * vive solo en memoria. Ver `services/api.ts`.
 */

const CLAVE = 'booking.consentimientoCookies.v1';

/** Decisiones validas. Cualquier otro valor se trata como `null`. */
const DECISIONES = ['all', 'essential'];

/** Nombres de cookie por categoria, para poder mostrarlos al usuario. */
export const CATEGORIAS_COOKIES = [
  {
    id: 'esenciales',
    nombre: 'Cookies esenciales',
    obligatoria: true,
    descripcion:
      'Necesarias para el funcionamiento basico: mantener la sesion, conservar la seguridad mediante tokens y recordar tu decision sobre el consentimiento. No se pueden desactivar.',
  },
  {
    id: 'analiticas',
    nombre: 'Cookies de medicion',
    obligatoria: false,
    descripcion:
      'Permiten medir el uso de forma agregada para mejorar el servicio. Se cargan solo si las aceptas de forma explicita.',
  },
];

/**
 * Lee el consentimiento guardado.
 * @returns {null | 'all' | 'essential'}
 */
export function leerConsentimiento() {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const parsed = JSON.parse(crudo);
    return DECISIONES.includes(parsed?.decision) ? parsed.decision : null;
  } catch {
    // localStorage puede estar bloqueado (modo privado, cookies deshabilitadas).
    // En ese caso tratamos al usuario como "sin decidir", que es lo seguro.
    return null;
  }
}

/**
 * Persiste el consentimiento.
 * @param {'all' | 'essential'} decision
 */
export function guardarConsentimiento(decision) {
  if (!DECISIONES.includes(decision)) {
    throw new Error(`Decision de consentimiento no valida: ${decision}`);
  }
  try {
    window.localStorage.setItem(
      CLAVE,
      JSON.stringify({ decision, fecha: new Date().toISOString(), version: 1 }),
    );
  } catch {
    // Si no se puede persistir, la sesion sigue funcionando: el banner volvera
    // a mostrarse en la proxima carga, que es el comportamiento aceptable.
  }
}

/** Borra el consentimiento guardado (util para pruebas). */
export function borrarConsentimiento() {
  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    /* sin persistencia disponible: nada que borrar */
  }
}

/**
 * Indica si una categoria de cookie puede cargarse.
 * Las esenciales siempre; las demas, solo con consentimiento 'all'.
 */
export function puedeCargar(categoriaId) {
  if (categoriaId === 'esenciales') return true;
  return leerConsentimiento() === 'all';
}

/**
 * Puerta de entrada para scripts de terceros (analitica, mapas, publicidad).
 *
 * El banner de consentimiento "bloquea rastreadores" en sentido literal:
 * este helper es el unico punto por el que un script externo puede entrar, y
 * se niega a inyectarlo mientras no exista consentimiento.
 *
 * @param {string} src          URL del script
 * @param {object} [opciones]    { categoria = 'analiticas', async = true, attrs }
 * @returns {boolean}            true si se inyecto, false si se bloqueo
 */
export function cargarScriptOpcional(src, opciones = {}) {
  const { categoria = 'analiticas', async = true, attrs = {} } = opciones;

  if (!puedeCargar(categoria)) {
    // Bloqueado a proposito. Se deja traza en consola para depurar, nunca datos.
    console.info(
      `[consentimiento] Script bloqueado (categoria "${categoria}"): ${src}`,
    );
    return false;
  }

  const el = document.createElement('script');
  el.src = src;
  if (async) el.async = true;
  for (const [clave, valor] of Object.entries(attrs)) {
    el.setAttribute(clave, valor);
  }
  document.head.appendChild(el);
  return true;
}

/**
 * Suscripcion simple a los cambios de consentimiento.
 * Permite que componentes externos se re-rendericen cuando la decision cambia
 * sin necesidad de un contexto global.
 * @param {(decision: null | 'all' | 'essential') => void} listener
 * @returns {() => void} funcion para cancelar la suscripcion
 */
export function suscribirConsentimiento(listener) {
  const handler = (evento) => {
    if (evento.key === CLAVE) listener(leerConsentimiento());
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
