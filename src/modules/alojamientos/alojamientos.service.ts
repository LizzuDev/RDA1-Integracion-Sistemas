import { Injectable, Logger, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';

import { Alojamiento } from './entities/alojamiento.entity';
import { ReservaAlojamiento } from './entities/reserva.entity';
import { ResenaAlojamiento } from './entities/resena.entity';

import { SearchAlojamientosRequestDto } from './dto/search-alojamientos.dto';
import { DetailsRequestDto } from './dto/details-request.dto';
import { ReservationRequestDto, CancelReservationRequestDto, ReservationStatus } from './dto/reservation.dto';
import { CreateAlojamientoDto } from './dto/create-alojamiento.dto';
import { UpdateAlojamientoDto } from './dto/update-alojamiento.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class AlojamientosService implements OnModuleInit {
  private readonly logger = new Logger(AlojamientosService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Alojamiento)
    private readonly alojamientoRepo: Repository<Alojamiento>,
    @InjectRepository(ReservaAlojamiento)
    private readonly reservaRepo: Repository<ReservaAlojamiento>,
    @InjectRepository(ResenaAlojamiento)
    private readonly resenaRepo: Repository<ResenaAlojamiento>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.alojamientoRepo.count();
      this.logger.log(`Conexión a base de datos de Alojamientos activa. Total de registros: ${count}`);
    } catch (err: any) {
      this.logger.warn('Error al verificar base de datos de alojamientos:', err.message);
    }
  }

  private transformAlojamiento(l: Alojamiento) {
    const defaultPhoto = [{ url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', caption: 'Vista Principal' }];
    const photos = Array.isArray(l.photos) && l.photos.length > 0 ? l.photos : defaultPhoto;

    const countryCode =
      l.destino === 'Cancún' ? 'MX' :
      l.destino === 'Cartagena' || l.destino === 'Medellín' ? 'CO' :
      l.destino === 'Quito' ? 'EC' :
      l.destino === 'Cusco' ? 'PE' : 'DO';

    return {
      id: l.id,
      nombre: l.nombre,
      descripcion: l.descripcion,
      tipo_propiedad: l.tipoPropiedad,
      tipo_alojamiento: l.tipoAlojamiento,
      destino: l.destino,
      precioPorNoche: Number(l.precioPorNoche),
      moneda: l.moneda || 'USD',
      capacidadAdultos: l.capacidadAdultos || 2,
      capacidadNinos: l.capacidadNinos || 0,
      habitaciones: l.habitaciones || 1,
      camas: l.camas || 1,
      banos: Number(l.banos) || 1.0,
      tienePiscina: Boolean(l.tienePiscina),
      host: l.host || null,
      photos,
      ratings: l.ratings || {
        score: 9.0,
        limpieza: 9.0,
        ubicacion: 9.0,
        servicio: 9.0,
        number_of_reviews: 0,
      },
      amenidades: Array.isArray(l.amenidades) ? l.amenidades : [],
      ubicacion: l.ubicacion || {
        address: l.destino,
        city: l.destino,
        country: countryCode,
        coordinates: { latitude: 0, longitude: 0 },
      },
      url: { web: `/alojamientos/${l.id}` },
      _links: {
        self: { href: `/api/v1/alojamientos/${l.id}`, type: 'GET' },
        reservations: { href: `/api/v1/alojamientos/${l.id}/reservations`, type: 'POST' },
      },
    };
  }

  async search(dto: SearchAlojamientosRequestDto): Promise<any> {
    this.logger.log('Búsqueda de alojamientos con filtros', dto);

    const where: any = {};
    if (dto.destino) {
      where.destino = ILike(`%${dto.destino}%`);
    }

    const [items, total] = await this.alojamientoRepo.findAndCount({
      where,
      take: dto.rows || 10,
    });

    let filtered = items;
    if (dto.filters?.tienePiscina) {
      filtered = filtered.filter((i) => i.tienePiscina);
    }

    if (filtered.length > 0) {
      const data = filtered.map((l) => this.transformAlojamiento(l));

      return {
        data,
        metadata: {
          total_results: total,
          next_page: total > (dto.rows || 10) ? Buffer.from(JSON.stringify({ page: 2 })).toString('base64') : null,
        },
        request_id: `req-${Date.now()}`,
      };
    }

    return this.findAll({ limit: dto.rows || 10, page: 1 });
  }

  async getDetailsBatch(dto: DetailsRequestDto): Promise<any> {
    this.logger.log(`Consultando batch details para ${dto.accommodations.length} alojamientos`);
    const data = await Promise.all(
      dto.accommodations.map(async (id) => {
        try {
          return await this.findOne(id);
        } catch {
          return { id, nombre: `Alojamiento ${id}`, disponible: false };
        }
      }),
    );

    return {
      request_id: `req-batch-${Date.now()}`,
      data,
    };
  }

  async health(): Promise<any> {
    const total = await this.alojamientoRepo.count();
    return { status: 'ok', service: 'Alojamientos', database: 'connected', total_listings: total };
  }

  async findAll(query: PaginationQueryDto): Promise<any> {
    this.logger.log(`Consultando catálogo de alojamientos`);

    const locales = await this.alojamientoRepo.find({
      take: query.limit || 10,
      skip: ((query.page || 1) - 1) * (query.limit || 10),
    });

    if (locales.length > 0) {
      const total = await this.alojamientoRepo.count();
      const data = locales.map((l) => this.transformAlojamiento(l));
      return {
        data,
        meta: {
          total,
          limit: query.limit || 10,
          page: query.page || 1,
        },
      };
    }

    return {
      data: [],
      meta: { total: 0, limit: query.limit || 10, page: query.page || 1 },
    };
  }

  async findOne(id: string): Promise<any> {
    this.logger.log(`Consultando detalle de Alojamiento ID ${id}`);

    const local = await this.alojamientoRepo.findOne({
      where: { id },
    });

    if (local) {
      return this.transformAlojamiento(local);
    }

    throw new HttpException('Alojamiento no encontrado', HttpStatus.NOT_FOUND);
  }

  async getAvailability(id: string, date: string): Promise<any> {
    this.logger.log(`Consultando disponibilidad para alojamiento ${id} en ${date}`);
    const local = await this.alojamientoRepo.findOne({ where: { id } });
    const precio = local ? Number(local.precioPorNoche) : 150.0;
    return {
      alojamiento_id: id,
      date: date || new Date().toISOString().split('T')[0],
      available_rooms: local ? local.habitaciones : 5,
      price_per_night: precio,
      checkin_times: ['14:00', '15:00', '16:00'],
    };
  }

  async reservar(id: string, dto: ReservationRequestDto, idempotencyKey: string): Promise<any> {
    this.logger.log(`Iniciando reserva para Alojamiento ${id} con idempotency key ${idempotencyKey}`);

    // Verificación de Idempotencia estricta
    const existing = await this.reservaRepo.findOne({ where: { idempotencyKey } });
    if (existing) {
      if (existing.status === ReservationStatus.CONFIRMED) {
        throw new HttpException('Conflicto de Idempotencia: Reserva ya procesada.', HttpStatus.CONFLICT);
      }
      return this.buildReservaResponse(existing);
    }

    const alojamiento = await this.findOne(id);
    const nights = Math.max(1, dto.nights || 1);
    const pricePerNight = Number(alojamiento.precioPorNoche) || 100.0;
    const roomsCount = dto.habitaciones_count || 1;
    const total = pricePerNight * nights * roomsCount;

    const codigoReserva = `BKG-${Math.floor(100000 + Math.random() * 900000)}`;

    let reserva = this.reservaRepo.create({
      codigoReserva,
      alojamientoId: id,
      idempotencyKey,
      status: ReservationStatus.CONFIRMED,
      total,
      totalPrice: { currency: 'USD', total },
      noches: nights,
      habitacionesCount: roomsCount,
      customerName: dto.customer_name,
      customerEmail: dto.customer_email || 'cliente@example.com',
      checkin: dto.checkin || new Date().toISOString().split('T')[0],
      checkout: dto.checkout || new Date(Date.now() + 86400000 * nights).toISOString().split('T')[0],
      huespedes: (dto.adultos || 1) + (dto.ninos || 0),
    });

    reserva = await this.reservaRepo.save(reserva);
    return this.buildReservaResponse(reserva);
  }

  async cancelarReserva(reservationId: string, dto: CancelReservationRequestDto, idempotencyKey: string): Promise<any> {
    this.logger.log(`Cancelando reserva ${reservationId} (razón: ${dto.reason}) con idempotency key ${idempotencyKey}`);

    const reserva = await this.reservaRepo.findOneBy({ id: reservationId });
    if (!reserva) throw new HttpException('Reserva no encontrada', HttpStatus.NOT_FOUND);

    if (reserva.status === ReservationStatus.CANCELLED) {
      return this.buildReservaResponse(reserva);
    }

    reserva.status = ReservationStatus.CANCELLED;
    await this.reservaRepo.save(reserva);

    return this.buildReservaResponse(reserva);
  }

  async getReservas(): Promise<any> {
    this.logger.log('Consultando historial de reservas de alojamientos');
    const reservas = await this.reservaRepo.find({ order: { createdAt: 'DESC' } });
    // Enrich with alojamiento data (batch lookup)
    const ids = [...new Set(reservas.map((r) => r.alojamientoId))];
    const alojamientos = await this.alojamientoRepo.findByIds(ids);
    const alojMap = new Map(alojamientos.map((a) => [a.id, a]));
    return reservas.map((r) => this.buildReservaResponse(r, alojMap.get(r.alojamientoId)));
  }

  async getReservaById(reservationId: string): Promise<any> {
    this.logger.log(`Consultando detalle de reserva ${reservationId}`);
    const reserva = await this.reservaRepo.findOneBy({ id: reservationId });
    if (!reserva) throw new HttpException('Reserva no encontrada', HttpStatus.NOT_FOUND);
    const alojamiento = await this.alojamientoRepo.findOneBy({ id: reserva.alojamientoId });
    return this.buildReservaResponse(reserva, alojamiento);
  }

  async create(dto: CreateAlojamientoDto): Promise<any> {
    const id = (dto as any).id || `aloj-${Date.now()}`;
    const entity = this.alojamientoRepo.create({
      id,
      ...dto,
      photos: (dto as any).photos || [{ url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800' }],
      amenidades: (dto as any).amenidades || [],
      ratings: (dto as any).ratings || { score: 9.0, number_of_reviews: 0 },
      host: (dto as any).host || null,
      ubicacion: (dto as any).ubicacion || { city: dto.destino },
    } as any);
    return this.alojamientoRepo.save(entity);
  }

  async replace(id: string, dto: CreateAlojamientoDto): Promise<void> {
    const alojamiento = await this.alojamientoRepo.findOneBy({ id });
    if (!alojamiento) throw new HttpException('Alojamiento no encontrado', HttpStatus.NOT_FOUND);
    await this.alojamientoRepo.save({ ...alojamiento, ...(dto as any) });
  }

  async update(id: string, dto: UpdateAlojamientoDto): Promise<any> {
    const alojamiento = await this.alojamientoRepo.findOneBy({ id });
    if (!alojamiento) throw new HttpException('Alojamiento no encontrado', HttpStatus.NOT_FOUND);
    Object.assign(alojamiento, dto);
    return this.alojamientoRepo.save(alojamiento);
  }

  async delete(id: string): Promise<void> {
    const alojamiento = await this.alojamientoRepo.findOneBy({ id });
    if (!alojamiento) throw new HttpException('Alojamiento no encontrado', HttpStatus.NOT_FOUND);
    await this.alojamientoRepo.remove(alojamiento);
  }

  async getResenas(alojamientoId: string): Promise<any> {
    const alojamiento = await this.alojamientoRepo.findOneBy({ id: alojamientoId });
    if (!alojamiento) throw new HttpException('Alojamiento no encontrado', HttpStatus.NOT_FOUND);

    let resenas = await this.resenaRepo.find({ where: { alojamientoId }, order: { createdAt: 'DESC' } });

    if (resenas.length === 0) {
      // Seed mock reviews for demonstration
      const mocks = [
        {
          alojamientoId,
          usuarioId: 'mock-user-1',
          usuarioNombre: 'Carlos M.',
          usuarioPais: 'Colombia',
          comentario: 'Excelente alojamiento, muy limpio y bien ubicado. El anfitrión fue muy atento y resolvió todas nuestras dudas. Lo recomiendo totalmente.',
          puntuacion: 9.2,
          limpieza: 9.5,
          servicio: 9.0,
          calidad: 9.0,
        },
        {
          alojamientoId,
          usuarioId: 'mock-user-2',
          usuarioNombre: 'Laura P.',
          usuarioPais: 'Ecuador',
          comentario: 'Muy buen apartamento, tiene todo lo necesario. La vista desde la terraza es increíble. Volvería sin dudarlo.',
          puntuacion: 9.6,
          limpieza: 10.0,
          servicio: 9.5,
          calidad: 9.2,
        },
        {
          alojamientoId,
          usuarioId: 'mock-user-3',
          usuarioNombre: 'Roberto A.',
          usuarioPais: 'Perú',
          comentario: 'La ubicación es perfecta, cerca de todo. El apartamento es espacioso y moderno. Solo mejoraría la velocidad del WiFi.',
          puntuacion: 8.8,
          limpieza: 9.0,
          servicio: 8.5,
          calidad: 9.0,
        },
      ];
      resenas = await this.resenaRepo.save(mocks as any[]);
    }

    const avg = (arr: number[]) => Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1));
    const scores = {
      limpieza: avg(resenas.map((r) => r.limpieza)),
      servicio: avg(resenas.map((r) => r.servicio)),
      calidad: avg(resenas.map((r) => r.calidad)),
      general: avg(resenas.map((r) => r.puntuacion)),
    };

    return { resenas, scores, total: resenas.length };
  }

  private buildReservaResponse(reserva: ReservaAlojamiento, alojamiento?: any) {
    const defaultPhoto = 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/833148758.jpg?k=4af6fee87e75cf2bdb688cfa67e30d77b3282140a0ed4ee22ac61e5be30b95dd&o=&hp=1';
    const photos = alojamiento?.photos;
    const photoUrl = Array.isArray(photos) && photos.length > 0 ? photos[0].url : defaultPhoto;

    return {
      reservation_id: reserva.id,
      alojamiento_id: reserva.alojamientoId,
      codigo_reserva: reserva.codigoReserva,
      status: reserva.status,
      customer_name: reserva.customerName,
      customer_email: reserva.customerEmail,
      checkin: reserva.checkin,
      checkout: reserva.checkout,
      noches: reserva.noches,
      huespedes: reserva.huespedes,
      habitaciones_count: reserva.habitacionesCount,
      total_price: reserva.totalPrice || { currency: 'USD', total: Number(reserva.total) },
      created_at: reserva.createdAt,
      // Enriched from alojamiento entity
      nombre_alojamiento: alojamiento?.nombre || null,
      destino: alojamiento?.destino || null,
      photo_url: photoUrl,
      _links: {
        self: { href: `/api/v1/alojamientos/reservations/${reserva.id}`, type: 'GET' },
        cancelar: { href: `/api/v1/alojamientos/reservations/${reserva.id}/cancel`, type: 'POST' },
        alojamiento: { href: `/api/v1/alojamientos/${reserva.alojamientoId}`, type: 'GET' },
      },
    };
  }
}
