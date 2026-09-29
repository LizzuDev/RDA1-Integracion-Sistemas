/**
 * Cliente PUBLICO de estado de vuelo y gestion de webhooks (Fase 10).
 *
 * ── Por que este archivo esta separado de `vuelosApi.ts` ─────────────────────
 * `GET /flights/{flightNumber}/status` es el unico endpoint del contrato con
 * `security: []`: publico, sin credenciales y sin RLS. No le mandamos la
 * `X-Device-Fingerprint` a proposito. Incluirla no rompe nada hoy, pero
 * acreditaria contra un endpoint que el contrato declara abierto, y el dia que
 * se anada un log de peticiones acabaria registrando la huella de un visitante
 * que no ha dado ningun dato.
 *
 * Las suscripciones a webhooks, en cambio, SI son del cliente y si llevan la
 * huella, asi que usan `cabecerasPropietario()` igual que el resto.
 */
import { api } from './api';
import { obtenerHuellaDispositivo } from './formato';

function cabecerasPropietario(): Record<string, string> {
  return { 'X-Device-Fingerprint': obtenerHuellaDispositivo() };
}

export interface FlightEndpointStatus {
  iataCode: string;
  terminal?: string | null;
  scheduledAt: string;
  estimatedAt?: string | null;
  actualAt?: string | null;
}

export interface FlightStatus {
  flightNumber: string;
  date: string;
  marketingCarrier: string;
  operatingCarrier: string;
  departure: FlightEndpointStatus;
  arrival: FlightEndpointStatus;
  aircraft?: string | null;
  status: string;
}

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  /** Mascara (`whsec_...a1b2`), nunca el secreto real. */
  secret: string;
  createdAt: string;
  active: boolean;
}

/**
 * GET /flights/{flightNumber}/status — PUBLICO.
 *
 * Sin cabecera de propietario, a proposito (ver la nota del archivo). El numero
 * de vuelo se normaliza a mayusculas tambien aqui: el backend lo hace, pero
 * evita un 404 avoidable en la red y deja la comparacion de la UI consistente.
 */
export async function consultarEstadoVuelo(flightNumber: string, fecha: string) {
  const { data } = await api.get(
    `/vuelos/flights/${encodeURIComponent(flightNumber.trim().toUpperCase())}/status`,
    { params: { date: fecha } },
  );
  return data as FlightStatus;
}

/** GET /webhooks — suscripciones activas del cliente. */
export async function listarWebhooks() {
  const { data } = await api.get('/vuelos/webhooks', {
    headers: cabecerasPropietario(),
  });
  return data as WebhookSubscription[];
}

/**
 * POST /webhooks.
 *
 * El secreto viaja en esta peticion y no vuelve nunca: la respuesta trae una
 * mascara. Por eso la UI lo pide UNA vez y avisa de que despues no se puede
 * recuperar, en vez de fingir que se podria volver a mostrar.
 */
export async function registrarWebhook(cuerpo: {
  url: string;
  events: string[];
  secret: string;
}) {
  const { data } = await api.post('/vuelos/webhooks', cuerpo, {
    headers: cabecerasPropietario(),
  });
  return data as WebhookSubscription;
}

/** DELETE /webhooks/{id} — borrado logico; la fila se conserva inactiva. */
export async function eliminarWebhook(id: string) {
  await api.delete(`/vuelos/webhooks/${encodeURIComponent(id)}`, {
    headers: cabecerasPropietario(),
  });
}

/** Los doce eventos del contrato, para los checkboxes del formulario. */
export const EVENTOS_WEBHOOK = [
  { valor: 'booking.confirmed', texto: 'Reserva confirmada' },
  { valor: 'booking.failed', texto: 'Reserva fallida' },
  { valor: 'booking.changed', texto: 'Reserva modificada' },
  { valor: 'booking.cancelled', texto: 'Reserva cancelada' },
  { valor: 'booking.baggage_added', texto: 'Equipaje anadido' },
  { valor: 'hold.expired', texto: 'Hold caducado' },
  { valor: 'flight.schedule_changed', texto: 'Horario de vuelo cambiado' },
  { valor: 'flight.cancelled', texto: 'Vuelo cancelado' },
  { valor: 'booking.ticket_issuing', texto: 'Emision de billete iniciada' },
  { valor: 'booking.ticket_issued', texto: 'Billete emitido' },
  { valor: 'booking.ticket_failed', texto: 'Emision de billete fallida' },
  { valor: 'booking.checked_in', texto: 'Check-in realizado' },
];
