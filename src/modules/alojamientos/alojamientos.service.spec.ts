import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AlojamientosService } from './alojamientos.service';
import { Alojamiento } from './entities/alojamiento.entity';
import { ReservaAlojamiento } from './entities/reserva.entity';
import { Host } from './entities/host.entity';
import { Amenidad } from './entities/amenidad.entity';
import { FotoAlojamiento } from './entities/foto.entity';
import { ResenaAlojamiento } from './entities/resena.entity';
import { ReservationStatus } from './dto/reservation.dto';

describe('AlojamientosService', () => {
  let service: AlojamientosService;
  let alojamientoRepo: any;
  let reservaRepo: any;

  const mockAlojamiento: Partial<Alojamiento> = {
    id: 'test-uuid-1',
    nombre: 'Villa Paraíso',
    descripcion: 'Hermosa villa frente al mar',
    destino: 'Cancún',
    precioPorNoche: 200,
    moneda: 'USD',
    habitaciones: 3,
    camas: 4,
    banos: 2,
    tienePiscina: true,
    rating: 9.5,
    fotos: [
      { id: 'f1', url: 'https://img.com/1.jpg', titulo: 'Vista', esPrincipal: true, orden: 1 } as any,
    ],
    amenidades: [{ id: 'a1', nombre: 'WiFi' } as any],
    resenas: [],
  };

  beforeEach(async () => {
    alojamientoRepo = {
      count: jest.fn().mockResolvedValue(10),
      find: jest.fn().mockResolvedValue([mockAlojamiento]),
      findAndCount: jest.fn().mockResolvedValue([[mockAlojamiento], 1]),
      findOne: jest.fn().mockResolvedValue(mockAlojamiento),
      findOneBy: jest.fn().mockResolvedValue(mockAlojamiento),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'test-uuid-1', ...entity })),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    reservaRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => ({ id: 'res-uuid-1', ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'res-uuid-1', ...entity })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlojamientosService,
        {
          provide: HttpService,
          useValue: { get: jest.fn() },
        },
        { provide: getRepositoryToken(Alojamiento), useValue: alojamientoRepo },
        { provide: getRepositoryToken(ReservaAlojamiento), useValue: reservaRepo },
        { provide: getRepositoryToken(Host), useValue: {} },
        { provide: getRepositoryToken(Amenidad), useValue: {} },
        { provide: getRepositoryToken(FotoAlojamiento), useValue: {} },
        { provide: getRepositoryToken(ResenaAlojamiento), useValue: {} },
      ],
    }).compile();

    service = module.get<AlojamientosService>(AlojamientosService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('health()', () => {
    it('debe retornar el estado operativo del servicio y conteo de registros', async () => {
      const result = await service.health();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('Alojamientos');
      expect(result.database).toBe('connected');
      expect(result.total_listings).toBe(10);
    });
  });

  describe('search()', () => {
    it('debe buscar y retornar alojamientos formateados con metadata', async () => {
      const result = await service.search({ destino: 'Cancún', rows: 5 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].nombre).toBe('Villa Paraíso');
      expect(result.data[0]._links).toBeDefined();
      expect(result.metadata.total_results).toBe(1);
    });
  });

  describe('findOne()', () => {
    it('debe retornar el detalle formateado si el alojamiento existe', async () => {
      const result = await service.findOne('test-uuid-1');
      expect(result.id).toBe('test-uuid-1');
      expect(result.nombre).toBe('Villa Paraíso');
      expect(result._links.self.href).toBe('/api/v1/alojamientos/test-uuid-1');
    });

    it('debe lanzar excepción NOT_FOUND si no existe', async () => {
      alojamientoRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('inexistente')).rejects.toThrow(HttpException);
    });
  });

  describe('reservar()', () => {
    it('debe calcular el monto total y generar la reserva confirmada', async () => {
      const dto = {
        nights: 3,
        habitaciones_count: 2,
        customer_name: 'Juan Pérez',
        customer_email: 'juan@test.com',
        checkin: '2026-10-10',
        checkout: '2026-10-13',
        adultos: 2,
      };

      const result = await service.reservar('test-uuid-1', dto as any, 'idemp-key-123');

      expect(result.status).toBe(ReservationStatus.CONFIRMED);
      expect(result.customer_name).toBe('Juan Pérez');
      // Precio por noche = 200 * 3 noches * 2 habitaciones = 1200
      expect(result.total_price.total).toBe(1200);
      expect(result._links.cancelar).toBeDefined();
    });

    it('debe lanzar conflicto si la clave de idempotencia ya fue procesada y confirmada', async () => {
      reservaRepo.findOne.mockResolvedValue({
        id: 'res-existente',
        status: ReservationStatus.CONFIRMED,
        idempotencyKey: 'idemp-key-dup',
      });

      const dto = { nights: 1, customer_name: 'Juan' };
      await expect(service.reservar('test-uuid-1', dto as any, 'idemp-key-dup')).rejects.toThrow(
        new HttpException('Conflicto de Idempotencia: Reserva ya procesada.', HttpStatus.CONFLICT),
      );
    });
  });

  describe('cancelarReserva()', () => {
    it('debe actualizar el estado a CANCELLED', async () => {
      reservaRepo.findOneBy.mockResolvedValue({
        id: 'res-1',
        status: ReservationStatus.CONFIRMED,
        codigoReserva: 'BKG-123',
        total: 200,
      });

      const result = await service.cancelarReserva('res-1', { reason: 'Cambio de planes' } as any, 'idemp-cancel');
      expect(result.status).toBe(ReservationStatus.CANCELLED);
    });
  });
});
