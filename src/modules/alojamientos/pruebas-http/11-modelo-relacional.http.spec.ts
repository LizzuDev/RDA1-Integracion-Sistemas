/**
 * Suite 11 — Modelo relacional de Alojamientos (migración 2026-10-13).
 *
 *   alojamientos 1─N tipos_habitacion 1─N reservas_alojamiento 1─N huespedes_reserva
 *   proveedores_alojamiento 1─N alojamientos        auth.users 1─N reservas_alojamiento
 *
 * Referencia Booking:
 * - Un hotel vende varios TIPOS de habitación, cada uno con su precio, capacidad,
 *   régimen, política de cancelación y cupo. Agotar uno no agota el hotel.
 * - La reserva es de un tipo concreto y guarda la tarifa contratada.
 * - Se puede reservar sin cuenta; con sesión, la reserva queda en la cuenta.
 * - Se pide el nombre de cada huésped (titular y acompañantes).
 * - Los proveedores se conectan con una API key que se ve una sola vez.
 */
import { AppPrueba, crearAppPrueba, esperarProblema, camposInvalidos, dia, reservaValida, TIPOS_EPIQ, API_KEYS } from './app-prueba';

const TIPO = { nombre: 'Suite con vista', capacidadAdultos: 3, capacidadNinos: 1, precioPorNoche: 300, cantidad: 2, regimen: 'DESAYUNO' };

describe('11 · Modelo relacional: tipos de habitación, huéspedes, cuentas y proveedores', () => {
  let t: AppPrueba;

  beforeAll(async () => {
    t = await crearAppPrueba();
  });
  afterAll(() => t.cerrar());
  beforeEach(async () => {
    t.sembrarCatalogo();
    t.repos.reservas.limpiar();
    await (t.app.get('CACHE_MANAGER') as any).reset();
  });

  const reservar = (id: string, body: Record<string, unknown>, como?: any) =>
    t.pedir('POST', `/alojamientos/${id}/reservations`, { body, idem: true, ...(como ? { como } : {}) });
  const ficha = async (id: string) => (await t.pedir('GET', `/alojamientos/${id}`)).body;

  // ───────────────────────────────────────────────────────────────────────────
  describe('Tipos de habitación', () => {
    it('la ficha pública incluye los tipos a la venta; sin tipos propios, el "estándar" automático', async () => {
      const f = await ficha('quito-gangotena');
      expect(f.tipos_habitacion).toEqual([
        expect.objectContaining({ codigo: 'estandar', precio_noche: 250, cantidad: 3, capacidad_adultos: 2, cancelacion_texto: expect.any(String) }),
      ]);
      expect((await t.pedir('GET', '/alojamientos/quito-gangotena/tipos-habitacion')).body).toHaveLength(1);
    });

    it('crear un tipo (admin) recalcula el precio "desde", las habitaciones y la capacidad del hotel', async () => {
      const res = await t.pedir('POST', '/alojamientos/quito-gangotena/tipos-habitacion', { body: TIPO });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ codigo: 'suite-con-vista', precio_noche: 300, regimen_texto: 'Desayuno incluido' });
      const f = await ficha('quito-gangotena');
      expect(f).toMatchObject({ precioPorNoche: 250, habitaciones: 5, capacidadAdultos: 3 });
      expect(f.tipos_habitacion.map((x: any) => x.codigo)).toEqual(['estandar', 'suite-con-vista']);
    });

    it('código repetido en el mismo hotel → 409', async () => {
      await t.pedir('POST', '/alojamientos/quito-gangotena/tipos-habitacion', { body: { ...TIPO, codigo: 'suite' } });
      const res = await t.pedir('POST', '/alojamientos/quito-gangotena/tipos-habitacion', { body: { ...TIPO, codigo: 'suite' } });
      esperarProblema(res, 409);
    });

    it.each([
      ['precioPorNoche', { precioPorNoche: 0 }],
      ['cantidad', { cantidad: -1 }],
      ['capacidadAdultos', { capacidadAdultos: 0 }],
      ['regimen', { regimen: 'BUFFET' }],
      ['codigo', { codigo: 'con espacios' }],
      ['cancelacionGratuitaHoras', { cancelacionGratuitaHoras: 1000 }],
      ['photos.0.url', { photos: [{ url: 'http://inseguro.com/a.jpg' }] }],
    ])('tipo inválido → 400 en "%s"', async (campo, cambio) => {
      const res = await t.pedir('POST', '/alojamientos/quito-gangotena/tipos-habitacion', { body: { ...TIPO, ...cambio } });
      esperarProblema(res, 400, 'VALIDATION_FAILED');
      expect(camposInvalidos(res)).toContain(campo);
    });

    it('editar el precio de un tipo (por código) cambia el precio "desde" del hotel', async () => {
      await t.pedir('GET', '/alojamientos/quito-gangotena');
      const res = await t.pedir('PATCH', '/alojamientos/quito-gangotena/tipos-habitacion/estandar', { body: { precioPorNoche: 199.99 } });
      expect(res.status).toBe(200);
      expect((await ficha('quito-gangotena')).precioPorNoche).toBe(199.99);
    });

    it('no se puede desactivar ni borrar el único tipo a la venta → 409', async () => {
      await t.pedir('GET', '/alojamientos/quito-gangotena');
      esperarProblema(await t.pedir('PATCH', '/alojamientos/quito-gangotena/tipos-habitacion/estandar', { body: { activo: false } }), 409);
      esperarProblema(await t.pedir('DELETE', '/alojamientos/quito-gangotena/tipos-habitacion/estandar'), 409);
    });

    it('borrar un tipo con reservas lo DESACTIVA (conserva el historial); sin reservas lo borra', async () => {
      t.sembrarTipos('quito-epiq', TIPOS_EPIQ);
      expect((await reservar('quito-epiq', reservaValida({ tipo_habitacion_id: 'suite' }))).status).toBe(201);
      const conReservas = await t.pedir('DELETE', '/alojamientos/quito-epiq/tipos-habitacion/suite');
      expect(conReservas.body).toEqual({ desactivado: true });
      const sinReservas = await t.pedir('DELETE', '/alojamientos/quito-epiq/tipos-habitacion/deluxe');
      expect(sinReservas.body).toEqual({ desactivado: false });
      expect((await ficha('quito-epiq')).tipos_habitacion.map((x: any) => x.codigo)).toEqual(['estandar']);
      expect(t.repos.tipos.todas().find((x) => x.codigo === 'suite')).toMatchObject({ activo: false });
    });

    it('un proveedor solo gestiona los tipos de SUS alojamientos (403 en los demás)', async () => {
      const alta = await t.pedir('POST', '/alojamientos', {
        como: 'proveedor-a',
        body: { nombre: 'Hostal A', destino: 'Loja', precioPorNoche: 30, capacidadAdultos: 2, capacidadNinos: 0, habitaciones: 2, tienePiscina: false, idExterno: 'H-1' },
      });
      const suyo = alta.body.id;
      expect((await t.pedir('POST', `/alojamientos/${suyo}/tipos-habitacion`, { como: 'proveedor-a', body: TIPO })).status).toBe(201);
      esperarProblema(await t.pedir('POST', `/alojamientos/${suyo}/tipos-habitacion`, { como: 'proveedor-b', body: TIPO }), 403);
      esperarProblema(await t.pedir('POST', '/alojamientos/quito-epiq/tipos-habitacion', { como: 'proveedor-a', body: TIPO }), 403);
      esperarProblema(await t.pedir('POST', '/alojamientos/quito-epiq/tipos-habitacion', { como: 'cliente', body: TIPO }), 403);
      esperarProblema(await t.pedir('POST', '/alojamientos/quito-epiq/tipos-habitacion', { como: 'anonimo', body: TIPO }), 401);
    });

    it('alta de alojamiento con tiposHabitacion: se crean y el hotel resume sus tipos', async () => {
      const res = await t.pedir('POST', '/alojamientos', {
        body: {
          nombre: 'Hotel Tipos', destino: 'Cuenca', precioPorNoche: 1, capacidadAdultos: 1, capacidadNinos: 0, habitaciones: 1, tienePiscina: false,
          tiposHabitacion: [
            { codigo: 'doble', nombre: 'Doble', capacidadAdultos: 2, precioPorNoche: 80, cantidad: 5 },
            { codigo: 'familiar', nombre: 'Familiar', capacidadAdultos: 4, capacidadNinos: 2, precioPorNoche: 140, cantidad: 2 },
          ],
        },
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ precioPorNoche: 80, habitaciones: 7, capacidadAdultos: 4, capacidadNinos: 2 });
    });

    it('con un solo tipo, editar precio/habitaciones del hotel se traslada a ese tipo', async () => {
      await t.pedir('GET', '/alojamientos/quito-gangotena');
      await t.pedir('PATCH', '/alojamientos/quito-gangotena', { body: { precioPorNoche: 260, habitaciones: 4 } });
      expect((await ficha('quito-gangotena')).tipos_habitacion[0]).toMatchObject({ precio_noche: 260, cantidad: 4 });
    });

    it('con varios tipos, cambiar el precio del hotel → 400 (se cambia en cada tipo)', async () => {
      t.sembrarTipos('quito-epiq', TIPOS_EPIQ);
      const res = await t.pedir('PATCH', '/alojamientos/quito-epiq', { body: { precioPorNoche: 99 } });
      esperarProblema(res, 400, 'VALIDATION_FAILED');
      expect(camposInvalidos(res)).toContain('precioPorNoche');
      // Enviar el mismo valor que ya tiene no es un cambio: el formulario del panel puede reenviarlo.
      expect((await t.pedir('PATCH', '/alojamientos/quito-epiq', { body: { precioPorNoche: 120, nombre: 'EpiQ' } })).status).toBe(200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('Reservas por tipo de habitación', () => {
    beforeEach(() => t.sembrarTipos('quito-epiq', TIPOS_EPIQ));

    it('reservar un tipo concreto (id o código) cobra SU tarifa y guarda la tarifa contratada', async () => {
      const res = await reservar('quito-epiq', reservaValida({ tipo_habitacion_id: 'deluxe', checkin: dia(10), checkout: dia(12) }));
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        total_price: { currency: 'USD', total: 300 },
        precio_noche: 150,
        tipo_habitacion: { codigo: 'deluxe', regimen: 'Desayuno incluido', cancelacion: 'Cancelación gratuita hasta 24 horas antes' },
      });
      const guardada = t.repos.reservas.todas()[0];
      expect(guardada.tipoHabitacionId).toBe(t.repos.tipos.todas().find((x) => x.codigo === 'deluxe').id);
    });

    it('sin tipo: el más barato con cupo; agotado el estándar, pasa al siguiente', async () => {
      const r1 = await reservar('quito-epiq', reservaValida({ habitaciones_count: 2, adultos: 2 }));
      expect(r1.body.tipo_habitacion.codigo).toBe('estandar');
      const r2 = await reservar('quito-epiq', reservaValida());
      expect(r2.body.tipo_habitacion.codigo).toBe('deluxe');
    });

    it('tipo agotado → 409 aunque el hotel tenga otros tipos libres', async () => {
      expect((await reservar('quito-epiq', reservaValida({ tipo_habitacion_id: 'suite' }))).status).toBe(201);
      const res = await reservar('quito-epiq', reservaValida({ tipo_habitacion_id: 'suite' }));
      esperarProblema(res, 409, 'ROOM_NO_LONGER_AVAILABLE');
      expect(res.body.detail).toContain('Master suite');
    });

    it('tipo de otro hotel o inexistente → 400 en "tipo_habitacion_id"', async () => {
      const res = await reservar('quito-epiq', reservaValida({ tipo_habitacion_id: 'presidencial' }));
      esperarProblema(res, 400, 'VALIDATION_FAILED');
      expect(camposInvalidos(res)).toContain('tipo_habitacion_id');
    });

    it('la capacidad se valida contra el tipo elegido', async () => {
      t.sembrarTipos('quito-gangotena', [
        { codigo: 'individual', nombre: 'Individual', precioNoche: 90, cantidad: 2, capacidadAdultos: 1 },
        { codigo: 'familiar', nombre: 'Familiar', precioNoche: 320, cantidad: 1, capacidadAdultos: 4, capacidadNinos: 2 },
      ]);
      const res = await reservar('quito-gangotena', reservaValida({ tipo_habitacion_id: 'individual', adultos: 2 }));
      esperarProblema(res, 400, 'VALIDATION_FAILED');
      expect(camposInvalidos(res)).toContain('adultos');
      // Sin tipo, 3 adultos van a la familiar (la única donde caben).
      const auto = await reservar('quito-gangotena', reservaValida({ adultos: 3 }));
      expect(auto.body.tipo_habitacion.codigo).toBe('familiar');
    });

    it('modificar una orden mantiene el tipo y la tarifa contratada aunque luego cambie el precio', async () => {
      const prev = await t.pedir('POST', '/alojamientos/orders/preview', {
        body: { accommodation_id: 'quito-epiq', product_id: 'deluxe', checkin: dia(10), checkout: dia(12), guests: { number_of_adults: 2, number_of_rooms: 1 } },
      });
      const orden = await t.pedir('POST', '/alojamientos/orders/create', {
        idem: true,
        body: { order_preview_id: prev.body.data.order_preview_id, payment_reference: 'pay_1234', customer_details: { first_name: 'Ana', last_name: 'Ruiz', email: 'ana@x.com' } },
      });
      await t.pedir('PATCH', '/alojamientos/quito-epiq/tipos-habitacion/deluxe', { body: { precioPorNoche: 500 } });
      const mod = await t.pedir('POST', `/alojamientos/orders/${orden.body.order_id}/modify`, { idem: true, body: { checkout: dia(13) } });
      expect(mod.status).toBe(200);
      expect(mod.body).toMatchObject({ total_price: 450, tipo_habitacion: { codigo: 'deluxe' } }); // 150 × 3, no 500 × 3
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('Huéspedes y datos de la reserva', () => {
    it('guarda titular, acompañantes, teléfono, peticiones especiales y hora de llegada', async () => {
      const res = await reservar('quito-epiq', reservaValida({
        customer_name: 'Ana María Pérez', adultos: 2, ninos: 1, phone: '+593 991234567',
        special_requests: 'Cuna, por favor', arrival_time: '15:00 - 16:00',
        acompanantes: [
          { nombre: 'Luis', apellido: 'Pérez' },
          { nombre: 'Sofía', apellido: 'Pérez', tipo: 'NINO', edad: 6 },
        ],
      }));
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        adultos: 2, ninos: 1, huespedes: 3,
        telefono: '+593 991234567', peticiones_especiales: 'Cuna, por favor', hora_llegada: '15:00 - 16:00',
      });
      expect(res.body.huespedes_detalle).toEqual([
        { orden: 1, es_titular: true, tipo: 'ADULTO', nombre: 'Ana', apellido: 'María Pérez', edad: null },
        { orden: 2, es_titular: false, tipo: 'ADULTO', nombre: 'Luis', apellido: 'Pérez', edad: null },
        { orden: 3, es_titular: false, tipo: 'NINO', nombre: 'Sofía', apellido: 'Pérez', edad: 6 },
      ]);
      const detalle = await t.pedir('GET', `/alojamientos/reservations/${res.body.reservation_id}`);
      expect(detalle.body.huespedes_detalle).toHaveLength(3);
    });

    it('"reservo para otra persona": el titular es guest_name, no quien paga', async () => {
      const res = await reservar('quito-epiq', reservaValida({ customer_name: 'Quien Paga', guest_name: 'Rosa Vera' }));
      expect(res.body.huespedes_detalle[0]).toMatchObject({ es_titular: true, nombre: 'Rosa', apellido: 'Vera' });
      expect(res.body.customer_name).toBe('Quien Paga');
    });

    it.each([
      ['más acompañantes adultos que adultos', { adultos: 2, acompanantes: [{ nombre: 'A' }, { nombre: 'B' }] }, 'acompanantes'],
      ['más niños que los declarados', { ninos: 0, acompanantes: [{ nombre: 'N', tipo: 'NINO', edad: 4 }] }, 'acompanantes'],
      ['niño sin edad', { ninos: 1, acompanantes: [{ nombre: 'N', tipo: 'NINO' }] }, 'acompanantes.0.edad'],
      ['adulto menor de 18', { adultos: 2, acompanantes: [{ nombre: 'J', edad: 15 }] }, 'acompanantes.0.edad'],
      ['nacionalidad no ISO', { adultos: 2, acompanantes: [{ nombre: 'J', nacionalidad: 'ecu' }] }, 'acompanantes.0.nacionalidad'],
    ])('%s → 400', async (_caso, cambio, campo) => {
      const res = await reservar('quito-epiq', reservaValida(cambio));
      esperarProblema(res, 400, 'VALIDATION_FAILED');
      expect(camposInvalidos(res)).toContain(campo);
      expect(t.repos.reservas.todas()).toHaveLength(0);
    });

    it('cancelar guarda el motivo y la fecha de cancelación', async () => {
      const r = await reservar('quito-epiq', reservaValida());
      const c = await t.pedir('POST', `/alojamientos/reservations/${r.body.reservation_id}/cancel`, { idem: true, body: { reason: 'Cambio de planes' } });
      expect(c.body).toMatchObject({ status: 'CANCELLED', motivo_cancelacion: 'Cambio de planes', cancelada_en: expect.any(String) });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('Reserva ↔ cuenta de usuario (usuario_id)', () => {
    it('con sesión la reserva queda vinculada a la cuenta; sin sesión, como invitado', async () => {
      const conSesion = await reservar('quito-epiq', reservaValida(), 'cliente');
      expect(conSesion.body.cuenta_vinculada).toBe(true);
      expect(t.repos.reservas.todas()[0].usuarioId).toBe('u-cli');
      const invitado = await reservar('quito-gangotena', reservaValida());
      expect(invitado.body.cuenta_vinculada).toBe(false);
    });

    it('con sesión y sin correo en el formulario se usa el de la cuenta', async () => {
      const { customer_email: _sin, ...sinCorreo } = reservaValida();
      const res = await reservar('quito-epiq', sinCorreo, 'cliente');
      expect(res.body.customer_email).toBe('cliente@example.com');
    });

    it('"Mis reservas": las de mi cuenta (aunque usara otro correo) + las de invitado con mi correo; nunca las de otra cuenta', async () => {
      const mia = await reservar('quito-epiq', reservaValida({ customer_email: 'otro-correo@example.com' }), 'cliente');
      const invitadoMiCorreo = await reservar('quito-gangotena', reservaValida({ customer_email: 'cliente@example.com' }));
      const deOtraCuenta = await reservar('cusco-inka', reservaValida({ customer_email: 'cliente@example.com' }), 'tramposo');
      const mis = await t.pedir('GET', '/alojamientos/reservations', { como: 'cliente' });
      const codigos = mis.body.map((r: any) => r.codigo_reserva);
      expect(codigos).toEqual(expect.arrayContaining([mia.body.codigo_reserva, invitadoMiCorreo.body.codigo_reserva]));
      expect(codigos).not.toContain(deOtraCuenta.body.codigo_reserva);
    });

    it('la misma cuenta reservando dos veces las mismas fechas → aviso de duplicado (aunque cambie el correo)', async () => {
      expect((await reservar('quito-epiq', reservaValida(), 'cliente')).status).toBe(201);
      const otra = await reservar('quito-epiq', reservaValida({ customer_email: 'nuevo@example.com' }), 'cliente');
      esperarProblema(otra, 409, 'BOOKING_NOT_CONFIRMED');
    });

    it('token inválido al reservar → 401 (no se reserva "a medias" como invitado)', async () => {
      esperarProblema(await reservar('quito-epiq', reservaValida(), 'token-invalido'), 401);
      expect(t.repos.reservas.todas()).toHaveLength(0);
    });

    it('la orden pagada con sesión también se vincula a la cuenta', async () => {
      const prev = await t.pedir('POST', '/alojamientos/orders/preview', {
        body: { accommodation_id: 'quito-epiq', checkin: dia(10), checkout: dia(12), guests: { number_of_adults: 2, number_of_rooms: 1 } },
      });
      await t.pedir('POST', '/alojamientos/orders/create', {
        idem: true, como: 'cliente',
        body: { order_preview_id: prev.body.data.order_preview_id, payment_reference: 'pay_1234', customer_details: { first_name: 'Ana', last_name: 'Ruiz', email: 'ana@x.com' } },
      });
      expect(t.repos.reservas.todas()[0]).toMatchObject({ usuarioId: 'u-cli', adultos: 2, ninos: 0 });
      expect(t.repos.huespedes.todas()[0]).toMatchObject({ esTitular: true, nombre: 'Ana', apellido: 'Ruiz' });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('Baja de alojamientos con historial', () => {
    const reservaPasada = (alojamientoId: string) =>
      t.repos.reservas.sembrar({
        codigoReserva: 'BKG-333333', alojamientoId, customerName: 'Antiguo', customerEmail: 'cliente@example.com',
        status: 'CONFIRMED', checkin: dia(-10), checkout: dia(-7), noches: 3, habitacionesCount: 1, total: 750,
      });

    it('con reservas pasadas: baja lógica (desaparece del catálogo, el historial se conserva)', async () => {
      reservaPasada('quito-gangotena');
      expect((await t.pedir('DELETE', '/alojamientos/quito-gangotena')).status).toBe(204);
      esperarProblema(await t.pedir('GET', '/alojamientos/quito-gangotena'), 404);
      const baja = t.repos.alojamientos.todas().find((a) => a.id === 'quito-gangotena');
      expect(baja?.estado).toBe('INACTIVO');
      expect(baja?.deletedAt).toBeTruthy();
      const mis = await t.pedir('GET', '/alojamientos/reservations', { como: 'cliente' });
      expect(mis.body[0]).toMatchObject({ codigo_reserva: 'BKG-333333', nombre_alojamiento: 'Casa Gangotena Relais & Châteaux' });
    });

    it('sin reservas: borrado definitivo', async () => {
      expect((await t.pedir('DELETE', '/alojamientos/quito-gangotena')).status).toBe(204);
      expect(t.repos.alojamientos.todas().find((a) => a.id === 'quito-gangotena')).toBeUndefined();
    });

    it('un proveedor que reenvía un alojamiento dado de baja lo restaura con el mismo id', async () => {
      const item = { nombre: 'Hostal R', destino: 'Loja', precioPorNoche: 30, capacidadAdultos: 2, capacidadNinos: 0, habitaciones: 2, tienePiscina: false, idExterno: 'R-1' };
      const alta = await t.pedir('POST', '/alojamientos/sincronizar', { como: 'proveedor-a', body: { alojamientos: [item] } });
      const id = alta.body.resultados[0].id;
      reservaPasada(id);
      await t.pedir('DELETE', `/alojamientos/${id}`, { como: 'proveedor-a' });
      const reenvio = await t.pedir('POST', '/alojamientos/sincronizar', { como: 'proveedor-a', body: { alojamientos: [{ ...item, estado: 'ACTIVO' }] } });
      expect(reenvio.body.resultados[0]).toMatchObject({ resultado: 'ACTUALIZADO', id, estado: 'ACTIVO' });
      expect((await t.pedir('GET', `/alojamientos/${id}`)).status).toBe(200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('Sincronización con tipos de habitación', () => {
    const base = { nombre: 'Hotel Sync', destino: 'Manta', precioPorNoche: 1, capacidadAdultos: 1, capacidadNinos: 0, habitaciones: 1, tienePiscina: false, idExterno: 'S-1' };
    const sync = (tipos: unknown[], extra: Record<string, unknown> = {}) =>
      t.pedir('POST', '/alojamientos/sincronizar', { como: 'proveedor-a', body: { alojamientos: [{ ...base, ...extra, tiposHabitacion: tipos }] } });

    it('reemplaza por código: actualiza los que vienen, crea los nuevos y DESACTIVA los que faltan', async () => {
      await sync([
        { codigo: 'doble', nombre: 'Doble', capacidadAdultos: 2, precioPorNoche: 70, cantidad: 4 },
        { codigo: 'triple', nombre: 'Triple', capacidadAdultos: 3, precioPorNoche: 95, cantidad: 2 },
      ]);
      const r = await sync([
        { codigo: 'doble', nombre: 'Doble renovada', capacidadAdultos: 2, precioPorNoche: 75, cantidad: 4 },
        { codigo: 'suite', nombre: 'Suite', capacidadAdultos: 2, precioPorNoche: 150, cantidad: 1 },
      ]);
      const id = r.body.resultados[0].id;
      const f = await ficha(id);
      expect(f.tipos_habitacion.map((x: any) => [x.codigo, x.precio_noche])).toEqual([['doble', 75], ['suite', 150]]);
      expect(f.precioPorNoche).toBe(75);
      expect(t.repos.tipos.todas().find((x) => x.alojamientoId === id && x.codigo === 'triple')).toMatchObject({ activo: false });
    });

    it('códigos repetidos o ningún tipo a la venta → ERROR solo de ese elemento', async () => {
      const repetidos = await sync([
        { codigo: 'x', nombre: 'Uno', capacidadAdultos: 2, precioPorNoche: 70, cantidad: 1 },
        { codigo: 'x', nombre: 'Dos', capacidadAdultos: 2, precioPorNoche: 80, cantidad: 1 },
      ]);
      expect(repetidos.status).toBe(200);
      expect(repetidos.body.resultados[0]).toMatchObject({ resultado: 'ERROR', errores: [expect.objectContaining({ name: 'tiposHabitacion' })] });
      const sinVenta = await sync([{ codigo: 'y', nombre: 'Cerrada', capacidadAdultos: 2, precioPorNoche: 70, cantidad: 0 }], { idExterno: 'S-2' });
      expect(sinVenta.body.resultados[0].resultado).toBe('ERROR');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('Proveedores registrados en la BD', () => {
    const crearProveedor = (body: Record<string, unknown>, como: any = 'admin') =>
      t.pedir('POST', '/alojamientos/gestion/proveedores', { body, como });

    it('las claves de ALOJAMIENTOS_API_KEYS se registran al arrancar (solo su hash)', async () => {
      const lista = await t.pedir('GET', '/alojamientos/gestion/proveedores');
      expect(lista.body.map((p: any) => p.id)).toEqual(expect.arrayContaining(['proveedor-a', 'proveedor-b']));
      expect(JSON.stringify(lista.body)).not.toContain(API_KEYS['proveedor-a']);
      const fila = t.repos.proveedores.todas().find((p) => p.id === 'proveedor-a');
      expect(fila.apiKeyHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('alta: la API key se muestra UNA vez y funciona para sincronizar', async () => {
      const res = await crearProveedor({ id: 'grupo7', nombre: 'Grupo 7', emailContacto: 'G7@Example.com' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'grupo7', email_contacto: 'g7@example.com', tiene_api_key: true, api_key: expect.stringMatching(/^aloj_/) });
      const sync = await t.pedir('POST', '/alojamientos/sincronizar', {
        headers: { 'X-Api-Key': res.body.api_key },
        body: { alojamientos: [{ nombre: 'Casa 7', destino: 'Loja', precioPorNoche: 40, capacidadAdultos: 2, capacidadNinos: 0, habitaciones: 1, tienePiscina: false, idExterno: 'C7' }] },
      });
      expect(sync.body).toMatchObject({ proveedor_id: 'grupo7', resumen: { creados: 1 } });
      const lista = await t.pedir('GET', '/alojamientos/gestion/proveedores');
      expect(lista.body.find((p: any) => p.id === 'grupo7')).toMatchObject({ alojamientos: 1, api_key_prefijo: expect.stringMatching(/^aloj_.*…$/) });
      expect(lista.body.find((p: any) => p.id === 'grupo7').api_key).toBeUndefined();
    });

    it('rotar la clave invalida la anterior al instante', async () => {
      const { body } = await crearProveedor({ id: 'grupo8', nombre: 'Grupo 8' });
      const rotada = await t.pedir('POST', '/alojamientos/gestion/proveedores/grupo8/rotar-clave');
      expect(rotada.body.api_key).not.toBe(body.api_key);
      const vieja = await t.pedir('GET', '/alojamientos/gestion/catalogo', { headers: { 'X-Api-Key': body.api_key } });
      esperarProblema(vieja, 401);
      expect((await t.pedir('GET', '/alojamientos/gestion/catalogo', { headers: { 'X-Api-Key': rotada.body.api_key } })).status).toBe(200);
    });

    it('desactivar un proveedor corta su acceso sin borrar nada; reactivarlo lo devuelve', async () => {
      await t.pedir('PATCH', '/alojamientos/gestion/proveedores/proveedor-b', { body: { activo: false } });
      esperarProblema(await t.pedir('GET', '/alojamientos/gestion/catalogo', { como: 'proveedor-b' }), 401);
      await t.pedir('PATCH', '/alojamientos/gestion/proveedores/proveedor-b', { body: { activo: true } });
      expect((await t.pedir('GET', '/alojamientos/gestion/catalogo', { como: 'proveedor-b' })).status).toBe(200);
    });

    it('no se elimina un proveedor con alojamientos (409); sin alojamientos sí (204)', async () => {
      await t.pedir('POST', '/alojamientos/sincronizar', {
        como: 'proveedor-a',
        body: { alojamientos: [{ nombre: 'Casa A', destino: 'Loja', precioPorNoche: 40, capacidadAdultos: 2, capacidadNinos: 0, habitaciones: 1, tienePiscina: false, idExterno: 'A9' }] },
      });
      esperarProblema(await t.pedir('DELETE', '/alojamientos/gestion/proveedores/proveedor-a'), 409);
      await crearProveedor({ id: 'grupo9', nombre: 'Grupo 9' });
      expect((await t.pedir('DELETE', '/alojamientos/gestion/proveedores/grupo9')).status).toBe(204);
    });

    it.each([
      ['id duplicado', { id: 'proveedor-a', nombre: 'Otra vez' }, 409],
      ['id con mayúsculas', { id: 'Grupo-X', nombre: 'X' }, 400],
      ['correo inválido', { id: 'grupo-x', nombre: 'X', emailContacto: 'no-es-correo' }, 400],
    ])('%s → %i', async (_caso, body, status) => {
      esperarProblema(await crearProveedor(body), status);
    });

    it.each([
      ['un cliente', 'cliente', 403],
      ['un proveedor con su API key', 'proveedor-a', 401],
      ['sin sesión', 'anonimo', 401],
    ])('%s no gestiona proveedores → %i', async (_caso, como, status) => {
      esperarProblema(await t.pedir('GET', '/alojamientos/gestion/proveedores', { como: como as any }), status);
      esperarProblema(await crearProveedor({ id: 'intruso', nombre: 'Intruso' }, como), status);
    });
  });
});
