import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as express from 'express';
import { VuelosSociosService } from './vuelos-socios.service';
import { VuelosSociosMiddleware } from './vuelos-socios.middleware';

/**
 * Prueba el agregador contra aerolíneas FALSAS levantadas en un puerto local.
 * En producción 127.0.0.1 cuenta como auto-referencia (no se consulta), así que
 * esta suite desactiva esa regla y la prueba aparte con la función original.
 */
describe('VuelosSociosService (agregador de aerolíneas)', () => {
  const llamadas: Array<{ nodo: string; method: string; url: string; headers: any; body: any }> = [];
  let servidor: http.Server;
  let puerto: number;
  const original = VuelosSociosService.esAutoReferencia;

  beforeAll(async () => {
    servidor = http.createServer((req, res) => {
      let crudo = '';
      req.on('data', (c) => (crudo += c));
      req.on('end', () => {
        const [, nodo, ...resto] = (req.url || '').split('/'); // /<nodo>/api/v2/vuelos/...
        const ruta = '/' + resto.join('/');
        const body = crudo ? (req.headers['content-type']?.includes('json') ? JSON.parse(crudo) : crudo) : null;
        llamadas.push({ nodo, method: req.method!, url: ruta, headers: req.headers, body });
        const json = (s: number, b: any) => {
          res.writeHead(s, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(b));
        };
        if (ruta === '/api/v2/oauth2/token') return json(200, { access_token: 'tok-123', expires_in: 3600 });
        if (nodo === 'lenta') return; // nunca responde
        if (nodo === 'oauth' && req.headers.authorization !== 'Bearer tok-123') return json(401, { title: 'sin token' });
        if (nodo === 'key' && req.headers['x-api-key'] !== 'clave-key') return json(401, { title: 'sin key' });
        if (ruta === '/api/v2/vuelos/search') {
          const precio = nodo === 'key' ? '120.00' : '80.00';
          return json(200, {
            offers: [{ offerId: `OF-${nodo}`, itineraries: [{ itineraryId: 'IT-1', pricingOptions: [{ price: { total: precio } }] }] }],
          });
        }
        if (ruta === '/api/v2/vuelos/offers/hold' && req.method === 'POST') {
          return json(201, { holdId: `HOLD-${nodo}`, offerId: body.offerId });
        }
        if (ruta.startsWith('/api/v2/vuelos/bookings/') && req.method === 'GET') {
          return json(200, { bookingId: ruta.split('/').pop(), status: 'CONFIRMED' });
        }
        json(404, { title: 'no existe' });
      });
    });
    await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r));
    puerto = (servidor.address() as AddressInfo).port;
    (VuelosSociosService as any).esAutoReferencia = () => false;
    process.env.VUELOS_SOCIOS_TIMEOUT_MS = '800';
  });

  afterAll(async () => {
    (VuelosSociosService as any).esAutoReferencia = original;
    delete process.env.VUELOS_SOCIOS_TIMEOUT_MS;
    delete process.env.VUELOS_FUENTE;
    servidor.closeAllConnections?.();
    await new Promise((r) => servidor.close(r));
  });

  beforeEach(() => (llamadas.length = 0));

  const nodos = () => [
    { codigoNodo: 'NODE_VUE_KEY', nombreProveedor: 'Aero Key', vertical: 'VUELOS', baseUrlRest: `http://127.0.0.1:${puerto}/key/api/v2/vuelos`, apiKey: 'clave-key', killSwitchActivo: false },
    { codigoNodo: 'NODE_VUE_OAUTH', nombreProveedor: 'Aero OAuth', vertical: 'VUELOS', baseUrlRest: `http://127.0.0.1:${puerto}/oauth/api/v2`, apiKey: `oauth2:cid:csecret:http://127.0.0.1:${puerto}/oauth/api/v2/oauth2/token`, killSwitchActivo: false },
    { codigoNodo: 'NODE_VUE_LENTA', nombreProveedor: 'Aero Lenta', vertical: 'VUELOS', baseUrlRest: `http://127.0.0.1:${puerto}/lenta/api/v2/vuelos`, killSwitchActivo: false },
    { codigoNodo: 'NODE_VUE_APAGADA', nombreProveedor: 'Apagada', vertical: 'VUELOS', baseUrlRest: `http://127.0.0.1:${puerto}/key/api/v2/vuelos`, killSwitchActivo: true },
    { codigoNodo: 'NODE_VUE_SINURL', nombreProveedor: 'Sin URL', vertical: 'VUELOS', baseUrlRest: 'pendiente', killSwitchActivo: false },
  ];

  const repoFalso = () => ({
    find: async ({ where }: any) => nodos().filter((n) => n.vertical === where.vertical),
    findOne: async ({ where }: any) => nodos().find((n) => n.codigoNodo === where.codigoNodo) ?? null,
  });

  const crear = () => new VuelosSociosService(repoFalso() as any);

  it('consulta en paralelo, autentica (API key y OAuth2), prefija ids y tolera una aerolínea caída', async () => {
    const r = await crear().buscar({ itineraries: [] }, { 'x-device-fingerprint': 'fp-1' });

    expect(r.offers.map((o) => o.offerId)).toEqual(['NODE_VUE_OAUTH~OF-oauth', 'NODE_VUE_KEY~OF-key']); // ordenado por precio
    expect(r.offers[0].provider).toMatchObject({ nodeCode: 'NODE_VUE_OAUTH', name: 'Aero OAuth' });
    expect(r.sources).toHaveLength(3); // apagada y sin URL no se consultan
    const lenta = r.sources.find((s) => s.codigoNodo === 'NODE_VUE_LENTA')!;
    expect(lenta.ok).toBe(false);
    expect(lenta.error).toMatch(/Sin respuesta/);

    const busqueda = llamadas.find((c) => c.nodo === 'key' && c.url.endsWith('/search'))!;
    expect(busqueda.headers['x-device-fingerprint']).toBe('fp-1');
    expect(llamadas.some((c) => c.url === '/api/v2/oauth2/token')).toBe(true);
  });

  it('reenvía el hold a la aerolínea dueña sin el prefijo y devuelve ids prefijados', async () => {
    const r = await crear().reenviar(
      'NODE_VUE_KEY', 'POST', ['offers', 'hold'], '',
      { offerId: 'NODE_VUE_KEY~OF-key', itinerarySelections: [] },
      { 'idempotency-key': 'idem-1' },
    );
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ holdId: 'NODE_VUE_KEY~HOLD-key', offerId: 'NODE_VUE_KEY~OF-key' });
    const hold = llamadas.find((c) => c.url === '/api/v2/vuelos/offers/hold')!;
    expect(hold.body.offerId).toBe('OF-key');
    expect(hold.headers['idempotency-key']).toBe('idem-1');
  });

  it('detecta el nodo por la ruta o por el cuerpo', () => {
    expect(VuelosSociosService.detectarNodo(['bookings', 'NODE_VUE_KEY~BK-1'], null)).toBe('NODE_VUE_KEY');
    expect(VuelosSociosService.detectarNodo(['bookings'], { holdId: 'NODE_VUE_OAUTH~H-9' })).toBe('NODE_VUE_OAUTH');
    expect(VuelosSociosService.detectarNodo(['bookings', '3f2a-uuid-local'], { holdId: 'uuid-local' })).toBeNull();
  });

  it('no consulta nodos que apuntan a Booking mismo (seeds localhost)', () => {
    expect(original('http://localhost:3000/api/v2/vuelos')).toBe(true);
    expect(original('https://booking.example.com/api/v2/vuelos', 'booking.example.com')).toBe(true);
    expect(original('https://aerolinea.azurewebsites.net/api/v2/vuelos')).toBe(false);
  });

  describe('middleware sobre Express', () => {
    let app: http.Server;
    let base: string;
    const local = { searchFlights: jest.fn(async () => ({ offers: [{ offerId: 'LOCAL-1' }] })) };

    beforeAll(async () => {
      const e = express();
      e.use(express.json());
      e.use(new VuelosSociosMiddleware(crear(), local as any).handler());
      e.use((_req, res) => res.status(299).json({ local: true }));
      app = await new Promise((r) => {
        const s = e.listen(0, '127.0.0.1', () => r(s));
      });
      base = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
    });
    afterAll(async () => {
      app.closeAllConnections?.();
      await new Promise((r) => app.close(r));
    });

    const post = (ruta: string, body: any) =>
      fetch(base + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    it('modo socios: la búsqueda solo trae vuelos de aerolíneas (sin datos locales)', async () => {
      delete process.env.VUELOS_FUENTE;
      const r = await post('/api/v2/vuelos/search', { itineraries: [] });
      const datos = await r.json();
      expect(r.status).toBe(200);
      expect(datos.offers.map((o: any) => o.offerId)).not.toContain('LOCAL-1');
      expect(datos.meta).toMatchObject({ fuente: 'socios', airlinesQueried: 3, airlinesOk: 2 });
    });

    it('modo mixto: agrega también la base local', async () => {
      process.env.VUELOS_FUENTE = 'mixto';
      const datos = await (await post('/api/v1/vuelos/search', { itineraries: [] })).json();
      expect(datos.offers.map((o: any) => o.offerId)).toContain('LOCAL-1');
      delete process.env.VUELOS_FUENTE;
    });

    it('reenvía GET de una reserva de aerolínea y deja pasar las rutas locales', async () => {
      const r = await fetch(`${base}/api/v2/vuelos/bookings/${encodeURIComponent('NODE_VUE_KEY~BK-77')}`);
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({ bookingId: 'NODE_VUE_KEY~BK-77', status: 'CONFIRMED' });

      const localRes = await fetch(`${base}/api/v2/vuelos/bookings/uuid-local`);
      expect(localRes.status).toBe(299);
    });

    it('modo local: todo sigue al controlador de siempre', async () => {
      process.env.VUELOS_FUENTE = 'local';
      const r = await post('/api/v2/vuelos/search', {});
      expect(r.status).toBe(299);
      delete process.env.VUELOS_FUENTE;
    });
  });
});
