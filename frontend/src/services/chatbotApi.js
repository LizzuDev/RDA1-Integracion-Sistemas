/**
 * Cliente del chatbot.
 *
 * Reutiliza la instancia global de `services/api.ts` a propósito, no axios suelto.
 * Así hereda el `baseURL` (`VITE_API_URL`), el interceptor de JWT y —lo que más
 * importa aquí— el tratamiento de errores: si el backend devuelve un 503 con el
 * motivo (por ejemplo "falta GROQ_API_KEY"), el componente puede distinguirlo de
 * un 500 y explicarlo en vez de mostrar un error genérico.
 */
import { api } from './api';

/**
 * Id de sesión de la conversación.
 *
 * Se genera UNA vez y se guarda en `localStorage` para que el historial del
 * servidor sobreviva a un refresh de la página: sin esto, recargar borraría la
 * conversación a mitad de una consulta y el bot perdería el contexto de lo ya
 * dicho.
 *
 * `localStorage` y no un `useState` porque el estado de React muere con la
 * pestaña. La alternativa (un id nuevo cada montaje) haría que cada recarga
 * borrara el historial en el servidor sin avisar.
 *
 * El `try/catch` cubre el modo privado de Safari, donde `localStorage` lanza en
 * vez de devolver `null`. En ese caso se usa un id en memoria: se pierde el
 * historial al recargar, pero el chat sigue funcionando.
 */
const CLAVE_SESION = 'booking_chatbot_session';

/**
 * Id nuevo de sesión, con el formato que exige el `@Matches` del DTO
 * `sessionId`: entre 8 y 64 caracteres de `[A-Za-z0-9_-]`.
 *
 * `randomUUID` ya cumple, así que el respaldo aleatorio es solo para navegadores
 * sin Web Crypto (contexto no seguro en HTTP, que es el caso del desarrollo local
 * abierto por IP). Aun así se limpia igual, porque no cuesta nada y evita un 400
 * en el endpoint si el respaldo cambiara.
 */
function nuevoId() {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  // El DTO exige 8..64 caracteres de `[A-Za-z0-9_-]`. `randomUUID` ya cumple;
  // el respaldo se limpia por si acaso.
  return uuid.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
}

export function obtenerSessionId() {
  try {
    const guardado = localStorage.getItem(CLAVE_SESION);
    if (guardado) return guardado;

    const id = nuevoId();
    localStorage.setItem(CLAVE_SESION, id);
    return id;
  } catch {
    // Navegación privada o almacenamiento bloqueado: id en memoria.
    return nuevoId();
  }
}

/** Lo llama el botón "Nueva conversación" del widget. */
export function rotarSessionId() {
  const id = nuevoId();
  try {
    localStorage.setItem(CLAVE_SESION, id);
  } catch {
    // Sin persistencia, el nuevo id sirve solo para esta sesión de la pestaña.
  }
  return id;
}

/**
 * Envía un mensaje al chatbot.
 *
 * @param mensaje Texto del usuario.
 * @param idioma  `es` o `en`, sacado del `LanguageContext` para que el bot
 *                responda en el mismo idioma que el resto de la interfaz.
 * @returns La respuesta del backend ya con el historial actualizado.
 */
export async function enviarMensaje(mensaje, idioma = 'es') {
  const { data } = await api.post('/chatbot/mensaje', {
    mensaje,
    sessionId: obtenerSessionId(),
    idioma,
  });
  return data;
}

/**
 * Reinicia la conversación.
 *
 * Rota el `sessionId` en el cliente en vez de solo avisar al servidor. La razón
 * es que el backend guarda el historial por sesión: si se mandara el mismo id
 * con la lista vacía, el siguiente mensaje crearía un turno `user` sin el `assistant`
 * correspondiente y el modelo se encontraría hablando solo.
 */
export async function nuevaConversacion() {
  const sessionId = rotarSessionId();
  try {
    await api.post('/chatbot/nueva-conversacion', { sessionId });
  } catch {
    // El borrado en el servidor es una optimización de memoria. Si falla, el
    // nuevo `sessionId` ya garantiza una conversación limpia, así que un fallo
    // aquí no debe interrumpir la acción del usuario.
  }
  return sessionId;
}

/**
 * Estado del chatbot (diagnóstico).
 *
 * Lo usa el widget para no dibujar un panel que no puede funcionar: si
 * `disponible` es `false`, se muestra el aviso "el asistente no está disponible"
 * en vez de aceptar mensajes que van a fallar con 503.
 */
export async function obtenerEstado() {
  const { data } = await api.get('/chatbot/estado');
  return data;
}