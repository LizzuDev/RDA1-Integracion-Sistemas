/**
 * Suite 10 — Gestión del catálogo e integración con proveedores.
 *
 * - Solo un ADMINISTRADOR (rol en app_metadata) o el SISTEMA de un proveedor
 *   (API key) puede modificar el catálogo. Antes las escrituras eran públicas.
 * - Un usuario que se pone `role: 'admin'` en su user_metadata NO es admin.
 * - Cada proveedor solo toca sus alojamientos.
 * - La sincronización por lotes es idempotente por (proveedorId, idExterno) y
 *   responde elemento a elemento.
 * - Un alojamiento INACTIVO desaparece del catálogo público y no se puede
 *   reservar, pero conserva sus reservas.
 * - No se borra un alojamiento con reservas confirmadas pendientes.
 * - "Mis reservas" solo muestra las reservas del cliente de la sesión.
 */
import { randomUUID } from 'crypto';
import { AppPrueba, crearAppPrueba, esperarProblema, camposInvalidos, dia, reservaValida, Como } from './app-prueba';

const ALTA = {
  nombre: 'Hostal Andino',
  destino: 'Otavalo',
  precioPorNoche: 38.9,
  capacidadAdultos: 3,
  capacidadNinos: 1,
  habitaciones: 4,
  tienePiscina: false,
};

const ALTA_COMPLETA = {
  ...ALTA,
  descripcion: 'Casa colonial junto a la Plaza de los Ponchos.',
  tipoPropiedad: 'Hostales',
  tipoAlojamiento: 'Habitación doble',
  moneda: 'USD',
  camas: 2,
  banos: 1.5,
  photos: [{ url: 'https://cdn.proveedor.com/andino/1.jpg', caption: 'Fachada' }, { url: 'https://cdn.proveedor.com/andino/2.jpg' }],
  amenidades: ['WiFi gratis', 'Desayuno', 'Pet friendly'],
  ubicacion: { address: 'Calle Sucre 10-12', city: 'Otavalo', country: 'EC', coordinates: { latitude: 0.2343, longitude: -78.2611 } },
  politicas: { checkin_desde: '14:00', checkin_hasta: '22:00', checkout_hasta: '11:00', cancelacion: 'Gratis hasta 48 h antes', mascotas: true, fumar: false },
};

const item = (idExterno: string, extra: Record<string, unknown> = {}) => ({ ...ALTA, nombre: `Hostal ${idExterno}`, idExterno, ...extra });

describe('10 · Gestión del catálogo e integración con proveedores', () => {
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

  const alta = (body: unknown, como: Como = 'admin') => t.pedir('POST', '/alojamientos', { body, como });
  const sincronizar = (body: unknown, como: Como = 'proveedor-a') => t.pedir('POST', '/alojamientos/sincronizar', { body, como });

  describe('Autenticación y autorización del catálogo', () => {
    it.each<[Como, number]>([
      ['anonimo', 401],
      ['token-invalido', 401],
      ['clave-falsa', 401],
      ['cliente', 403],
      ['tramposo', 403],
      ['admin', 201],
      ['admin-promovido', 201],
      ['proveedor-a', 201],
    ])('POST /alojamientos como %s → %i', async (como, esperado) => {
      const res = await alta(ALTA, como);
      expect(res.status).toBe(esperado);
      if (esperado >= 400) esperarProblema(res, esperado);
    });

    it('un usuario con role=admin en user_metadata (editable por él) NO puede tocar el catálogo', async () => {
      const res = await t.pedir('PATCH', '/alojamientos/quito-epiq', { body: { precioPorNoche: 1 }, como: 'tramposo' });
      esperarProblema(res, 403);
      expect((await t.pedir('GET', '/alojamientos/quito-epiq')).body.precioPorNoche).toBe(120);
    });

    it.each<[string, string, unknown]>([
      ['PATCH', '/alojamientos/quito-epiq', { precioPorNoche: 1 }],
      ['PUT', '/alojamientos/quito-epiq', ALTA],
      ['DELETE', '/alojamientos/quito-epiq', undefined],
      ['POST', '/alojamientos/sincronizar', { alojamientos: [item('X1')] }],
      ['GET', '/alojamientos/gestion/catalogo', undefined],
    ])('%s %s sin autenticación → 401 y no cambia nada', async (metodo, ruta, body) => {
      const res = await t.pedir(metodo, ruta, { body, como: 'anonimo' });
      esperarProblema(res, 401);
      expect((await t.pedir('GET', '/alojamientos/quito-epiq', { como: 'anonimo' })).status).toBe(200);
    });

    it('las lecturas públicas siguen sin pedir autenticación', async () => {
      expect((await t.pedir('GET', '/alojamientos', { como: 'anonimo' })).status).toBe(200);
      expect((await t.pedir('GET', '/alojamientos/quito-epiq', { como: 'anonimo' })).status).toBe(200);
      expect((await t.pedir('POST', '/alojamientos/search', { body: { destino: 'Quito' }, como: 'anonimo' })).status).toBe(200);
    });
  });

  describe('Contrato completo de alta (lo que un proveedor necesita enviar)', () => {
    it('acepta y devuelve fotos, amenidades, ubicación, políticas, moneda y descripción', async () => {
      const res = await alta(ALTA_COMPLETA);
      expect(res.status).toBe(201);
      const detalle = await t.pedir('GET', `/alojamientos/${res.body.id}`, { como: 'anonimo' });
      expect(detalle.body).toEqual(
        expect.objectContaining({
          descripcion: ALTA_COMPLETA.descripcion,
          tipo_propiedad: 'Hostales',
          moneda: 'USD',
          camas: 2,
          banos: 1.5,
          photos: ALTA_COMPLETA.photos,
          amenidades: ALTA_COMPLETA.amenidades,
          ubicacion: ALTA_COMPLETA.ubicacion,
          politicas: ALTA_COMPLETA.politicas,
          estado: 'ACTIVO',
          proveedor_id: null,
        }),
      );
    });

    it.each<[string, Record<string, unknown>]>([
      ['photos.0.url', { photos: [{ url: 'http://inseguro.com/a.jpg' }] }],
      ['photos.0.url', { photos: [{ url: 'no-es-url' }] }],
      ['photos', { photos: Array.from({ length: 31 }, (_, i) => ({ url: `https://x.com/${i}.jpg` })) }],
      ['amenidades', { amenidades: [123] }],
      ['ubicacion.country', { ubicacion: { country: 'ecu' } }],
      ['ubicacion.coordinates.latitude', { ubicacion: { coordinates: { latitude: 100, longitude: 0 } } }],
      ['politicas.checkin_desde', { politicas: { checkin_desde: '25:00' } }],
      ['politicas.mascotas', { politicas: { mascotas: 'si' } }],
      ['moneda', { moneda: 'usd' }],
      ['precioPorNoche', { precioPorNoche: 10.555 }],
      ['banos', { banos: -1 }],
      ['estado', { estado: 'BORRADO' }],
      ['idExterno', { idExterno: 'con espacios' }],
      ['ratings', { ratings: { score: 10 } }],
    ])('campo inválido "%s" → 400', async (campo, cambio) => {
      const res = await alta({ ...ALTA, ...cambio });
      esperarProblema(res, 400, 'VALIDATION_FAILED');
      expect(camposInvalidos(res)).toContain(campo);
    });

    it('dos altas seguidas no se pisan (ids distintos)', async () => {
      const [a, b] = await Promise.all([alta(ALTA), alta({ ...ALTA, nombre: 'Otro hostal' })]);
      expect(a.body.id).not.toBe(b.body.id);
      expect((await t.pedir('GET', '/alojamientos?limit=50')).body.meta.total).toBe(9);
    });
  });

  describe('null en campos NOT NULL (la BD los rechaza: antes daba 500 o guardaba basura)', () => {
    it.each([
      'nombre', 'destino', 'precioPorNoche', 'capacidadAdultos', 'capacidadNinos', 'habitaciones', 'tienePiscina',
      'tipoPropiedad', 'tipoAlojamiento', 'moneda', 'camas', 'banos', 'photos', 'amenidades', 'ubicacion', 'estado',
    ])('PATCH { %s: null } → 400 y no se modifica', async (campo) => {
      const res = await t.pedir('PATCH', '/alojamientos/quito-gangotena', { body: { [campo]: null } });
      esperarProblema(res, 400, 'VALIDATION_FAILED');
      expect(camposInvalidos(res)).toContain(campo);
      expect(t.repos.alojamientos.todas().find((a: any) => a.id === 'quito-gangotena')[campo]).not.toBeNull();
    });

    it.each(['tipoPropiedad', 'moneda', 'photos', 'ubicacion', 'estado'])('alta con { %s: null } → 400', async (campo) => {
      const res = await alta({ ...ALTA, [campo]: null });
      esperarProblema(res, 400, 'VALIDATION_FAILED');
      expect(camposInvalidos(res)).toContain(campo);
    });

    it('sincronizar con un null lo marca como ERROR sin tumbar el lote', async () => {
      const res = await sincronizar({ alojamientos: [item('N-1', { moneda: null }), item('N-2')] });
      expect(res.status).toBe(200);
      expect(res.body.resumen).toMatchObject({ creados: 1, errores: 1 });
      expect(res.body.resultados[0].errores.map((e: any) => e.name)).toContain('moneda');
    });

    it('descripcion y politicas sí se pueden vaciar con null', async () => {
      const res = await t.pedir('PATCH', '/alojamientos/quito-gangotena', { body: { descripcion: null, politicas: null } });
      expect(res.status).toBe(200);
    });
  });

  describe('Propiedad por proveedor', () => {
    it('el proveedor queda fijado por su API key, aunque el cuerpo diga otro', async () => {
      const res = await alta({ ...ALTA, idExterno: 'P-1', proveedorId: 'proveedor-b' }, 'proveedor-a');
      expect(res.status).toBe(201);
      expect(res.body.proveedorId).toBe('proveedor-a');
      expect(res.body.id).toBe('proveedor-a-P-1');
    });

    it('un proveedor no puede modificar ni borrar alojamientos de otro (403)', async () => {
      const { body } = await alta({ ...ALTA, idExterno: 'P-2' }, 'proveedor-a');
      esperarProblema(await t.pedir('PATCH', `/alojamientos/${body.id}`, { body: { precioPorNoche: 1 }, como: 'proveedor-b' }), 403);
      esperarProblema(await t.pedir('DELETE', `/alojamientos/${body.id}`, { como: 'proveedor-b' }), 403);
      esperarProblema(await t.pedir('PATCH', '/alojamientos/quito-epiq', { body: { precioPorNoche: 1 }, como: 'proveedor-a' }), 403);
    });

    it('el dueño sí puede actualizar su alojamiento y queda la marca de sincronización', async () => {
      const { body } = await alta({ ...ALTA, idExterno: 'P-3' }, 'proveedor-a');
      const res = await t.pedir('PATCH', `/alojamientos/${body.id}`, { body: { precioPorNoche: 55 }, como: 'proveedor-a' });
      expect(res.status).toBe(200);
      expect(res.body.precioPorNoche).toBe(55);
      expect(res.body.ultimaSincronizacion).toBeTruthy();
    });

    it('un proveedor no puede cambiarse de dueño un alojamiento', async () => {
      const { body } = await alta({ ...ALTA, idExterno: 'P-4' }, 'proveedor-a');
      const res = await t.pedir('PATCH', `/alojamientos/${body.id}`, { body: { proveedorId: 'proveedor-b' }, como: 'proveedor-a' });
      expect(res.body.proveedorId).toBe('proveedor-a');
    });

    it('el mismo idExterno dos veces para el mismo proveedor → 409 (hay que usar sincronizar)', async () => {
      await alta({ ...ALTA, idExterno: 'P-5' }, 'proveedor-a');
      const res = await alta({ ...ALTA, idExterno: 'P-5' }, 'proveedor-a');
      esperarProblema(res, 409);
      expect(res.body.detail).toContain('/alojamientos/sincronizar');
    });

    it('el mismo idExterno en proveedores distintos son alojamientos distintos', async () => {
      const a = await alta({ ...ALTA, idExterno: 'COMUN' }, 'proveedor-a');
      const b = await alta({ ...ALTA, idExterno: 'COMUN' }, 'proveedor-b');
      expect(a.status).toBe(201);
      expect(b.status).toBe(201);
      expect(a.body.id).not.toBe(b.body.id);
    });
  });

  describe('POST /alojamientos/sincronizar', () => {
    it('crea los alojamientos nuevos y devuelve el resultado de cada uno', async () => {
      const res = await sincronizar({ alojamientos: [item('H-1'), item('H-2')] });
      expect(res.status).toBe(200);
      expect(res.body.proveedor_id).toBe('proveedor-a');
      expect(res.body.resumen).toEqual({ recibidos: 2, creados: 2, actualizados: 0, errores: 0 });
      expect(res.body.resultados.map((r: any) => [r.idExterno, r.resultado, r.id])).toEqual([
        ['H-1', 'CREADO', 'proveedor-a-H-1'],
        ['H-2', 'CREADO', 'proveedor-a-H-2'],
      ]);
      const publico = await t.pedir('GET', '/alojamientos/proveedor-a-H-1', { como: 'anonimo' });
      expect(publico.status).toBe(200);
      expect(publico.body.proveedor_id).toBe('proveedor-a');
      expect(publico.body.id_externo).toBe('H-1');
    });

    it('es idempotente: reenviar el lote ACTUALIZA y no duplica', async () => {
      await sincronizar({ alojamientos: [item('H-1'), item('H-2')] });
      const res = await sincronizar({ alojamientos: [item('H-1', { precioPorNoche: 70 }), item('H-2')] });
      expect(res.body.resumen).toEqual({ recibidos: 2, creados: 0, actualizados: 2, errores: 0 });
      expect(t.repos.alojamientos.todas().filter((a) => a.proveedorId === 'proveedor-a')).toHaveLength(2);
      expect((await t.pedir('GET', '/alojamientos/proveedor-a-H-1', { como: 'anonimo' })).body.precioPorNoche).toBe(70);
    });

    it('el precio sincronizado se ve al instante aunque el detalle estuviera en caché', async () => {
      await sincronizar({ alojamientos: [item('H-9')] });
      await t.pedir('GET', '/alojamientos/proveedor-a-H-9', { como: 'anonimo' });
      await sincronizar({ alojamientos: [item('H-9', { precioPorNoche: 99 })] });
      expect((await t.pedir('GET', '/alojamientos/proveedor-a-H-9', { como: 'anonimo' })).body.precioPorNoche).toBe(99);
    });

    it('un elemento inválido no impide guardar los demás; su error señala el campo', async () => {
      const res = await sincronizar({
        alojamientos: [item('OK-1'), { ...item('MAL-1'), precioPorNoche: -5, moneda: 'dolares' }, item('OK-2')],
      });
      expect(res.status).toBe(200);
      expect(res.body.resumen).toEqual({ recibidos: 3, creados: 2, actualizados: 0, errores: 1 });
      const malo = res.body.resultados.find((r: any) => r.idExterno === 'MAL-1');
      expect(malo.resultado).toBe('ERROR');
      expect(malo.errores.map((e: any) => e.name)).toEqual(expect.arrayContaining(['precioPorNoche', 'moneda']));
      expect((await t.pedir('GET', '/alojamientos/proveedor-a-MAL-1')).status).toBe(404);
    });

    it.each<[string, unknown, string]>([
      ['sin idExterno', { ...ALTA }, 'idExterno'],
      ['no es un objeto', 'texto', 'alojamientos.0'],
      ['campo desconocido', { ...item('Z-1'), comision: 15 }, 'comision'],
      ['falta un campo obligatorio', { idExterno: 'Z-2', destino: 'Loja' }, 'nombre'],
    ])('elemento %s → ERROR señalando "%s"', async (_caso, elemento, campo) => {
      const res = await sincronizar({ alojamientos: [elemento] });
      expect(res.body.resultados[0].resultado).toBe('ERROR');
      expect(res.body.resultados[0].errores.map((e: any) => e.name)).toContain(campo);
    });

    it('idExterno repetido dentro del mismo lote → el segundo es ERROR', async () => {
      const res = await sincronizar({ alojamientos: [item('D-1'), item('D-1', { precioPorNoche: 1 })] });
      expect(res.body.resultados.map((r: any) => r.resultado)).toEqual(['CREADO', 'ERROR']);
    });

    it.each<[string, unknown]>([
      ['lote vacío', { alojamientos: [] }],
      ['más de 100 elementos', { alojamientos: Array.from({ length: 101 }, (_, i) => item(`N-${i}`)) }],
      ['sin la lista', {}],
    ])('%s → 400', async (_caso, body) => {
      const res = await sincronizar(body);
      esperarProblema(res, 400, 'VALIDATION_FAILED');
      expect(camposInvalidos(res)).toContain('alojamientos');
    });

    it('un administrador debe indicar el proveedor del lote', async () => {
      esperarProblema(await sincronizar({ alojamientos: [item('A-1')] }, 'admin'), 400, 'VALIDATION_FAILED');
      const res = await sincronizar({ proveedorId: 'grupo3-alojamientos', alojamientos: [item('A-1')] }, 'admin');
      expect(res.status).toBe(200);
      expect(res.body.resultados[0].id).toBe('grupo3-alojamientos-A-1');
    });

    it('un proveedor no puede sincronizar a nombre de otro (el proveedorId del cuerpo se ignora)', async () => {
      const res = await sincronizar({ proveedorId: 'proveedor-b', alojamientos: [item('B-1')] }, 'proveedor-a');
      expect(res.body.proveedor_id).toBe('proveedor-a');
    });

    it('retirar un alojamiento = enviarlo con estado INACTIVO', async () => {
      await sincronizar({ alojamientos: [item('R-1')] });
      await sincronizar({ alojamientos: [item('R-1', { estado: 'INACTIVO' })] });
      esperarProblema(await t.pedir('GET', '/alojamientos/proveedor-a-R-1', { como: 'anonimo' }), 404);
    });

    it('registra la telemetría de la sincronización', async () => {
      t.telemetria.trackEvent.mockClear();
      await sincronizar({ alojamientos: [item('T-1')] });
      expect(t.telemetria.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event_name: 'catalog_synced', properties: expect.objectContaining({ proveedor_id: 'proveedor-a', creados: 1 }) }),
      );
    });
  });

  describe('Alojamientos inactivos', () => {
    const desactivar = (id: string) => t.pedir('PATCH', `/alojamientos/${id}`, { body: { estado: 'INACTIVO' } });

    it('desaparecen del detalle, el listado y la búsqueda públicos', async () => {
      await t.pedir('GET', '/alojamientos/quito-epiq'); // en caché
      expect((await desactivar('quito-epiq')).status).toBe(200);
      esperarProblema(await t.pedir('GET', '/alojamientos/quito-epiq', { como: 'anonimo' }), 404);
      const lista = await t.pedir('GET', '/alojamientos?limit=50', { como: 'anonimo' });
      expect(lista.body.data.map((a: any) => a.id)).not.toContain('quito-epiq');
      expect(lista.body.meta.total).toBe(6);
      const busqueda = await t.pedir('POST', '/alojamientos/search', { body: { destino: 'Quito' }, como: 'anonimo' });
      expect(busqueda.body.data.map((a: any) => a.id)).not.toContain('quito-epiq');
    });

    it('no se pueden cotizar ni reservar (404)', async () => {
      await desactivar('quito-epiq');
      const disp = await t.pedir('POST', '/alojamientos/availability', { body: { accommodation: 'quito-epiq', checkin: dia(10), checkout: dia(12) } });
      esperarProblema(disp, 404);
      esperarProblema(await t.pedir('POST', '/alojamientos/orders/preview', { body: { accommodation_id: 'quito-epiq', checkin: dia(10), checkout: dia(12) } }), 404);
      esperarProblema(await t.pedir('POST', '/alojamientos/quito-epiq/reservations', { idem: true, body: reservaValida() }), 404);
      esperarProblema(await t.pedir('GET', `/alojamientos/quito-epiq/availability?date=${dia(10)}`), 404);
    });

    it('si se desactiva entre la cotización y el pago, la orden no se crea (409)', async () => {
      const prev = await t.pedir('POST', '/alojamientos/orders/preview', { body: { accommodation_id: 'quito-epiq', checkin: dia(10), checkout: dia(12) } });
      await desactivar('quito-epiq');
      const orden = await t.pedir('POST', '/alojamientos/orders/create', {
        idem: true,
        body: { order_preview_id: prev.body.data.order_preview_id, payment_reference: 'pay_123456', customer_details: { first_name: 'A', last_name: 'B', email: 'a@b.com' } },
      });
      esperarProblema(orden, 409, 'ROOM_NO_LONGER_AVAILABLE');
    });

    it('sus reservas existentes se pueden consultar y cancelar', async () => {
      const r = await t.pedir('POST', '/alojamientos/quito-epiq/reservations', { idem: true, body: reservaValida() });
      await desactivar('quito-epiq');
      expect((await t.pedir('GET', `/alojamientos/reservations/${r.body.reservation_id}`)).status).toBe(200);
      const c = await t.pedir('POST', `/alojamientos/reservations/${r.body.reservation_id}/cancel`, { idem: true, body: {} });
      expect(c.body.status).toBe('CANCELLED');
    });

    it('al reactivarlo vuelve a aparecer', async () => {
      await desactivar('quito-epiq');
      await t.pedir('PATCH', '/alojamientos/quito-epiq', { body: { estado: 'ACTIVO' } });
      expect((await t.pedir('GET', '/alojamientos/quito-epiq', { como: 'anonimo' })).status).toBe(200);
    });
  });

  describe('Baja protegida', () => {
    it('con reservas confirmadas pendientes → 409 que sugiere desactivarlo', async () => {
      await t.pedir('POST', '/alojamientos/cusco-inka/reservations', { idem: true, body: reservaValida() });
      const res = await t.pedir('DELETE', '/alojamientos/cusco-inka');
      esperarProblema(res, 409);
      expect(res.body.detail).toContain('INACTIVO');
      expect((await t.pedir('GET', '/alojamientos/cusco-inka')).status).toBe(200);
    });

    it('con reservas solo pasadas o canceladas → se puede borrar (204)', async () => {
      t.repos.reservas.sembrar(
        { id: randomUUID(), codigoReserva: 'BKG-500001', alojamientoId: 'cusco-inka', customerName: 'X', status: 'CONFIRMED', checkin: dia(-10), checkout: dia(-7), noches: 3, habitacionesCount: 1, total: 1 },
        { id: randomUUID(), codigoReserva: 'BKG-500002', alojamientoId: 'cusco-inka', customerName: 'Y', status: 'CANCELLED', checkin: dia(10), checkout: dia(12), noches: 2, habitacionesCount: 1, total: 1 },
      );
      expect((await t.pedir('DELETE', '/alojamientos/cusco-inka')).status).toBe(204);
    });
  });

  describe('GET /alojamientos/gestion/catalogo (panel)', () => {
    it('lista todo, también los inactivos, con origen y reservas pendientes', async () => {
      await t.pedir('PATCH', '/alojamientos/quito-ejido', { body: { estado: 'INACTIVO' } });
      await sincronizar({ alojamientos: [item('C-1')] });
      await t.pedir('POST', '/alojamientos/quito-epiq/reservations', { idem: true, body: reservaValida() });

      const res = await t.pedir('GET', '/alojamientos/gestion/catalogo');
      expect(res.status).toBe(200);
      expect(res.body.resumen).toEqual({ total: 8, activos: 7, inactivos: 1, manuales: 7, de_proveedores: 1, proveedores: ['proveedor-a'] });
      const ejido = res.body.data.find((a: any) => a.id === 'quito-ejido');
      expect(ejido.estado).toBe('INACTIVO');
      expect(res.body.data.find((a: any) => a.id === 'quito-epiq').reservas_pendientes).toBe(1);
      expect(res.body.data.find((a: any) => a.id === 'proveedor-a-C-1').proveedor_id).toBe('proveedor-a');
    });

    it.each<[string, (ids: string[]) => void]>([
      ['estado=INACTIVO', (ids) => expect(ids).toEqual(['quito-ejido'])],
      ['proveedor=manual', (ids) => expect(ids).not.toContain('proveedor-a-C-1')],
      ['proveedor=proveedor-a', (ids) => expect(ids).toEqual(['proveedor-a-C-1'])],
      ['q=cancun', (ids) => expect(ids).toEqual(['cancun-coral'])],
      ['q=C-1', (ids) => expect(ids).toEqual(['proveedor-a-C-1'])],
    ])('filtro %s', async (query, comprobar) => {
      await t.pedir('PATCH', '/alojamientos/quito-ejido', { body: { estado: 'INACTIVO' } });
      await sincronizar({ alojamientos: [item('C-1')] });
      const res = await t.pedir('GET', `/alojamientos/gestion/catalogo?${query}`);
      comprobar(res.body.data.map((a: any) => a.id));
    });

    it('un proveedor solo ve su propio inventario', async () => {
      await sincronizar({ alojamientos: [item('C-1')] });
      await sincronizar({ alojamientos: [item('C-9')] }, 'proveedor-b');
      const res = await t.pedir('GET', '/alojamientos/gestion/catalogo', { como: 'proveedor-a' });
      expect(res.body.data.map((a: any) => a.id)).toEqual(['proveedor-a-C-1']);
      expect(res.body.resumen.total).toBe(1);
    });

    it('un cliente no puede verlo (403)', async () => {
      esperarProblema(await t.pedir('GET', '/alojamientos/gestion/catalogo', { como: 'cliente' }), 403);
    });
  });

  describe('Mis reservas: cada cliente ve solo las suyas', () => {
    it('sin sesión → 401', async () => {
      esperarProblema(await t.pedir('GET', '/alojamientos/reservations', { como: 'anonimo' }), 401);
    });

    it('un cliente ve solo las reservas hechas con su correo; un admin ve todas', async () => {
      await t.pedir('POST', '/alojamientos/quito-epiq/reservations', { idem: true, body: reservaValida({ customer_email: 'Cliente@Example.com' }) });
      await t.pedir('POST', '/alojamientos/cusco-inka/reservations', { idem: true, body: reservaValida({ customer_email: 'otra.persona@example.com' }) });

      const mias = await t.pedir('GET', '/alojamientos/reservations', { como: 'cliente' });
      expect(mias.status).toBe(200);
      expect(mias.body).toHaveLength(1);
      expect(mias.body[0].customer_email).toBe('cliente@example.com');
      expect(JSON.stringify(mias.body)).not.toContain('otra.persona');

      const todas = await t.pedir('GET', '/alojamientos/reservations', { como: 'admin' });
      expect(todas.body).toHaveLength(2);
    });
  });
});
