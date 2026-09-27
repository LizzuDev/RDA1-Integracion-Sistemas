import { api } from './api';

/**
 * Servicio de Atracciones.
 *
 * Usa la instancia global de `services/api.ts` en lugar de crear una propia.
 * Asi todas las peticiones heredan el interceptor de JWT y la politica de
 * refresco ante 401, en lugar de quedar aisladas del esquema de autenticacion.
 */
export async function getAtracciones({ page = 1, limit = 10 } = {}) {
  const { data } = await api.get('/atracciones', { params: { page, limit } });
  return data;
}

export async function getAtraccion(id) {
  const { data } = await api.get(`/atracciones/${id}`);
  return data;
}

export async function reservarAtraccion(id, reservationData, idempotencyKey) {
  const { data } = await api.post(`/atracciones/${id}/reservations`, reservationData, {
    headers: {
      'idempotency-key': idempotencyKey
    }
  });
  return data;
}

export async function crearAtraccion(atraccionData) {
  const { data } = await api.post('/atracciones', atraccionData);
  return data;
}

export async function eliminarAtraccion(id) {
  await api.delete(`/atracciones/${id}`);
}

export async function getReservas() {
  const { data } = await api.get('/atracciones/reservations');
  return data;
}
