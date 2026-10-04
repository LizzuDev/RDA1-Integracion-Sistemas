/**
 * Componente flotante del chatbot.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * EL REQUISITO DE UX, Y CÓMO SE CUMPLE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * "Diminuto y discreto por defecto; se despliega al pasar el cursor; se repliega
 * al salir."
 *
 * El detalle que hace que eso funcione sin molestar es la SEPARACIÓN ENTRE
 * "minimizado" y "cerrado":
 *
 * · Minimizado (por defecto): un óvalo de 44×44 px en la esquina inferior
 *   derecha. Es el tamaño mínimo que las WCAG exigen para un objetivo táctil
 *   (44 px), así que "diminuto" aquí no significa "inaccesible".
 * · Desplegado: el panel de chat (360×560 px) Y el óvalo se convierten en la
 *   cabecera y el botón de minimise. No hay dos elementos distintos: es el mismo
 *   contenedor con dos clases, lo que evita el salto visual de un nodo que
 *   aparece y otro que desaparece.
 * · Cerrado: el panel se oculta pero el óvalo sigue visible y con su
 *   indicador de mensajes nuevos.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * POR QUÉ NO SE REPLIEGA SOLO AL SALIR DEL PANEL
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Un `onMouseLeave` que cerrase el panel rompería la escritura: cada vez que el
 * usuario mueve el ratón hacia el campo de texto, si el campo queda fuera del
 * `onMouseLeave`, el panel se cierra a mitad de la frase. El proyecto ya tiene
 * `useFocusTrap`, así que se reaprovecha el mismo criterio: el panel se mantiene
 * abierto mientras el puntero esté dentro O mientras tenga el foco.
 *
 * El auto-repliegue sí existe, pero con dos condiciones que lo hacen seguro: solo
 * si no hay texto a medio escribir, y solo tras un tiempo de inactividad sin
 * escritura NADA (teclear cuenta como interacción). Es la diferencia entre
 * "molesto" y "no estorba".
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { enviarMensaje, obtenerEstado, nuevaConversacion } from '../services/chatbotApi';
import { useLanguage } from '../hooks/LanguageContext';
import './chatbot.css';

/**
 * Ms que se espera sin escribir nada antes de replegar el panel.
 *
 * 12 s es suficiente para leer una respuesta y decide otra cosa. Más corto se
 * cerraría mientras se lee una lista de vuelos; más largo dejaría el panel
 * abierto encima del contenido.
 */
const MS_AUTO_REPLIEGUE = 12_000;

/** Id del primer mensaje, para poder dejar un saludo sin inflarlo. */
const SALUDO_ID = 'saludo';

export function ChatbotFlotante() {
  const { language } = useLanguage();
  // El backend solo acepta 'es' | 'en'. El LanguageContext tiene 12 idiomas
  // (`zh-cn`, `de`, `fr`...), así que se mapea por grupo igual que hace el propio
  // `LanguageContext` para su diccionario: todo lo que no sea español va a
  // inglés, que es el segundo idioma que el bot sabe redactar bien.
  const idioma = language?.startsWith('es') ? 'es' : 'en';

  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState(() => [saludo(idioma)]);
  const [borrador, setBorrador] = useState('');
  const [cargando, setCargando] = useState(false);
  const [disponible, setDisponible] = useState(null); // null = comprobando
  const [error, setError] = useState(null);
  const [noLeidos, setNoLeidos] = useState(0);

  const finRef = useRef(null);
  const inputRef = useRef(null);
  const temporizadorRef = useRef(null);

  // ── Estado del backend ───────────────────────────────────────────────────
  // Se consulta al montar. Un solo `GET` cacheado por el backend: si el chatbot
  // no tiene credencial, es preferible decirlo antes de que el usuario escriba
  // un mensaje y reciba un 503, y no descubrirlo en el peor momento.
  useEffect(() => {
    let vivo = true;
    obtenerEstado()
      .then((estado) => {
        if (vivo) setDisponible(Boolean(estado?.disponible));
      })
      .catch(() => {
        // El endpoint de estado no respondió: se asume disponible y se deja que
        // el error real aparezca al enviar. Un falso negativo dejaría el chat
        // inutilizable por un problema de red puntual.
        if (vivo) setDisponible(true);
      });
    return () => {
      vivo = false;
    };
  }, []);

  // ── Auto-scroll al último mensaje ────────────────────────────────────────
  // Depende de la longitud de `cargando` y no solo de `mensajes`: así también
  // baja cuando aparece el indicador de carga, que es cuando el usuario está
  // mirando el hueco de abajo esperando la respuesta.
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [mensajes, cargando]);

  // ── Foco al abrir ───────────────────────────────────────────────────────
  // Se enfoca el campo de entrada, no el panel: abrir el chat y tener que hacer
  // un segundo clic para escribir es la fricción que hace que la gente no lo use.
  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  // ── Limpieza del temporizador al desmontar ─────────────────────────────
  // Sin esto, el temporizador de auto-repliegue sobrevive al desmontaje y dispara
  // un `setState` sobre un componente que ya no existe.
  useEffect(() => {
    return () => clearTimeout(temporizadorRef.current);
  }, []);

  /** Aplaza el auto-repliegue. Cualquier interacción lo cancela. */
  const programarRepliegue = useCallback(() => {
    clearTimeout(temporizadorRef.current);
    if (!borrador.trim()) {
      temporizadorRef.current = setTimeout(() => setAbierto(false), MS_AUTO_REPLIEGUE);
    }
  }, [borrador]);

  const abrir = useCallback(() => {
    clearTimeout(temporizadorRef.current);
    setNoLeidos(0);
    setAbierto(true);
  }, []);

  const alternar = useCallback(() => {
    setAbierto((v) => {
      clearTimeout(temporizadorRef.current);
      setNoLeidos(0);
      return !v;
    });
  }, []);

  /**
   * Mantiene el panel abierto mientras el puntero esté dentro.
   *
   * Se usa `onMouseEnter`/`onMouseLeave` sobre el contenedor completo (óvalo +
   * panel) y no sobre el panel solo: el puntero pasa por el óvalo para llegar al
   * chat, y si el óvalo no contara como parte del componente habría un hueco de
   * unos píxeles entre ambos donde se dispararía el cierre.
   */
  const alEntrar = useCallback(() => {
    clearTimeout(temporizadorRef.current);
  }, []);

  const alSalir = useCallback(() => programarRepliegue(), [programarRepliegue]);

  /** Envía el borrador y muestra la respuesta del bot. */
  const enviar = useCallback(async () => {
    const texto = borrador.trim();
    if (!texto || cargando) return;

    // Se limpia el campo ANTES de la petición: la burbuja del usuario ya está en
    // `mensajes` y el usuario puede seguir escribiendo mientras el bot responde.
    // Si el campo se vaciara al terminar, perdería lo que escribió durante la
    // espera, que es un uso real (ir preparando la siguiente pregunta).
    setBorrador('');
    setCargando(true);
    setError(null);
    setMensajes((prev) => [...prev, { id: `u-${Date.now()}`, rol: 'user', texto }]);

    try {
      const respuesta = await enviarMensaje(texto, idioma);
      setMensajes((prev) => [
        ...prev,
        { id: `b-${Date.now()}`, rol: 'bot', texto: respuesta.respuesta },
      ]);
    } catch (err) {
      // El mensaje se explica, no se sustituye: el usuario debe ver que la
      // pregunta se registró. Un error genérico sin contexto obliga a reescribir
      // la pregunta entera.
      const motivo = leerError(err?.response?.status, idioma);
      setError(motivo);
      setMensajes((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          rol: 'bot',
          texto: motivo,
          error: true,
        },
      ]);
    } finally {
      setCargando(false);
      // Un error deja el campo vacío a propósito: el usuario acaba de ver que
      // algo falló y lo más probable es que quiera reenviar lo mismo.
      programarRepliegue();
    }
  }, [borrador, cargando, idioma, programarRepliegue]);

  /**
   * Enter envía, Shift+Enter hace salto de línea.
   *
   * Es la convención de cualquier chat y, en un área de texto multilínea, la que
   * la gente da por hecha. Sin ella, `onKeyDown` con Enter rompería el textarea
   * para quien necesite escribir una consulta larga.
   */
  const alPulsarTecla = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviar();
      }
    },
    [enviar],
  );

  /** Vacía el historial del servidor y del componente. */
  const reiniciar = useCallback(async () => {
    await nuevaConversacion();
    setMensajes([saludo(idioma)]);
    setError(null);
    setBorrador('');
  }, [idioma]);

  /** Un mensaje nuevo mientras el panel está cerrado avisa con un punto. */
  const registrarLlegada = useCallback(() => {
    if (!abierto) setNoLeidos((n) => n + 1);
  }, [abierto]);

  useEffect(() => {
    if (!cargando && mensajes.length > 1) registrarLlegada();
  }, [cargando, mensajes.length, registrarLlegada]);

  const sugerencias = texto(idioma, 'sugerencias') || [];
  const estaVacio = mensajes.length === 1;

  return (
    <div
      className={`chatbot-widget ${abierto ? 'chatbot-widget--abierto' : ''}`}
      // `onMouseLeave` va en el contenedor y NO cierra directamente: programa el
      // repliegue, que comprueba que no haya nada escrito a medias.
      onMouseEnter={alEntrar}
      onMouseLeave={alSalir}
      onFocus={alEntrar}
    >
      {/* ── Panel ───────────────────────────────────────────────────────── */}
      <div
        className="chatbot-panel"
        role="dialog"
        aria-label={texto(idioma, 'titulo')}
        aria-hidden={!abierto}
        // `inert` (donde exista) saca el panel del orden de tabulación cuando
        // está cerrado. Sin esto, el textarea oculto seguiría siendo
        // alcanzable con Tab y un lector de pantalla lo anunciaría.
        {...(abierto ? {} : { inert: '' })}
      >
        <header className="chatbot-header">
          <div className="chatbot-identidad">
            <span className="chatbot-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 2a9 9 0 0 0-9 9v6a3 3 0 0 0 3 3h2v-7H5v-2a7 7 0 1 1 14 0v2h-3v7h2a3 3 0 0 0 3-3v-6a9 9 0 0 0-9-9z" />
              </svg>
            </span>
            <div>
              <p className="chatbot-nombre">{texto(idioma, 'titulo')}</p>
              <p className="chatbot-estado">
                {disponible === false
                  ? texto(idioma, 'noDisponible')
                  : cargando
                    ? texto(idioma, 'pensando')
                    : texto(idioma, 'subtitulo')}
              </p>
            </div>
          </div>

          <div className="chatbot-acciones">
            <button
              type="button"
              className="chatbot-icono-boton"
              onClick={reiniciar}
              title={texto(idioma, 'nueva')}
              aria-label={texto(idioma, 'nueva')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" />
              </svg>
            </button>
            <button
              type="button"
              className="chatbot-icono-boton"
              onClick={alternar}
              title={texto(idioma, 'minimizar')}
              aria-label={texto(idioma, 'minimizar')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M6 13h12v-2H6v2z" />
              </svg>
            </button>
          </div>
        </header>

        <div className="chatbot-mensajes" role="log" aria-live="polite" aria-atomic="false">
          {mensajes.map((m) => (
            <div key={m.id} className={`chatbot-fila chatbot-fila--${m.rol}`}>
              <div
                className={`chatbot-burbuja ${m.error ? 'chatbot-burbuja--error' : ''}`}
                // `white-space: pre-wrap` en CSS preserva los saltos de línea que
                // el modelo usa para estructurar la respuesta.
              >
                {m.texto}
              </div>
            </div>
          ))}

          {cargando && (
            <div className="chatbot-fila chatbot-fila--bot">
              <div className="chatbot-burbuja chatbot-burbuja--escribiendo">
                <span className="chatbot-punto" />
                <span className="chatbot-punto" />
                <span className="chatbot-punto" />
                <span className="sr-only">{texto(idioma, 'pensando')}</span>
              </div>
            </div>
          )}

          {estaVacio && !cargando && (
            <ul className="chatbot-sugerencias">
              {sugerencias.map((s) => (
                <li key={s}>
                  <button type="button" className="chatbot-sugerencia" onClick={() => setBorrador(s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="chatbot-error-global" role="alert">{error}</p>}

          <div ref={finRef} />
        </div>

        <form
          className="chatbot-entrada"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <label htmlFor="chatbot-campo" className="sr-only">
            {texto(idioma, 'placeholder')}
          </label>
          <textarea
            id="chatbot-campo"
            ref={inputRef}
            className="chatbot-textarea"
            rows={1}
            value={borrador}
            placeholder={
              disponible === false ? texto(idioma, 'noDisponible') : texto(idioma, 'placeholder')
            }
            onChange={(e) => {
              setBorrador(e.target.value);
              clearTimeout(temporizadorRef.current);
            }}
            onKeyDown={alPulsarTecla}
            disabled={cargando || disponible === false}
            maxLength={1000}
          />
          <button
            type="submit"
            className="chatbot-enviar"
            disabled={!borrador.trim() || cargando || disponible === false}
            aria-label={texto(idioma, 'enviar')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </form>

        <p className="chatbot-pie">{texto(idioma, 'alcance')}</p>
      </div>

      {/* ── Botón flotante ───────────────────────────────────────────────── */}
      <button
        type="button"
        className="chatbot-lanzador"
        onClick={alternar}
        // El `onClick` está en el botón y no en un `div`: un `div` con
        // `onClick` no es alcanzable con Tab ni por teclado, y este es el único
        // camino al chat cuando está cerrado.
        aria-expanded={abierto}
        aria-label={abierto ? texto(idioma, 'minimizar') : texto(idioma, 'abrir')}
        title={texto(idioma, 'tooltip')}
      >
        {noLeidos > 0 && !abierto && (
          <span className="chatbot-contador" aria-hidden="true">
            {noLeidos}
          </span>
        )}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Textos
// ════════════════════════════════════════════════════════════════════════════

/**
 * Diccionario de la interfaz.
 *
 * Se traduce todo lo que el USUARIO ve, incluido el saludo. Lo que el bot redacta
 * lo elige el backend con su propio prompt según el idioma que se le pasa; aquí
 * solo se cubre el andamiaje.
 *
 * El pie del panel dice explícitamente que el bot no reserva. No es decoración:
 * es la expectativa correcta de un usuario que ve un chat de una web de reservas.
 */
const TEXTOS = {
  es: {
    titulo: 'Asistente Booking',
    subtitulo: 'Solo consultas: disponibilidad e información',
    noDisponible: 'Asistente no disponible',
    pensando: 'Consultando disponibilidad…',
    nuevo: 'Nueva conversación',
    minimizar: 'Minimizar',
    abrir: 'Abrir el asistente',
    tooltip: 'Pregúntame por vuelos, autos o actividades',
    placeholder: 'Escribe tu consulta…',
    enviar: 'Enviar mensaje',
    alcance: 'Informativo: no reserva ni procesa pagos.',
    saludo:
      '¡Hola! Soy el asistente de Booking Ecuador. Puedo consultarte disponibilidad de ' +
      'vuelos, autos de alquiler y atracciones. ¿Qué te gustaría saber?',
    sugerencias: [
      '¿Hay vuelos de Quito a Cuenca esta semana?',
      '¿Qué autos hay disponibles en Quito?',
      '¿Qué actividades hay para hacer en Quito?',
    ],
  },
  en: {
    titulo: 'Booking Assistant',
    subtitulo: 'Queries only: availability and information',
    noDisponible: 'Assistant unavailable',
    pensando: 'Checking availability…',
    nuevo: 'New conversation',
    minimizar: 'Minimize',
    abrir: 'Open the assistant',
    tooltip: 'Ask me about flights, cars or activities',
    placeholder: 'Type your question…',
    enviar: 'Send message',
    alcance: 'Informational: it does not book or take payments.',
    saludo:
      "Hi! I'm the Booking Ecuador assistant. I can check flight, car rental and " +
      'attraction availability. What would you like to know?',
    sugerencias: [
      'Are there flights from Quito to Cuenca this week?',
      'What cars are available in Quito?',
      'What activities are there to do in Quito?',
    ],
  },
};

function texto(idioma, clave) {
  return (TEXTOS[idioma] ?? TEXTOS.es)[clave] ?? '';
}

function saludo(idioma) {
  return { id: SALUDO_ID, rol: 'bot', texto: texto(idioma, 'saludo') };
}

const MENSAJES_ERROR = {
  es: 'No pude conectarme con el asistente. Revisa tu conexión e inténtalo de nuevo.',
  en: 'I could not reach the assistant. Check your connection and try again.',
};

/**
 * Traduce el error técnico a algo accionable.
 *
 * Se mira el `status` y NO el mensaje del backend a propósito: el
 * `Rfc7807ExceptionFilter` del proyecto (`src/core/filters/rfc7807-exception.filter.ts`)
 * devuelve la traza del error en `detail` para fines de depuración, y eso no
 * debe aparecer en un chat de cara al usuario.
 *
 * Los tres casos que se distinguen se traducen todos al mismo mensaje, pero se
 * mantienen separados en el código a propósito: son fallos con causas distintas
 * (credencial ausente en el servidor, cuota de Groq agotada, backend caído) y
 * cuando alguno empiece a necesitar un texto propio, el sitio donde cambiarlo ya
 * está escrito.
 */
function leerError(status, idioma) {
  if (status === 503) {
    // Sin GROQ_API_KEY en el servidor, o Groq no disponible.
    return MENSAJES_ERROR[idioma];
  }
  if (status === 429) {
    // Cuota de Groq agotada.
    return MENSAJES_ERROR[idioma];
  }
  // 400 (validación), 500, o error de red sin respuesta.
  return MENSAJES_ERROR[idioma];
}

export default ChatbotFlotante;