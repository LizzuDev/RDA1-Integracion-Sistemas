/**
 * Constantes del modulo de chatbot.
 *
 * ── Por que existe un catalogo deciuudades aqui ─────────────────────────────
 *
 * `POST /api/v1/vuelos/search` exige codigos IATA EXACTOS (`^[A-Z]{3}$`) y hace
 * `aeropuertoOrigen = origin AND aeropuertoDestino = destination AND fecha =
 * departureDate`. No hay busqueda difusa: si el modelo manda `"Quito"` en vez de
 * `"UIO"`, el `ValidationPipe` lo rechaza con 400 y si mandara un IATA
 * equivocado devolveria `totalOffers: 0`, que el usuario leeria como "no hay
 * vuelos" cuando en realidad se consulto una ruta inexistente.
 *
 * O sea: el CIUDAD es el punto donde una alucinacion se vuelve invisible. Por eso
 * la normalizacion NO se delega en el LLM. El modelo elige de una lista cerrada
 * que se le pasa en el prompt del sistema y en la herramienta
 * `catalogo_destinos`; esta tabla es la unica fuente de verdad y el executor la
 * vuelve a aplicar antes de llamar a la API (defensa en profundidad: el LLM puede
 * ignorar la lista).
 */

/**
 * Destinos operados por Booking Ecuador, con su IATA y su `city_id` de Booking.
 *
 * `city_id` se usa para el filtro `cities` de `POST /api/v1/atracciones/search`.
 * Los valores vienen de `AutosService.getDepots()` (`-924216` Quito,
 * `-924190` Guayaquil) y del resto de*D.T.O*s del proyecto; los que no estan
 * confirmados se dejan en `null` y el executor OMITE el filtro en vez de
 * inventar un id, porque un `city_id` equivocado devuelve cero resultados y eso
 * ya es una alucinacion deavailability.
 */
export interface DestinoConocido {
  /** Nombre canonico, como lo muestra el bot al usuario. */
  readonly nombre: string;
  /** Codigo IATA de 3 letras, o `null` si el destino no tiene aeropuerto. */
  readonly iata: string | null;
  /** Alias que se aceptan al escribir, en minúsculas y sin acentos. */
  readonly alias: readonly string[];
  /** Ciudad (no el aeropuerto) cuando hay mas de uno: p. ej. Quito tiene UIO y SCY. */
  readonly iataAlternos?: readonly string[];
  /** `city_id` de Booking, `null` si no se conoce con certeza. */
  readonly cityId: number | null;
  /** Paises/regiones donde esta el destino, para el filtro `countries`. */
  readonly pais: string;
}

/**
 * Catalogo cerrado de destinos.
 *
 * No cubre el mundo entero a proposito: cubre lo que la plataforma vende. Un
 * destino fuera de esta tabla NO se "adivina", se responde que no hay cobertura,
 * que es la respuesta honesta.
 */
export const DESTINOS: readonly DestinoConocido[] = [
  // ── Ecuador (cobertura principal) ────────────────────────────────────────
  { nombre: 'Quito', iata: 'UIO', alias: ['quito'], iataAlternos: ['SCY'], cityId: -924216, pais: 'EC' },
  { nombre: 'Guayaquil', iata: 'GYE', alias: ['guayaquil', 'guayaquill'], cityId: -924190, pais: 'EC' },
  { nombre: 'Cuenca', iata: 'CUE', alias: ['cuenca'], cityId: null, pais: 'EC' },
  { nombre: 'Galápagos', iata: 'GPS', alias: ['galapagos', 'galapagos islands', 'islas galapagos', 'san cristobal'], cityId: null, pais: 'EC' },
  { nombre: 'Baltra', iata: 'BSC', alias: ['baltra'], cityId: null, pais: 'EC' },
  { nombre: 'Manta', iata: 'MEC', alias: ['manta'], cityId: null, pais: 'EC' },
  { nombre: 'Ambato', iata: 'AME', alias: ['ambato'], cityId: null, pais: 'EC' },
  { nombre: 'Loja', iata: 'LOJ', alias: ['loja'], cityId: null, pais: 'EC' },
  { nombre: 'Portoviejo', iata: 'POV', alias: ['portoviejo', 'manabi'], cityId: null, pais: 'EC' },
  { nombre: 'Esmeraldas', iata: 'ESM', alias: ['esmeraldas'], cityId: null, pais: 'EC' },
  { nombre: 'Ibarra', iata: 'IBB', alias: ['ibarra'], cityId: null, pais: 'EC' },
  { nombre: 'Machala', iata: 'MCH', alias: ['machala'], cityId: null, pais: 'EC' },
  { nombre: 'Milagro', iata: 'MIL', alias: ['milagro'], cityId: null, pais: 'EC' },
  { nombre: 'Coca', iata: 'COE', alias: ['coca', 'el coca'], cityId: null, pais: 'EC' },

  // ── Colombia ─────────────────────────────────────────────────────────────
  { nombre: 'Bogotá', iata: 'BOG', alias: ['bogota', 'bogotá'], cityId: null, pais: 'CO' },
  { nombre: 'Medellín', iata: 'MDE', alias: ['medellin', 'medellín'], cityId: null, pais: 'CO' },
  { nombre: 'Cartagena', iata: 'CTG', alias: ['cartagena', 'cartagena de indias'], cityId: null, pais: 'CO' },
  { nombre: 'Cali', iata: 'CLO', alias: ['cali'], cityId: null, pais: 'CO' },
  { nombre: 'Cúcuta', iata: 'CUC', alias: ['cucuta', 'cúcuta'], cityId: null, pais: 'CO' },

  // ── Perú ─────────────────────────────────────────────────────────────────
  { nombre: 'Lima', iata: 'LIM', alias: ['lima'], cityId: null, pais: 'PE' },
  { nombre: 'Cusco', iata: 'CUZ', alias: ['cusco', 'cuzco', 'cuzco', 'puno'], cityId: null, pais: 'PE' },
  { nombre: 'Arequipa', iata: 'AQP', alias: ['arequipa'], cityId: null, pais: 'PE' },

  // ── Destinos regionales comunes ──────────────────────────────────────────
  { nombre: 'Miami', iata: 'MIA', alias: ['miami', 'estados unidos', 'usa', 'eeuu'], cityId: null, pais: 'US' },
  { nombre: 'Nueva York', iata: 'JFK', alias: ['nueva york', 'new york', 'ny', 'eeuu', 'estados unidos'], cityId: null, pais: 'US' },
  { nombre: 'Madrid', iata: 'MAD', alias: ['madrid', 'españa', 'espana'], cityId: null, pais: 'ES' },
  { nombre: 'Panamá', iata: 'PTY', alias: ['panama', 'panamá', 'ciudad de panama'], cityId: null, pais: 'PA' },
  { nombre: 'São Paulo', iata: 'GRU', alias: ['sao paulo', 'são paulo', 'brasil'], cityId: null, pais: 'BR' },
  { nombre: 'Buenos Aires', iata: 'EZE', alias: ['buenos aires', 'argentina'], cityId: null, pais: 'AR' },
  { nombre: 'Santiago', iata: 'SCL', alias: ['santiago', 'chile'], cityId: null, pais: 'CL' },
] as const;

/**
 * Catalogo de categorias de autos, para que el modelo no invente una categoria
 * que el usuario pidio en espanol y la API no sepa mapear.
 */
export const CATEGORIAS_AUTO: readonly string[] = [
  'ECONOMY',
  'COMPACT',
  'MIDSIZE',
  'SUV',
  'VAN',
  'LUXURY',
];

/** Transmisiones admitidas por `POST /api/v1/autos/constants`. */
export const TRANSMISIONES_AUTO: readonly string[] = ['AUTOMATIC', 'MANUAL'];

/**
 * Limites operativos.
 *
 * Son(topes de coste y de latencia), no de correctitud, pero un LLM en un bucle
 * de tool-calling puede generar peticiones ilimitadas: cada iteracion es una
 * llamada de red a la API de datos Y potentially otra a Groq. Sin tope, un
 * "busca todos los vuelos de diciembre" se traduce en docenas de llamadas
 * mientras el usuario mira un spinner.
 */
export const LIMITES = {
  /** Iteraciones maximas del bucle de tool-calling por mensaje del usuario. */
  ITERACIONES_TOOL: 3,
  /** Turnos (par usuario+bot) que se conservan por sesion. */
  TURNOS_POR_SESION: 8,
  /** Minutos de inactividad antes de que una sesion expire del mapa en memoria. */
  TTL_SESION_MINUTOS: 60,
  /** Numero maximo de conversaciones vivas a la vez (protege la memoria del proceso). */
  SESIONES_MAXIMAS: 500,
  /** Resultados por herramienta que se le pasan al modelo. */
  MAX_RESULTADOS_VUELOS: 4,
  MAX_RESULTADOS_AUTOS: 5,
  MAX_RESULTADOS_ATRACCIONES: 4,
  /** Timeout de la llamada a la API de datos. */
  TIMEOUT_DATOS_MS: 12_000,
  /** Timeout de la llamada a Groq. */
  TIMEOUT_GROQ_MS: 30_000,
  /** Temperatura. 0.1 porque es un bot factual: la creatividad solo introduce errores. */
  TEMPERATURA: 0.1,

  /**
   * Tope del historial que se envia a Groq, en mensajes.
   *
   * Bajó de 16 a 8 al optimizar el presupuesto de tokens. Con el historial
   * completo, un turno reciente costaba lo mismo que el system prompt entero, y la
   * mitad de esa ventana era de una conversación que el usuario ya había olvidado.
   *
   * Ocho mensajes son cuatro turnos, que es lo que alcanza para entender "también
   * para el día 14" o "y en inglés". Si se corta el historial, `ultimosTurnos()`
   * garantiza que empiece en un turno del usuario, para que el modelo no crea que
   * él dijo la primera línea.
   */
  MAX_MENSAJES_HISTORIAL: 6,

  /**
   * Reintentos ante un 429 de Groq (límite de tokens por minuto).
   *
   * El plan gratuito limita a ~8 000 tokens/minuto. Con los esquemas y el prompt
   * optimizados, un turno completo baja a ~800 tokens, así que caben ~10 por
   * minuto y el 429 pasa a ser la excepción (dos personas a la vez) en vez de lo
   * normal. Un reintento lo resuelve casi siempre.
   */
  REINTENTOS_429: 2,
  /** Espera maxima entre reintentos, en ms. Techo para no bloquear el turno. */
  ESPERA_MAX_REINTENTO_MS: 6_000,

  /**
   * Cuántos turnos de chatbot se procesan a la VEZ en este proceso.
   *
   * MEDIDO contra la API real, con el presupuesto ya optimizado:
   *
   * · 1 turno ≈ 800 tokens de prompt × 2 llamadas = ~1 600 tokens/turno.
   * · 2 turnos simultáneos ≈ 3 200 tokens. Cabe de sobra en 8 000/min.
   * · 5 simultáneos ≈ 8 000 tokens. Justo en el límite.
   *
   * Por eso son 2 y no 1: con el código anterior (unos 5 000 tokens por turno) el
   * valor tenía que ser 1 porque tres simultáneos no cabían ni con reintentos.
   * Ahora dos usuarios chateando a la vez se responden sin que ninguno espere, y
   * el reintento cubre el tercero.
   *
   * Con un plan de pago, subirlo a 4–6 es todo lo que hace falta.
   */
  CONCURRENCIA_CHAT: 2,

  /**
   * Turnos que pueden esperar en la cola antes de ser rechazados.
   *
   * Es un tope de memoria y de tiempo de espera: si la cola se llena, el
   * siguiente recibe un 503 inmediato y honesto ("está ocupado") en lugar de
   * quedarse esperando a un minuto que puede no llegar nunca.
   */
  COLA_CHAT_MAX: 20,
} as const;

/**
 * Modelo por defecto.
 *
 * ── Por qué NO `llama-3.3-70b-versatile` ────────────────────────────────────
 *
 * Era el modelo indicado para este bot, y ya no está: Groq lo retiró de su
 * catálogo y la API responde `404 The model llama-3.3-70b-versatile does not
 * exist or you do not have access to it`. Verificado contra
 * `GET https://api.groq.com/openai/v1/models`.
 *
 * ── Cómo se eligió entre los que quedan ────────────────────────────────────
 *
 * MEDIDO con ráfagas contra la API, porque el límite de tokens por minuto NO es
 * el mismo en todos los modelos y no hay endpoint que lo consulte:
 *
 * | Modelo                  | TPM   | Tool-calling |
 * |-------------------------|-------|--------------|
 * | `openai/gpt-oss-20b`    | 8 000 | sí           |
 * | `openai/gpt-oss-120b`   | 8 000 | sí           |
 * | `qwen/qwen3.8-27b`      | 7 000 | sí           |
 * | `allam-2-7b`            | —     | NO loSoporta |
 *
 * Los tres que lo soportan emiten `tool_calls` con argumentos idénticos a los
 * otros, así que el límite de TPM es lo único que los separa. Se elige el 20b por
 * dos razones concretas:
 *
 *  1. **Mismo TPM que el 120b, pero más rápido.** El TPM es el recurso escaso; el
 *     tamaño del modelo solo afecta a la latencia. En una demo, responder en 2 s en
 *     vez de en 5 s pesa más que la diferencia de calidad entre 20B y 120B en una
 *     tarea que consiste en extraer fechas y ciudades de una frase.
 *  2. **Verificado con tool-calling real.** Emitió
 *     `consultar_vuelos({"origen":"UIO","destino":"CUE","fecha":"2026-10-06"})`
 *     exacto, sin tener que reintentar por JSON mal formado.
 *
 * `GROQ_MODEL` alcanza al 120b o a `qwen/qwen3.8-27b` sin tocar código, por si en
 * la defensa hay que cambiar.
 */
export const MODELO_POR_DEFECTO = 'openai/gpt-oss-20b';