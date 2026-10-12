/**
 * Suite 05 — Disponibilidad y tarifas.
 *
 * Referencia Booking:
 * - Se cotiza SIEMPRE el alojamiento pedido; un ID inexistente es 404 (nunca se
 *   ofrece otro hotel en su lugar).
 * - Precio = tarifa por noche × noches (× habitaciones). Distintas tarifas
 *   (estándar, con desayuno, no reembolsable) con su política de cancelación.
 * - Las noches se cuentan como en un hotel: entrada 10 → salida 13 = 3 noches,
 *   y el día de salida queda libre para la siguiente llegada.
 * - Sin cupo para esas fechas, no se ofrecen productos.
 */
import { AppPrueba, crearAppPrueba, esperarProblema, camposInvalidos, dia, TIPOS_EPIQ } from './app-prueba';

const ocupar = (t: AppPrueba, alojamientoId: string, desde: number, hasta: number, habitaciones = 1, status = 'CONFIRMED') =>
  t.repos.reservas.sembrar({
    codigoReserva: `BKG-${Math.floor(Math.random() * 900000) + 100000}`,
    alojamientoId, customerName: 'Ocupante', status,
    checkin: dia(desde), checkout: dia(hasta), noches: hasta - desde, habitacionesCount: habitaciones, total: 1,
  });

describe('05 · Disponibilidad y tarifas', () => {
  let t: AppPrueba;

  beforeAll(async () => {
    t = await crearAppPrueba();
  });
  afterAll(() => t.cerrar());
  beforeEach(() => {
    t.sembrarCatalogo();
    t.repos.reservas.limpiar();
  });

  const disponibilidad = (body: Record<string, unknown>) => t.pedir('POST', '/alojamientos/availability', { body });

  describe('POST /alojamientos/availability (contrato)', () => {
    it('200 con un producto por cada tipo de habitación del alojamiento pedido', async () => {
      t.sembrarTipos('quito-epiq', TIPOS_EPIQ);
      const res = await disponibilidad({ accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(13) });
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('quito-epiq');
      expect(res.body.data.url).toBe('/api/v1/alojamientos/quito-epiq');
      expect(res.body.data.products).toHaveLength(3);
    });

    it('sin tipos propios, el alojamiento ofrece su tipo "estándar" a su precio', async () => {
      const res = await disponibilidad({ accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(13) });
      expect(res.body.data.products).toHaveLength(1);
      expect(res.body.data.products[0]).toMatchObject({ codigo: 'estandar', price: 360, price_per_night: 120 });
    });

    it('precio = tarifa del tipo × noches, ordenados del más barato al más caro (3 noches)', async () => {
      t.sembrarTipos('quito-epiq', TIPOS_EPIQ);
      const res = await disponibilidad({ accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(13) });
      const [std, deluxe, suite] = res.body.data.products;
      expect(std.price).toBe(360); // 120 × 3
      expect(deluxe.price).toBe(450); // 150 × 3
      expect(suite.price).toBe(576); // 192 × 3
    });

    it('precio con decimales redondeado a céntimos (56.88 × 3 = 170.64, no 170.64000000000001)', async () => {
      t.sembrarTipos('quito-ejido', [
        { codigo: 'a', nombre: 'Individual', precioNoche: 45.5, cantidad: 1, capacidadAdultos: 2 },
        { codigo: 'b', nombre: 'Doble', precioNoche: 56.88, cantidad: 1, capacidadAdultos: 2 },
        { codigo: 'c', nombre: 'Triple', precioNoche: 72.8, cantidad: 1, capacidadAdultos: 2 },
      ]);
      const res = await disponibilidad({ accommodation: 'quito-ejido', checkin: dia(10), checkout: dia(13) });
      expect(res.body.data.products.map((p: any) => p.price)).toEqual([136.5, 170.64, 218.4]);
    });

    it('cada producto informa tipo, régimen, política de cancelación, cupo y capacidad', async () => {
      const [estandar] = t.sembrarTipos('quito-epiq', TIPOS_EPIQ);
      const res = await disponibilidad({ accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(11) });
      expect(res.body.data.products[0]).toMatchObject({
        product_id: estandar.id,
        tipo_habitacion_id: estandar.id,
        codigo: 'estandar',
        room_name: 'Apartamento estándar',
        meal_plan: 'Solo alojamiento',
        cancellation_type: 'Cancelación gratuita hasta 48 horas antes',
        reembolsable: true,
        price: 120,
        price_per_night: 120,
        currency: 'USD',
        available_rooms: 2,
        capacidad: { adultos: 4, ninos: 2 },
      });
      const suite = res.body.data.products.find((p: any) => p.codigo === 'suite');
      expect(suite).toMatchObject({ meal_plan: 'Todo incluido', cancellation_type: 'No reembolsable', reembolsable: false });
    });

    it('los product_id son únicos', async () => {
      t.sembrarTipos('quito-epiq', TIPOS_EPIQ);
      const res = await disponibilidad({ accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(11) });
      const idsProd = res.body.data.products.map((p: any) => p.product_id);
      expect(new Set(idsProd).size).toBe(3);
    });

    it('solo ofrece los tipos donde cabe la ocupación pedida', async () => {
      t.sembrarTipos('quito-epiq', [
        { codigo: 'individual', nombre: 'Individual', precioNoche: 60, cantidad: 3, capacidadAdultos: 1 },
        { codigo: 'familiar', nombre: 'Familiar', precioNoche: 200, cantidad: 1, capacidadAdultos: 4, capacidadNinos: 2 },
      ]);
      const res = await disponibilidad({
        accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(11),
        guests: { number_of_adults: 3, number_of_rooms: 1 },
      });
      expect(res.body.data.products.map((p: any) => p.codigo)).toEqual(['familiar']);
    });

    it('un tipo agotado desaparece y los demás se siguen ofreciendo (cupo por tipo)', async () => {
      const [estandar] = t.sembrarTipos('quito-epiq', TIPOS_EPIQ);
      t.repos.reservas.sembrar({
        codigoReserva: 'BKG-111111', alojamientoId: 'quito-epiq', tipoHabitacionId: estandar.id, customerName: 'X',
        status: 'CONFIRMED', checkin: dia(10), checkout: dia(12), noches: 2, habitacionesCount: 2, total: 1,
      });
      const res = await disponibilidad({ accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(11) });
      expect(res.body.data.products.map((p: any) => p.codigo)).toEqual(['deluxe', 'suite']);
      expect(res.body.data.available_rooms).toBe(2);
    });

    it('usa la moneda del alojamiento por defecto (COP en Cartagena)', async () => {
      const res = await disponibilidad({ accommodation: 'cartagena-charleston', checkin: dia(10), checkout: dia(11) });
      expect(res.body.data.currency).toBe('COP');
    });

    it('respeta la moneda solicitada si es ISO 4217 válida', async () => {
      const res = await disponibilidad({ accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(11), currency: 'EUR' });
      expect(res.body.data.currency).toBe('EUR');
      expect(res.body.data.products.every((p: any) => p.currency === 'EUR')).toBe(true);
    });

    it('acepta el id numérico o textual (accommodation: string | number)', async () => {
      t.repos.alojamientos.sembrar({ id: '42', nombre: 'Num', destino: 'Loja', precioPorNoche: 10, habitaciones: 1 });
      const res = await disponibilidad({ accommodation: 42, checkin: dia(10), checkout: dia(11) });
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('42');
    });

    it('informa noches y habitaciones libres para pintar la página del hotel', async () => {
      ocupar(t, 'quito-gangotena', 10, 12, 1);
      const res = await disponibilidad({ accommodation: 'quito-gangotena', checkin: dia(10), checkout: dia(13) });
      expect(res.body.data.nights).toBe(3);
      expect(res.body.data.available_rooms).toBe(2);
    });

    it.each([
      ['2 adultos en 1 habitación (cap. 4)', 'quito-epiq', { number_of_adults: 2, number_of_rooms: 1 }, 200],
      ['4 adultos + 2 niños en 1 habitación', 'quito-epiq', { number_of_adults: 4, number_of_rooms: 1, children: [4, 9] }, 200],
      ['5 adultos en 1 habitación', 'quito-epiq', { number_of_adults: 5, number_of_rooms: 1 }, 400],
      ['5 adultos en 2 habitaciones', 'quito-epiq', { number_of_adults: 5, number_of_rooms: 2 }, 200],
      ['2 adultos + 2 niños en Gangotena (cap. 2+1)', 'quito-gangotena', { number_of_adults: 2, number_of_rooms: 1, children: [3, 7] }, 400],
    ])('ocupación: %s → %i', async (_caso, id, guests, esperado) => {
      const res = await disponibilidad({ accommodation: id, checkin: dia(10), checkout: dia(12), guests });
      expect(res.status).toBe(esperado);
      if (esperado === 400) {
        esperarProblema(res, 400, 'VALIDATION_FAILED');
        expect(res.body.detail).toContain('capacidad');
        expect(camposInvalidos(res).some((c) => ['adultos', 'ninos'].includes(c))).toBe(true);
      }
    });

    it('ID inexistente → 404 (no se cotiza otro hotel en su lugar)', async () => {
      const res = await disponibilidad({ accommodation: 'fantasma', checkin: dia(10), checkout: dia(11) });
      esperarProblema(res, 404);
      expect(res.body.detail).toContain('fantasma');
    });

    it('sin habitaciones libres → 200 sin productos', async () => {
      ocupar(t, 'quito-ejido', 10, 12);
      const res = await disponibilidad({ accommodation: 'quito-ejido', checkin: dia(11), checkout: dia(13) });
      expect(res.status).toBe(200);
      expect(res.body.data.products).toEqual([]);
    });

    it('pedir más habitaciones de las libres → sin productos', async () => {
      const res = await disponibilidad({
        accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(11),
        guests: { number_of_adults: 2, number_of_rooms: 3 },
      });
      expect(res.body.data.products).toEqual([]);
    });

    it.each([
      ['accommodation', { checkin: dia(10), checkout: dia(11) }],
      ['accommodation', { accommodation: '', checkin: dia(10), checkout: dia(11) }],
      ['checkin', { accommodation: 'quito-epiq', checkout: dia(11) }],
      ['checkout', { accommodation: 'quito-epiq', checkin: dia(10) }],
      ['checkout', { accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(10) }],
      ['checkout', { accommodation: 'quito-epiq', checkin: dia(12), checkout: dia(10) }],
      ['checkout', { accommodation: 'quito-epiq', checkin: dia(1), checkout: dia(40) }],
      ['checkin', { accommodation: 'quito-epiq', checkin: dia(-2), checkout: dia(1) }],
      ['checkin', { accommodation: 'quito-epiq', checkin: '2027-13-01', checkout: '2027-13-03' }],
      ['currency', { accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(11), currency: 'eur' }],
      ['booker.platform', { accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(11), booker: { country: 'ec', platform: 'fax' } }],
      ['guests.number_of_rooms', { accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(11), guests: { number_of_adults: 1, number_of_rooms: 0 } }],
    ])('petición inválida → 400 en "%s"', async (campo, body) => {
      const res = await disponibilidad(body);
      esperarProblema(res, 400, 'VALIDATION_FAILED');
      expect(camposInvalidos(res)).toContain(campo);
    });
  });

  describe('POST /alojamientos/bulk-availability', () => {
    it('200 con disponibilidad de varios alojamientos en una sola llamada', async () => {
      const res = await t.pedir('POST', '/alojamientos/bulk-availability', {
        body: { accommodations: ['quito-epiq', 'cusco-inka'], checkin: dia(10), checkout: dia(12) },
      });
      expect(res.status).toBe(200);
      expect(res.body.data.map((d: any) => d.id)).toEqual(['quito-epiq', 'cusco-inka']);
      expect(res.body.data[1].products[0].price).toBe(420); // 210 × 2
    });

    it('un ID inexistente se marca como no disponible sin romper el lote', async () => {
      const res = await t.pedir('POST', '/alojamientos/bulk-availability', {
        body: { accommodations: ['quito-epiq', 'fantasma'], checkin: dia(10), checkout: dia(12) },
      });
      expect(res.status).toBe(200);
      expect(res.body.data[1]).toEqual({ id: 'fantasma', available: false, products: [] });
    });

    it.each([
      ['accommodations', { accommodations: [], checkin: dia(10), checkout: dia(12) }],
      ['accommodations', { accommodations: Array.from({ length: 101 }, (_, i) => `x${i}`), checkin: dia(10), checkout: dia(12) }],
      ['checkout', { accommodations: ['quito-epiq'], checkin: dia(12), checkout: dia(10) }],
      ['checkin', { accommodations: ['quito-epiq'], checkin: 'hoy', checkout: dia(10) }],
    ])('inválido → 400 en "%s"', async (campo, body) => {
      const res = await t.pedir('POST', '/alojamientos/bulk-availability', { body });
      esperarProblema(res, 400, 'VALIDATION_FAILED');
      expect(camposInvalidos(res)).toContain(campo);
    });
  });

  describe('GET /alojamientos/:id/availability (inventario por fechas)', () => {
    it('200 con habitaciones totales, reservadas y libres', async () => {
      const res = await t.pedir('GET', `/alojamientos/quito-gangotena/availability?checkin=${dia(10)}&checkout=${dia(12)}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          alojamiento_id: 'quito-gangotena',
          checkin: dia(10),
          checkout: dia(12),
          total_rooms: 3,
          reserved_rooms: 0,
          available_rooms: 3,
          price_per_night: 250,
          is_available: true,
        }),
      );
    });

    it('descuenta las habitaciones de reservas confirmadas que se solapan', async () => {
      ocupar(t, 'quito-gangotena', 9, 11, 2);
      const res = await t.pedir('GET', `/alojamientos/quito-gangotena/availability?checkin=${dia(10)}&checkout=${dia(12)}`);
      expect(res.body.reserved_rooms).toBe(2);
      expect(res.body.available_rooms).toBe(1);
    });

    it.each([
      ['termina el día de mi llegada', 8, 10, 3],
      ['empieza el día de mi salida', 12, 14, 3],
      ['totalmente antes', 1, 5, 3],
      ['totalmente después', 20, 25, 3],
      ['me envuelve', 5, 20, 2],
      ['está dentro de mi estancia', 10, 11, 2],
      ['empieza a mitad de mi estancia', 11, 15, 2],
    ])('reserva que %s (días %i→%i) deja %i habitaciones libres', async (_caso, desde, hasta, libres) => {
      ocupar(t, 'quito-gangotena', desde, hasta, 1);
      const res = await t.pedir('GET', `/alojamientos/quito-gangotena/availability?checkin=${dia(10)}&checkout=${dia(12)}`);
      expect(res.body.available_rooms).toBe(libres);
    });

    it('las reservas canceladas no ocupan habitación', async () => {
      ocupar(t, 'quito-ejido', 10, 12, 1, 'CANCELLED');
      const res = await t.pedir('GET', `/alojamientos/quito-ejido/availability?checkin=${dia(10)}&checkout=${dia(12)}`);
      expect(res.body.available_rooms).toBe(1);
      expect(res.body.is_available).toBe(true);
    });

    it('completo → available_rooms 0 e is_available false (nunca negativo)', async () => {
      ocupar(t, 'quito-ejido', 10, 12, 1);
      ocupar(t, 'quito-ejido', 10, 12, 1);
      const res = await t.pedir('GET', `/alojamientos/quito-ejido/availability?checkin=${dia(10)}&checkout=${dia(12)}`);
      expect(res.body.available_rooms).toBe(0);
      expect(res.body.is_available).toBe(false);
    });

    it('las reservas de OTRO alojamiento no afectan', async () => {
      ocupar(t, 'quito-epiq', 10, 12, 2);
      const res = await t.pedir('GET', `/alojamientos/quito-ejido/availability?checkin=${dia(10)}&checkout=${dia(12)}`);
      expect(res.body.available_rooms).toBe(1);
    });

    it('acepta ?date= (una noche) para compatibilidad', async () => {
      const res = await t.pedir('GET', `/alojamientos/quito-epiq/availability?date=${dia(10)}`);
      expect(res.status).toBe(200);
      expect(res.body.checkin).toBe(dia(10));
      expect(res.body.checkout).toBe(dia(11));
    });

    it('ofrece horarios de check-in desde las 14:00', async () => {
      const res = await t.pedir('GET', `/alojamientos/quito-epiq/availability?date=${dia(10)}`);
      expect(res.body.checkin_times[0]).toBe('14:00');
    });

    it('alojamiento inexistente → 404', async () => {
      esperarProblema(await t.pedir('GET', `/alojamientos/fantasma/availability?date=${dia(10)}`), 404);
    });
  });
});
