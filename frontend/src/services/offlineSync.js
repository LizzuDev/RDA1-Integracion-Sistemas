import { get, set, update } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';
import { createOrderAuto } from './autosApi';
import { reservarAtraccion } from './atraccionesApi';
import { crearReserva as crearReservaVuelo } from './vuelosApi';

const PENDING_RESERVATIONS_KEY = 'pending_reservations';

/**
 * Guarda una reserva en IndexedDB para procesarla cuando vuelva la conexión.
 * @param {string} tipo 'auto' | 'atraccion' | 'vuelo' | 'alojamiento'
 * @param {object} payload Datos necesarios para la API
 * @param {string} idempotencyKey Clave de idempotencia
 * @param {object} emailParams Opcional: Parámetros para enviar correo con EmailJS al recuperar red
 */
export async function savePendingReservation(tipo, payload, idempotencyKey = uuidv4(), emailParams = null) {
  const newTask = {
    id: uuidv4(),
    tipo,
    payload,
    idempotencyKey,
    emailParams,
    timestamp: Date.now(),
  };

  await update(PENDING_RESERVATIONS_KEY, (val) => {
    const queue = val || [];
    queue.push(newTask);
    return queue;
  });

  console.log(`[Offline Sync] Reserva de ${tipo} guardada localmente. Se enviará al reconectar.`);
}

/**
 * Intenta procesar todas las reservas pendientes guardadas en IndexedDB.
 */
export async function syncPendingReservations() {
  const queue = await get(PENDING_RESERVATIONS_KEY);
  if (!queue || queue.length === 0) return;

  console.log(`[Offline Sync] Hay ${queue.length} reservas pendientes. Intentando sincronizar...`);

  const pending = [];

  for (const task of queue) {
    try {
      if (task.tipo === 'auto') {
        await createOrderAuto(task.payload, task.idempotencyKey);
      } else if (task.tipo === 'atraccion') {
        // En atracciones el payload suele ser { atraccionId, form } 
        // Adapta esto según cómo recibe reservarAtraccion en tu API
        await reservarAtraccion(task.payload.atraccionId, task.payload.data, task.idempotencyKey);
      } else if (task.tipo === 'vuelo') {
        await crearReservaVuelo(task.payload, task.idempotencyKey, task.fingerprint);
      }
      
      console.log(`[Offline Sync] ✅ Sincronización exitosa para reserva de ${task.tipo} (${task.id})`);

      // Si había un correo pendiente de enviar
      if (task.emailParams) {
        // Usa require dinámico o asume que emailjs está disponible para evitar importaciones cíclicas si ocurre
        import('@emailjs/browser').then((emailjs) => {
          emailjs.send(
            'service_gc9gkdc',
            'template_nlbgw3v',
            task.emailParams,
            'vZyuTrdLeGeWrTWLe'
          ).then((res) => {
            console.log(`[Offline Sync] ✅ Correo enviado para reserva de ${task.tipo}`, res.status);
          }).catch((err) => {
            console.error(`[Offline Sync] ❌ Error enviando correo para reserva de ${task.tipo}:`, err);
          });
        });
      }

    } catch (error) {
      console.error(`[Offline Sync] ❌ Error sincronizando reserva de ${task.tipo} (${task.id}):`, error);
      // Si el error es de red (no hay conexión aún), lo devolvemos a la cola.
      // Si es un error 400 o 500 del backend, quizás deberíamos descartarlo o alertar.
      // Por simplicidad, si falla por cualquier razón, lo mantenemos para intentar de nuevo.
      pending.push(task);
    }
  }

  // Guardar en IDB solo las que fallaron (para reintentar después)
  await set(PENDING_RESERVATIONS_KEY, pending);
  
  if (pending.length === 0) {
    console.log('[Offline Sync] Todas las reservas pendientes fueron sincronizadas exitosamente.');
  }
}
