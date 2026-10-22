import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AtraccionesController } from '../../src/modules/atracciones/atracciones.controller';
import { AtraccionesService } from '../../src/modules/atracciones/atracciones.service';
import { PagoService } from '../../src/modules/atracciones/pago.service';
import { SoapWrapperService } from '../../src/modules/atracciones/soap-wrapper.service';
import { DilanAtraccionesAdapter } from '../../src/modules/atracciones/acl/dilan-atracciones.adapter';
import { WinstonPhysicalLoggerService } from '../../src/core/logger/winston-logger.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Atraccion,
  CategoriaRecursiva,
  TurnoAforo,
  ReservaAtraccion,
  ResenaAtraccion,
  EventoOutbox,
} from '../../src/modules/atracciones/entities';
import { DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { of } from 'rxjs';

describe('Atracciones OpenAPI v2 Contract Tests (Cátedra RDA2 CE07)', () => {
  let app: INestApplication;

  const mockRepo = {
    find: jest.fn().mockResolvedValue([]),
    findAndCount: jest.fn().mockResolvedValue([
      [
        {
          id: 'PRhu4UBTWPBC',
          nombre: 'Teleférico y Volcán Pichincha',
          descripcionCorta: 'Vistas panorámicas de Quito a 4000 msnm',
          precioUnitarioAdulto: 55.0,
          precioUnitarioNino: 27.5,
          activo: true,
          inclusiones: ['Guía', 'Transporte'],
          createdAt: new Date(),
        },
      ],
      1,
    ]),
    findOne: jest.fn().mockImplementation((query) => {
      if (query?.where?.horaInicio === '10:00 a.m.') {
        return Promise.resolve({
          id: 'turno-1',
          atraccionId: 'PRhu4UBTWPBC',
          fecha: '2026-10-25',
          horaInicio: '10:00 a.m.',
          horaFin: '12:00 p.m.',
          capacidadTotal: 20,
          cuposDisponibles: 15,
          estado: 'DISPONIBLE',
        });
      }
      return Promise.resolve(null);
    }),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((entity) =>
      Promise.resolve({
        id: 'res-auto-01',
        localizador: 'LOC-12345',
        status: 'CONFIRMED',
        ...entity,
      }),
    ),
  };

  const mockHttpService = {
    get: jest.fn().mockReturnValue(of({ data: [] })),
    post: jest.fn().mockReturnValue(of({ data: { success: true } })),
  };

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(null),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AtraccionesController],
      providers: [
        AtraccionesService,
        PagoService,
        SoapWrapperService,
        DilanAtraccionesAdapter,
        WinstonPhysicalLoggerService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: HttpService, useValue: mockHttpService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: getRepositoryToken(Atraccion), useValue: mockRepo },
        { provide: getRepositoryToken(CategoriaRecursiva), useValue: mockRepo },
        { provide: getRepositoryToken(TurnoAforo), useValue: mockRepo },
        { provide: getRepositoryToken(ReservaAtraccion), useValue: mockRepo },
        { provide: getRepositoryToken(ResenaAtraccion), useValue: mockRepo },
        { provide: getRepositoryToken(EventoOutbox), useValue: mockRepo },
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

  it('GET /api/v2/atracciones debe cumplir con el esquema paginado de OpenAPI v2', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v2/atracciones?limit=2&page=1')
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');
    expect(Array.isArray(response.body.data)).toBe(true);
    if (response.body.data.length > 0) {
      const item = response.body.data[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('price');
    }
  });

  it('GET /api/v2/atracciones/categorias/arbol debe retornar el árbol recursivo con los 3 flags de inclusión', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v2/atracciones/categorias/arbol')
      .expect(HttpStatus.OK);

    expect(Array.isArray(response.body)).toBe(true);
    if (response.body.length > 0) {
      const cat = response.body[0];
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('nombre');
      expect(cat).toHaveProperty('incluye_comida');
      expect(cat).toHaveProperty('incluye_transporte');
      expect(cat).toHaveProperty('incluye_guia');
    }
  });

  it('POST /api/v2/atracciones/reservas debe validar aforo y procesar reserva según contrato OpenAPI v2', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v2/atracciones/reservas')
      .send({
        atraccionId: 'PRhu4UBTWPBC',
        date: '2026-10-25',
        time: '10:00 a.m.',
        adult_count: 1,
        child_count: 0,
        senior_count: 0,
        infant_count: 0,
        customer_name: 'Dilan Flores Test',
        customer_email: 'dilan.flores@epn.edu.ec',
      });

    // Debe responder 201 Created o 409 Conflict OUT_OF_STOCK según el cupo
    expect([HttpStatus.CREATED, HttpStatus.CONFLICT]).toContain(res.status);
    if (res.status === HttpStatus.CONFLICT) {
      expect(res.body).toHaveProperty('type');
      expect(res.body).toHaveProperty('code', 'OUT_OF_STOCK');
    }
  });
});
