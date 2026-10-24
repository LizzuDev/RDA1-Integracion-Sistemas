import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AutosController } from '../../src/modules/autos/autos.controller';
import { AutosService } from '../../src/modules/autos/autos.service';
import { PagoService } from '../../src/modules/atracciones/pago.service';
import { AutosCircuitBreakerAdapter } from '../../src/modules/autos/acl/autos-circuit-breaker.adapter';
import { WinstonPhysicalLoggerService } from '../../src/core/logger/winston-logger.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auto } from '../../src/modules/autos/entities/auto.entity';
import { OrderAuto } from '../../src/modules/autos/entities/order-auto.entity';
import { MantenimientoAuto } from '../../src/modules/autos/entities/mantenimiento-auto.entity';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { SupabaseAuthGuard } from '../../src/core/guards/supabase-auth.guard';
import { RolesGuard } from '../../src/core/guards/roles.guard';
import { of } from 'rxjs';

describe('Autos OpenAPI v2 Contract Tests & Cooldown 2h (Cátedra RDA2 §5)', () => {
  let app: INestApplication;

  const mockRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'saved-id', ...entity })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockHttpService = {
    post: jest.fn().mockReturnValue(of({ data: { success: true } })),
    get: jest.fn().mockReturnValue(of({ data: [] })),
  };

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(null),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AutosController],
      providers: [
        AutosService,
        PagoService,
        AutosCircuitBreakerAdapter,
        WinstonPhysicalLoggerService,
        SupabaseAuthGuard,
        RolesGuard,
        { provide: getRepositoryToken(Auto), useValue: mockRepo },
        { provide: getRepositoryToken(OrderAuto), useValue: mockRepo },
        { provide: getRepositoryToken(MantenimientoAuto), useValue: mockRepo },
        { provide: HttpService, useValue: mockHttpService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: ['1', '2'],
      prefix: 'v',
    });
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/v2/autos/flota debe reportar estado de flota, cronómetros de cooldown y alertas de kilometraje', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v2/autos/flota')
      .expect(HttpStatus.OK);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    const auto = response.body[0];
    expect(auto).toHaveProperty('id');
    expect(auto).toHaveProperty('marca');
    expect(auto).toHaveProperty('estado_operativo');
    expect(auto).toHaveProperty('cooldown_activo');
    expect(auto).toHaveProperty('segundos_restantes_cooldown');
  });

  it('POST /api/v2/autos/search debe excluir vehículos en cooldown/limpieza y retornar catálogo filtrado', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v2/autos/search')
      .send({
        pickup_location: 'UIO',
        pickup_date: '2026-11-10',
        pickup_time: '10:00',
        dropoff_date: '2026-11-13',
        dropoff_time: '10:00',
        driver_age: 28,
      })
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    // Ningún auto en EN_LIMPIEZA activo debe ser devuelto
    for (const item of response.body.data) {
      expect(item.estado).not.toBe('EN_LIMPIEZA');
    }
  });

  it('GET /api/v2/autos/:id/coberturas debe desglosar Protección Básica vs Cobertura Total (Cátedra RDA2)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v2/autos/auto-spark-01/coberturas')
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('opciones');
    expect(Array.isArray(response.body.opciones)).toBe(true);
    const basica = response.body.opciones.find((o: any) => o.tipo === 'BASICA');
    const total = response.body.opciones.find((o: any) => o.tipo === 'TOTAL');
    expect(basica).toBeDefined();
    expect(total).toBeDefined();
    expect(basica.franquicia).toBeGreaterThan(0);
    expect(total.franquicia).toBe(0);
  });

  it('GET /api/v2/autos/:id debe retornar ficha técnica del vehículo', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v2/autos/auto-spark-01')
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('vehicle_id', 'auto-spark-01');
    expect(response.body).toHaveProperty('marca');
    expect(response.body).toHaveProperty('transmision');
    expect(response.body).toHaveProperty('politica_combustible');
  });

  it('POST /api/v2/autos/orders/create debe crear orden con PNR, Voucher QR y cabecera de Idempotencia', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v2/autos/orders/create')
      .set('Idempotency-Key', 'idem-test-uuid-444')
      .set('X-Correlation-Id', 'corr-test-444')
      .send({
        vehicle_id: 'auto-spark-01',
        pickup_date: '2026-11-10',
        dropoff_date: '2026-11-12',
        pickup_location: 'UIO Aeropuerto',
        dropoff_location: 'UIO Aeropuerto',
        tipo_cobertura: 'TOTAL',
        conductor: {
          nombre: 'Dilan Flores',
          email: 'dilan.flores@epn.edu.ec',
          telefono: '+593987654321',
          licencia: '1723456789',
          edad: 28,
        },
      })
      .expect(HttpStatus.CREATED);

    expect(response.body).toHaveProperty('pnr');
    expect(response.body).toHaveProperty('status', 'CONFIRMED');
    expect(response.body).toHaveProperty('voucher_qr_data');
    expect(response.body).toHaveProperty('checklist_mostrador');
  });

  it('POST /api/v2/autos/orders/:id/checkin-entrega debe validar odómetro inicial y marcar auto ENTREGADO', async () => {
    // Primero creamos la orden para que exista en memoria
    const orderRes = await request(app.getHttpServer())
      .post('/api/v2/autos/orders/create')
      .set('Idempotency-Key', 'idem-entrega-001')
      .send({
        vehicle_id: 'auto-spark-01',
        pickup_date: '2026-11-10',
        dropoff_date: '2026-11-12',
        conductor: {
          nombre: 'María Gómez',
          email: 'maria.gomez@epn.edu.ec',
          telefono: '+593987111222',
          licencia: '1799988877',
          edad: 32,
        },
      });

    const orderId = orderRes.body.pnr || orderRes.body.order_id;

    const response = await request(app.getHttpServer())
      .post(`/api/v2/autos/orders/${orderId}/checkin-entrega`)
      .send({
        licencia_conducir: '1799988877',
        km_salida: 5200,
        tecnico_entrega: 'Tecnico Patio UIO',
      })
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('estado_orden', 'ENTREGADO');
  });

  it('POST /api/v2/autos/orders/:id/checkin-devolucion debe transicionar a EN_LIMPIEZA y activar cooldown 2h', async () => {
    // Creamos la orden para retornar
    const orderRes = await request(app.getHttpServer())
      .post('/api/v2/autos/orders/create')
      .set('Idempotency-Key', 'idem-devolucion-001')
      .send({
        vehicle_id: 'auto-spark-01',
        pickup_date: '2026-11-10',
        dropoff_date: '2026-11-12',
        conductor: {
          nombre: 'Carlos Ruiz',
          email: 'carlos.ruiz@epn.edu.ec',
          telefono: '+593987333444',
          licencia: '1755544433',
          edad: 30,
        },
      });

    const orderId = orderRes.body.pnr || orderRes.body.order_id;

    const response = await request(app.getHttpServer())
      .post(`/api/v2/autos/orders/${orderId}/checkin-devolucion`)
      .send({
        km_retorno: 5450,
        nivel_combustible: 100,
        observaciones: 'Vehículo recibido en perfectas condiciones',
      })
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('cooldown');
    expect(response.body.cooldown).toHaveProperty('cooldown_horas', 2);
  });

  it('POST /api/v2/autos/:id/mantenimiento/registro debe rechazar acceso (403 Forbidden) para rol CLIENTE (RBAC Cátedra RDA2 §5)', async () => {
    await request(app.getHttpServer())
      .post('/api/v2/autos/auto-spark-01/mantenimiento/registro')
      .set('X-Role', 'CLIENTE')
      .send({
        tecnico_id: 'CLI-01',
        kilometraje_registrado: 10100,
        nivel_combustible: 90,
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  it('POST /api/v2/autos/:id/mantenimiento/registro debe autorizar rol MANTENIMIENTO, auditar odómetro y evaluar alerta preventiva', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v2/autos/auto-spark-01/mantenimiento/registro')
      .set('X-Role', 'MANTENIMIENTO')
      .send({
        tecnico_id: 'TEC-UIO-99',
        kilometraje_registrado: 10100,
        nivel_combustible: 90,
        condiciones_carroceria: 'Sin novedades',
        estado_neumaticos: 'Presión calibrada 32 psi',
        observaciones: 'Inspección de rutina completada',
      })
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('auto_id', 'auto-spark-01');
    expect(response.body).toHaveProperty('kilometraje_actual', 10100);
    expect(response.body).toHaveProperty('mantenimiento_requerido');
  });

  it('POST /api/v2/autos/orders/:orderId/cancel debe ejecutar compensación Saga con reembolso', async () => {
    // Usamos auto-rio-02 (que está DISPONIBLE y no en EN_LIMPIEZA) para la orden a cancelar
    const orderRes = await request(app.getHttpServer())
      .post('/api/v2/autos/orders/create')
      .set('Idempotency-Key', 'idem-cancel-002')
      .send({
        vehicle_id: 'auto-rio-02',
        pickup_date: '2026-11-20',
        dropoff_date: '2026-11-22',
        conductor: {
          nombre: 'Ana Paredes',
          email: 'ana.paredes@epn.edu.ec',
          telefono: '+593987666555',
          licencia: '1722233344',
          edad: 29,
        },
      })
      .expect(HttpStatus.CREATED);

    const orderId = orderRes.body.pnr || orderRes.body.order_id;
    expect(orderId).toBeDefined();

    const response = await request(app.getHttpServer())
      .post(`/api/v2/autos/orders/${orderId}/cancel`)
      .set('Idempotency-Key', 'cancel-idem-999')
      .send({
        motivo: 'Cambio de itinerario de vuelo',
      })
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('status', 'CANCELLED');
    expect(response.body).toHaveProperty('refund');
    expect(response.body.refund).toHaveProperty('percentage', 100);
    expect(response.body.inventory_restoration).toHaveProperty('new_state', 'DISPONIBLE');
  });

  it('GET /api/v2/autos/health debe retornar telemetría de salud y métricas de nodo (CE01)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v2/autos/health')
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('status', 'HEALTHY');
    expect(response.body).toHaveProperty('nodo_id', 'NODE_AUT_LOCAL');
    expect(response.body).toHaveProperty('version', '2.0.0');
    expect(response.body).toHaveProperty('uptime_seconds');
  });

  it('GET y PUT /api/v2/autos/promociones/contrato debe consultar y formalizar acuerdo B2B de promociones (Cátedra RDA2 §9)', async () => {
    const getRes = await request(app.getHttpServer())
      .get('/api/v2/autos/promociones/contrato')
      .expect(HttpStatus.OK);

    expect(getRes.body).toHaveProperty('permite_promociones', true);
    expect(getRes.body).toHaveProperty('porcentaje_descuento_maximo');
    expect(getRes.body).toHaveProperty('destinos_habilitados');

    const putRes = await request(app.getHttpServer())
      .put('/api/v2/autos/promociones/contrato')
      .send({
        permite_promociones: true,
        porcentaje_descuento_maximo: 20.0,
        destinos_habilitados: ['Quito', 'Guayaquil', 'Cuenca'],
      })
      .expect(HttpStatus.OK);

    expect(putRes.body).toHaveProperty('success', true);
    expect(putRes.body.contrato).toHaveProperty('porcentaje_descuento_maximo', 20.0);
  });

  it('GET /api/v2/autos debe listar catálogo general de vehículos', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v2/autos')
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('POST /api/v2/autos/reservas y cancel alias debe crear y cancelar reserva con cálculo dinámico de días', async () => {
    const resCreate = await request(app.getHttpServer())
      .post('/api/v2/autos/reservas')
      .set('Idempotency-Key', 'idem-alias-reserva-001')
      .send({
        vehicle_id: 'auto-audi-04',
        pickup_date: '2026-11-15',
        dropoff_date: '2026-11-18',
        tipo_cobertura: 'BASICA',
        conductor: {
          nombre: 'Elena Castro',
          email: 'elena.castro@epn.edu.ec',
          telefono: '+593987111333',
          licencia: '1788899900',
          edad: 26,
        },
      })
      .expect(HttpStatus.CREATED);

    expect(resCreate.body).toHaveProperty('pnr');
    expect(resCreate.body).toHaveProperty('codigo_reserva');
    expect(resCreate.body).toHaveProperty('dias_renta', 3);
    expect(resCreate.body).toHaveProperty('estado', 'CONFIRMED');

    const orderId = resCreate.body.pnr;

    const resCancel = await request(app.getHttpServer())
      .post(`/api/v2/autos/reservas/${orderId}/cancel`)
      .set('Idempotency-Key', 'idem-alias-cancel-001')
      .send({
        motivo: 'Compensación Saga por fallo en tramo hotelero',
        solicitante: 'SAGA_ORCHESTRATOR',
      })
      .expect(HttpStatus.OK);

    expect(resCancel.body).toHaveProperty('status', 'CANCELLED');
    expect(resCancel.body).toHaveProperty('reembolso_id');
    expect(resCancel.body).toHaveProperty('monto_reembolsado');
    expect(resCancel.body.inventory_restoration).toHaveProperty('new_state', 'DISPONIBLE');
  });

  it('POST /api/v2/autos/:id/devolucion debe iniciar cooldown de limpieza de 2 horas', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v2/autos/auto-rio-02/devolucion')
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('auto_id', 'auto-rio-02');
    expect(response.body).toHaveProperty('estado', 'EN_LIMPIEZA');
    expect(response.body).toHaveProperty('cooldown_horas', 2);
    expect(response.body).toHaveProperty('disponible_desde');
  });

  it('GET /api/v2/autos/eventos debe retornar feed Outbox de eventos CloudEvents', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v2/autos/eventos')
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('events');
    expect(Array.isArray(response.body.events)).toBe(true);
    expect(response.body.events.length).toBeGreaterThanOrEqual(4);
    const types = response.body.events.map((e: any) => e.type);
    expect(types).toContain('ec.edu.epn.booking.autos.order.confirmed');
    expect(types).toContain('ec.edu.epn.booking.autos.cleaning.started');
    expect(types).toContain('ec.edu.epn.booking.autos.mantenimiento.alerta');
    expect(types).toContain('ec.edu.epn.booking.autos.order.cancelled');
  });
});
