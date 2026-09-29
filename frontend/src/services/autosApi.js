import { api } from './api';

/**
 * Servicio de Autos.
 *
 * Usa la instancia global de `services/api.ts` para heredar el interceptor de
 * JWT y la politica de refresco ante 401.
 */
export async function searchAutos(searchParams) {
  const { data } = await api.post('/autos/search', searchParams);
  return data;
}

export async function getDepots() {
  const { data } = await api.post('/autos/depots');
  return data;
}

export async function getConstants() {
  const { data } = await api.post('/autos/constants');
  return data;
}

export async function createOrderAuto(reservationData, idempotencyKey) {
  const { data } = await api.post('/autos/orders/create', reservationData, {
    headers: {
      'Idempotency-Key': idempotencyKey
    }
  });
  return data;
}

export async function cancelOrderAuto(orderId, cancelData, idempotencyKey) {
  const { data } = await api.post(`/autos/orders/${orderId}/cancel`, cancelData, {
    headers: {
      'Idempotency-Key': idempotencyKey
    }
  });
  return data;
}

export async function getOrdersAuto() {
  const { data } = await api.get('/autos/orders');
  return data;
}

export async function createAutoLocal(autoData) {
  const { data } = await api.post('/autos', autoData);
  return data;
}

export async function deleteAutoLocal(id) {
  const { data } = await api.post(`/autos/${id}/delete`);
  return data;
}
