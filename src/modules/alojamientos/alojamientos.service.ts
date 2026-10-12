import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { createHash, randomUUID } from 'crypto';

import { Alojamiento } from './entities/alojamiento.entity';
import { ReservaAlojamiento } from './entities/reserva.entity';
import { ResenaAlojamiento } from './entities/resena.entity';

import { SearchAlojamientosRequestDto } from './dto/search-alojamientos.dto';
import { DetailsRequestDto } from './dto/details-request.dto';
import { ReservationRequestDto, CancelReservationRequestDto, ReservationStatus } from './dto/reservation.dto';
import { CreateAlojamientoDto } from './dto/create-alojamiento.dto';
import { UpdateAlojamientoDto } from './dto/update-alojamiento.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

import {
  AvailabilityRequestDto,
  AvailabilityResponseDto,
  BulkAvailabilityRequestDto,
  BulkAvailabilityResponseDto,
} from './dto/availability-contract.dto';

import {
  AccommodationDetailsRequestDto,
  AccommodationDetailsResponseDto,
  DetailsChangesRequestDto,
  DetailsChangesResponseDto,
  ChainsResponseDto,
  ConstantsRequestDto,
  ConstantsResponseDto,
  ReviewsRequestDto,
  ReviewsResponseDto,
  ReviewsScoresRequestDto,
  ReviewsScoresResponseDto,
} from './dto/catalog-extra.dto';

import {
  OrderPreviewRequestDto,
  OrderPreviewResponseDto,
  OrderCreateRequestDto,
  OrderDetailDto,
  OrderModifyRequestDto,
} from './dto/orders.dto';

import {
  CreateAccommodationWebhookDto,
  AccommodationWebhookSubscriptionDto,
} from './dto/webhooks.dto';

import { TelemetryService } from '../telemetry/telemetry.service';
import {
  CodigoProblema,
  conflicto,
  noProcesable,
  ProblemaApi,
  validacion,
} from '../../core/errors/codigo-error';
import { validarCapacidad, validarEstancia, calcularNoches, fechaRelativa } from './reglas-estancia';
import { ActorCatalogo, exigirPropiedad } from './guards/gestion-alojamientos.guard';
import { aplanarValidacion } from '../../core/validation/validation-pipe';
import { esAdministrador, UsuarioSupabase } from '../../core/auth/administradores';

/** Máximo de alojamientos por petición de sincronización. */
export const MAX_SINCRONIZACION = 100;

/** Solo los alojamientos ACTIVOS se muestran y se pueden reservar. */
const SOLO_ACTIVOS = { estado: Not('INACTIVO') } as const;

/** Una cotización (preview) caduca a los 30 minutos, como el carrito de Booking. */
export const PREVIEW_TTL_MS = 30 * 60 * 1000;

/** Minúsculas, sin tildes y con espacios colapsados: "  Cancún " -> "cancun". */
function normalizarBusqueda(texto?: string | null): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

interface OrderPreviewStoreItem {
  id: string;
  alojamientoId: string;
  checkin: string;
  checkout: string;
  nights: number;
  rooms: number;
  guests: any;
  totalPrice: number;
  currency: string;
  createdAt: number;
}

interface StoredWebhook {
  id: string;
  propietarioId: string;
  url: string;
  events: string[];
  secret?: string;
  activo: boolean;
  createdAt: string;
}

@Injectable()
export class AlojamientosService implements OnModuleInit {
  private readonly logger = new Logger(AlojamientosService.name);

  // Almacén en memoria para previews de órdenes (TTL de 30 minutos)
  private readonly orderPreviews = new Map<string, OrderPreviewStoreItem>();

  // Almacén de suscripciones a webhooks
  private readonly webhooks = new Map<string, StoredWebhook>();

  /**
   * Cola de escrituras de reservas. Comprobar el cupo y guardar la reserva son
   * dos pasos asíncronos: sin serializarlos, dos clientes que piden la ÚLTIMA
   * habitación a la vez pasan ambos la comprobación y se produce overbooking
   * (algo que Booking nunca permite). También evita que dos reintentos
   * simultáneos con la misma Idempotency-Key creen dos reservas.
   *
   * Protege una instancia del servicio. Con varias instancias haría falta un
   * bloqueo en base de datos (SELECT ... FOR UPDATE).
   */
  private colaReservas: Promise<unknown> = Promise.resolve();

  private enSerie<T>(tarea: () => Promise<T>): Promise<T> {
    const resultado = this.colaReservas.then(tarea, tarea);
    this.colaReservas = resultado.catch(() => undefined);
    return resultado;
  }

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Alojamiento)
    private readonly alojamientoRepo: Repository<Alojamiento>,
    @InjectRepository(ReservaAlojamiento)
    private readonly reservaRepo: Repository<ReservaAlojamiento>,
    @InjectRepository(ResenaAlojamiento)
    private readonly resenaRepo: Repository<ResenaAlojamiento>,
    @Optional()
    private readonly telemetryService?: TelemetryService,
  ) {}

  async onModuleInit() {
    await this.verificarEsquema();
    try {
      const count = await this.alojamientoRepo.count();
      this.logger.log(`Conexión a base de datos de Alojamientos activa. Total de registros: ${count}`);
    } catch (err: any) {
      this.logger.warn('Error al verificar base de datos de alojamientos:', err.message);
    }
  }

  /**
   * Comprueba al arrancar que la base de datos tiene las columnas que usa la
   * entidad. NO modifica el esquema (TypeORM corre con `synchronize: false` y los
   * cambios de BD se aplican a mano con `database/migraciones/`): solo deja un
   * error claro en el log en vez de fallar después con un 500 en cada consulta.
   */
  private async verificarEsquema() {
    const repo: any = this.alojamientoRepo;
    if (typeof repo.query !== 'function') return; // repositorio en memoria de las pruebas
    const necesarias = ['proveedor_id', 'id_externo', 'estado', 'politicas', 'ultima_sincronizacion'];
    try {
      const filas: { column_name: string }[] = await repo.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'alojamientos' AND column_name = ANY($1)`,
        [necesarias],
      );
      const presentes = new Set(filas.map((f) => f.column_name));
      const faltan = necesarias.filter((c) => !presentes.has(c));
      if (faltan.length) {
        this.logger.error(
          `Faltan columnas en "alojamientos": ${faltan.join(', ')}. ` +
            'Ejecuta database/migraciones/2026-10-12_alojamientos_integracion.sql en Supabase.',
        );
      }
    } catch (e: any) {
      this.logger.warn(`No se pudo verificar el esquema de alojamientos: ${e.message}`);
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
      politicas: l.politicas || null,
      estado: l.estado || 'ACTIVO',
      proveedor_id: l.proveedorId ?? null,
      id_externo: l.idExterno ?? null,
      ultima_sincronizacion: l.ultimaSincronizacion ?? null,
      url: { web: `/alojamientos/${l.id}` },
      _links: {
        self: { href: `/api/v1/alojamientos/${l.id}`, type: 'GET' },
        reservations: { href: `/api/v1/alojamientos/${l.id}/reservations`, type: 'POST' },
      },
    };
  }

  // =========================================================================
  // 1. BÚSQUEDA Y CATÁLOGO
  // =========================================================================

  async search(dto: SearchAlojamientosRequestDto): Promise<any> {
    this.logger.log('Búsqueda de alojamientos con filtros', dto);

    // Fechas: solo se validan si el cliente las manda (se puede explorar sin fechas).
    const fechaIn = dto.checkin ?? dto.dates?.checkin;
    const fechaOut = dto.checkout ?? dto.dates?.checkout;
    if (fechaIn !== undefined || fechaOut !== undefined) {
      validarEstancia(fechaIn, fechaOut, { prefijo: dto.checkin === undefined && dto.dates ? 'dates' : undefined });
    }
    const { precioMin, precioMax } = dto.filters ?? {};
    if (precioMin !== undefined && precioMax !== undefined && precioMin > precioMax) {
      throw validacion('El precio mínimo no puede ser mayor que el máximo.', [
        { name: 'filters.precioMin', reason: 'Debe ser menor o igual que filters.precioMax.' },
      ]);
    }

    const destinoRaw = dto.destino || (typeof dto.city === 'string' ? dto.city : undefined);
    const destinoTerm = destinoRaw ? destinoRaw.trim() : '';

    // Filtro por destino/país. Se compara sobre texto NORMALIZADO (minúsculas y
    // sin tildes) para que "cancun" encuentre "Cancún", igual que en Booking.
    // `ILIKE` de Postgres ignora mayúsculas pero NO tildes, y además trata `%` y
    // `_` como comodines: buscar "%" devolvía el catálogo entero.
    let coincideDestino: ((a: Alojamiento) => boolean) | null = null;
    if (destinoTerm) {
      const termino = normalizarBusqueda(destinoTerm);
      coincideDestino = (a) =>
        [a.destino, a.nombre, a.descripcion].some((campo) => normalizarBusqueda(campo).includes(termino));
    } else if (dto.country) {
      const paisDestinoMap: Record<string, string> = {
        ec: 'Quito',
        mx: 'Cancún',
        co: 'Cartagena',
        pe: 'Cusco',
      };
      const destinoMapeado = paisDestinoMap[dto.country.toLowerCase()];
      // Un país sin oferta da 0 resultados, no el catálogo completo.
      coincideDestino = destinoMapeado
        ? (a) => normalizarBusqueda(a.destino) === normalizarBusqueda(destinoMapeado)
        : () => false;
    }

    this.telemetryService?.trackEvent({
      event_name: 'search_submitted',
      vertical: 'alojamientos',
      properties: {
        destino: destinoTerm || dto.country || 'all',
        checkin: dto.checkin,
        checkout: dto.checkout,
        adultos: dto.guests?.number_of_adults || dto.adultos,
      },
    });

    const rowsCount = dto.rows || 25;
    const catalogo = await this.alojamientoRepo.find({ where: SOLO_ACTIVOS as any, order: { createdAt: 'ASC' } });
    // Los filtros se aplican ANTES de paginar: si no, una página podía quedar
    // corta (o vacía) aunque existieran más resultados que cumplían el filtro.
    let coincidentes = coincideDestino ? catalogo.filter(coincideDestino) : catalogo;
    if (dto.filters?.tienePiscina) {
      coincidentes = coincidentes.filter((i) => i.tienePiscina);
    }
    if (dto.filters?.precioMin !== undefined) {
      coincidentes = coincidentes.filter((i) => Number(i.precioPorNoche) >= dto.filters!.precioMin!);
    }
    if (dto.filters?.precioMax !== undefined) {
      coincidentes = coincidentes.filter((i) => Number(i.precioPorNoche) <= dto.filters!.precioMax!);
    }
    // Con fechas, como en Booking: solo se muestran alojamientos con cupo para
    // las habitaciones pedidas, y cada resultado lleva su disponibilidad.
    const checkinDate = dto.checkin || dto.dates?.checkin;
    const checkoutDate = dto.checkout || dto.dates?.checkout;
    const disponibilidad = new Map<string, any>();
    if (checkinDate && checkoutDate) {
      const habitacionesPedidas = dto.guests?.number_of_rooms || dto.habitaciones || 1;
      const conCupo: Alojamiento[] = [];
      for (const aloj of coincidentes) {
        const avail = await this.getAvailability(aloj.id, checkinDate, checkoutDate);
        if (avail.available_rooms >= habitacionesPedidas) {
          disponibilidad.set(aloj.id, avail);
          conCupo.push(aloj);
        }
      }
      coincidentes = conCupo;
    }

    const total = coincidentes.length;
    const pagina = coincidentes.slice(0, rowsCount);
    const nextPage = total > rowsCount ? Buffer.from(JSON.stringify({ page: 2 })).toString('base64') : null;

    return {
      request_id: `req-${Date.now()}`,
      data: pagina.map((l) => {
        const avail = disponibilidad.get(l.id);
        const item: any = this.transformAlojamiento(l);
        if (avail) {
          item.disponibilidad = {
            available_rooms: avail.available_rooms,
            nights: calcularNoches(checkinDate!, checkoutDate!),
            total_price: Number((Number(l.precioPorNoche) * calcularNoches(checkinDate!, checkoutDate!)).toFixed(2)),
            currency: l.moneda || 'USD',
          };
        }
        return item;
      }),
      metadata: {
        total_results: total,
        next_page: nextPage,
      },
      next_page: nextPage,
    };
  }

  async getDetailsBatch(dto: DetailsRequestDto): Promise<any> {
    this.logger.log(`Consultando batch details para ${dto.accommodations.length} alojamientos`);
    const data = await Promise.all(
      dto.accommodations.map(async (id) => {
        try {
          return await this.findOne(String(id));
        } catch {
          // No se inventa un nombre: el ID se marca como no encontrado.
          return { id, disponible: false, error: 'Alojamiento no encontrado' };
        }
      }),
    );

    return {
      request_id: `req-batch-${Date.now()}`,
      data,
    };
  }

  async getAccommodationDetailsExtended(dto: AccommodationDetailsRequestDto): Promise<AccommodationDetailsResponseDto> {
    this.logger.log(`Consultando detalles extendidos para ${dto.accommodations.length} alojamientos`);
    const results = await Promise.all(
      dto.accommodations.map(async (accId) => {
        try {
          const item = await this.findOne(String(accId));
          return {
            ...item,
            policies: {
              checkin_from: '14:00',
              checkout_until: '11:00',
              cancellation_policy: 'Cancelación gratuita hasta 48h antes de la llegada',
              children_policy: 'Niños de cualquier edad son bienvenidos',
              pets_allowed: item.amenidades?.includes('Pet friendly') || false,
            },
            facilities_detail: [
              { category: 'Internet', items: ['WiFi gratis en todas las habitaciones', 'Conexión de alta velocidad'] },
              { category: 'Servicios', items: ['Recepción 24 horas', 'Conserjería', 'Limpieza diaria'] },
              { category: 'Habitación', items: ['Aire acondicionado', 'Caja fuerte', 'Smart TV'] },
            ],
            bundles: [
              { bundle_id: `bundle-${item.id}-std`, name: 'Tarifa Estándar', price_multiplier: 1.0 },
              { bundle_id: `bundle-${item.id}-bb`, name: 'Tarifa con Desayuno Buffet', price_multiplier: 1.2 },
            ],
          };
        } catch {
          return { id: accId, disponible: false, error: 'Alojamiento no encontrado' };
        }
      }),
    );

    return {
      request_id: `req-ext-${Date.now()}`,
      data: results,
      next_page: null,
    };
  }

  async getDetailsChanges(dto: DetailsChangesRequestDto): Promise<DetailsChangesResponseDto> {
    this.logger.log(`Consultando cambios de alojamientos desde: ${dto.last_change}`);
    const alojamientos = await this.alojamientoRepo.find({ take: 20 });
    const ids = alojamientos.map((a) => a.id);

    return {
      request_id: `req-chg-${Date.now()}`,
      data: {
        from: dto.last_change,
        next: new Date().toISOString(),
        total_changes: ids.length,
        changes: {
          updated_accommodations: ids,
          deleted_accommodations: [],
        },
      },
    };
  }

  async getChains(): Promise<ChainsResponseDto> {
    this.logger.log('Consultando catálogo de cadenas hoteleras');
    return {
      request_id: `req-chains-${Date.now()}`,
      data: [
        {
          id: 1,
          name: 'Marriott International',
          brands: [
            { id: 101, name: 'Courtyard by Marriott' },
            { id: 102, name: 'Sheraton Hotels & Resorts' },
            { id: 103, name: 'JW Marriott' },
          ],
        },
        {
          id: 2,
          name: 'Hilton Worldwide',
          brands: [
            { id: 201, name: 'Hilton Hotels & Resorts' },
            { id: 202, name: 'DoubleTree by Hilton' },
            { id: 203, name: 'Hampton by Hilton' },
          ],
        },
        {
          id: 3,
          name: 'Decameron All Inclusive Hotels',
          brands: [
            { id: 301, name: 'Decameron Punta Centinela' },
            { id: 302, name: 'Decameron Barú' },
            { id: 303, name: 'Decameron San Andrés' },
          ],
        },
        {
          id: 4,
          name: 'Accor Hotels',
          brands: [
            { id: 401, name: 'Novotel' },
            { id: 402, name: 'Ibis' },
            { id: 403, name: 'Sofitel' },
          ],
        },
      ],
    };
  }

  async getConstants(dto?: ConstantsRequestDto): Promise<ConstantsResponseDto> {
    this.logger.log('Consultando constantes del sistema de alojamientos');
    return {
      request_id: `req-const-${Date.now()}`,
      data: {
        room_types: [
          { code: 'standard', name: 'Habitación Estándar', capacity: 2 },
          { code: 'deluxe', name: 'Habitación Deluxe', capacity: 3 },
          { code: 'suite', name: 'Master Suite', capacity: 4 },
          { code: 'family', name: 'Suite Familiar', capacity: 5 },
          { code: 'villa', name: 'Villa Privada', capacity: 8 },
        ],
        facilities: [
          { code: 'wifi', name: 'WiFi Gratuito' },
          { code: 'pool', name: 'Piscina' },
          { code: 'gym', name: 'Gimnasio' },
          { code: 'spa', name: 'Spa & Bienestar' },
          { code: 'parking', name: 'Estacionamiento Gratis' },
          { code: 'restaurant', name: 'Restaurante' },
          { code: 'air_conditioning', name: 'Aire Acondicionado' },
          { code: 'pet_friendly', name: 'Admite Mascotas' },
        ],
        meal_plans: [
          { code: 'room_only', name: 'Solo Alojamiento' },
          { code: 'breakfast_included', name: 'Desayuno Incluido' },
          { code: 'half_board', name: 'Media Pensión (Desayuno y Cena)' },
          { code: 'all_inclusive', name: 'Todo Incluido (Comidas y Bebidas)' },
        ],
        bed_types: [
          { code: 'single', name: 'Cama Individual' },
          { code: 'double', name: 'Cama Doble' },
          { code: 'queen', name: 'Cama Queen Size' },
          { code: 'king', name: 'Cama King Size' },
        ],
        property_types: [
          { code: 'hotel', name: 'Hotel' },
          { code: 'resort', name: 'Resort' },
          { code: 'apartment', name: 'Apartamento' },
          { code: 'villa', name: 'Villa' },
          { code: 'hostel', name: 'Hostal' },
        ],
      },
    };
  }

  async getReviewsContract(dto: ReviewsRequestDto): Promise<ReviewsResponseDto> {
    this.logger.log(`Consultando reseñas de contrato para ${dto.accommodations.length} alojamientos`);
    const results: any[] = [];
    for (const accId of dto.accommodations) {
      const resenas = await this.resenaRepo.find({
        where: { alojamientoId: String(accId) },
        take: dto.rows || 10,
        order: { createdAt: 'DESC' },
      });

      results.push({
        accommodation_id: accId,
        reviews_count: resenas.length,
        reviews: resenas.map((r) => ({
          review_id: r.id,
          author: r.usuarioNombre,
          country: r.usuarioPais,
          score: r.puntuacion,
          text: r.comentario,
          categories: {
            cleanliness: r.limpieza,
            service: r.servicio,
            quality: r.calidad,
          },
          created_at: r.createdAt,
        })),
      });
    }

    return {
      request_id: `req-rev-${Date.now()}`,
      data: results,
      next_page: null,
    };
  }

  async getReviewsScores(dto: ReviewsScoresRequestDto): Promise<ReviewsScoresResponseDto> {
    this.logger.log(`Consultando puntuaciones de reseñas para ${dto.accommodations.length} alojamientos`);
    const results: any[] = [];
    for (const accId of dto.accommodations) {
      // En una consulta por lotes, un ID inexistente no tumba la respuesta entera.
      const existe = await this.alojamientoRepo.findOneBy({ id: String(accId) });
      if (!existe) {
        results.push({ accommodation_id: accId, error: 'Alojamiento no encontrado' });
        continue;
      }
      const data = await this.getResenas(String(accId));
      results.push({
        accommodation_id: accId,
        total_reviews: data.total,
        average_score: data.scores.general,
        scores_breakdown: {
          cleanliness: data.scores.limpieza,
          service: data.scores.servicio,
          quality: data.scores.calidad,
          location: 9.2,
        },
      });
    }

    return {
      request_id: `req-scores-${Date.now()}`,
      data: results,
    };
  }

  // =========================================================================
  // 2. DISPONIBILIDAD Y PRECIOS
  // =========================================================================

  async getAvailabilityContract(dto: AvailabilityRequestDto): Promise<AvailabilityResponseDto> {
    this.logger.log(`Consultando disponibilidad de contrato para ${dto.accommodation}`);
    const accId = String(dto.accommodation);
    const nights = validarEstancia(dto.checkin, dto.checkout);
    // Nunca se cotiza otro hotel en lugar del pedido: un ID inexistente es un 404.
    const local = await this.alojamientoRepo.findOne({ where: { id: accId, ...SOLO_ACTIVOS } as any });
    if (!local) {
      throw new NotFoundException(`El alojamiento '${accId}' no existe.`);
    }

    // Si el cliente indica la ocupación, se valida contra la capacidad real (400
    // con el campo exacto), como hace Booking al cambiar adultos/niños/habitaciones.
    if (dto.guests) {
      validarCapacidad(
        local,
        dto.guests.number_of_adults,
        dto.guests.children?.length || 0,
        dto.guests.number_of_rooms,
      );
    }

    const basePrice = Number(local.precioPorNoche);
    const currency = dto.currency || local.moneda || 'USD';

    const products = [
      {
        product_id: `prod_${local?.id || accId}_std`,
        room_name: 'Habitación Estándar',
        meal_plan: 'Solo Alojamiento',
        cancellation_type: 'Cancelación gratuita hasta 48 horas antes',
        price: Number((basePrice * nights).toFixed(2)),
        currency,
      },
      {
        product_id: `prod_${local?.id || accId}_deluxe_bb`,
        room_name: 'Habitación Deluxe con Balcón',
        meal_plan: 'Desayuno Buffet Incluido',
        cancellation_type: 'Cancelación gratuita hasta 24 horas antes',
        price: Number((basePrice * 1.25 * nights).toFixed(2)),
        currency,
      },
      {
        product_id: `prod_${local?.id || accId}_suite_ai`,
        room_name: 'Master Suite Premium',
        meal_plan: 'Todo Incluido',
        cancellation_type: 'No Reembolsable (Tarifa Promocional)',
        price: Number((basePrice * 1.6 * nights).toFixed(2)),
        currency,
      },
    ];

    // Sin habitaciones libres para esas fechas no se ofrece ningún producto.
    const ocupacion = await this.getAvailability(local.id, dto.checkin, dto.checkout);
    const habitacionesPedidas = dto.guests?.number_of_rooms || 1;
    const hayCupo = ocupacion.available_rooms >= habitacionesPedidas;

    return {
      request_id: `req-avail-${Date.now()}`,
      data: {
        id: local.id,
        currency,
        nights,
        available_rooms: ocupacion.available_rooms,
        products: hayCupo ? products : [],
        url: `/api/v1/alojamientos/${local.id}`,
      },
    };
  }

  async getBulkAvailability(dto: BulkAvailabilityRequestDto): Promise<BulkAvailabilityResponseDto> {
    this.logger.log(`Consultando bulk availability para ${dto.accommodations.length} propiedades`);
    validarEstancia(dto.checkin, dto.checkout);
    const results = await Promise.all(
      dto.accommodations.map(async (accId) => {
        try {
          const res = await this.getAvailabilityContract({
            accommodation: accId,
            booker: dto.booker,
            checkin: dto.checkin,
            checkout: dto.checkout,
            guests: dto.guests,
            currency: dto.currency,
          });
          return res.data;
        } catch {
          return { id: accId, available: false, products: [] };
        }
      }),
    );

    return {
      request_id: `req-bulk-${Date.now()}`,
      data: results,
    };
  }

  // =========================================================================
  // 3. GESTIÓN DE ÓRDENES (RESERVAS)
  // =========================================================================

  async previewOrder(dto: OrderPreviewRequestDto): Promise<OrderPreviewResponseDto> {
    this.logger.log('Previsualizando orden de alojamiento', dto);
    const accId = String(dto.accommodation_id);
    const nights = validarEstancia(dto.checkin, dto.checkout);
    const local = await this.alojamientoRepo.findOne({ where: { id: accId, ...SOLO_ACTIVOS } as any });
    if (!local) {
      throw new NotFoundException(`El alojamiento '${dto.accommodation_id}' no existe.`);
    }

    const rooms = dto.guests?.number_of_rooms || 1;
    const adults = dto.guests?.number_of_adults || 1;
    const children = dto.guests?.children?.length || 0;
    validarCapacidad(local, adults, children, rooms);

    const ocupacion = await this.getAvailability(local.id, dto.checkin, dto.checkout);
    if (ocupacion.available_rooms < rooms) {
      throw conflicto(
        CodigoProblema.ROOM_NO_LONGER_AVAILABLE,
        `No hay suficientes habitaciones para esas fechas. Disponibles: ${ocupacion.available_rooms}, solicitadas: ${rooms}.`,
      );
    }

    let multiplier = 1.0;
    if (dto.product_id?.includes('deluxe')) multiplier = 1.25;
    if (dto.product_id?.includes('suite')) multiplier = 1.6;

    const basePrice = Number(local.precioPorNoche) || 120.0;
    const totalPrice = Number((basePrice * multiplier * nights * rooms).toFixed(2));
    const previewId = `prev_${randomUUID().substring(0, 8)}`;

    // Guardar en caché temporal para validación en createOrder
    this.orderPreviews.set(previewId, {
      id: previewId,
      alojamientoId: local.id,
      checkin: dto.checkin!,
      checkout: dto.checkout!,
      nights,
      rooms,
      guests: dto.guests,
      totalPrice,
      currency: local.moneda || 'USD',
      createdAt: Date.now(),
    });

    this.telemetryService?.trackEvent({
      event_name: 'checkout_started',
      vertical: 'alojamientos',
      properties: {
        alojamiento_id: local.id,
        nights,
        rooms,
        total_price: totalPrice,
        currency: local.moneda || 'USD',
      },
    });

    return {
      request_id: `req-prev-${Date.now()}`,
      data: {
        order_preview_id: previewId,
        accommodation_id: local.id,
        total_price: totalPrice,
        currency: local.moneda || 'USD',
        nights,
        rooms,
        expires_at: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
      },
    };
  }

  async createOrder(dto: OrderCreateRequestDto, idempotencyKey: string): Promise<OrderDetailDto> {
    return this.enSerie(() => this.createOrderEnSerie(dto, idempotencyKey));
  }

  private async createOrderEnSerie(dto: OrderCreateRequestDto, idempotencyKey: string): Promise<OrderDetailDto> {
    this.logger.log(`Creando orden de alojamiento a partir de preview ${dto.order_preview_id} con idempotency key ${idempotencyKey}`);

    // 1. Verificación de Idempotencia estricta
    // Reintento con la misma clave: se devuelve la orden original (sin cobrar dos veces).
    const existing = await this.reservaRepo.findOne({ where: { idempotencyKey } });
    if (existing) {
      this.logger.warn(`Idempotencia detectada: retornando orden previa ${existing.id}`);
      const local = await this.alojamientoRepo.findOne({ where: { id: existing.alojamientoId } });
      return this.buildOrderDetailDto(existing, local, dto.payment_reference);
    }

    // 2. Validación de referencia de pago (RFC 7807: PAYMENT_REFERENCE_INVALID)
    if (!dto.payment_reference || dto.payment_reference.trim().length < 4) {
      throw noProcesable(
        CodigoProblema.PAYMENT_REFERENCE_INVALID,
        'payment_reference inválido o ausente. Se requiere confirmación de pago de la Payment API.',
      );
    }

    // 3. Resolución de datos del preview o fallback
    // 3. La orden SOLO se crea desde una cotización vigente. Nunca se inventa una
    //    reserva sobre otro hotel ni con otras fechas: si el preview no existe o
    //    caducó, el cliente debe volver a cotizar (410 Gone).
    const preview = this.orderPreviews.get(dto.order_preview_id);
    if (!preview || Date.now() - preview.createdAt > PREVIEW_TTL_MS) {
      if (preview) this.orderPreviews.delete(dto.order_preview_id);
      throw conflicto(
        CodigoProblema.OFFER_NO_LONGER_AVAILABLE,
        'La cotización no existe o ha caducado. Vuelve a consultar el precio antes de reservar.',
      );
    }

    const local = await this.alojamientoRepo.findOne({ where: { id: preview.alojamientoId, ...SOLO_ACTIVOS } as any });
    if (!local) {
      throw conflicto(
        CodigoProblema.ROOM_NO_LONGER_AVAILABLE,
        'El alojamiento seleccionado ya no tiene disponibilidad para formalizar la orden.',
      );
    }

    // 4. Se revalida el cupo: otra persona pudo reservar entre el preview y el pago.
    const ocupacion = await this.getAvailability(local.id, preview.checkin, preview.checkout);
    if (ocupacion.available_rooms < preview.rooms) {
      throw conflicto(
        CodigoProblema.ROOM_NO_LONGER_AVAILABLE,
        'Las habitaciones cotizadas ya no están disponibles para esas fechas.',
      );
    }

    const codigoReserva = `BKG-${Math.floor(100000 + Math.random() * 900000)}`;
    const fullName = `${dto.customer_details.first_name} ${dto.customer_details.last_name}`;

    let reserva = this.reservaRepo.create({
      codigoReserva,
      alojamientoId: local.id,
      customerName: fullName,
      customerEmail: dto.customer_details.email,
      checkin: preview.checkin,
      checkout: preview.checkout,
      noches: preview.nights,
      huespedes: preview.guests?.number_of_adults || 2,
      habitacionesCount: preview.rooms || 1,
      total: preview.totalPrice,
      totalPrice: { currency: preview.currency, total: preview.totalPrice },
      status: ReservationStatus.CONFIRMED,
      idempotencyKey,
    });

    reserva = await this.reservaRepo.save(reserva);

    // Consumir preview
    this.orderPreviews.delete(dto.order_preview_id);

    // Disparar Webhooks salientes
    this.triggerWebhookNotification('ORDER_CONFIRMED', reserva.id, {
      order_id: reserva.id,
      codigo_reserva: reserva.codigoReserva,
      total: reserva.total,
      customer_email: reserva.customerEmail,
      alojamiento_id: reserva.alojamientoId,
    });

    // Telemetría de reserva confirmada
    this.telemetryService?.trackEvent({
      event_name: 'booking_confirmed',
      vertical: 'alojamientos',
      properties: {
        order_id: reserva.id,
        codigo_reserva: reserva.codigoReserva,
        alojamiento_id: reserva.alojamientoId,
        total: reserva.total,
        destination: local.destino,
        payment_reference: dto.payment_reference,
      },
    });

    return this.buildOrderDetailDto(reserva, local, dto.payment_reference);
  }

  async getOrderById(orderId: string): Promise<OrderDetailDto> {
    this.logger.log(`Consultando detalle de orden ${orderId}`);
    const reserva = await this.reservaRepo.findOne({ where: { id: orderId } });
    if (!reserva) {
      throw new NotFoundException(`La orden de alojamiento '${orderId}' no existe.`);
    }

    const local = await this.alojamientoRepo.findOne({ where: { id: reserva.alojamientoId } });
    return this.buildOrderDetailDto(reserva, local);
  }

  async modifyOrder(orderId: string, dto: OrderModifyRequestDto, idempotencyKey: string): Promise<OrderDetailDto> {
    return this.enSerie(() => this.modifyOrderEnSerie(orderId, dto, idempotencyKey));
  }

  private async modifyOrderEnSerie(orderId: string, dto: OrderModifyRequestDto, idempotencyKey: string): Promise<OrderDetailDto> {
    this.logger.log(`Modificando orden ${orderId} con idempotency key ${idempotencyKey}`);
    const reserva = await this.reservaRepo.findOne({ where: { id: orderId } });
    if (!reserva) {
      throw new NotFoundException(`La orden '${orderId}' no existe.`);
    }

    if (reserva.status === ReservationStatus.CANCELLED) {
      throw new ConflictException(`No se puede modificar una orden en estado CANCELLED.`);
    }

    // Las fechas nuevas se combinan con las actuales (se puede cambiar solo una).
    const nuevoCheckin = dto.checkin ?? reserva.checkin;
    const nuevoCheckout = dto.checkout ?? reserva.checkout;
    const nuevasHabitaciones = dto.guests?.number_of_rooms ?? reserva.habitacionesCount ?? 1;
    const nuevosAdultos = dto.guests?.number_of_adults ?? reserva.huespedes ?? 1;
    const noches = validarEstancia(nuevoCheckin, nuevoCheckout);

    const local = await this.alojamientoRepo.findOne({ where: { id: reserva.alojamientoId } });
    if (local) {
      validarCapacidad(local, nuevosAdultos, dto.guests?.children?.length || 0, nuevasHabitaciones);
      const ocupacion = await this.getAvailability(local.id, nuevoCheckin, nuevoCheckout, reserva.id);
      if (ocupacion.available_rooms < nuevasHabitaciones) {
        throw conflicto(
          CodigoProblema.ROOM_NO_LONGER_AVAILABLE,
          'No hay disponibilidad para las nuevas fechas u ocupación solicitadas.',
        );
      }
    }

    reserva.checkin = nuevoCheckin;
    reserva.checkout = nuevoCheckout;
    reserva.noches = noches;
    reserva.huespedes = nuevosAdultos;
    reserva.habitacionesCount = nuevasHabitaciones;

    // El precio por noche se mantiene (tarifa contratada); cambia por noches/habitaciones.
    const moneda = reserva.totalPrice?.currency || local?.moneda || 'USD';
    const precioNoche = local ? Number(local.precioPorNoche) : Number(reserva.total) / Math.max(1, calcularNoches(reserva.checkin, reserva.checkout));
    reserva.total = Number((precioNoche * noches * nuevasHabitaciones).toFixed(2));
    reserva.totalPrice = { currency: moneda, total: reserva.total };

    await this.reservaRepo.save(reserva);

    this.triggerWebhookNotification('ORDER_MODIFIED', reserva.id, {
      order_id: reserva.id,
      checkin: reserva.checkin,
      checkout: reserva.checkout,
      total: reserva.total,
    });

    return this.buildOrderDetailDto(reserva, local);
  }

  async cancelOrder(orderId: string, idempotencyKey: string, reason?: string): Promise<any> {
    return this.enSerie(() => this.cancelOrderEnSerie(orderId, idempotencyKey, reason));
  }

  private async cancelOrderEnSerie(orderId: string, idempotencyKey: string, reason?: string): Promise<any> {
    this.logger.log(`Cancelando orden ${orderId} (motivo: ${reason}) con idempotency key ${idempotencyKey}`);
    const reserva = await this.reservaRepo.findOne({ where: { id: orderId } });
    if (!reserva) {
      throw new NotFoundException(`La orden '${orderId}' no existe.`);
    }

    if (reserva.status !== ReservationStatus.CANCELLED) {
      if (reserva.checkout && new Date(reserva.checkout).getTime() < Date.now()) {
        throw conflicto(
          CodigoProblema.CANCELLATION_NOT_ALLOWED,
          'No es posible cancelar una reserva cuya estancia ya ha finalizado.',
        );
      }

      reserva.status = ReservationStatus.CANCELLED;
      await this.reservaRepo.save(reserva);

      this.triggerWebhookNotification('ORDER_CANCELLED', reserva.id, {
        order_id: reserva.id,
        reason: reason || 'Cancelado a solicitud del cliente',
        status: 'CANCELLED',
      });

      this.telemetryService?.trackEvent({
        event_name: 'booking_cancelled',
        vertical: 'alojamientos',
        properties: {
          order_id: reserva.id,
          codigo_reserva: reserva.codigoReserva,
          reason: reason || 'Cancelado a solicitud del cliente',
        },
      });
    }

    return {
      order_id: reserva.id,
      codigo_reserva: reserva.codigoReserva,
      status: ReservationStatus.CANCELLED,
      message: 'Cancelación procesada exitosamente',
      cancellation_date: new Date().toISOString(),
    };
  }

  // =========================================================================
  // 4. WEBHOOKS
  // =========================================================================

  async listWebhooks(propietarioId = 'default-owner'): Promise<AccommodationWebhookSubscriptionDto[]> {
    this.logger.log(`Listando webhooks para propietario ${propietarioId}`);
    const list: AccommodationWebhookSubscriptionDto[] = [];
    for (const w of this.webhooks.values()) {
      if (w.activo && w.propietarioId === propietarioId) {
        list.push({
          id: w.id,
          url: w.url,
          events: w.events,
          secret: w.secret ? `whsec_...${w.secret.slice(-4)}` : undefined,
          createdAt: w.createdAt,
          active: w.activo,
        });
      }
    }
    return list;
  }

  async createWebhook(dto: CreateAccommodationWebhookDto, propietarioId = 'default-owner'): Promise<AccommodationWebhookSubscriptionDto> {
    this.logger.log(`Registrando webhook a ${dto.url} para eventos: ${dto.events.join(', ')}`);

    if (!dto.url.toLowerCase().startsWith('https://')) {
      throw new BadRequestException('La URL del webhook debe usar protocolo seguro https://');
    }

    const id = randomUUID();
    const stored: StoredWebhook = {
      id,
      propietarioId,
      url: dto.url,
      events: dto.events,
      secret: dto.secret || `whsec_${randomUUID().replace(/-/g, '').substring(0, 16)}`,
      activo: true,
      createdAt: new Date().toISOString(),
    };

    this.webhooks.set(id, stored);

    return {
      id: stored.id,
      url: stored.url,
      events: stored.events,
      secret: `whsec_...${stored.secret?.slice(-4) || 'a1b2'}`,
      createdAt: stored.createdAt,
      active: true,
    };
  }

  async deleteWebhook(id: string, propietarioId = 'default-owner'): Promise<void> {
    this.logger.log(`Eliminando webhook ${id}`);
    const w = this.webhooks.get(id);
    if (!w || !w.activo || (propietarioId !== 'admin' && w.propietarioId !== propietarioId)) {
      throw new NotFoundException(`La suscripción de webhook '${id}' no existe.`);
    }

    w.activo = false;
    this.webhooks.delete(id);
  }

  private triggerWebhookNotification(eventType: string, resourceId: string, payloadData: any) {
    for (const sub of this.webhooks.values()) {
      if (sub.activo && sub.events.includes(eventType)) {
        this.logger.log(`[Webhook Event] Disparando ${eventType} a ${sub.url} para recurso ${resourceId}`);
        // Notificación en segundo plano no bloqueante
        this.httpService.post(sub.url, {
          eventId: randomUUID(),
          eventType,
          timestamp: new Date().toISOString(),
          resourceId,
          data: payloadData,
        }).subscribe({
          error: (e) => this.logger.warn(`Error al entregar webhook a ${sub.url}: ${e.message}`),
        });

        this.telemetryService?.trackApiCall({
          provider: 'AlojamientosWebhookDispatcher',
          vertical: 'alojamientos',
          operation: eventType,
          status_code: 200,
          latency_ms: 15,
          success: true,
        });
      }
    }
  }

  // =========================================================================
  // 5. MÉTODOS EXISTENTES DE MARKETPLACE Y ADMINISTRACIÓN
  // =========================================================================

  async health(): Promise<any> {
    const total = await this.alojamientoRepo.count();
    return { status: 'ok', service: 'Alojamientos', database: 'connected', total_listings: total };
  }

  async findAll(query: PaginationQueryDto): Promise<any> {
    this.logger.log(`Consultando catálogo de alojamientos`);

    const limit = query.limit || 10;
    const page = query.page || 1;

    const locales = await this.alojamientoRepo.find({
      where: SOLO_ACTIVOS as any,
      take: limit,
      skip: (page - 1) * limit,
    });

    if (locales.length > 0) {
      const total = await this.alojamientoRepo.count({ where: SOLO_ACTIVOS as any });
      const data = locales.map((l) => this.transformAlojamiento(l));
      return {
        data,
        meta: {
          total,
          limit,
          page,
        },
      };
    }

    return {
      data: [],
      meta: { total: 0, limit, page },
    };
  }

  async findOne(id: string): Promise<any> {
    this.logger.log(`Consultando detalle de Alojamiento ID ${id}`);

    // Un alojamiento INACTIVO no existe para el público (como una propiedad
    // retirada de Booking); el panel de gestión lo ve por su propio endpoint.
    const local = await this.alojamientoRepo.findOne({
      where: { id, ...SOLO_ACTIVOS } as any,
    });

    if (local) {
      return this.transformAlojamiento(local);
    }

    throw new HttpException('Alojamiento no encontrado', HttpStatus.NOT_FOUND);
  }

  async getAvailability(id: string, date?: string, checkoutDate?: string, excluirReservaId?: string): Promise<any> {
    this.logger.log(`Consultando disponibilidad para alojamiento ${id} en ${date} - ${checkoutDate}`);
    const local = await this.alojamientoRepo.findOne({ where: { id, ...SOLO_ACTIVOS } as any });
    if (!local) {
      throw new HttpException('Alojamiento no encontrado', HttpStatus.NOT_FOUND);
    }
    const precio = Number(local.precioPorNoche) || 150.0;
    const totalRooms = local.habitaciones || 5;

    const startDate = date || new Date().toISOString().split('T')[0];
    const endDate = checkoutDate || new Date(new Date(startDate).getTime() + 86400000).toISOString().split('T')[0];

    // Contabilizar reservas confirmadas activas que se crucen con el rango [startDate, endDate)
    const activeReservations = await this.reservaRepo.find({
      where: {
        alojamientoId: id,
        status: ReservationStatus.CONFIRMED,
      },
    });

    const overlapping = activeReservations.filter((r) => {
      return r.id !== excluirReservaId && r.checkin < endDate && r.checkout > startDate;
    });

    const reservedRooms = overlapping.reduce((sum, r) => sum + (r.habitacionesCount || 1), 0);
    const availableRooms = Math.max(0, totalRooms - reservedRooms);

    return {
      alojamiento_id: id,
      date: startDate,
      checkin: startDate,
      checkout: endDate,
      total_rooms: totalRooms,
      reserved_rooms: reservedRooms,
      available_rooms: availableRooms,
      price_per_night: precio,
      checkin_times: ['14:00', '15:00', '16:00'],
      is_available: availableRooms > 0,
    };
  }

  async reservar(id: string, dto: ReservationRequestDto, idempotencyKey: string): Promise<any> {
    return this.enSerie(() => this.reservarEnSerie(id, dto, idempotencyKey));
  }

  private async reservarEnSerie(id: string, dto: ReservationRequestDto, idempotencyKey: string): Promise<any> {
    this.logger.log(`Iniciando reserva para Alojamiento ${id} con idempotency key ${idempotencyKey}`);

    // 1. Control de Idempotencia estricto
    const existing = await this.reservaRepo.findOne({ where: { idempotencyKey } });
    if (existing) {
      if (existing.status === ReservationStatus.CONFIRMED) {
        throw conflicto(CodigoProblema.BOOKING_NOT_CONFIRMED, 'Conflicto de Idempotencia: Reserva ya procesada con este Idempotency-Key.');
      }
      return this.buildReservaResponse(existing);
    }

    const alojamiento = await this.findOne(id);
    // Las noches salen SIEMPRE de las fechas (fuente de verdad), no de `dto.nights`:
    // así el total cobrado coincide con la estancia real.
    const nights = validarEstancia(dto.checkin, dto.checkout);
    const targetCheckin = dto.checkin;
    const targetCheckout = dto.checkout;
    const roomsCount = Math.max(1, dto.habitaciones_count || 1);
    validarCapacidad(alojamiento, dto.adultos || 1, dto.ninos || 0, roomsCount);

    // 2. Posible reserva duplicada (mismo cliente, mismo alojamiento, fechas que
    //    se solapan). Como en Booking, NO se bloquea: puede querer otra habitación.
    //    Se devuelve 409 para que el cliente CONFIRME, y basta con reenviar la
    //    petición con `confirmar_duplicado: true` (lo indica `invalidParams`).
    const customerEmail = (dto.customer_email || '').trim().toLowerCase();
    if (customerEmail && !dto.confirmar_duplicado) {
      const delCliente = await this.reservaRepo.find({
        where: { alojamientoId: id, customerEmail, status: ReservationStatus.CONFIRMED },
      });
      const duplicate = delCliente.find((r) => r.checkin < targetCheckout && r.checkout > targetCheckin);

      if (duplicate) {
        this.logger.warn(`Posible reserva duplicada de ${customerEmail} en alojamiento ${id}`);
        throw conflicto(
          CodigoProblema.BOOKING_NOT_CONFIRMED,
          `Ya tienes una reserva confirmada en este alojamiento del ${duplicate.checkin} al ${duplicate.checkout} (Código: ${duplicate.codigoReserva}).`,
          [
            {
              name: 'confirmar_duplicado',
              reason: 'Reenvía la petición con confirmar_duplicado: true para hacer otra reserva igualmente.',
            },
          ],
        );
      }
    }

    // 3. Verificación de disponibilidad de habitaciones sincronizada en tiempo real
    const availability = await this.getAvailability(id, targetCheckin, targetCheckout);
    if (availability.available_rooms < roomsCount) {
      throw conflicto(
        CodigoProblema.ROOM_NO_LONGER_AVAILABLE,
        `No hay suficientes habitaciones disponibles para las fechas seleccionadas. Habitaciones disponibles: ${availability.available_rooms}, solicitadas: ${roomsCount}.`,
      );
    }

    const pricePerNight = Number(alojamiento.precioPorNoche) || 100.0;
    const total = Number((pricePerNight * nights * roomsCount).toFixed(2));
    const currency = alojamiento.moneda || 'USD';

    const codigoReserva = `BKG-${Math.floor(100000 + Math.random() * 900000)}`;

    let reserva = this.reservaRepo.create({
      codigoReserva,
      alojamientoId: id,
      idempotencyKey,
      status: ReservationStatus.CONFIRMED,
      total,
      totalPrice: { currency, total },
      noches: nights,
      habitacionesCount: roomsCount,
      customerName: dto.customer_name,
      customerEmail: customerEmail || 'cliente@example.com',
      checkin: targetCheckin,
      checkout: targetCheckout,
      huespedes: (dto.adultos || 1) + (dto.ninos || 0),
    });

    reserva = await this.reservaRepo.save(reserva);

    this.telemetryService?.trackEvent({
      event_name: 'booking_confirmed',
      vertical: 'alojamientos',
      properties: {
        order_id: reserva.id,
        codigo_reserva: reserva.codigoReserva,
        alojamiento_id: reserva.alojamientoId,
        total: reserva.total,
        customer_email: reserva.customerEmail,
      },
    });

    return this.buildReservaResponse(reserva, alojamiento);
  }

  async cancelarReserva(reservationId: string, dto: CancelReservationRequestDto, idempotencyKey: string): Promise<any> {
    return this.enSerie(() => this.cancelarReservaEnSerie(reservationId, dto, idempotencyKey));
  }

  private async cancelarReservaEnSerie(reservationId: string, dto: CancelReservationRequestDto, idempotencyKey: string): Promise<any> {
    this.logger.log(`Cancelando reserva ${reservationId} (razón: ${dto.reason}) con idempotency key ${idempotencyKey}`);

    const reserva = await this.reservaRepo.findOneBy({ id: reservationId });
    if (!reserva) throw new HttpException('Reserva no encontrada', HttpStatus.NOT_FOUND);

    if (reserva.status === ReservationStatus.CANCELLED) {
      return this.buildReservaResponse(reserva);
    }

    if (reserva.checkout && new Date(reserva.checkout).getTime() < Date.now()) {
      throw conflicto(
        CodigoProblema.CANCELLATION_NOT_ALLOWED,
        'No es posible cancelar una reserva cuya estancia ya ha finalizado.',
      );
    }

    reserva.status = ReservationStatus.CANCELLED;
    await this.reservaRepo.save(reserva);

    this.telemetryService?.trackEvent({
      event_name: 'booking_cancelled',
      vertical: 'alojamientos',
      properties: {
        order_id: reserva.id,
        codigo_reserva: reserva.codigoReserva,
        reason: dto.reason,
      },
    });

    return this.buildReservaResponse(reserva);
  }

  /**
   * "Mis reservas": un cliente solo ve SUS reservas (por el correo de su sesión);
   * un administrador ve todas. Antes devolvía todas las reservas de todos los
   * clientes, con nombre y correo, a cualquiera.
   */
  async getReservas(usuario?: UsuarioSupabase | null): Promise<any> {
    this.logger.log('Consultando historial de reservas de alojamientos');
    const email = (usuario?.email || '').trim().toLowerCase();
    const verTodas = esAdministrador(usuario);
    if (!verTodas && !email) return [];
    const reservas = await this.reservaRepo.find({
      ...(verTodas ? {} : { where: { customerEmail: email } }),
      order: { createdAt: 'DESC' },
    });
    const ids = [...new Set(reservas.map((r) => r.alojamientoId))];
    const alojamientos = ids.length > 0 ? await this.alojamientoRepo.find({ where: ids.map((id) => ({ id })) }) : [];
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

  /** Id interno estable para un alojamiento que llega de un proveedor. */
  private idParaProveedor(proveedorId: string, idExterno: string): string {
    const legible = `${proveedorId}-${idExterno}`;
    if (legible.length <= 50) return legible;
    return `${proveedorId.slice(0, 30)}-${createHash('sha1').update(legible).digest('hex').slice(0, 16)}`;
  }

  /** Normaliza el DTO a columnas de la entidad (sin campos ajenos ni el proveedor). */
  private camposDesdeDto(dto: Partial<CreateAlojamientoDto>) {
    const { proveedorId: _p, ...resto } = dto as any;
    const campos: Record<string, any> = {};
    for (const [k, v] of Object.entries(resto)) {
      if (v !== undefined) campos[k] = v;
    }
    return campos;
  }

  async create(dto: CreateAlojamientoDto, actor?: ActorCatalogo): Promise<any> {
    // Con API key el proveedor es SIEMPRE el de la clave; un admin puede indicarlo.
    const proveedorId = actor?.tipo === 'proveedor' ? actor.proveedorId : dto.proveedorId ?? null;
    if (dto.idExterno && proveedorId) {
      const existente = await this.alojamientoRepo.findOne({ where: { proveedorId, idExterno: dto.idExterno } as any });
      if (existente) {
        throw new ConflictException(
          `El proveedor '${proveedorId}' ya tiene un alojamiento con idExterno '${dto.idExterno}' (id ${existente.id}). Usa PATCH /alojamientos/${existente.id} o POST /alojamientos/sincronizar.`,
        );
      }
    }
    const id = proveedorId && dto.idExterno ? this.idParaProveedor(proveedorId, dto.idExterno) : `aloj-${randomUUID().slice(0, 13)}`;
    const entity = this.alojamientoRepo.create({
      id,
      ...this.camposDesdeDto(dto),
      proveedorId,
      estado: dto.estado || 'ACTIVO',
      moneda: dto.moneda || 'USD',
      photos: dto.photos?.length ? dto.photos : [{ url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800' }],
      amenidades: dto.amenidades || [],
      ratings: { score: 9.0, number_of_reviews: 0 },
      host: null,
      ubicacion: dto.ubicacion || { city: dto.destino },
      ultimaSincronizacion: actor?.tipo === 'proveedor' ? new Date() : null,
    } as any);
    return this.alojamientoRepo.save(entity);
  }

  async replace(id: string, dto: CreateAlojamientoDto, actor?: ActorCatalogo): Promise<void> {
    const alojamiento = await this.alojamientoRepo.findOneBy({ id });
    if (!alojamiento) throw new HttpException('Alojamiento no encontrado', HttpStatus.NOT_FOUND);
    exigirPropiedad(actor, alojamiento.proveedorId);
    await this.alojamientoRepo.save({
      ...alojamiento,
      ...this.camposDesdeDto(dto),
      ...(actor?.tipo === 'admin' && dto.proveedorId !== undefined ? { proveedorId: dto.proveedorId } : {}),
      ...(actor?.tipo === 'proveedor' ? { ultimaSincronizacion: new Date() } : {}),
    } as any);
  }

  async update(id: string, dto: UpdateAlojamientoDto, actor?: ActorCatalogo): Promise<any> {
    const alojamiento = await this.alojamientoRepo.findOneBy({ id });
    if (!alojamiento) throw new HttpException('Alojamiento no encontrado', HttpStatus.NOT_FOUND);
    exigirPropiedad(actor, alojamiento.proveedorId);
    Object.assign(alojamiento, this.camposDesdeDto(dto));
    if (actor?.tipo === 'admin' && (dto as any).proveedorId !== undefined) alojamiento.proveedorId = (dto as any).proveedorId;
    if (actor?.tipo === 'proveedor') alojamiento.ultimaSincronizacion = new Date();
    return this.alojamientoRepo.save(alojamiento);
  }

  /**
   * Baja definitiva. Se rechaza (409) si hay reservas confirmadas que aún no han
   * terminado: borrar el hotel dejaría a esos clientes sin alojamiento ni datos.
   * En ese caso hay que desactivarlo (estado INACTIVO), que lo oculta sin perder nada.
   */
  async delete(id: string, actor?: ActorCatalogo): Promise<void> {
    const alojamiento = await this.alojamientoRepo.findOneBy({ id });
    if (!alojamiento) throw new HttpException('Alojamiento no encontrado', HttpStatus.NOT_FOUND);
    exigirPropiedad(actor, alojamiento.proveedorId);
    const hoy = fechaRelativa(0);
    const pendientes = (await this.reservaRepo.find({ where: { alojamientoId: id, status: ReservationStatus.CONFIRMED } }))
      .filter((r) => String(r.checkout) >= hoy);
    if (pendientes.length > 0) {
      throw new ConflictException(
        `No se puede eliminar: tiene ${pendientes.length} reserva(s) confirmada(s) pendientes. Desactívalo (estado INACTIVO) para ocultarlo sin afectar a esos clientes.`,
      );
    }
    await this.alojamientoRepo.remove(alojamiento);
  }

  /**
   * Catálogo para el panel de gestión: TODOS los alojamientos (también los
   * inactivos), con su origen y sus reservas pendientes. Un proveedor solo ve los suyos.
   */
  async catalogoGestion(
    filtros: { estado?: string; proveedor?: string; q?: string },
    actor?: ActorCatalogo,
  ): Promise<any> {
    let lista = await this.alojamientoRepo.find({ order: { createdAt: 'DESC' } });
    if (actor?.tipo === 'proveedor') lista = lista.filter((a) => a.proveedorId === actor.proveedorId);
    const estado = (filtros.estado || '').toUpperCase();
    if (estado === 'ACTIVO' || estado === 'INACTIVO') lista = lista.filter((a) => (a.estado || 'ACTIVO') === estado);
    if (filtros.proveedor === 'manual') lista = lista.filter((a) => !a.proveedorId);
    else if (filtros.proveedor) lista = lista.filter((a) => a.proveedorId === filtros.proveedor);
    if (filtros.q?.trim()) {
      const q = normalizarBusqueda(filtros.q);
      lista = lista.filter((a) => [a.nombre, a.destino, a.id, a.idExterno].some((c) => normalizarBusqueda(c).includes(q)));
    }

    const hoy = fechaRelativa(0);
    const confirmadas = await this.reservaRepo.find({ where: { status: ReservationStatus.CONFIRMED } });
    const pendientesPor = new Map<string, number>();
    for (const r of confirmadas) {
      if (String(r.checkout) >= hoy) pendientesPor.set(r.alojamientoId, (pendientesPor.get(r.alojamientoId) || 0) + 1);
    }

    const todos = await this.alojamientoRepo.find();
    const visibles = actor?.tipo === 'proveedor' ? todos.filter((a) => a.proveedorId === actor.proveedorId) : todos;
    const proveedores = [...new Set(visibles.map((a) => a.proveedorId).filter(Boolean))].sort();

    return {
      data: lista.map((a) => ({
        ...this.transformAlojamiento(a),
        reservas_pendientes: pendientesPor.get(a.id) || 0,
        creado_en: a.createdAt,
        actualizado_en: a.updatedAt,
      })),
      resumen: {
        total: visibles.length,
        activos: visibles.filter((a) => (a.estado || 'ACTIVO') === 'ACTIVO').length,
        inactivos: visibles.filter((a) => a.estado === 'INACTIVO').length,
        manuales: visibles.filter((a) => !a.proveedorId).length,
        de_proveedores: visibles.filter((a) => a.proveedorId).length,
        proveedores,
      },
    };
  }

  /**
   * Sincronización por lotes desde el sistema de un proveedor.
   *
   * Idempotente: la clave es (proveedorId, idExterno). Si ya existe se ACTUALIZA,
   * si no se CREA; reenviar el mismo lote no duplica nada. Para retirar un
   * alojamiento se envía con `estado: 'INACTIVO'`.
   *
   * Cada elemento se valida por separado con el MISMO contrato que el alta
   * (CreateAlojamientoDto): un elemento inválido no impide guardar los demás, y
   * su error se devuelve con el campo exacto, como en las APIs de contenido de Booking.
   */
  async sincronizar(items: unknown[], actor: ActorCatalogo, proveedorDelLote?: string): Promise<any> {
    const proveedorId = actor.tipo === 'proveedor' ? actor.proveedorId : proveedorDelLote;
    if (!proveedorId || !/^[a-z0-9-]{2,60}$/.test(proveedorId)) {
      throw validacion('Indica el proveedor del lote.', [
        { name: 'proveedorId', reason: 'Obligatorio para un administrador (con API key se toma de la clave). Minúsculas, números y "-".' },
      ]);
    }

    const resultados: any[] = [];
    const vistos = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      const crudo = items[i] as any;
      const idExterno = typeof crudo?.idExterno === 'string' ? crudo.idExterno : null;
      if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) {
        resultados.push({ indice: i, idExterno: null, resultado: 'ERROR', errores: [{ name: `alojamientos.${i}`, reason: 'Debe ser un objeto.' }] });
        continue;
      }
      if (!idExterno) {
        resultados.push({ indice: i, idExterno: null, resultado: 'ERROR', errores: [{ name: 'idExterno', reason: 'Es obligatorio al sincronizar.' }] });
        continue;
      }
      if (vistos.has(idExterno)) {
        resultados.push({ indice: i, idExterno, resultado: 'ERROR', errores: [{ name: 'idExterno', reason: 'Está repetido en el mismo lote.' }] });
        continue;
      }
      vistos.add(idExterno);

      const { proveedorId: _ignorado, ...datos } = crudo;
      const dto = plainToInstance(CreateAlojamientoDto, datos);
      const errores: ValidationError[] = await validate(dto as object, { whitelist: true, forbidNonWhitelisted: true });
      if (errores.length) {
        resultados.push({ indice: i, idExterno, resultado: 'ERROR', errores: aplanarValidacion(errores) });
        continue;
      }

      const existente = await this.alojamientoRepo.findOne({ where: { proveedorId, idExterno } as any });
      if (existente) {
        Object.assign(existente, this.camposDesdeDto(dto), { ultimaSincronizacion: new Date() });
        const guardado = await this.alojamientoRepo.save(existente);
        resultados.push({ indice: i, idExterno, resultado: 'ACTUALIZADO', id: guardado.id, estado: guardado.estado || 'ACTIVO' });
      } else {
        const creado = await this.create(dto, { tipo: 'proveedor', proveedorId });
        resultados.push({ indice: i, idExterno, resultado: 'CREADO', id: creado.id, estado: creado.estado });
      }
    }

    const cuenta = (r: string) => resultados.filter((x) => x.resultado === r).length;
    this.telemetryService?.trackEvent({
      event_name: 'catalog_synced',
      vertical: 'alojamientos',
      properties: { proveedor_id: proveedorId, creados: cuenta('CREADO'), actualizados: cuenta('ACTUALIZADO'), errores: cuenta('ERROR') },
    });
    return {
      proveedor_id: proveedorId,
      resumen: { recibidos: items.length, creados: cuenta('CREADO'), actualizados: cuenta('ACTUALIZADO'), errores: cuenta('ERROR') },
      resultados,
    };
  }

  async getResenas(alojamientoId: string): Promise<any> {
    const alojamiento = await this.alojamientoRepo.findOneBy({ id: alojamientoId });
    if (!alojamiento) throw new HttpException('Alojamiento no encontrado', HttpStatus.NOT_FOUND);

    let resenas = await this.resenaRepo.find({ where: { alojamientoId }, order: { createdAt: 'DESC' } });

    if (resenas.length === 0) {
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

  // --- Helpers de Formateo ---

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

  private buildOrderDetailDto(reserva: ReservaAlojamiento, alojamiento?: any, paymentReference?: string): OrderDetailDto {
    return {
      order_id: reserva.id,
      codigo_reserva: reserva.codigoReserva,
      status: reserva.status,
      accommodation_details: {
        id: alojamiento?.id || reserva.alojamientoId,
        nombre: alojamiento?.nombre || 'Propiedad de Alojamiento',
        destino: alojamiento?.destino || 'Ecuador',
        checkin: reserva.checkin,
        checkout: reserva.checkout,
        noches: reserva.noches,
        habitaciones: reserva.habitacionesCount,
        huespedes: reserva.huespedes,
      },
      total_price: Number(reserva.total),
      currency: reserva.totalPrice?.currency || 'USD',
      creation_date: reserva.createdAt ? new Date(reserva.createdAt).toISOString() : new Date().toISOString(),
      payment_reference: paymentReference || 'pay_verified',
      customer_name: reserva.customerName,
      customer_email: reserva.customerEmail,
      _links: {
        self: { href: `/api/v1/alojamientos/orders/${reserva.id}`, type: 'GET' },
        modify: { href: `/api/v1/alojamientos/orders/${reserva.id}/modify`, type: 'POST' },
        cancel: { href: `/api/v1/alojamientos/orders/${reserva.id}/cancel`, type: 'POST' },
        accommodation: { href: `/api/v1/alojamientos/${reserva.alojamientoId}`, type: 'GET' },
      },
    };
  }
}
