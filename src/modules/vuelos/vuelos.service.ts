import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomInt, randomUUID } from 'crypto';
import { DataSource, EntityManager, FindOptionsRelations, In, Not, Repository } from 'typeorm';

import { Aerolinea } from './entities/aerolinea.entity';
import { AsientoVuelo } from './entities/asiento_vuelo.entity';
import { Boleto } from './entities/boleto.entity';
import { BoletoSegmento } from './entities/boleto_segmento.entity';
import { BloqueoCupo } from './entities/bloqueo_cupo.entity';
import { BloqueoItinerario } from './entities/bloqueo_itinerario.entity';
import { EquipajePasajero } from './entities/equipaje_pasajero.entity';
import { Idempotencia } from './entities/idempotencia.entity';
import { LogAuditoriaVuelos } from './entities/log_auditoria_vuelos.entity';
import { Oferta } from './entities/oferta.entity';
import { Pasajero } from './entities/pasajero.entity';
import { AsientoAsignado } from './entities/asiento_asignado.entity';
import { Checkin } from './entities/checkin.entity';
import { CheckinPasajero } from './entities/checkin_pasajero.entity';
import { CheckinSegmento } from './entities/checkin_segmento.entity';
import { CotizacionCancelacion } from './entities/cotizacion_cancelacion.entity';
import { EventoWebhook } from './entities/evento_webhook.entity';
import { OfertaCambioFecha } from './entities/oferta_cambio_fecha.entity';
import { OfertaCambioSegmento } from './entities/oferta_cambio_segmento.entity';
import { PaseAbordar } from './entities/pase_abordar.entity';
import { Reserva } from './entities/reserva.entity';
import { ReservaItinerario } from './entities/reserva_itinerario.entity';
import { ReservaSegmento } from './entities/reserva_segmento.entity';
import { OfertaItinerario } from './entities/oferta_itinerario.entity';
import { OfertaSegmento } from './entities/oferta_segmento.entity';
import { SuscripcionWebhook } from './entities/suscripcion_webhook.entity';
import { TarifaCabina } from './entities/tarifa_cabina.entity';
import { TarifaEquipaje } from './entities/tarifa_equipaje.entity';
import { Vuelo } from './entities/vuelo.entity';
import {
  AccionAuditoria,
  EstadoCheckIn,
  EstadoCheckInItem,
  EstadoCotizacionCancelacion,
  EstadoHold,
  EstadoIdempotencia,
  EstadoOfertaCambioFecha,
  EstadoReserva,
  EstadoTicket,
  EstadoTicketSegmento,
  Genero,
  TipoCodigoBarras,
  TipoDocumento,
  TipoEventoWebhook,
  TipoPasajero,
} from './entities/vuelos.enums';
import {
  CabinPricingDto,
  FlightOfferDto,
  ItineraryOptionDto,
  MoneyAmountDto,
  SearchResponseDto,
} from './dto/search-response.dto';
import { SearchRequestDto } from './dto/search.dto';
import {
  HoldRequestDto,
  HoldResponseDto,
  HoldStatusResponseDto,
} from './dto/hold.dto';
import { SeatMapResponseDto } from './dto/seatmap.dto';
import {
  BookingDetailResponseDto,
  BookingItineraryDto,
  BookingRequestDto,
  BookingSegmentDto,
} from './dto/booking.dto';
import {
  BaggageOptionDto,
  ListarReservasQueryDto,
  ReservaListResponseDto,
  ReservaResumenDto,
} from './dto/booking-list.dto';
import {
  BoardingPassListResponseDto,
  DateChangeOfferDto,
  DateChangeRequestDto,
  DateChangeSearchRequestDto,
  TicketDetailDto,
  TicketIssuanceResponseDto,
  TicketListResponseDto,
} from './dto/emision.dto';
import {
  AddBaggageRequestDto,
  BaggageAddedResponseDto,
  CancelBookingRequestDto,
  CancelBookingResponseDto,
  CancellationQuoteResponseDto,
  CheckInPassengerDto,
  CheckInResponseDto,
} from './dto/postventa.dto';
import {
  CreateWebhookDto,
  FlightStatusDto,
  FlightStatusQueryDto,
  WebhookSubscriptionDto,
} from './dto/estado-vuelo.dto';
import {
  CodigoProblema,
  ProblemaApi,
  conflicto,
  noProcesable,
} from '../../core/errors/codigo-error';

/** Minutos que un hold permanece vivo si el cliente no manda `ttlMinutes`. */
const TTL_POR_DEFECTO = 15;

/**
 * Version del esquema de los payloads de `evento_webhook`.
 *
 * Viaja en `evt_versionApi`. Sin ella, un suscriptor que guarde un
 * `booking.cancelled` de la v1 no tiene forma de saber si mas adelante le llega
 * la v2 con otro shape, ni de distinguir un cambio de contenido de un cambio de
 * formato.
 */
const VERSION_EVENTO = '1.0';

/**
 * Calcula la diferencia en minutos entre dos instantes.
 *
 * Se hace con `getTime()` sobre `Date` y no leyendo el DTO: los campos
 * `horaSalidaProgramada` y `horaLlegadaProgramada` son TIMESTAMPTZ, que
 * TypeORM mapea a `Date`, y por eso la resta es exacta en milisegundos. El
 * resultado se redondea a entero porque el contrato declara
 * `totalDurationMinutes` y `durationMinutes` como `integer`.
 */
function minutosEntre(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / 60000);
}

/** Redondea un importe a 2 decimales y lo devuelve como STRING. */
function aImporte(valor: number): string {
  return valor.toFixed(2);
}

/**
 * Normaliza a `YYYY-MM-DD` un valor de columna `date`.
 *
 * El driver puede entregar un `date` de PostgreSQL como texto (`'2026-11-03'`)
 * o como `Date` de JavaScript, segun el parser de tipos con el que se cree el
 * pool. Un `String(fecha).slice(0, 10)` solo funciona en el primer caso: sobre
 * un `Date` devuelve `'Tue Nov 03'`, que no es una fecha.
 *
 * Cuando llega como `Date` se usa `getFullYear/getMonth/getDate` en vez de
 * `toISOString()`, porque `toISOString()` convierte a UTC y en una zona horaria
 * detras de UTC (Ecuador es UTC-5) puede devolver el dia ANTERIOR: un vuelo que
 * sale el 3 se fecharia el 2.
 */
function aFechaIso(valor: Date | string): string {
  if (typeof valor === 'string') {
    return valor.slice(0, 10);
  }
  const mes = String(valor.getMonth() + 1).padStart(2, '0');
  const dia = String(valor.getDate()).padStart(2, '0');
  return [valor.getFullYear(), mes, dia].join('-');
}

/**
 * Redondea a dos decimales evitando el error binario de `toFixed`.
 *
 * `(0.1 + 0.2).toFixed(2)` es `"0.30"`, pero `(1.005).toFixed(2)` es
 * `"1.00"` porque 1.005 no es representable y en realidad vale 1.0049999.
 * Multiplicar por 100, redondear y dividir corrige el caso, y la ultima division
 * se vuelve a dejar a dos decimales por si el redondeo ha dejado residuo.
 */
function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Codigo de barras del pase de abordar, en formato PDF417.
 *
 * ── Debe ser ESTABLE ────────────────────────────────────────────────────────
 * Se deriva del PNR, el segmento y el pasajero, sin `random`: si el mismo
 * pasajero repite el check-in, sale el mismo codigo. Un boarding pass que
 * cambia en cada consulta no sirve para nada, y ademas el DDL tiene
 * `UNIQUE (pab_pasajeroId, pab_segmentId)`.
 *
 * El CHECK exige entre 50 y 5000 caracteres para PDF417. El relleno con
 * asteriscos hasta 120 mantiene la longitud en el rango valido y simula el
 * relleno real de un PDF417, que es de longitud fija.
 */
function paseDeAbordar(pnr: string, segmentId: string, passengerId: string): string {
  const base = `M1${pnr}/${segmentId}/${passengerId}`;
  return base.padEnd(120, '*').slice(0, 120);
}

/**
 * SHA-256 en hexadecimal, 64 caracteres.
 *
 * Se usa para `ofe_huellacatalogo` (`CHECK (~ '^[a-f0-9]{64}$')`) y para
 * `idm_cuerpohash`. `hex`, no `base64`: el CHECK del DDL solo admite `[a-f0-9]`.
 */
function sha256(texto: string): string {
  return createHash('sha256').update(texto).digest('hex');
}

/**
 * Serie decimal de N digitos derivada de un texto.
 *
 * El DDL no impone un formato a `bol_numeroboleto` ni a `bse_numerocupon`, pero
 * el estandar IATA son 13 digitos DECIMALES en el cupon y 10 en la serie del
 * boleto, y es lo que escanea el mostrador. Tomar los primeros N caracteres del
 * SHA-256 NO sirve: el hash es HEXADECIMAL y salen letras (`0b9ea66658`), que no
 * son un numero de boleto. Ese fue el fallo de la primera version.
 *
 * Se recorre el hash de dos en dos (un byte, un valor 0-255) y se va acumulando
 * con un primo grande, que es la "multiply-and-add" clasica: reparte los bytes en
 * todo el rango. Con SHA-256 como entrada la uniformidad ya esta garantizada,
 * pero un reparto sesgado haria que los numeros bajos salieran mas a menudo que
 * los altos.
 *
 * `padStart` garantiza la longitud: un resto puede tener menos digitos, y
 * `bol_numeroboleto` es `varchar(15)`. Un numero mas corto no rompe ningun
 * CHECK, pero dos boletos distintos podrian acabar con el mismo formato y ser mas
 * dificil de distinguir a simple vista.
 */
function serieDecimal(texto: string, digitos: number): string {
  const hash = sha256(texto);
  // 2^31-1, el primo de Mersenne.
  const primo = 2147483647;
  let acumulado = 0;
  for (let i = 0; i + 1 < hash.length; i += 2) {
    acumulado = (acumulado * 31 + parseInt(hash.slice(i, i + 2), 16)) % primo;
  }
  return String(acumulado % Math.pow(10, digitos)).padStart(digitos, '0');
}

/**
 * Numero de boleto electronico: `014-2384719264`.
 *
 * Tres digitos de prefijo de linea, guion y diez de serie: catorce caracteres,
 * dentro del `varchar(15)` de `bol_numeroboleto`.
 *
 * Es DETERMINISTA a proposito. El DDL no exige unicidad de este campo (solo la de
 * `bol_ticketId`), pero un numero de boleto que cambia entre reintentos es
 * indistinguible de dos boletos distintos: el pasajero fotografiaria uno y el
 * mostrador buscaria el otro.
 *
 * El prefijo sale del PNR y no de un numero de linea real porque este modulo no
 * tiene lineas aereas de verdad: es un formato sintetico, y se documenta como tal.
 */
function numeroDeBoleto(pnr: string, passengerId: string): string {
  const linea = serieDecimal(`linea:${pnr}`, 3);
  return `${linea}-${serieDecimal(`${pnr}:${passengerId}:serie`, 10)}`;
}

/**
 * Cupon de un segmento del boleto: trece digitos decimales, el formato IATA.
 *
 * `bse_numerocupon` es `varchar(15)` y el DDL no le impone un formato, asi que el
 * unico que manda es el que entiende el mostrador.
 */
function cuponDeBoleto(numeroBoleto: string, segmentId: string): string {
  return serieDecimal(`${numeroBoleto}:${segmentId}:cupon`, 13);
}

@Injectable()
export class VuelosService {
  private readonly logger = new Logger(VuelosService.name);

  constructor(
    @InjectRepository(Vuelo) private readonly vueloRepo: Repository<Vuelo>,
    @InjectRepository(Aerolinea) private readonly aerolineaRepo: Repository<Aerolinea>,
    @InjectRepository(AsientoVuelo) private readonly asientoRepo: Repository<AsientoVuelo>,
    @InjectRepository(Oferta) private readonly ofertaRepo: Repository<Oferta>,
    @InjectRepository(OfertaItinerario)
    private readonly ofertaItinerarioRepo: Repository<OfertaItinerario>,
    @InjectRepository(OfertaSegmento)
    private readonly ofertaSegmentoRepo: Repository<OfertaSegmento>,
    @InjectRepository(BloqueoCupo) private readonly bloqueoRepo: Repository<BloqueoCupo>,
    @InjectRepository(BloqueoItinerario)
    private readonly bloqueoItinerarioRepo: Repository<BloqueoItinerario>,
    @InjectRepository(Idempotencia) private readonly idempotenciaRepo: Repository<Idempotencia>,
    @InjectRepository(Reserva) private readonly reservaRepo: Repository<Reserva>,
    @InjectRepository(Pasajero) private readonly pasajeroRepo: Repository<Pasajero>,
    @InjectRepository(ReservaItinerario)
    private readonly reservaItinerarioRepo: Repository<ReservaItinerario>,
    @InjectRepository(ReservaSegmento)
    private readonly reservaSegmentoRepo: Repository<ReservaSegmento>,
    @InjectRepository(Boleto) private readonly boletoRepo: Repository<Boleto>,
    @InjectRepository(EquipajePasajero)
    private readonly equipajeRepo: Repository<EquipajePasajero>,
    @InjectRepository(TarifaCabina) private readonly tarifaCabinaRepo: Repository<TarifaCabina>,
    @InjectRepository(TarifaEquipaje)
    private readonly tarifaEquipajeRepo: Repository<TarifaEquipaje>,
    @InjectRepository(CotizacionCancelacion)
    private readonly cotizacionRepo: Repository<CotizacionCancelacion>,
    @InjectRepository(Checkin) private readonly checkinRepo: Repository<Checkin>,
    @InjectRepository(AsientoAsignado)
    private readonly asientoAsignadoRepo: Repository<AsientoAsignado>,
    @InjectRepository(EventoWebhook)
    private readonly eventoRepo: Repository<EventoWebhook>,
    @InjectRepository(SuscripcionWebhook)
    private readonly suscripcionWebhookRepo: Repository<SuscripcionWebhook>,
    // Fase 11. `PaseAbordar` ya estaba importada pero no registrada: hasta ahora
    // los pases se leian de otra parte del check-in. `OfertaCambioFecha` y
    // `OfertaCambioSegmento` son las dos tablas del bloque 6a que el cambio de
    // fecha necesita y que ningun endpoint anterior tocaba.
    @InjectRepository(PaseAbordar)
    private readonly paseAbordarRepo: Repository<PaseAbordar>,
    @InjectRepository(OfertaCambioFecha)
    private readonly ofertaCambioFechaRepo: Repository<OfertaCambioFecha>,
    @InjectRepository(OfertaCambioSegmento)
    private readonly ofertaCambioSegmentoRepo: Repository<OfertaCambioSegmento>,
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================================
  // POST /search
  // =========================================================================

  /**
   * Busca vuelos que coincidan con los itinerarios solicitados.
   *
   * ── Reglas del contrato aplicadas aquí ────────────────────────────────────
   * · `vue_estado != 'CANCELLED'`: un vuelo cancelado no debe ofrecerse. Es el
   *   mismo criterio que usa la vista `vista_busqueda_vuelos` (§5.1 del plan),
   *   de modo que el listado y la busqueda no se contradicen.
   * · La coincidencia de ruta y fecha es EXACTA (igualdad), no una aproximacion
   *   por rango: el DDL tiene `UNIQUE (vue_numeroVuelo, vue_fecha)` y la fecha es
   *   la de operacion, que es como el usuario busca ("vuelos del 15 de diciembre").
   *
   * ── Por qué la búsqueda ESCRIBE ───────────────────────────────────────────
   * La búsqueda **persiste la oferta** en `oferta`, `oferta_itinerario` y
   * `oferta_segmento`. No es un efecto secundario gratuito: es lo que permite
   * que `POST /vuelos/offers/hold` pueda validar el `offerId` recibido.
   *
   * `bloqueo_cupo.blo_ofertaid` es una FK real a `oferta(id_oferta)`. Si la
   * búsqueda devolviera un identificador sintético sin fila detrás, el hold
   * fallaría con violación de FK, o peor, se aceptaría con una offerings que
   * no existe. El identificador de negocio `ofe_offerid` tiene
   * `UNIQUE (ofe_offerid)`, así que se usa el id sintético determinista
   * `OF-<8 hex del UUID de vuelo>` como `ofe_offerid`: dos búsquedas del mismo
   * vuelo devuelven SIEMPRE el mismo `offerId` y no duplican filas.
   */
  async searchFlights(dto: SearchRequestDto): Promise<SearchResponseDto> {
    const ofertas: FlightOfferDto[] = [];

    for (const [indice, itinerario] of dto.itineraries.entries()) {
      const vuelos = await this.vueloRepo.find({
        where: {
          aeropuertoOrigen: itinerario.origin,
          aeropuertoDestino: itinerario.destination,
          fecha: itinerario.departureDate,
          estado: Not(In(['CANCELLED'])),
        },
        relations: ['aerolineaMarketing', 'aerolineaOperadora'],
        order: { horaSalidaProgramada: 'ASC' },
      });

      this.logger.log(
        `Itinerario ${indice + 1}/${dto.itineraries.length} ` +
          `${itinerario.origin}->${itinerario.destination} ${itinerario.departureDate}: ` +
          `${vuelos.length} vuelo(s)`,
      );

      for (const vuelo of vuelos) {
        ofertas.push(await this.construirOferta(vuelo, indice, dto));
      }
    }

    return { totalOffers: ofertas.length, offers: ofertas };
  }

  /** Arma un `FlightOffer` a partir de una fila de `vuelo` y lo persiste. */
  private async construirOferta(
    vuelo: Vuelo,
    indiceItinerario: number,
    dto: SearchRequestDto,
  ): Promise<FlightOfferDto> {
    // Prefijo corto y estable derivado del UUID: permite que el frontend
    // correlacione oferta y segmento sin inventar una secuencia global.
    const prefijo = vuelo.idVuelo.slice(0, 8);
    const offerId = `OF-${prefijo}`;
    const itineraryId = `IT-${indiceItinerario}-${prefijo}`;
    const segmentId = `SG-${prefijo}`;

    const disponibilidad = await this.disponibilidadPorCabina(vuelo.idVuelo);

    const aerolineaComercial = vuelo.aerolineaMarketing?.idAerolinea ?? '';

    // `oferta` + `oferta_itinerario` + `oferta_segmento` se escriben ANTES de
    // armar la respuesta, para que el `offerId` que se devuelve sea un id que
    // el hold puede resolver contra una fila real.
    await this.persistirOferta({
      offerId,
      aerolineaId: aerolineaComercial,
      vuelo,
      itineraryId,
      segmentId,
      indiceItinerario,
      totalDurationMinutes: minutosEntre(
        vuelo.horaSalidaProgramada,
        vuelo.horaLlegadaProgramada,
      ),
    });

    const segmento = {
      segmentId: segmentId,
      flightNumber: vuelo.numeroVuelo,
      departure: {
        iataCode: vuelo.aeropuertoOrigen,
        at: vuelo.horaSalidaProgramada.toISOString(),
        terminal: vuelo.terminalOrigen,
      },
      arrival: {
        iataCode: vuelo.aeropuertoDestino,
        at: vuelo.horaLlegadaProgramada.toISOString(),
        terminal: vuelo.terminalDestino,
      },
      // Una busqueda por ruta directa no genera escalas, asi que este campo
      // queda nulo en lugar de inventar una conexion.
      layoverMinutes: null,
      marketingCarrier: aerolineaComercial,
      operatingCarrier: vuelo.aerolineaOperadora?.idAerolinea ?? '',
      aircraft: vuelo.aeronave,
      durationMinutes: vuelo.duracionMinutos,
      status: vuelo.estado,
    };

    const itinerario: ItineraryOptionDto = {
      itineraryId: itineraryId,
      totalDurationMinutes: minutosEntre(
        vuelo.horaSalidaProgramada,
        vuelo.horaLlegadaProgramada,
      ),
      // Ruta directa: sin escalas.
      stopsCount: 0,
      segments: [segmento],
      pricingOptions: this.construirPricing(disponibilidad, dto),
    };

    return {
      offerId: offerId,
      airline: {
        code: aerolineaComercial,
        name: vuelo.aerolineaMarketing?.nombre ?? '',
      },
      itineraries: [itinerario],
      grandTotal: this.construirTotal(dto, disponibilidad),
    };
  }

  /**
   * Persiste (o reutiliza) la cadena `oferta` -> `oferta_itinerario` ->
   * `oferta_segmento` de un vuelo.
   *
   * Es idempotente por `ofe_offerid`, que es `UNIQUE`: si la fila ya existe se
   * actualiza, y buscar dos veces el mismo vuelo no duplica nada.
   *
   * Se hace con `findOne` + `save`/`update` y **no** con `upsert` a proposito.
   * `upsert` exige `conflictPaths`, que son rutas de PROPIEDADES que TypeORM
   * traduce a columnas. Las claves naturales de esta cadena incluyen columnas
   * que solo existen como `@RelationId` (`ofertaId` en `oferta_itinerario`,
   * `itinerarioId` en `oferta_segmento`), y un `@RelationId` no tiene
   * `databaseName` por el que traducirlas: TypeORM responde
   * `EntityPropertyNotFoundError: Property "ofertaId" was not found in "Oferta"`.
   * El find-then-write evita esa traduccion y hace el comportamiento explicito.
   */
  private async persistirOferta(args: {
    offerId: string;
    aerolineaId: string;
    vuelo: Vuelo;
    itineraryId: string;
    segmentId: string;
    indiceItinerario: number;
    totalDurationMinutes: number;
  }): Promise<void> {
    const { offerId, aerolineaId, vuelo, itineraryId, segmentId } = args;

    // La oferta caduca a la medianoche del dia de la salida: un precio congelado
    // para un vuelo que ya despego no tiene sentido. `ofe_expiraen` es NOT NULL
    // sin DEFAULT, asi que hay que mandarlo siempre.
    const expiraEn = new Date(vuelo.fecha + 'T23:59:59.000Z');

    // `Oferta` NO expone un `@RelationId` para `aerolinea` (a diferencia de
    // `BloqueoCupo`, que si lo tiene): solo la relacion. Por eso la FK se
    // escribe pasando el objeto anidado, no un `aerolineaId` suelto.
    // Calculate cheapest class total for persistirOferta (assuming 1 adult for now to maintain schema validity, since search could have multiple)
    // Actually we will just keep 0 in DB because the search response holds the real price
    const datosOferta = {
      aerolinea: { idAerolinea: aerolineaId },
      expiraEn: expiraEn,
      moneda: 'USD',
      tarifaBase: aImporte(0),
      impuestos: aImporte(0),
      total: aImporte(0),
      // Huella del "catalogo" que se ofrecio. Sin GDS real es un SHA-256 de
      // los parametros que definen la oferta, que es lo que un fingerprint de
      // catalogo debe detectar: que la tarifa cambio. Cumple el
      // `CHECK (~ '^[a-f0-9]{64}$')`.
      huellaCatalogo: sha256(
        [vuelo.idVuelo, aerolineaId, vuelo.numeroVuelo, vuelo.fecha].join('|'),
      ),
    };

    const existente = await this.ofertaRepo.findOne({ where: { offerId: offerId } });
    const oferta = existente
      ? await this.ofertaRepo.save(
          this.ofertaRepo.create({ ...existente, ...datosOferta }),
        )
      : await this.ofertaRepo.save(
          this.ofertaRepo.create({ offerId: offerId, ...datosOferta }),
        );

    // `ofertaId` en `OfertaItinerario` e `itinerarioId` en `OfertaSegmento` son
    // `@RelationId`: propiedades VIRTUALES que TypeORM rellena al leer pero que
    // no admiten como criterio de `where` (`EntityPropertyNotFoundError`). Por
    // eso estos dos `findOne` van por `QueryBuilder` contra la columna fisica.
    // Los nombres van en minusculas porque son los reales: el DDL los escribe sin
    // comillas y PostgreSQL pliega los identificadores a minusculas.
    const itinerarioPrevio = await this.ofertaItinerarioRepo
      .createQueryBuilder('oi')
      .where('oi.oit_ofertaid = :ofertaId', { ofertaId: oferta.idOferta })
      .andWhere('oi.oit_itineraryid = :itineraryId', { itineraryId: itineraryId })
      .getOne();
    const datosItinerario = {
      orden: args.indiceItinerario + 1,
      duracionTotalMinutos: args.totalDurationMinutes,
      escalas: 0,
    };

    /**
     * REGLA DE ORO DE ESTA ENTIDAD, y la reason de los tres comentarios que
     * siguen: **`@RelationId` es solo de LECTURA.** TypeORM lo rellena al
     * SELECT, pero en un `create()`/`save()` NO escribe la columna (falla con
     * `el valor nulo en la columna "oit_ofertaid" ... viola la restriccion de no
     * nulo`), y tampoco vale como criterio de `where`
     * (`EntityPropertyNotFoundError`).
     *
     * Para ESCRIBIR una FK hay que pasar la RELACION anidada, no su
     * `@RelationId`: `oferta: { idOferta: ... }`, no `ofertaId: ...`.
     */
    const itinerario = itinerarioPrevio
      ? await this.ofertaItinerarioRepo.save(
          this.ofertaItinerarioRepo.create({ ...itinerarioPrevio, ...datosItinerario }),
        )
      : await this.ofertaItinerarioRepo.save(
          this.ofertaItinerarioRepo.create({
            // FK por la relacion, no por el `ofertaId` virtual.
            oferta: { idOferta: oferta.idOferta },
            itineraryId: itineraryId,
            ...datosItinerario,
          }),
        );

    // `oferta_segmento` referencia `vuelo` con ON DELETE RESTRICT. Un vuelo
    // borrado con ofertas vivas no se puede borrar, y eso es intencionado.
    const datosSegmento = {
      orden: 1,
      escalaMinutos: null,
      estado: vuelo.estado,
    };

    const segmentoPrevio = await this.ofertaSegmentoRepo
      .createQueryBuilder('os')
      .where('os.osg_itinerarioid = :itinerarioId', {
        itinerarioId: itinerario.idOfertaItinerario,
      })
      .andWhere('os.osg_segmentid = :segmentId', { segmentId: segmentId })
      .getOne();
    if (segmentoPrevio) {
      await this.ofertaSegmentoRepo.save(
        this.ofertaSegmentoRepo.create({ ...segmentoPrevio, ...datosSegmento }),
      );
    } else {
      await this.ofertaSegmentoRepo.save(
        this.ofertaSegmentoRepo.create({
          // Ambas FKs por la relacion (`@RelationId` no escribe, ver nota arriba).
          itinerario: { idOfertaItinerario: itinerario.idOfertaItinerario },
          vuelo: { idVuelo: vuelo.idVuelo },
          segmentId: segmentId,
          ...datosSegmento,
        }),
      );
    }
  }

  /**
   * Cuenta los asientos LIBRES por cabina de un vuelo.
   * Se apoya en el indice parcial `ix_asiento_vuelo_cabina`
   * (`WHERE asi_estaDisponible`), asi que el recuento no recorre la tabla
   * entera.
   */
  private async disponibilidadPorCabina(
    vueloId: string,
  ): Promise<Array<{ clase: string; libres: number }>> {
    const filas = await this.asientoRepo
      .createQueryBuilder('a')
      .select('a.asi_clasecabina', 'clase')
      .addSelect('COUNT(*)', 'libres')
      .where('a.asi_vueloid = :vueloId', { vueloId })
      .andWhere('a.asi_estadisponible = true')
      .groupBy('a.asi_clasecabina')
      .orderBy('a.asi_clasecabina', 'ASC')
      .getRawMany<{ clase: string; libres: string }>();

    return filas.map((f) => ({ clase: f.clase, libres: Number(f.libres) }));
  }

  /**
   * Construye las `pricingOptions` a partir de la disponibilidad real.
   * Solo incluye cabinas con al menos un asiento libre: ofrecer una cabina
   * agotada seria misleading y el usuario no podria comprar.
   */
  private construirPricing(
    disponibilidad: Array<{ clase: string; libres: number }>,
    dto: SearchRequestDto,
  ): CabinPricingDto[] {
    const FACTOR: Record<string, number> = { ADULT: 1.00, YOUTH: 0.82, CHILD: 0.68, INFANT: 0.12 };
    const BASES: Record<string, number> = {
      'ECONOMY': 68.00,
      'PREMIUM_ECONOMY': 95.00,
      'BUSINESS': 268.00,
      'FIRST': 500.00
    };
    const MARCAS: Record<string, string> = {
      'ECONOMY': 'BASIC',
      'PREMIUM_ECONOMY': 'FLEX',
      'BUSINESS': 'CORPORATE',
      'FIRST': 'LUXURY'
    };
    const EQ: Record<string, number> = {
      'ECONOMY': 35.00,
      'PREMIUM_ECONOMY': 0.00,
      'BUSINESS': 0.00,
      'FIRST': 0.00
    };

    return disponibilidad
      .filter((c) => c.libres > 0)
      .map((cabina) => {
        const base = BASES[cabina.clase] ?? 100.00;
        return {
          cabinClass: cabina.clase,
          fareBrand: MARCAS[cabina.clase] ?? 'STANDARD',
          availableSeats: cabina.libres,
          fareRules: { isRefundable: cabina.clase !== 'ECONOMY', isChangeable: true },
          baggageAllowance: {
            personalItemIncluded: true,
            carryOnIncluded: cabina.clase === 'ECONOMY' ? 0 : 1,
            checkedBaggageIncluded: cabina.clase === 'ECONOMY' ? 0 : 2,
          },
          extraCheckedBaggagePrice: {
            currency: 'USD',
            total: aImporte(EQ[cabina.clase] ?? 0.00),
          },
          pricePerPassengerType: this.tiposPasajeroSolicitados(dto).map((tipo) => {
            const f = FACTOR[tipo] ?? 1.0;
            const pb = base * f;
            const pi = pb * 0.18;
            return {
              passengerType: tipo,
              price: { currency: 'USD', baseFare: aImporte(pb), taxes: aImporte(pi), total: aImporte(pb + pi) },
            };
          }),
        };
      });
  }

  /** Tipos de pasajero con al menos una plaza, en el orden del contrato. */
  private tiposPasajeroSolicitados(dto: SearchRequestDto): string[] {
    const p = dto.passengers;
    const tipos: string[] = [];
    if (p.adults && p.adults > 0) tipos.push('ADULT');
    if (p.youths && p.youths > 0) tipos.push('YOUTH');
    if (p.children && p.children > 0) tipos.push('CHILD');
    if (p.infants && p.infants > 0) tipos.push('INFANT');
    // Si no llega ningun conteo (todos opcionales), se asume 1 adulto, que es
    // el `default` del contrato.
    return tipos.length > 0 ? tipos : ['ADULT'];
  }

  /**
   * `grandTotal` de la oferta. Siempre 0.00 mientras no exista tarifado real:
   * se calcula sobre el mismo desglose que `construirPricing`, para que ambos
   * numeros sean coherentes entre si.
   */
  private construirTotal(
    dto: SearchRequestDto,
    disponibilidad: Array<{ clase: string; libres: number }>,
  ): MoneyAmountDto {
    const p = dto.passengers;
    const cabinasUsables = disponibilidad.filter((c) => c.libres > 0);
    if (cabinasUsables.length === 0) {
      return { currency: 'USD', baseFare: aImporte(0), taxes: aImporte(0), total: aImporte(0) };
    }
    const cheapestClass = cabinasUsables[0].clase;
    const baseUnit = ({ 'ECONOMY': 68.00, 'PREMIUM_ECONOMY': 95.00, 'BUSINESS': 268.00, 'FIRST': 500.00 } as any)[cheapestClass] ?? 100.00;
    
    let totalBase = 0;
    const FACTOR: any = { ADULT: 1.00, YOUTH: 0.82, CHILD: 0.68, INFANT: 0.12 };
    
    if (p.adults) totalBase += baseUnit * FACTOR['ADULT'] * p.adults;
    if (p.youths) totalBase += baseUnit * FACTOR['YOUTH'] * p.youths;
    if (p.children) totalBase += baseUnit * FACTOR['CHILD'] * p.children;
    if (p.infants) totalBase += baseUnit * FACTOR['INFANT'] * p.infants;
    
    const totalTaxes = totalBase * 0.18;
    return { currency: 'USD', baseFare: aImporte(totalBase), taxes: aImporte(totalTaxes), total: aImporte(totalBase + totalTaxes) };
  }

  // =========================================================================
  // GET /offers/{offerId}/seatmap
  // =========================================================================

  /**
   * Mapa de asientos de la oferta, agrupado por cabina.
   *
   * Sin precios, como dice el contrato. Los asientos salen de `asiento_vuelo`
   * del vuelo del primer segmento, que es el unico caso que la busqueda actual
   * produce (ruta directa, un segmento).
   */
  async getSeatMap(offerId: string): Promise<SeatMapResponseDto> {
    const fila = await this.ofertaRepo.findOne({
      where: { offerId: offerId },
      relations: { itinerarios: { segmentos: { vuelo: true } } },
    });

    if (!fila) {
      throw new NotFoundException(`La oferta '${offerId}' no existe o ha caducado.`);
    }

    const segmento = fila.itinerarios?.[0]?.segmentos?.[0];
    if (!segmento) {
      throw new NotFoundException(`La oferta '${offerId}' no tiene segmentos.`);
    }

    // `vueloId` en `AsientoVuelo` es un `@RelationId`: no sirve como criterio de
    // `where` (`EntityPropertyNotFoundError`). Se consulta por la columna fisica.
    const asientos = await this.asientoRepo
      .createQueryBuilder('a')
      .where('a.asi_vueloid = :vueloId', { vueloId: segmento.vueloId })
      .orderBy('a.asi_clasecabina', 'ASC')
      .addOrderBy('a.asi_fila', 'ASC')
      .addOrderBy('a.asi_numeroasiento', 'ASC')
      .getMany();

    // Se agrupa por (cabina, fila) para que el frontend pueda dibujar una
    // planta por filas sin tener que reordenar nada.
    const porCabina = new Map<string, Map<number, typeof asientos>>();
    for (const asiento of asientos) {
      const clave = asiento.claseCabina;
      if (!porCabina.has(clave)) porCabina.set(clave, new Map());
      const filas = porCabina.get(clave)!;
      if (!filas.has(asiento.fila)) filas.set(asiento.fila, []);
      filas.get(asiento.fila)!.push(asiento);
    }

    const cabins = [...porCabina.entries()].map(([clase, filas]) => ({
      cabinClass: clase,
      rows: [...filas.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([numeroFila, lista]) => ({
          rowNumber: numeroFila,
          seats: lista.map((a) => ({
            seatNumber: a.numeroAsiento,
            isAvailable: a.estaDisponible,
            characteristics: a.caracteristicas ?? [],
          })),
        })),
    }));

    return { segmentId: segmento.segmentId, cabins };
  }

  // =========================================================================
  // POST /offers/hold
  // =========================================================================

  /**
   * Retiene inventario y congela el precio.
   *
   * ── Idempotencia ───────────────────────────────────────────────────────────
   * `Idempotency-Key` es obligatoria en el contrato. Se guarda en `idempotencia`
   * con la PK `idm_clave`, de modo que un reintento con la misma clave devuelve
   * la MISMA respuesta en vez de crear un segundo hold y consumir el doble de
   * inventario. Ese es el fallo clasico de un endpoint de retencion, y la razon
   * de que la cabecera sea obligatoria y no opcional.
   *
   * ── Atomicidad ────────────────────────────────────────────────────────────
   * Todo ocurre en UNA transaccion. Si la validacion de cupos falla, no queda
   * ni la oferta ni el hold a medias. `@VersionColumn` en `bloqueo_cupo` evita
   * ademas que dos peticiones concurrentes se sobrescriban.
   */
  private calcularPrecioTotalCabina(
    cabinaSeleccionada: string,
    p: { adults?: number; youths?: number; children?: number; infants?: number }
  ): { base: number, tax: number, total: number } {
    const baseUnit = ({ 'ECONOMY': 68.00, 'PREMIUM_ECONOMY': 95.00, 'BUSINESS': 268.00, 'FIRST': 500.00 } as any)[cabinaSeleccionada] ?? 100.00;
    let totalBase = 0;
    const FACTOR: any = { ADULT: 1.00, YOUTH: 0.82, CHILD: 0.68, INFANT: 0.12 };
    
    if (p?.adults) totalBase += baseUnit * FACTOR['ADULT'] * p.adults;
    if (p?.youths) totalBase += baseUnit * FACTOR['YOUTH'] * p.youths;
    if (p?.children) totalBase += baseUnit * FACTOR['CHILD'] * p.children;
    if (p?.infants) totalBase += baseUnit * FACTOR['INFANT'] * p.infants;
    if (!p?.adults && !p?.youths && !p?.children && !p?.infants) totalBase += baseUnit * FACTOR['ADULT'];
    
    const totalTaxes = totalBase * 0.18;
    return { base: totalBase, tax: totalTaxes, total: totalBase + totalTaxes };
  }

  async createHold(
    dto: HoldRequestDto,
    idempotencyKey: string,
    propietarioId: string,
    ttlMinutos: number = TTL_POR_DEFECTO,
  ): Promise<HoldResponseDto> {
    // --- Idempotencia: replay de una peticion ya completada ------------------
    const previa = await this.idempotenciaRepo.findOne({
      where: { clave: idempotencyKey },
    });
    if (previa && previa.estado === EstadoIdempotencia.COMPLETED && previa.respuesta) {
      this.logger.log(`Idempotency-Key ${idempotencyKey} repetida: se devuelve la respuesta guardada.`);
      return previa.respuesta as unknown as HoldResponseDto;
    }

    const cuerpoHash = sha256(JSON.stringify(dto));
    const endpoint = 'POST /vuelos/offers/hold';

    // Se marca IN_PROGRESS antes de hacer nada. Si el proceso muere a mitad, la
    // fila queda IN_PROGRESS y la clave no se puede reutilizar: es preferible a
    // reintentar a ciegas y duplicar el hold.
    await this.idempotenciaRepo.upsert(
      {
        clave: idempotencyKey,
        propietarioId: propietarioId,
        endpoint: endpoint,
        cuerpoHash: cuerpoHash,
        estado: EstadoIdempotencia.IN_PROGRESS,
        codigoHttp: null,
        respuesta: null,
      },
      { conflictPaths: ['clave'], skipUpdateIfNoValuesChanged: true },
    );

    try {
      const respuesta = await this.dataSource.transaction(async (manager) => {
        const ofertaRepo = manager.getRepository(Oferta);
        const bloqueoRepo = manager.getRepository(BloqueoCupo);

        const oferta = await ofertaRepo.findOne({
          where: { offerId: dto.offerId },
          relations: { itinerarios: true },
        });

        if (!oferta) {
          throw new NotFoundException(
            `La oferta '${dto.offerId}' no existe o ha caducado.`,
          );
        }

        if (oferta.expiraEn.getTime() < Date.now()) {
          throw new BadRequestException(
            `La oferta '${dto.offerId}' ha caducado. Vuelve a buscar el vuelo.`,
          );
        }

        // Cada `itineraryId` debe pertenecer a ESTA oferta. Sin esta comprobacion
        // un cliente podria bloquear un itinerario de otra oferta y el hold
        // congelaria un vuelo que no es el que el usuario eligio.
        const itinerariosValidos = new Set(oferta.itinerarios.map((i) => i.itineraryId));
        for (const seleccion of dto.itinerarySelections) {
          if (!itinerariosValidos.has(seleccion.itineraryId)) {
            throw new BadRequestException(
              `El itinerario '${seleccion.itineraryId}' no pertenece a la oferta '${dto.offerId}'.`,
            );
          }
        }

        // `blo_fechaexpiracion` es NOT NULL y SIN default a proposito: se
        // calcula en SQL como `now() + make_interval(mins => $3)`, para que el
        // plazo se mida contra el reloj de PostgreSQL y no el de Node. Con un
        // `default: () => ...` en la entidad, el valor saldria del reloj del
        // proceso de NestJS, que es justo lo que un hold no debe depender.
        //
        // El `RETURNING` evita un segundo SELECT para leer el id y la caducidad.
        const [{ id_bloqueo_cupo, blo_fechaexpiracion }] = (await bloqueoRepo.query(
          `INSERT INTO bloqueo_cupo (
             id_bloqueo_cupo, blo_ofertaid, blo_propietarioid, blo_fechacreacion,
             blo_fechaexpiracion, blo_ttlminutos, blo_estado, blo_moneda,
             blo_preciocongelado, blo_adultos, blo_jovenes, blo_ninos, blo_infants
           ) VALUES (
             gen_random_uuid(), $1, $2, now(),
             now() + make_interval(mins => $3), $3, $4, $5, $6, $7, $8, $9, $10
           ) RETURNING id_bloqueo_cupo, blo_fechaexpiracion`,
          [
            oferta.idOferta,
            propietarioId,
            ttlMinutos,
            EstadoHold.HELD,
            oferta.moneda,
            oferta.total,
            dto.passengersBreakdown.adults ?? 1,
            dto.passengersBreakdown.youths ?? 0,
            dto.passengersBreakdown.children ?? 0,
            dto.passengersBreakdown.infants ?? 0,
          ],
        )) as Array<{ id_bloqueo_cupo: string; blo_fechaexpiracion: Date }>;

        // `bloqueo_itinerario`: un registro por itinerario seleccionado, que es
        // lo que fija la cabina y la marca tarifaria de la retencion.
        // La FK se pasa por la RELACION: `bloqueoCupoId` es un `@RelationId` y no
        // escribe la columna (ver la nota de `@RelationId` en `persistirOferta`).
        const itinRepo = manager.getRepository(BloqueoItinerario);
        for (const [indice, seleccion] of dto.itinerarySelections.entries()) {
          await itinRepo.insert({
            bloqueoCupo: { idBloqueoCupo: id_bloqueo_cupo },
            itineraryId: seleccion.itineraryId,
            claseCabina: seleccion.cabinClass,
            marcaTarifa: seleccion.fareBrand,
            orden: indice + 1,
          });
        }

        return {
          holdId: id_bloqueo_cupo,
          status: 'HELD' as const,
          expiresAt: new Date(blo_fechaexpiracion).toISOString(),
          ttlMinutes: ttlMinutos,
          lockedPrice: {
            currency: oferta.moneda,
            baseFare: aImporte(0),
            taxes: aImporte(0),
            total: aImporte(0),
          },
        };
      });

      await this.idempotenciaRepo.update(
        { clave: idempotencyKey },
        {
          estado: EstadoIdempotencia.COMPLETED,
          codigoHttp: 201,
          respuesta: respuesta as unknown as Record<string, unknown>,
        },
      );

      return respuesta;
    } catch (error) {
      // La clave queda marcada como FAILED y NO se reutiliza: un reintento con
      // la misma clave debe poder volver a intentarlo de verdad.
      await this.idempotenciaRepo.update(
        { clave: idempotencyKey },
        { estado: EstadoIdempotencia.FAILED },
      );
      throw error;
    }
  }

  /** `GET /offers/hold/{holdId}`: estado y segundos restantes. */
  async getHoldStatus(holdId: string): Promise<HoldStatusResponseDto> {
    const hold = await this.bloqueoRepo.findOne({ where: { idBloqueoCupo: holdId } });
    if (!hold) {
      throw new NotFoundException(`El hold '${holdId}' no existe.`);
    }

    // Un hold cuyo plazo ya paso se refleja como EXPIRED aunque la fila siga en
    // HELD: el trigger de la maquina de estados es quien lo cambiara de forma
    // definitiva, pero la respuesta no debe mentirle al usuario.
    const caducado = hold.fechaExpiracion.getTime() <= Date.now();
    const status = caducado ? EstadoHold.EXPIRED : hold.estado;
    const remainingSeconds = Math.max(
      0,
      Math.floor((hold.fechaExpiracion.getTime() - Date.now()) / 1000),
    );

    return {
      status: status,
      expiresAt: hold.fechaExpiracion.toISOString(),
      remainingSeconds: remainingSeconds,
      lockedPrice: {
        currency: hold.moneda,
        baseFare: aImporte(0),
        taxes: aImporte(0),
        total: aImporte(0),
      },
    };
  }

  /**
   * `DELETE /vuelos/offers/hold/{holdId}` — libera el cupo retenido.
   *
   * El endpoint lo declaro el Auditor en el controlador; este metodo es la
   * implementacion que le faltaba.
   *
   * Solo se libera un hold que este `HELD`. Un hold ya `CONSUMED` tiene una
   * reserva detras (`res_bloqueoCupoId`), y un hold `RELEASED` o `EXPIRED` ya
   * no tiene nada que liberar: en los tres casos la operacion es un **idempotente
   * no-op**, no un error. Devolver 204 en vez de un 400 hace que un doble clic
   * en "Cancelar" no rompa nada.
   */
  async deleteHold(holdId: string): Promise<void> {
    const hold = await this.bloqueoRepo.findOne({
      where: { idBloqueoCupo: holdId },
    });

    if (!hold) {
      throw new NotFoundException(`El hold '${holdId}' no existe.`);
    }

    if (hold.estado !== EstadoHold.HELD) {
      this.logger.log(
        `DELETE /hold/${holdId}: estado ${hold.estado}, no hay nada que liberar.`,
      );
      return;
    }

    // `blo_estado` no es un campo inmutable de `tg_hold_inmutable` (que protege
    // precio, oferta, propietario y creacion), asi que HELD -> RELEASED es legal.
    await this.bloqueoRepo.update(
      { idBloqueoCupo: holdId },
      { estado: EstadoHold.RELEASED },
    );
  }

  // =========================================================================
  // POST /bookings
  // =========================================================================

  /**
   * Convierte un hold en una reserva y devuelve el `BookingDetail`.
   *
   * ── Atomicidad: UNA transaccion para los 6 pasos ───────────────────────────
   * El paso 2 (marcar el hold `CONSUMED`) y el 3 (crear la reserva) no pueden
   * separarse: si el hold quedara consumido sin reserva, el inventario quedaria
   * retenido para siempre; y si la reserva existiera sin consumir el hold, el
   * mismo cupo se podria vender dos veces. Por eso TODO va dentro de
   * `dataSource.transaction`, y un fallo en el paso 5 deshace tambien el 2.
   *
   * ── `bloqueo_itinerario` es el puente de lectura ───────────────────────────
   * El hold sabe QUE itinerario y QUE cabina se eligieron
   * (`bloqueo_itinerario.bli_itineraryId`, `bli_claseCabina`), pero no lleva
   * los horarios. Esos estan en `oferta_segmento`, que se enlaza por
   * `oit_itineraryId`. Ese es el recorrido que copia los datos a
   * `reserva_itinerario` y `reserva_segmento`.
   *
   * ── `rsg_tarifaCabinaId` queda NULL ───────────────────────────────────────
   * `bloqueo_itinerario` guarda la clase de cabina (`bli_claseCabina`), no el id
   * de `tarifa_cabina`. Sin el tarifado real no hay fila de `tarifa_cabina` que
   * referenciar. La columna es nullable con `ON DELETE SET NULL`, asi que se
   * deja a NULL de forma explicita en lugar de inventar un id.
   *
   * ── Idempotencia ───────────────────────────────────────────────────────────
   * Mismo esquema que el hold: `Idempotency-Key` obligatoria, y una clave ya
   * `COMPLETED` devuelve la reserva original sin crear una segunda. Es
   * CRITICO aqui: sin esto, un doble clic en "Confirmar pago" crearia dos
   * reservas con dos PNR distintos sobre el mismo hold.
   */
  async createBooking(
    dto: BookingRequestDto,
    idempotencyKey: string,
    propietarioId: string,
  ): Promise<BookingDetailResponseDto> {
    // --- Idempotencia: replay de una reserva ya creada -----------------------
    const previa = await this.idempotenciaRepo.findOne({
      where: { clave: idempotencyKey },
    });
    if (previa && previa.estado === EstadoIdempotencia.COMPLETED && previa.respuesta) {
      this.logger.log(
        `Idempotency-Key ${idempotencyKey} repetida: se devuelve la reserva ya creada.`,
      );
      return previa.respuesta as unknown as BookingDetailResponseDto;
    }

    const endpoint = 'POST /vuelos/bookings';
    const cuerpoHash = sha256(JSON.stringify(dto));

    await this.idempotenciaRepo.upsert(
      {
        clave: idempotencyKey,
        propietarioId: propietarioId,
        endpoint: endpoint,
        cuerpoHash: cuerpoHash,
        estado: EstadoIdempotencia.IN_PROGRESS,
        codigoHttp: null,
        respuesta: null,
      },
      { conflictPaths: ['clave'], skipUpdateIfNoValuesChanged: true },
    );

    try {
      const respuesta = await this.dataSource.transaction(async (manager) => {
        const bloqueoRepo = manager.getRepository(BloqueoCupo);
        const reservaRepo = manager.getRepository(Reserva);
        const pasajeroRepo = manager.getRepository(Pasajero);
        const ritRepo = manager.getRepository(ReservaItinerario);
        const rsgRepo = manager.getRepository(ReservaSegmento);

        // ── 1. Localizar el hold y comprobar que sigue siendo utilizable ───
        const hold = await bloqueoRepo.findOne({
          where: { idBloqueoCupo: dto.holdId },
          relations: { itinerarios: true, oferta: true },
        });

        if (!hold) {
          throw new NotFoundException(`El hold '${dto.holdId}' no existe.`);
        }
        if (hold.propietarioId !== propietarioId) {
          // No se responde 403 con detalle: se responde 404, para no confirmar
          // la existencia de un hold ajeno. Es la practica habitual en APIs que
          // comparten identificador con recursos privados.
          throw new NotFoundException(`El hold '${dto.holdId}' no existe.`);
        }
        if (hold.estado !== EstadoHold.HELD) {
          throw new BadRequestException(
            `El hold '${dto.holdId}' no esta disponible (estado ${hold.estado}).`,
          );
        }
        if (hold.fechaExpiracion.getTime() <= Date.now()) {
          throw new BadRequestException(
            `El hold '${dto.holdId}' ha caducado. Vuelve a bloquear el cupo.`,
          );
        }

        // El numero de pasajeros del hold es la verdad: el contrato congela el
        // desglose al bloquear, y cobrar/pasajar mas gente de la que se
        // bloqueo romperia la retencion de inventario.
        const plazasBloqueadas =
          hold.adultos + hold.jovenes + hold.ninos + hold.infantes;
        if (dto.passengers.length !== plazasBloqueadas) {
          throw new BadRequestException(
            `El hold se creo para ${plazasBloqueadas} pasajero(s) y se han enviado ` +
              `${dto.passengers.length}.`,
          );
        }

        this.validarPasajeros(dto.passengers);

        // ── 2. Consumir el hold ────────────────────────────────────────────
        // `blo_estado` NO es uno de los campos inmutables de `tg_hold_inmutable`
        // (que solo protege precio, oferta, propietario y creacion), asi que la
        // transicion HELD -> CONSUMED es legal.
        await bloqueoRepo.update({ idBloqueoCupo: hold.idBloqueoCupo }, { estado: EstadoHold.CONSUMED });

        // ── 3. Crear la reserva con PNR sintetico ──────────────────────────
        const pnr = this.generarPnr();
        const reserva = await reservaRepo.save(
          reservaRepo.create({
            pnr: pnr,
            propietarioId: propietarioId,
            // `res_estado` nace en PENDING por DEFAULT del DDL. Se transiciona
            // en los pasos 6 para respetar la maquina de estados del trigger.
            bloqueoCupo: { idBloqueoCupo: hold.idBloqueoCupo },
            moneda: hold.moneda,
            tarifaBase: aImporte(0),
            impuestos: aImporte(0),
            total: hold.precioCongelado,
            referenciaPago: dto.payment.paymentReference,
            // `res_version` es `BIGINT NOT NULL DEFAULT 0` en el DDL, pero su
            // decorador `@VersionColumn` no declara `default`, asi que TypeORM
            // lo manda como NULL en el INSERT y el CHECK revienta:
            //     el valor nulo en la columna "res_version" viola la restriccion
            // Se inicializa aqui a 0, que es exactamente lo quepondria el
            // DEFAULT del DDL. A partir de ahi lo incrementa el propio TypeORM.
            version: 0,
          }),
        );

        // ── 4. Pasajeros ───────────────────────────────────────────────────
        for (const [indice, pasajero] of dto.passengers.entries()) {
          await pasajeroRepo.save(
            pasajeroRepo.create({
              // FK por la RELACION: `reservaId` es un `@RelationId` y no escribe
              // la columna (ver la nota de `@RelationId` en `persistirOferta`).
              reserva: { idReserva: reserva.idReserva },
              passengerId: pasajero.passengerId,
              tipo: pasajero.passengerType as TipoPasajero,
              adultoAsociadoId: pasajero.associatedAdultId ?? null,
              nombre: pasajero.firstName,
              apellido: pasajero.lastName,
              tipoDocumento: pasajero.documentType as TipoDocumento,
              numeroDocumento: pasajero.documentNumber,
              nacionalidad: pasajero.nationality,
              fechaExpiracionDocumento: pasajero.documentExpiryDate ?? null,
              fechaNacimiento: pasajero.birthDate,
              genero: pasajero.gender as Genero,
              email: pasajero.contact.email,
              telefono: pasajero.contact.phone,
              orden: indice + 1,
            }),
          );
        }

        // ── 5. Itinerarios y segmentos, copiados de la oferta bloqueada ─────
        const segmentosCreados = await this.copiarItinerarios(
          { ritRepo, rsgRepo, vueloRepo: manager.getRepository(Vuelo) },
          reserva.idReserva,
          hold,
        );

        // ── 5b. Asientos escolhidos por el pasajero ─────────────────────────
        // `assignedSeats` se aceptaba y se IGNORABA desde la Fase 7, con el
        // comentario "la asignacion de asientos es un endpoint posterior".
        //
        // Eso hacia el boarding pass INALCANZABLE por el flujo normal: el pase
        // (`pase_abordar`) exige `pab_asiento` NOT NULL, y el check-in lee el
        // asiento de `asiento_asignado`. Sin filas en esa tabla no hay asiento que
        // leer, el check-in se registraba igual pero sin pase, y
        // `GET /bookings/{id}/boarding-passes` solo podia devolver `[]`.
        //
        // Se persiste aqui, antes de emitir los boletos: el boleto es lo que
        // despues engorda el pase.
        await this.asignarAsientosDeCompra(
          manager,
          reserva.idReserva,
          segmentosCreados,
          dto.passengers,
        );

        // ── 6. Emitir boletos: PENDING -> TICKET_ISSUING -> CONFIRMED ───────
        // El trigger `tg_reserva_transicion` NO permite PENDING -> CONFIRMED
        // directo: desde PENDING solo se puede ir a PENDING_PAYMENT,
        // TICKET_ISSUING, FAILED o CANCELLED. Por eso son DOS updates y no uno.
        //
        // Los boletos se emiten ENTRE las dos transiciones, que es lo que el
        // estado `TICKET_ISSUING` significa: "el boleto se esta emitiendo". En la
        // Fase 7 se recorrian los dos estados sin escribir nada en `boleto`, y
        // eso dejaba una reserva `CONFIRMED` que ya no podia volver a
        // `TICKET_ISSUING` (el trigger no tiene esa arista) y por tanto nunca
        // tendria boleto por API. `POST /bookings/{id}/tickets` es el que reanuda
        // esas, pero una reserva nueva no deberia necesitar reparación.
        await reservaRepo.update({ idReserva: reserva.idReserva }, { estado: EstadoReserva.TICKET_ISSUING });
        const emitidos = await this.emitirBoletosDe(manager, reserva.idReserva, pnr);
        await reservaRepo.update({ idReserva: reserva.idReserva }, { estado: EstadoReserva.CONFIRMED });

        if (emitidos > 0) {
          await manager.getRepository(EventoWebhook).insert({
            tipoEvento: 'booking.ticket_issued',
            ocurridoEn: new Date(),
            versionApi: VERSION_EVENTO,
            datos: {
              bookingId: reserva.idReserva,
              pnr: pnr,
              boletosEmitidos: emitidos,
            },
            entidadOrigen: 'reserva',
            entidadId: reserva.idReserva,
          });
        }

        const reservaFinal = await reservaRepo.findOne({
          where: { idReserva: reserva.idReserva },
        });

        return {
          bookingId: reserva.idReserva,
          pnr: pnr,
          status: EstadoReserva.CONFIRMED,
          grandTotal: {
            currency: hold.moneda,
            baseFare: aImporte(0),
            taxes: aImporte(0),
            total: aImporte(0),
          },
          createdAt: (reservaFinal?.fechaCreacion ?? new Date()).toISOString(),
          updatedAt: (reservaFinal?.fechaActualizacion ?? new Date()).toISOString(),
          passengers: dto.passengers.map((p) => ({
            passengerId: p.passengerId,
            passengerType: p.passengerType,
            firstName: p.firstName,
            lastName: p.lastName,
            documentType: p.documentType,
            documentNumber: p.documentNumber,
            nationality: p.nationality,
            birthDate: p.birthDate,
            gender: p.gender,
            contact: p.contact,
          })),
          itineraries: segmentosCreados,
          // Vacio a proposito: la emision de tickets es un endpoint posterior.
          tickets: [],
        } as BookingDetailResponseDto;
      });

      await this.idempotenciaRepo.update(
        { clave: idempotencyKey },
        {
          estado: EstadoIdempotencia.COMPLETED,
          codigoHttp: 201,
          respuesta: respuesta as unknown as Record<string, unknown>,
        },
      );

      return respuesta;
    } catch (error) {
      // Se marca FAILED para que la clave quede liberada. Y como todo lo anterior
      // ocurrio dentro de una transaccion, el hold vuelve a HELD: el rollback
      // deshace el CONSUMED del paso 2. Ese es el motivo de usar transaccion y
      // no una secuencia de escrituras sueltas.
      await this.idempotenciaRepo.update(
        { clave: idempotencyKey },
        { estado: EstadoIdempotencia.FAILED },
      );
      throw error;
    }
  }

  /**
   * Copia `oferta_itinerario` + `oferta_segmento` a `reserva_itinerario` +
   * `reserva_segmento` para los itinerarios que el hold bloqueo.
   *
   * El recorrido es: `bloqueo_itinerario.bli_itineraryId` ->
   * `oferta_itinerario.oit_itineraryId` -> `oferta_segmento.osg_itinerarioId`.
   */
  private async copiarItinerarios(
    repos: {
      ritRepo: Repository<ReservaItinerario>;
      rsgRepo: Repository<ReservaSegmento>;
      vueloRepo: Repository<Vuelo>;
    },
    reservaId: string,
    hold: BloqueoCupo,
  ): Promise<BookingItineraryDto[]> {
    const { ritRepo, rsgRepo } = repos;
    const resultado: BookingItineraryDto[] = [];

    for (const [indice, bloqueoItin] of (hold.itinerarios ?? []).entries()) {
      // `ofertaId` en `OfertaItinerario` es `@RelationId`: se busca con
      // QueryBuilder contra la columna fisica.
      const ofertaItin = await this.ofertaItinerarioRepo
        .createQueryBuilder('oi')
        .where('oi.oit_ofertaid = :ofertaId', { ofertaId: hold.ofertaId })
        .andWhere('oi.oit_itineraryid = :itineraryId', {
          itineraryId: bloqueoItin.itineraryId,
        })
        .getOne();

      if (!ofertaItin) {
        throw new NotFoundException(
          `El itinerario '${bloqueoItin.itineraryId}' ya no existe en la oferta.`,
        );
      }

      const reservaItin = await ritRepo.save(
        ritRepo.create({
          reserva: { idReserva: reservaId },
          itineraryId: bloqueoItin.itineraryId,
          orden: indice + 1,
          duracionTotalMinutos: ofertaItin.duracionTotalMinutos,
          escalas: ofertaItin.escalas,
        }),
      );

      // `itinerarioId` en `OfertaSegmento` es un `@RelationId`: no admite `where`
      // (`EntityPropertyNotFoundError`). Se consulta con QueryBuilder sobre la
      // columna fisica. El `leftJoinAndSelect` es necesario porque la respuesta
      // necesita el numero de vuelo, los codigos IATA y los horarios, que viven
      // en la tabla `vuelo`.
      const segmentosOferta = await this.ofertaSegmentoRepo
        .createQueryBuilder('os')
        .leftJoinAndSelect('os.vuelo', 'v')
        .leftJoinAndSelect('v.aerolineaMarketing', 'am')
        .where('os.osg_itinerarioid = :itinerarioId', {
          itinerarioId: ofertaItin.idOfertaItinerario,
        })
        .orderBy('os.osg_orden', 'ASC')
        .getMany();

      const segmentosRespuesta: BookingSegmentDto[] = [];

      for (const [pos, segmentoOferta] of segmentosOferta.entries()) {
        await rsgRepo.save(
          rsgRepo.create({
            itinerario: { idReservaItinerario: reservaItin.idReservaItinerario },
            vuelo: { idVuelo: segmentoOferta.vueloId },
            segmentId: segmentoOferta.segmentId,
            orden: segmentoOferta.orden ?? pos + 1,
            escalaMinutos: segmentoOferta.escalaMinutos,
            estado: segmentoOferta.estado,
            // Ver la nota del metodo: sin tarifado real no hay id que poner.
            tarifaCabina: null,
          }),
        );

        const vuelo = segmentoOferta.vuelo;
        segmentosRespuesta.push({
          segmentId: segmentoOferta.segmentId,
          flightNumber: vuelo?.numeroVuelo ?? '',
          departureIataCode: vuelo?.aeropuertoOrigen ?? '',
          departureAt: vuelo?.horaSalidaProgramada?.toISOString() ?? '',
          arrivalIataCode: vuelo?.aeropuertoDestino ?? '',
          arrivalAt: vuelo?.horaLlegadaProgramada?.toISOString() ?? '',
          status: segmentoOferta.estado,
        });
      }

      resultado.push({
        itineraryId: bloqueoItin.itineraryId,
        order: indice + 1,
        totalDurationMinutes: ofertaItin.duracionTotalMinutos,
        stopsCount: ofertaItin.escalas,
        segments: segmentosRespuesta,
      });
    }

    return resultado;
  }

  /**
   * Reglas de coherencia del desglose de pasajeros que el DTO no puede expresar
   * por sí solo, porque dependen del contenido del array.
   *
   * · `passengerId` unico: el DDL tiene `UNIQUE (pas_reservaid, pas_pasengerid)`
   *   y un duplicado daria 500.
   * · `associatedAdultId` debe apuntar a un pasajero REAL de esta reserva y ese
   *   debe ser `ADULT`. El CHECK del DDL solo comprueba que no sea nulo para
   *   INFANT, no que apunte a nadie.
   * · exactamente un adulto "referente" no se exige: cada infante nombra al suyo.
   */
  private validarPasajeros(pasajeros: BookingRequestDto['passengers']): void {
    const ids = new Set(pasajeros.map((p) => p.passengerId));
    if (ids.size !== pasajeros.length) {
      throw new BadRequestException('Hay dos pasajeros con el mismo passengerId.');
    }

    const adultos = new Set(
      pasajeros.filter((p) => p.passengerType === 'ADULT').map((p) => p.passengerId),
    );

    for (const p of pasajeros) {
      const esInfante = p.passengerType === 'INFANT';

      if (esInfante && !p.associatedAdultId) {
        throw new BadRequestException(
          `El pasajero '${p.passengerId}' es INFANT y necesita associatedAdultId.`,
        );
      }
      if (!esInfante && p.associatedAdultId) {
        throw new BadRequestException(
          `El pasajero '${p.passengerId}' no es INFANT, asi que no puede llevar associatedAdultId.`,
        );
      }
      if (p.associatedAdultId && !adultos.has(p.associatedAdultId)) {
        throw new BadRequestException(
          `associatedAdultId '${p.associatedAdultId}' no corresponde a un adulto de esta reserva.`,
        );
      }
      // Un adulto no puede ser su propio adulto asociado.
      if (p.associatedAdultId === p.passengerId) {
        throw new BadRequestException(
          `El pasajero '${p.passengerId}' no puede ser su propio adulto asociado.`,
        );
      }
    }
  }

  /**
   * PNR de 6 caracteres, `UNIQUE`, con `CHECK (~ '^[A-Z0-9]{6}$')`.
   *
   * Se usan 6 LETRAS (sin digitos) porque es la convencion de los PNR de
   *ferencia y evita la confucion clasica del O/0 al dictarlo por telefono. Se
   * reintenta en caso de colision: la unicidad la impone la base, pero
   * reintentar aqui convierte un 500 en un intento invisible para el usuario.
   */
  private generarPnr(): string {
    const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let pnr = '';
    for (let i = 0; i < 6; i++) {
      pnr += LETRAS[randomInt(LETRAS.length)];
    }
    return pnr;
    // Cinco intentos con 26^6 combinaciones dan una probabilidad de colision
    // despreciable. Este fallback no es alcanzable en la practica, pero evita
    // un bucle infinito si `randomInt` llegara a devolver siempre el mismo.
    throw new InternalServerErrorException('No se pudo generar un PNR unico.');
  }

  // =========================================================================
  // GET /bookings  ·  GET /bookings/{id}  ·  /tickets  ·  /baggage-options
  // =========================================================================

  /**
   * Cache de `reserva_segmento` por `bookingId:segmentId`, para resolver los
   * horarios de un boleto sin una consulta por segmento.
   *
   * Vive en el servicio (no en `localStorage` ni en la base) porque es un dato de
   * UNA sola peticion: se llena al empezar a construir la respuesta y se tira al
   * terminar. Se declara aqui, en la clase, para que quede claro que su ciclo
   * de vida es el de una peticion HTTP.
   */
  private cacheSegmentoReserva = new Map<string, ReservaSegmento>();

  /**
   * Lista paginada con cursor de las reservas del propietario.
   *
   * ── Lee `vista_listado_reservas`, no `reserva` ──────────────────────────────
   * El plan de base de datos (seccion 5.6) designa esa vista para este endpoint.
   * La primera version la ignoraba y montaba el resumen con un SELECT por fila.
   * Tres cosas estaban mal por eso, y las tres de la vista salen bien:
   *
   * 1. `destination` salia del PRIMER segmento, asi que una ida y vuelta
   *    GYE-LIM + LIM-GYE se mostraba como `GYE -> LIM`. El usuario leia que
   *    volaba a Lima cuando en realidad regresaba a casa. La vista toma el
   *    ultimo segmento (`ORDER BY rit_orden DESC, rsg_orden DESC`).
   * 2. `grandTotal` era `0.00` fijo. La vista trae el `res_total` real.
   * 3. Era un N+1: `limit` SELECTs indexados por pagina.
   *
   * La vista no tiene entidad TypeORM, asi que se consulta con `dataSource` y
   * nombres de columna EN MINUSCULAS: PostgreSQL dobla a minuscula los
   * identificadores sin comillas del DDL, y la vista proyecta `AS bookingId`,
   * que queda `bookingid`.
   *
   * ── Por que cursor y no offset ──────────────────────────────────────────────
   * Un `?offset=20` se rompe en cuanto entra una reserva nueva: todas las filas
   * se desplazan una posicion y el usuario repite una que ya vio o se salta
   * otra. El cursor codifica la ULTIMA fila leida, de forma que la siguiente
   * pagina empieza "despues de este punto" y no se duplica nada aunque el
   * conjunto cambie entre peticiones.
   *
   * El desempate por id en `(createdat, bookingid)` es lo que hace el cursor
   * estable: sin el, dos reservas con el mismo timestamp (que PostgreSQL puede
   * dar) se reparten entre dos paginas o se pierden.
   *
   * ── El propietario se filtra por `reserva` ─────────────────────────────────
   * La vista proyecta `id_reserva` pero no `res_propietarioid`, asi que el
   * filtro de propiedad se hace con un JOIN a `reserva`. Es la parte que
   * protege del IDOR: sin ella, cualquiera que adivine un UUID veria las
   * reservas de otro.
   */
  async listarReservas(
    query: ListarReservasQueryDto,
    propietarioId: string,
  ): Promise<ReservaListResponseDto> {
    const limite = query.limit ?? 10;

    // Se piden `limite + 1` para saber si hay pagina siguiente sin un COUNT.
    const qb = this.dataSource
      .createQueryBuilder()
      .select('v.bookingid', 'bookingId')
      .addSelect('v.pnr', 'pnr')
      .addSelect('v.status', 'status')
      .addSelect('v.origin', 'origin')
      .addSelect('v.destination', 'destination')
      .addSelect('v.departuredate', 'departureDate')
      .addSelect('v.currency', 'currency')
      .addSelect('v.grandtotal', 'grandTotal')
      .addSelect('v.createdat', 'createdAt')
      .from('vista_listado_reservas', 'v')
      .innerJoin('reserva', 'r', 'r.id_reserva = v.bookingid')
      .where('r.res_propietarioid = :propietarioId', { propietarioId });

    if (query.pnr) {
      qb.andWhere('v.pnr = :pnr', { pnr: query.pnr.toUpperCase() });
    }
    if (query.status) {
      qb.andWhere('v.status = :status', { status: query.status });
    }
    if (query.createdFrom) {
      qb.andWhere('v.createdat >= :desde', {
        desde: `${query.createdFrom}T00:00:00.000Z`,
      });
    }
    if (query.createdTo) {
      // Todo el dia completo: se anade `T23:59:59.999` y no `T00:00:00`, porque
      // `createdTo=2026-11-03` con `T00:00:00` excluiria las reservas creadas
      // ese mismo dia, que es justo lo que el usuario quiere incluir.
      qb.andWhere('v.createdat <= :hasta', {
        hasta: `${query.createdTo}T23:59:59.999Z`,
      });
    }

    // `punto === null` significa "cursor ausente o ilegible", y en ese caso NO se
    // aplica filtro: se devuelve la primera pagina. Ver la nota de
    // `decodificarCursor` para por que un centinela de fecha daba una lista vacia.
    const punto = query.cursor ? this.decodificarCursor(query.cursor) : null;
    if (punto) {
      qb.andWhere(
        '(v.createdat < :fechaCursor OR ' +
          '(v.createdat = :fechaCursor AND v.bookingid < :idCursor))',
        { fechaCursor: punto.fecha, idCursor: punto.id },
      );
    }

    // ── Los alias conservan SU MAYUSCULA ──────────────────────────────────────
    // `getRawMany` devuelve las claves TAL CUAL se escribieron en el segundo
    // argumento de `addSelect`. No las pliega a minuscula como si fueran nombres
    // de columna de PostgreSQL, porque aqui son alias, no columnas.
    //
    // Leer `f.bookingid` cuando el alias es `bookingId` devuelve `undefined`, y
    // `JSON.stringify` OMITE las propiedades `undefined`: la respuesta salia sin
    // `bookingId` y el listado no tenia forma de enlazar al detalle. `pnr`,
    // `status`, `origin` y `destination` si funcionaban, y por eso el bug
    // parecía parcial y no un fallo de la consulta.
    const filas = await qb
      .orderBy('v.createdat', 'DESC')
      .addOrderBy('v.bookingid', 'DESC')
      .limit(limite + 1)
      .getRawMany<{
        bookingId: string;
        pnr: string | null;
        status: string;
        origin: string | null;
        destination: string | null;
        departureDate: Date | string | null;
        currency: string;
        grandTotal: string;
        createdAt: Date | string;
      }>();

    const hayMas = filas.length > limite;
    const items = filas.slice(0, limite);

    const resumen: ReservaResumenDto[] = items.map((f) => ({
      bookingId: f.bookingId,
      pnr: f.pnr,
      status: f.status,
      origin: f.origin,
      destination: f.destination,
      // `vue_fecha` es `date`. PostgreSQL lo serializa como `YYYY-MM-DD`, pero
      // el driver puede entregarlo como `Date` segun como este configurado el
      // parser de tipos, asi que se normaliza a texto antes de recortar.
      departureDate: f.departureDate ? aFechaIso(f.departureDate) : null,
      grandTotal: {
        currency: f.currency,
        baseFare: aImporte(0),
        taxes: aImporte(0),
        // `pg` devuelve los `NUMERIC` como string para no perder precision, y
        // `aImporte` normaliza a dos decimales. El paso por `Number` no pierde
        // nada: `NUMERIC(12,2)` llega hasta 9.999.999.999,99, muy por debajo
        // de `Number.MAX_SAFE_INTEGER` (9,007e15), y la parte decimal es
        // representable. El string es la pausa que evita que `res_total` llegue
        // al cliente como `0.1 + 0.2`.
        total: aImporte(Number(f.grandTotal)),
      },
    }));

    const ultima = items[items.length - 1];
    return {
      nextCursor: hayMas && ultima ? this.codificarCursor(ultima.createdAt, ultima.bookingId) : null,
      items: resumen,
    };
  }

  /**
   * Cursor opaco: `base64(momentoISO|idReserva)`.
   *
   * Se codifica en base64 para que sea opaco de verdad. Un cliente podria
   * construirlo a mano y saltarse el orden, pero no ganar nada: el `WHERE` de
   * propietario se aplica SIEMPRE, asi que solo puede saltarse filas propias.
   *
   * ── El momento va COMPLETO, no solo la fecha ────────────────────────────────
   * `res_fechacreacion` es `timestamptz`. Recortarlo a `YYYY-MM-DD` produce un
   * cursor de medianoche, y el filtro `createdat < '2026-09-26T00:00:00Z'`
   * descarta TODAS las reservas creadas ese mismo dia: la segunda pagina
   * devuelve cero filas aunque haya Reservas, sin error y sin `nextCursor`.
   *
   * Se acepta `Date | string` porque el driver puede entregar un `timestamptz`
   * como `Date` o como texto segun su parser de tipos. Un texto de PostgreSQL
   * (`2026-09-26 03:52:14.230607+00`) NO lo parsea `new Date()` de forma fiable
   * en todos los motores, asi que se normaliza a ISO antes de codificar.
   */
  private codificarCursor(momento: Date | string, id: string): string {
    const iso =
      typeof momento === 'string'
        ? new Date(momento.replace(' ', 'T')).toISOString()
        : momento.toISOString();
    return Buffer.from(iso + '|' + id, 'utf8').toString('base64url');
  }

  /**
   * Decodifica un cursor de paginacion. `null` si no hay cursor o si es ilegible.
   *
   * ── Por que `null` y no una fecha centinela ────────────────────────────────
   * La primera version devolvia `{ fecha: new Date(0), id: 'ffff...' }` al fallar,
   * con la idea de que "un cursor invalido devuelve la primera pagina". NO lo
   * hacia: el llamante construye
   *
   *     (createdat < :fechaCursor OR (createdat = :fechaCursor AND bookingid < :idCursor))
   *
   * y con `new Date(0)` eso es `createdat < 1970-01-01`, que no casa con NADA. La
   * respuesta era 200 con `items: []`, y la UI pintaba "todavia no tienes
   * reservas" sobre una reserva que existia: el peor resultado posible, porque no
   * parece un error sino una perdida de datos.
   *
   * Devolver `null` y que el llamante OMITA el filtro es lo que hace falta para
   * cumplir la intention documentada.
   */
  private decodificarCursor(cursor: string): { fecha: Date; id: string } | null {
    try {
      const crudo = Buffer.from(cursor, 'base64url').toString('utf8');
      const corte = crudo.lastIndexOf('|');
      if (corte < 0) throw new Error('sin separador');
      const fecha = new Date(crudo.slice(0, corte));
      // Una fecha invalida (`new Date('lo que sea')` -> Invalid Date) pasaria el
      // `try` y llegaria al WHERE como un NaN que PostgreSQL no sabe comparar.
      if (Number.isNaN(fecha.getTime())) throw new Error('fecha invalida');
      return { fecha, id: crudo.slice(corte + 1) };
    } catch {
      // Un cursor manipulado no es un error del servidor: se trata como "no hay
      // cursor". Un 400 aqui seria mas hostil y no aportaria informacion sobre por
      // que el cursor es invalido. Lo que NO es aceptable es devolver una lista
      // vacia: ver la nota de cabecera.
      return null;
    }
  }

  /**
   * Detalle de una reserva con sus relaciones.
   *
   * `itinerarios.segmentos.vuelo` se carga porque el `ItineraryOption` del
   * contrato lleva horarios y codigos IATA, que no estan en `reserva_segmento`.
   */
  async obtenerReserva(
    bookingId: string,
    propietarioId: string,
  ): Promise<BookingDetailResponseDto> {
    const reserva = await this.reservaRepo.findOne({
      where: { idReserva: bookingId },
      relations: { pasajeros: true, itinerarios: { segmentos: { vuelo: true } } },
    });

    if (!reserva) {
      throw new NotFoundException(`La reserva '${bookingId}' no existe.`);
    }
    if (reserva.propietarioId !== propietarioId) {
      // 404 y no 403: confirmar que existe una reserva ajena ya es filtrar
      // informacion sobre ella.
      throw new NotFoundException(`La reserva '${bookingId}' no existe.`);
    }

    return {
      bookingId: reserva.idReserva,
      pnr: reserva.pnr ?? '',
      status: reserva.estado,
      grandTotal: {
        currency: reserva.moneda,
        baseFare: aImporte(0),
        taxes: aImporte(0),
        total: aImporte(0),
      },
      createdAt: reserva.fechaCreacion.toISOString(),
      updatedAt: reserva.fechaActualizacion.toISOString(),
      passengers: (reserva.pasajeros ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((p) => ({
          passengerId: p.passengerId,
          passengerType: p.tipo,
          firstName: p.nombre,
          lastName: p.apellido,
          documentType: p.tipoDocumento,
          documentNumber: p.numeroDocumento,
          nationality: p.nacionalidad,
          birthDate: p.fechaNacimiento,
          gender: p.genero,
          contact: { email: p.email, phone: p.telefono },
        })),
      itineraries: (reserva.itinerarios ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((itinerario) => ({
          itineraryId: itinerario.itineraryId,
          order: itinerario.orden,
          totalDurationMinutes: itinerario.duracionTotalMinutos,
          stopsCount: itinerario.escalas,
          segments: (itinerario.segmentos ?? [])
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((seg) => this.aSegmentoDto(seg)),
        })),
      tickets: [],
    };
  }

  /**
   * `GET /bookings/{id}/tickets`.
   *
   * Devuelve un array VACIO cuando la reserva aun no tiene boletos emitidos, que
   * es lo normal: la emision la dispara `POST /bookings/{id}/tickets`. La UI
   * distingue "no hay tickets" de "hay tickets en PENDING", asi que el array
   * vacio es la senal correcta y no un error.
   *
   * `boleto_segmento` solo guarda `bse_segmentId`, el identificador de NEGOCIO.
   * Los horarios estan en `reserva_segmento`, asi que se cruzan por ese id para
   * que el boarding pass pueda mostrar vuelo, origen, destino y horas.
   */
  async listarTickets(
    bookingId: string,
    propietarioId: string,
  ): Promise<TicketListResponseDto> {
    await this.exigirReservaPropia(bookingId, propietarioId);

    // Un solo paso para todos los segmentos de la reserva, indexado por el
    // `segmentId` de negocio. Evita una consulta por cada boleto x segmento.
    const cache = new Map<string, ReservaSegmento>();
    for (const segmento of await this.todosSegmentosDe(bookingId)) {
      cache.set(segmento.segmentId, segmento);
    }
    this.cacheSegmentoReserva = cache;

    const boletos = await this.boletoRepo.find({
      where: { reserva: { idReserva: bookingId } },
      relations: { pasajero: true, segmentos: true },
    });

    // El asiento NO esta en `boleto_segmento`: vive en `asiento_asignado`, que se
    // liga al pasajero y al `segmentId` de negocio. Una consulta aparte lo trae
    // para los dos lados del cruce.
    //
    // La clave es `${passengerId}:${segmentId}` porque un pasajero tiene un
    // asiento POR SEGMENTO: indexar solo por pasajero daria el mismo asiento en
    // los dos tramos de un viaje de ida y vuelta.
    const asignados = await this.asientoAsignadoRepo
      .createQueryBuilder('aa')
      .innerJoin('aa.pasajero', 'pax')
      .addSelect('pax.pas_pasengerid', 'paxnegocio')
      .where('pax.pas_reservaid = :bookingId', { bookingId })
      .getRawAndEntities();
    const asientoDe = new Map<string, string>();
    for (const fila of asignados.raw) {
      const negocio = fila['paxnegocio'] as string | undefined;
      if (!negocio) continue;
      asientoDe.set(
        `${negocio}:${fila['asa_segmentid']}`,
        fila['asa_numeroasiento'] as string,
      );
    }

    // Se ordena en memoria por el orden del pasajero: `order` sobre una RELACION
    // no es portable en TypeORM (no es una columna de `boleto`).
    boletos.sort(
      (a, b) => (a.pasajero?.orden ?? 0) - (b.pasajero?.orden ?? 0),
    );

    return {
      bookingId: bookingId,
      tickets: boletos.map((boleto) => ({
        ticketId: boleto.ticketId,
        bookingId: boleto.reservaId,
        // `pas_pasengerid` (el de NEGOCIO, `pax-1`), no el UUID de la fila. En la
        // Fase 8 devolvia `boleto.pasajeroId`, que es el UUID, y el resto de la
        // API (`GET /bookings/{id}`) devuelve el de negocio. Con la mezcla, un
        // cliente no podia cruzar un boleto con su pasajero sin una tabla
        // aparte, que es justo lo que el boarding pass necesita para etiquetar
        // cada pase.
        passengerId: boleto.pasajero?.passengerId ?? '',
        // Nombre completo: el `Ticket` del contrato no lo trae, pero sin el la UI
        // no puede pintar un boarding pass legible.
        passengerName: `${boleto.pasajero?.nombre ?? ''} ${boleto.pasajero?.apellido ?? ''}`.trim() || undefined,
        eTicketNumber: boleto.numeroBoleto,
        status: boleto.estado,
        issuedAt: boleto.fechaEmision ? boleto.fechaEmision.toISOString() : null,
        failureReason: boleto.motivoFallo,
        segments: (boleto.segmentos ?? []).map((seg) => {
          const original = cache.get(seg.segmentId);
          return {
            segmentId: seg.segmentId,
            status: seg.estado,
            couponNumber: seg.numeroCupon,
            flightNumber: original?.vuelo?.numeroVuelo,
            departureIataCode: original?.vuelo?.aeropuertoOrigen,
            departureAt: original?.vuelo?.horaSalidaProgramada?.toISOString(),
            arrivalIataCode: original?.vuelo?.aeropuertoDestino,
            arrivalAt: original?.vuelo?.horaLlegadaProgramada?.toISOString(),
            seatNumber:
              asientoDe.get(`${boleto.pasajero?.passengerId}:${seg.segmentId}`) ??
              null,
          };
        }),
      })),
    };
  }

  /**
   * `GET /bookings/{id}/baggage-options`.
   *
   * Un item por cada par (pasajero, itinerario) de la reserva, porque el equipaje
   * se compra por pasajero y por trayecto, no por reserva.
   *
   * · `alreadyPurchased` sale de `equipaje_pasajero.eqp_cantidad`.
   * · `maxAllowed` sale de `tarifa_equipaje.teq_incluyeBodega` (la inclusion de la
   *   tarifa). Sin tarifa cargada devuelve 0, que es la lectura honesta de "no hay
   *   nada permitido todavia", y no un `-1` inventado.
   * · `price` sale de `tarifa_cabina.tca_precioEquipajeExtra` de la tarifa con la
   *   que se creo la reserva, localizada por (itinerario, cabina, marca).
   *
   * `tarifa_cabina` se enlaza por `tca_itinerarioid`, que es el UUID de
   * `oferta_itinerario`, no el `itineraryId` de negocio. Por eso hay que resolver
   * antes la `oferta_itinerario` de la reserva.
   */
  async opcionesEquipaje(
    bookingId: string,
    propietarioId: string,
  ): Promise<BaggageOptionDto[]> {
    await this.exigirReservaPropia(bookingId, propietarioId);

    const reserva = await this.reservaRepo.findOne({
      where: { idReserva: bookingId },
      relations: {
        pasajeros: true,
        itinerarios: true,
        // `oferta` hace falta para obtener `bloqueoCupo.ofertaId`, que es el
        // UUID de `oferta` y NO el del hold. Ver la nota de `ofertaId` mas abajo.
        bloqueoCupo: { itinerarios: true, oferta: true },
      },
    });
    if (!reserva) {
      throw new NotFoundException(`La reserva '${bookingId}' no existe.`);
    }

    /**
     * equipaje_pasajero NO tiene columna de reserva: su FK es
     * eqp_pasajeroid -> pasajero.pas_reservaid. Por eso el filtro va por un
     * JOIN a pasajero y no por una columna propia:
     *
     *     no existe la columna e.pas_reservaid
     *
     * Se agrupa por pasajero e itinerario porque eqp_cantidad es POR fila
     * (una compra) y el DTO expone la suma.
     */
    const comprados = await this.equipajeRepo
      .createQueryBuilder('e')
      .innerJoin('e.pasajero', 'p')
      // `pas_pasengerid` esta en `pasajero`, NO en `equipaje_pasajero`:
      //     no existe la columna e.pas_pasengerid
      //
      // Los alias van en minusculas y son el nombre fisico de la columna: el
      // alias de un `select` NO se pliega a minuscula, asi que pedir
      // `'pasengerId'` y leer `fila.pasengerid` devuelve `undefined` y
      // `alreadyPurchased` sale siempre 0, por mas maletas que haya comprado el
      // pasajero. Es el mismo fallo que hacia que `listarReservas` perdiera el
      // `bookingId`.
      .select('p.pas_pasengerid', 'pasengerid')
      .addSelect('e.eqp_itineraryid', 'itineraryid')
      .addSelect('SUM(e.eqp_cantidad)', 'cantidad')
      .where('p.pas_reservaid = :reservaId', { reservaId: bookingId })
      .groupBy('p.pas_pasengerid')
      .addGroupBy('e.eqp_itineraryid')
      .getRawMany<{ pasengerid: string; itineraryid: string; cantidad: string }>();

    // La clave es `passengerId de negocio | itineraryId`, que es como el DTO los
    // nombra. Se agrupa por el `passengerId` de NEGOCIO y no por el UUID de
    // `id_pasajero` porque es lo que devuelve la API.
    const porClave = new Map<string, number>();
    for (const fila of comprados) {
      porClave.set([fila.pasengerid, fila.itineraryid].join('|'), Number(fila.cantidad));
    }

    const resultado: BaggageOptionDto[] = [];

    /**
     * `oferta_itinerario.oit_ofertaid` referencia `oferta.id_oferta`.
     *
     * OJO: ese UUID es el de la OFERTA, no el del hold. `reserva.bloqueoCupoId`
     * es `id_bloqueo_cupo`, y usarlo aqui no encuentra nada: falla en SILENCIO,
     * con cero tarifas y cero precios y sin error de por medio. La distincion es
     * `bloqueoCupo.ofertaId`, el `@RelationId` a `oferta`, y por eso la
     * relacion `oferta` se carga en el `findOne` de mas arriba.
     */
    const ofertaId = reserva.bloqueoCupo?.ofertaId ?? null;

    for (const itinerario of reserva.itinerarios ?? []) {
      const bloqueo = (reserva.bloqueoCupo?.itinerarios ?? []).find(
        (b) => b.itineraryId === itinerario.itineraryId,
      );

      const tarifa = bloqueo
        ? await this.tarifaDelItinerario(
            ofertaId,
            itinerario.itineraryId,
            bloqueo.claseCabina,
            bloqueo.marcaTarifa,
          )
        : null;

      const equipajes = tarifa
        ? await this.tarifaEquipajeRepo.findOne({
            // `TarifaEquipaje` declara la FK como su PROPIA `@PrimaryColumn`
            // (`teqTarifaCabinaId`), sin `@RelationId`: ese es el nombre de la
            // propiedad, no `tarifaCabinaId`.
            where: { teqTarifaCabinaId: tarifa.idTarifaCabina },
          })
        : null;
      const incluido = equipajes?.incluyeBodega ?? 0;

      for (const pasajero of reserva.pasajeros ?? []) {
        const clave = [pasajero.passengerId, itinerario.itineraryId].join('|');
        const yaComprado = porClave.get(clave) ?? 0;
        resultado.push({
          passengerId: pasajero.passengerId,
          itineraryId: itinerario.itineraryId,
          // `tca_precioEquipajeExtra` es el precio REAL de la maleta extra, en la
          // moneda de la tarifa. Sin tarifa no hay precio que devolver y se
          // informa 0.00, que es lo que devolveria un `DEFAULT` del DDL.
          price: {
            currency: tarifa?.moneda ?? 'USD',
            baseFare: aImporte(0),
            taxes: aImporte(0),
            total: aImporte(Number(tarifa?.precioEquipajeExtra ?? 0)),
          },
          maxAllowed: incluido + yaComprado,
          alreadyPurchased: yaComprado,
        });
      }
    }

    return resultado;
  }


  /**
  /**
   * Verifica que la reserva existe y es del propietario, o lanza 404.
   *
   * Un 404 y no un 403 a proposito: confirmar que existe una reserva ajena ya
   * es filtrar informacion sobre ella. Un 403 le confirmaria al atacante que el
   * UUID existe, que es justo lo que el UUID pretende evitar.
   */
  private async exigirReservaPropia(
    bookingId: string,
    propietarioId: string,
    relaciones?: FindOptionsRelations<Reserva>,
  ): Promise<Reserva> {
    // Devuelve la reserva en vez de `void`: el llamante la necesita para el
    // importe, el PNR o los pasajeros, y repetir la consulta seria tirar la
    // que ya esta hecha.
    const reserva = await this.reservaRepo.findOne({
      where: { idReserva: bookingId },
      relations: relaciones,
    });
    if (!reserva || reserva.propietarioId !== propietarioId) {
      throw new NotFoundException(`La reserva '${bookingId}' no existe.`);
    }
    return reserva;
  }

  /**
   * Todos los segmentos de una reserva, con su vuelo.
   *
   * `reservaId` en `ReservaItinerario` es un `@RelationId`: no admite `where`
   * (`EntityPropertyNotFoundError`). Se consulta por la columna fisica.
   */
  private async todosSegmentosDe(reservaId: string): Promise<ReservaSegmento[]> {
    const itinerarios = await this.reservaItinerarioRepo
      .createQueryBuilder('ri')
      .where('ri.rit_reservaid = :reservaId', { reservaId })
      .getMany();
    if (itinerarios.length === 0) return [];
    return this.reservaSegmentoRepo
      .createQueryBuilder('rs')
      .leftJoinAndSelect('rs.vuelo', 'v')
      .where('rs.rsg_itinerarioid IN (:...ids)', {
        ids: itinerarios.map((i) => i.idReservaItinerario),
      })
      .getMany();
  }
  private aSegmentoDto(seg: ReservaSegmento): BookingSegmentDto {
    return {
      segmentId: seg.segmentId,
      flightNumber: seg.vuelo?.numeroVuelo ?? '',
      departureIataCode: seg.vuelo?.aeropuertoOrigen ?? '',
      departureAt: seg.vuelo?.horaSalidaProgramada?.toISOString() ?? '',
      arrivalIataCode: seg.vuelo?.aeropuertoDestino ?? '',
      arrivalAt: seg.vuelo?.horaLlegadaProgramada?.toISOString() ?? '',
      status: seg.estado,
    };
  }

  // =========================================================================
  // POSTVENTA · Check-in, cancelacion y equipaje
  // =========================================================================

  /**
   * Ventana de check-in, en horas antes de la salida.
   *
   * La regla es una decision de negocio, no del contrato: el contrato solo
   * declara que existe el endpoint. 48h es lo habitual en aerolineas, y es el
   * mismo valor que menciona el enunciado.
   */
  private static readonly HORAS_APERTURA_CHECKIN = 48;

  /** Vigencia de una cotizacion de cancelacion. Mismo orden de magnitud que el hold. */
  private static readonly MINUTOS_VIGENCIA_COTIZACION = 15;

  /**
   * Penalizacion por proximidad a la salida, en porcentaje del importe.
   *
   * Se recorre de mas reciente a mas antiguo y se toma la PRIMERA regla cuya
   * anticipacion supere el umbral. Va de 0% (con mas de 72h) a 100% (con menos
   * de 24h), y el ultimo escalon absorbe cualquier anticipacion por debajo de
   * 24h, incluida la salida ya passada.
   */
  private static readonly PENALIZACION = [
    { horasMinimas: 72, porcentaje: 0 },
    { horasMinimas: 48, porcentaje: 25 },
    { horasMinimas: 24, porcentaje: 50 },
    { horasMinimas: 0, porcentaje: 100 },
  ];

  /**
   * `POST /bookings/{id}/cancellation-quote`
   *
   * NO cambia el estado de la reserva, pero SI inserta una fila en
   * `cotizacion_cancelacion`: es lo que ata la confirmacion al importe mostrado.
   * Ver la nota del DTO.
   *
   * ── Base imponible ─────────────────────────────────────────────────────────
   * Se usa `res_total`, que es lo que la reserva cobro de verdad. Si viniera en
   * 0 (una reserva creada sin tarifado real), se recurre a la tarifa de cabina
   * de la reserva; y si tampoco hay, se devuelve 0 con `isRefundable = false` y
   * motivo `TARIFA_NO_REEMBOLSABLE`, en vez de inventar una cifra. Es preferible
   * un 0 honesto a un 30% de un importe que no existe.
   */
  async cotizarCancelacion(
    bookingId: string,
    propietarioId: string,
  ): Promise<CancellationQuoteResponseDto> {
    // Los segmentos con su vuelo hacen falta para saber cuando sale el primer
    // vuelo, que es lo que fija la penalizacion. Sin cargarlos, `itinerarios`
    // llega vacio y la reserva pareceria no tener vuelo, lo que daria
    // `isRefundable: false` sin un motivo real.
    const reserva = await this.exigirReservaPropia(bookingId, propietarioId, {
      itinerarios: { segmentos: { vuelo: true } },
    });

    // El primer segmento del primer itinerario es la salida mas temprana: es la
    // que decide la penalizacion. En una ida y vuelta, la segunda ya habria
    // salido cuando el usuario cancela.
    const primerItinerario = (reserva.itinerarios ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)[0];
    const primerSegmento = (primerItinerario?.segmentos ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)[0];
    const vuelo = primerSegmento?.vuelo;

    const moneda = reserva.moneda || 'USD';
    const base = await this.baseImponibleCancelacion(reserva);

    let esReembolsable = true;
    let motivo: string | null = null;
    let porcentaje = 0;

    if (!vuelo) {
      esReembolsable = false;
      motivo = 'SIN_VUELO_ASOCIADO';
    } else {
      const horasAnticipacion =
        (vuelo.horaSalidaProgramada.getTime() - Date.now()) / 3_600_000;
      if (horasAnticipacion < 0) {
        // El vuelo ya salio: no hay nada que reembolsar ni que penalizar.
        esReembolsable = false;
        motivo = 'VUELO_YA_DESPEGADO';
      } else {
        const regla = VuelosService.PENALIZACION.find(
          (p) => horasAnticipacion >= p.horasMinimas,
        );
        porcentaje = regla ? regla.porcentaje : 100;
      }
    }

    // Sin importe no hay cotizacion que mostrar: se marca no reembolsable en vez
    // de devolver 0.00 / 0.00, que la UI leeria como "te devolvemos nada pero no
    // pasa nada".
    if (base.total <= 0) {
      esReembolsable = false;
      if (!motivo) motivo = 'TARIFA_NO_REEMBOLSABLE';
      porcentaje = 100;
    }

    const penalizacion = redondear(base.total * (porcentaje / 100));
    const reembolso = esReembolsable ? redondear(base.total - penalizacion) : 0;

    // La fecha de expiracion se calcula en SQL con `now()`, no en Node: el
    // reloj que decide cuando caduca una oferta de dinero es el del servidor de
    // base de datos, igual que se hizo con el TTL del hold.
    const fila = await this.cotizacionRepo
      .createQueryBuilder()
      .insert()
      .into(CotizacionCancelacion)
      .values({
        reserva: { idReserva: bookingId } as Reserva,
        esReembolsable,
        montoReembolso: aImporte(reembolso),
        montoPenalizacion: aImporte(penalizacion),
        moneda,
        estado: EstadoCotizacionCancelacion.VALID,
        motivo,
        // La vigencia se calcula con el reloj de PostgreSQL, no con el de Node:
        // es un plazo de dinero y el servidor de base de datos es quien debe
        // decidir cuando caduca.
        //
        // El numero va en LITERAL y no como parametro. `make_interval()` es
        // polimorfica en sus once argumentos, asi que `make_interval(mins => $1)`
        // deja a PostgreSQL sin tipo para el parametro y falla con "se dedujeron
        // tipos de dato inconsistentes", y `::int` tampoco basta cuando el
        // `InsertQueryBuilder` ya ha numerado otros parametros por el
        // `returning('*')`. Como el valor es una constante entera interna y NO
        // entrada del usuario, escribirla en la cadena no es una inyeccion: no
        // hay nada que el cliente pueda controlar.
        fechaExpiracion: () =>
          `now() + make_interval(mins => ${VuelosService.MINUTOS_VIGENCIA_COTIZACION})`,
        fechaCancelacion: null,
      })
      .returning('*')
      .execute();

    const creada = fila.raw[0] as {
      id_cotizacion_cancelacion: string;
      cco_fechaexpiracion: Date | string;
    };

    return {
      quoteId: creada.id_cotizacion_cancelacion,
      isRefundable: esReembolsable,
      refundAmount: aImporte(reembolso),
      penaltyAmount: aImporte(penalizacion),
      currency: moneda,
      expiresAt: new Date(creada.cco_fechaexpiracion).toISOString(),
    };
  }

  /**
   * Importe de referencia de una reserva: `res_total` y, si es 0, la tarifa de
   * cabina que se aplico.
   *
   * `res_total` manda porque es lo cobrado. El respaldo existe porque en este
   * entorno el tarifado real no esta cargado y `res_total` queda en 0, lo que
   * haria que toda cancelacion fuera no reembolsable y el flujo quedaria sin
   * poder demostrarse.
   */
  private async baseImponibleCancelacion(
    reserva: Reserva,
  ): Promise<{ total: number; currency: string }> {
    const total = Number(reserva.total ?? 0);
    if (total > 0) {
      return { total, currency: reserva.moneda };
    }

    // `TarifaCabina.reservaId` es un `@RelationId`: no admite `where` y da
    // `EntityPropertyNotFoundError`. Se filtra por la columna fisica.
    const tarifa = await this.tarifaCabinaRepo
      .createQueryBuilder('tc')
      .where('tc.tca_reservaid = :reservaId', { reservaId: reserva.idReserva })
      .orderBy('tc.tca_total', 'DESC')
      .getOne();
    if (tarifa) {
      return { total: Number(tarifa.total), currency: tarifa.moneda };
    }

    return { total: 0, currency: reserva.moneda || 'USD' };
  }

  /**
   * `POST /bookings/{id}/cancel`
   *
   * Confirma la cancelacion contra una cotizacion concreta. Todas las
   * validaciones ocurren DENTRO de la transaccion, y en este orden:
   *
   * 1. La reserva es del propietario y admite cancelacion (409 si no).
   * 2. La cotizacion existe, es de ESTA reserva, esta `VALID` y no ha caducado
   *    (409). Es lo que impide cancelar por una cifra distinta de la mostrada.
   * 3. Se marca la cotizacion `CONSUMED` con `fechaCancelacion`.
   * 4. Se libera el cupo: los asientos asignados vuelven a estar disponibles.
   * 5. Se transiciona la reserva a `CANCELLED` o `CANCELLATION_PENDING`.
   * 6. Se registra el evento de webhook y la traza de auditoria.
   *
   * ── 200 vs 202 ─────────────────────────────────────────────────────────────
   * Con reembolso (`isRefundable`), el dinero vuelve por un mecanismo local y la
   * cancelacion es inmediata: `CANCELLED` y **200**.
   *
   * Sin reembolso, no hay nada que mover y la reserva queda en un limbo que solo
   * alguien de finanzas puede cerrar: `CANCELLATION_PENDING` y **202**. Cerrar
   * a `CANCELLED` una reserva que no devuelve dinero daria por hecho un proceso
   * que no ocurrio.
   */
  async cancelarReserva(
    bookingId: string,
    dto: CancelBookingRequestDto,
    idempotencyKey: string,
    propietarioId: string,
  ): Promise<{ cuerpo: CancelBookingResponseDto; codigo: 200 | 202 }> {
    // --- Idempotencia: replay de una peticion ya completada ------------------
    const endpoint = 'POST /vuelos/bookings/{id}/cancel';
    const previa = await this.idempotenciaRepo.findOne({
      where: { clave: idempotencyKey },
    });
    if (previa && previa.estado === EstadoIdempotencia.COMPLETED && previa.respuesta) {
      this.logger.log(
        `Idempotency-Key ${idempotencyKey} repetida en cancel: se devuelve la respuesta guardada.`,
      );
      const guardado = previa.respuesta as unknown as CancelBookingResponseDto;
      return {
        cuerpo: guardado,
        codigo: guardado.status === 'CANCELLED' ? 200 : 202,
      };
    }

    await this.idempotenciaRepo.upsert(
      {
        clave: idempotencyKey,
        propietarioId: propietarioId,
        endpoint: endpoint,
        cuerpoHash: sha256(JSON.stringify(dto)),
        estado: EstadoIdempotencia.IN_PROGRESS,
        codigoHttp: null,
        respuesta: null,
      },
      { conflictPaths: ['clave'], skipUpdateIfNoValuesChanged: true },
    );

    try {
      const resultado = await this.dataSource.transaction(async (manager) => {
        const reservaRepo = manager.getRepository(Reserva);
        const cotizacionRepo = manager.getRepository(CotizacionCancelacion);
        const asientoAsignadoRepo = manager.getRepository(AsientoAsignado);
        const asientoRepo = manager.getRepository(AsientoVuelo);
        const reservaSegmentoRepo = manager.getRepository(ReservaSegmento);
        const eventoRepo = manager.getRepository(EventoWebhook);
        const auditoriaRepo = manager.getRepository(LogAuditoriaVuelos);

        const reserva = await reservaRepo.findOne({
          where: { idReserva: bookingId },
        });
        if (!reserva || reserva.propietarioId !== propietarioId) {
          // 404 y no 403: confirmar que existe una reserva ajena ya es filtrar
          // informacion sobre ella.
          throw new NotFoundException(`La reserva '${bookingId}' no existe.`);
        }

        // Solo desde `CONFIRMED` o `CANCELLATION_PENDING` se puede cancelar,
        // que es justo lo que permite el trigger `tg_reserva_transicion`. Se
        // comprueba aqui para devolver un 409 explicito en vez de un 23514.
        if (reserva.estado !== EstadoReserva.CONFIRMED &&
            reserva.estado !== EstadoReserva.CANCELLATION_PENDING) {
          // `ALREADY_CANCELLED` cuando el estado es CANCELLED, y
          // `BOOKING_NOT_CONFIRMED` en cualquier otro: los dos son 409 y el
          // contrato obliga a distinguirlos por `code`. Un `ConflictException` a
          // secos llegaba sin el, y era imposible saber si había que volver a
          // cotizar o esperar a que la reserva change de estado.
          throw conflicto(
            reserva.estado === EstadoReserva.CANCELLED
              ? CodigoProblema.ALREADY_CANCELLED
              : CodigoProblema.BOOKING_NOT_CONFIRMED,
            `La reserva '${reserva.pnr}' esta en estado ${reserva.estado} y no admite cancelacion.`,
          );
        }

        const cotizacion = await cotizacionRepo.findOne({
          where: { idCotizacionCancelacion: dto.quoteId },
        });
        if (!cotizacion) {
          throw new NotFoundException(
            `La cotizacion '${dto.quoteId}' no existe. Vuelve a pedirla.`,
          );
        }
        // La cotizacion tiene que ser DE ESTA reserva. Sin esto, un usuario con
        // dos reservas podria cotizar la barata y cancelar con ella la cara.
        if (cotizacion.reservaId !== bookingId) {
          throw new ConflictException(
            'La cotizacion indicada pertenece a otra reserva.',
          );
        }
        if (cotizacion.estado !== EstadoCotizacionCancelacion.VALID) {
          // `QUOTE_EXPIRED` (410) segun `codigo_error`: la cotizacion existio pero
          // ya no sirve. Un 409 sin `code` no lo distinguia de "la reserva no admite
          // cancelacion", que si es 409.
          throw conflicto(
            CodigoProblema.QUOTE_EXPIRED,
            `La cotizacion ya esta ${cotizacion.estado} y no se puede reutilizar.`,
          );
        }
        if (cotizacion.fechaExpiracion.getTime() <= Date.now()) {
          // Se marca EXPIRED para que quede constancia, no solo para que la
          // siguiente llamada la vea y la rechace con un motivo claro.
          await cotizacionRepo.update(
            { idCotizacionCancelacion: dto.quoteId },
            { estado: EstadoCotizacionCancelacion.EXPIRED },
          );
          // 410 y no 409: el recurso EXISTE pero ha caducado, y el 410 es
          // justamente "vuelve a pedirla". El mensaje ya lo decia; el numero tambien.
          throw new ProblemaApi(
            CodigoProblema.QUOTE_EXPIRED,
            'La cotizacion ha caducado. Vuelve a pedirla para ver el importe actual.',
          );
        }

        // --- Liberar los asientos --------------------------------------------
        // `asiento_asignado` no tiene FK al vuelo, solo `asa_segmentId` de
        // negocio, asi que el asiento concreto se resuelve por
        // `reserva_segmento` -> `rsg_vueloid` + `asi_numeroAsiento`.
        const asignados = await asientoAsignadoRepo
          .createQueryBuilder('aa')
          .innerJoin(
            Pasajero,
            'p',
            'p.id_pasajero = aa.asa_pasajeroid',
          )
          .where('p.pas_reservaid = :reservaId', { reservaId: bookingId })
          .getMany();

        let asientosLiberados = 0;
        for (const asignado of asignados) {
          const segmento = await reservaSegmentoRepo.findOne({
            where: { segmentId: asignado.segmentId },
          });
          if (!segmento) continue;

          // Se filtra por vuelo Y numero: `asi_numeroAsiento` se repite en cada
          // vuelo, asi que `asi_numeroAsiento` solo no identifica un asiento.
          //
          // `createQueryBuilder('a').update()` NO vale para un UPDATE: el alias se
          // propaga al WHERE y PostgreSQL lo rechaza con "falta una entrada para la
          // tabla a en la clausula FROM", porque en un UPDATE el alias de la tabla
          // destino no se puede anteponer a las columnas. Sin alias.
          //
          // Esto era un 500 en TODO "Cancelar reserva" de una reserva CON asiento
          // asignado, que es el caso normal desde que `assignedSeats` se persiste
          // (Fase 11). No lo habia detectado ninguna prueba: la de postventa
          // cancelaba una reserva sin asiento, y entonces este bucle no se
          // ejecutaba nunca.
          const resultadoLibere = await manager
            .createQueryBuilder()
            .update(AsientoVuelo)
            .set({ estaDisponible: true })
            .where('asi_vueloid = :vueloId', { vueloId: segmento.vueloId })
            .andWhere('asi_numeroasiento = :asiento', {
              asiento: asignado.numeroAsiento,
            })
            .execute();
          if (resultadoLibere.affected) {
            asientosLiberados += resultadoLibere.affected;
          }
          await asientoAsignadoRepo.delete({ idAsientoAsignado: asignado.idAsientoAsignado });
        }

        // --- Transicionar la reserva -----------------------------------------
        const destino = cotizacion.esReembolsable
          ? EstadoReserva.CANCELLED
          : EstadoReserva.CANCELLATION_PENDING;

        await reservaRepo.update(
          { idReserva: bookingId },
          { estado: destino, version: reserva.version + 1 },
        );

        // --- Consumir la cotizacion -----------------------------------------
        await cotizacionRepo.update(
          { idCotizacionCancelacion: dto.quoteId },
          {
            estado: EstadoCotizacionCancelacion.CONSUMED,
            fechaCancelacion: () => 'now()',
            motivo: dto.reason ?? cotizacion.motivo,
          },
        );

        // --- Evento de webhook ------------------------------------------------
        // Se encola el evento aunque no haya suscripciones: la tabla es la cola,
        // y el reparto a cada suscriptor es trabajo de otro consumidor. Emitir
        // solo si hay alguien escuchando haria que al suscribirse tarde no
        // hubiera historial.
        await eventoRepo.insert({
          tipoEvento: 'booking.cancelled',
          ocurridoEn: new Date(),
          versionApi: VERSION_EVENTO,
          datos: {
            bookingId: bookingId,
            pnr: reserva.pnr,
            estadoAnterior: reserva.estado,
            estadoNuevo: destino,
            refundAmount: cotizacion.montoReembolso,
            penaltyAmount: cotizacion.montoPenalizacion,
            currency: cotizacion.moneda,
            motivo: dto.reason ?? cotizacion.motivo,
            asientosLiberados: asientosLiberados,
          },
          entidadOrigen: 'reserva',
          entidadId: bookingId,
        });

        // --- Auditoria --------------------------------------------------------
        await auditoriaRepo.insert({
          tipoEntidad: 'reserva',
          entidadId: bookingId,
          accion: AccionAuditoria.STATUS_CHANGED,
          datosAntiguos: { estado: reserva.estado },
          datosNuevos: {
            estado: destino,
            quoteId: dto.quoteId,
            reembolso: cotizacion.montoReembolso,
          },
          realizadoPor: propietarioId,
          fechaHora: new Date(),
          idempotencyKey: idempotencyKey,
        });

        const cuerpo: CancelBookingResponseDto = {
          bookingId: bookingId,
          pnr: reserva.pnr ?? '',
          status: destino,
          refundAmount: cotizacion.montoReembolso,
          penaltyAmount: cotizacion.montoPenalizacion,
          currency: cotizacion.moneda,
        };

        return { cuerpo, codigo: (destino === EstadoReserva.CANCELLED ? 200 : 202) as 200 | 202 };
      });

      await this.idempotenciaRepo.update(
        { clave: idempotencyKey },
        {
          estado: EstadoIdempotencia.COMPLETED,
          codigoHttp: resultado.codigo,
          respuesta: resultado.cuerpo as unknown as Record<string, unknown>,
        },
      );

      return resultado;
    } catch (error) {
      // La clave queda FAILED y NO se reutiliza: un reintento con la misma
      // clave debe poder volver a intentarlo de verdad.
      await this.idempotenciaRepo.update(
        { clave: idempotencyKey },
        { estado: EstadoIdempotencia.FAILED },
      );
      throw error;
    }
  }

  /**
   * `POST /bookings/{id}/check-in`
   *
   * Reglas, en el orden en que se aplican:
   *
   * 1. La reserva debe estar `CONFIRMED` (409). Una reserva `CANCELLED` no se
   *    registra, y una `TICKET_ISSUING` todavia no tiene boleto emitido.
   * 2. Debe existir un boleto `ISSUED` por pasajero (422). Sin boleto emitido no
   *    hay nada que presentar en el mostrador; es un 422 y no un 409 porque la
   *    reserva esta en un estado valido, lo que falla es el contenido.
   * 3. La ventana: entre 48h antes de la salida y la salida misma. Fuera de ella
   *    se responde 409 diciendo CUANDO abre, que es mas util que un 409 seco.
   * 4. Un `checkin` por reserva (`UNIQUE (chi_reservaid)`): el segundo intento
   *    devuelve 409, no sobrescribe ni falla en la base.
   */
  async hacerCheckIn(
    bookingId: string,
    propietarioId: string,
  ): Promise<CheckInResponseDto> {
    // Los pasajeros TIENEN que cargarse. Sin `relations`, `reserva.pasajeros`
    // llega vacio, el filtro de boleto emitido no encuentra a nadie con falta,
    // y el check-in se registra con cero pasajeros y responde COMPLETED: un exito
    // vacio, que es el peor resultado posible porque parece que todo salio bien.
    const reserva = await this.exigirReservaPropia(bookingId, propietarioId, {
      pasajeros: true,
    });

    if (reserva.estado !== EstadoReserva.CONFIRMED) {
      // `BOOKING_NOT_CONFIRMED` (409). Este 409 y el de "el vuelo ya despegó" son
      // el mismo numero, asi que sin `code` el usuario veia dos mensajes
      // incompatibles para la misma causa.
      throw conflicto(
        CodigoProblema.BOOKING_NOT_CONFIRMED,
        `Solo las reservas confirmadas pueden hacer check-in. Esta esta en ${reserva.estado}.`,
      );
    }

    if (!reserva.pasajeros || reserva.pasajeros.length === 0) {
      throw noProcesable(
        CodigoProblema.CHECK_IN_FAILED,
        'La reserva no tiene pasajeros registrados: no se puede hacer check-in.',
      );
    }

    // --- Ventana temporal ----------------------------------------------------
    // Se compara contra la SALIDA mas temprana de la reserva: si el primer vuelo
    // ya despegó, el check-in ya no tiene sentido aunque el segundo no haya salido.
    const segmentos = await this.todosSegmentosDe(bookingId);
    const salidas = segmentos
      .map((s) => s.vuelo?.horaSalidaProgramada)
      .filter((f): f is Date => f instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime());

    if (salidas.length === 0) {
      throw noProcesable(
        CodigoProblema.CHECK_IN_FAILED,
        'La reserva no tiene vuelos asociados, no se puede hacer check-in.',
      );
    }

    const primera = salidas[0];
    const msParaSalida = primera.getTime() - Date.now();
    const horasParaSalida = msParaSalida / 3_600_000;

    if (msParaSalida <= 0) {
      // `FLIGHT_ALREADY_DEPARTED` (409): es exactamente lo que dice el
      // mensaje, y `codigo_error` le asigna ese par.
      throw conflicto(
        CodigoProblema.FLIGHT_ALREADY_DEPARTED,
        'El vuelo ya despegó: el check-in está cerrado.',
      );
    }
    if (horasParaSalida > VuelosService.HORAS_APERTURA_CHECKIN) {
      const abreEn = Math.ceil(horasParaSalida - VuelosService.HORAS_APERTURA_CHECKIN);
      // `CHECK_IN_NOT_AVAILABLE` (409), no `CUTOFF_PASSED`: aqui la ventana
      // aun no se ha ABIERTO, mientras que el corte (`CUTOFF_PASSED`) es el
      // otro extremo. Confundirlos haria que un cliente cerrara la venta de
      // check-in al empezar el periodo.
      throw conflicto(
        CodigoProblema.CHECK_IN_NOT_AVAILABLE,
        `El check-in aún no está disponible. Abre ${abreEn} h antes de la salida.`,
      );
    }

    // --- Boletos emitidos -----------------------------------------------------
    // Se exige un boleto `ISSUED` por pasajero. El CHECK bidireccional del DDL
    // garantiza que `ISSUED` implica numero y fecha de emision, asi que basta
    // con el estado.
    const boletos = await this.boletoRepo.find({
      where: { reserva: { idReserva: bookingId } },
      relations: { pasajero: true, segmentos: true },
    });

    const porPasajero = new Map<string, { emitido: boolean; segmentos: string[] }>();
    for (const boleto of boletos) {
      const emitido = boleto.estado === EstadoTicket.ISSUED;
      const anterior = porPasajero.get(boleto.pasajeroId) ?? {
        emitido: false,
        segmentos: [],
      };
      anterior.emitido = anterior.emitido || emitido;
      for (const seg of boleto.segmentos ?? []) {
        if (!anterior.segmentos.includes(seg.segmentId)) {
          anterior.segmentos.push(seg.segmentId);
        }
      }
      porPasajero.set(boleto.pasajeroId, anterior);
    }

    const pasajerosSinBoleto = (reserva.pasajeros ?? []).filter(
      (p) => porPasajero.get(p.idPasajero)?.emitido !== true,
    );
    if (pasajerosSinBoleto.length > 0) {
      throw noProcesable(
        CodigoProblema.CHECK_IN_FAILED,
        'No se puede hacer check-in: todavia no hay boleto emitido para ' +
          pasajerosSinBoleto.map((p) => p.nombre).join(', ') +
          '.',
      );
    }

    // --- Idempotencia natural: UNIQUE (chi_reservaid) -------------------------
    // `Checkin` declara la FK como `@JoinColumn` sin un `@RelationId` aparte,
    // asi que no hay propiedad `reservaId` por la que filtrar: se usa la columna
    // fisica. Un `where: { reservaId }` daria `EntityPropertyNotFoundError`.
    const checkinExistente = await this.checkinRepo
      .createQueryBuilder('c')
      .where('c.chi_reservaid = :reservaId', { reservaId: bookingId })
      .getOne();
    if (checkinExistente) {
      // El segundo clic del usuario. `CHECK_IN_NOT_AVAILABLE` (409) dice
      // "no se puede, ya esta hecho" sin que el cliente tenga que interpretar el
      // texto. El bloqueo de verdad es `UNIQUE (chi_reservaid)`.
      throw conflicto(
        CodigoProblema.CHECK_IN_NOT_AVAILABLE,
        'Esta reserva ya tiene un check-in registrado.',
      );
    }

    // --- Asientos ya asignados -----------------------------------------------
    // El check-in reutiliza el asiento que el pasajero eligio al reservar. Se
    // busca por pasajero y segmento, y si no hay, el segmento queda sin asiento:
    // no se asigna uno al vuelo, porque eso es otra operacion con su propio
    // precio.
    // `AsientoAsignado.pasajeroId` es un `@RelationId`: no admite `where` ni
    // como elemento de un array de condiciones. Se filtra por la columna fisica.
    const idsPasajeros = (reserva.pasajeros ?? []).map((p) => p.idPasajero);
    const asignados =
      idsPasajeros.length === 0
        ? []
        : await this.asientoAsignadoRepo
            .createQueryBuilder('aa')
            .where('aa.asa_pasajeroid IN (:...ids)', { ids: idsPasajeros })
            .getMany();
    const asientoDe = new Map<string, string>();
    for (const a of asignados) {
      asientoDe.set(`${a.pasajeroId}|${a.segmentId}`, a.numeroAsiento);
    }

    const pnr = reserva.pnr ?? bookingId;

    return this.dataSource.transaction(async (manager) => {
      const checkinRepo = manager.getRepository(Checkin);
      const cpaRepo = manager.getRepository(CheckinPasajero);
      const cseRepo = manager.getRepository(CheckinSegmento);
      const paseRepo = manager.getRepository(PaseAbordar);
      const eventoRepo = manager.getRepository(EventoWebhook);
      const boletoRepo = manager.getRepository(Boleto);

      const checkin = await checkinRepo.save(
        checkinRepo.create({
          reserva: { idReserva: bookingId } as Reserva,
          estado: EstadoCheckIn.COMPLETED,
          fechaHora: new Date(),
          motivoFallo: null,
        }),
      );

      const pasajerosRespuesta: CheckInPassengerDto[] = [];

      for (const pasajero of reserva.pasajeros ?? []) {
        const info = porPasajero.get(pasajero.idPasajero) ?? {
          emitido: true,
          segmentos: [],
        };
        const segmentosPasajero =
          segmentos.length > 0
            ? segmentos
            : info.segmentos.map((segmentId) => ({ segmentId }) as ReservaSegmento);

        const cpa = await cpaRepo.save(
          cpaRepo.create({
            checkinId: checkin.idCheckin,
            pasajeroId: pasajero.idPasajero,
            estado: EstadoCheckInItem.CHECKED_IN,
          }),
        );

        let primerAsiento: string | null = null;

        for (const segmento of segmentosPasajero) {
          const asiento = asientoDe.get(`${pasajero.idPasajero}|${segmento.segmentId}`) ?? null;
          if (!primerAsiento) primerAsiento = asiento;

          await cseRepo.save(
            cseRepo.create({
              checkinId: checkin.idCheckin,
              pasajeroId: pasajero.idPasajero,
              segmentId: segmento.segmentId,
              asiento: asiento,
              estado: EstadoCheckInItem.CHECKED_IN,
            }),
          );

          // El pase de abordar se emite con el codigo de barras que el DDL
          // exige. Se deriva del PNR y del segmento, de forma ESTABLE: repetir
          // el check-in del mismo segmento produce el mismo codigo, que es lo
          // que haria un boarding pass real.
          // El boleto del pasajero. `Boleto.pasajeroId` es un `@RelationId`: no
          // admite `where` y da `EntityPropertyNotFoundError`. Se filtra por la
          // columna fisica `bse_pasajeroid` con la UUID que ya tiene el pasajero.
          const boleto = await boletoRepo
            .createQueryBuilder('b')
            .where('b.bol_pasajeroid = :pasajeroId', {
              pasajeroId: pasajero.idPasajero,
            })
            .getOne();

          // `pab_asiento` es NOT NULL y `pab_boletoid` tambien, asi que sin
          // asiento no hay pase que emitir. Es la regla de aviation, no una
          // limitacion: un pase de abordar sin BUTACA no sirve para nada. El
          // `checkin_segmento` de arriba si se guarda, con `cse_asiento` NULL,
          // porque esa columna si admite null: el check-in quedo registrado y
          // solo falta la asignacion, que es otra operacion y otro precio.
          if (asiento && boleto) {
            await paseRepo.save(
              paseRepo.create({
                // `boletoId` y `pasajeroId` son `@RelationId`: son de SOLO
                // LECTURA. Pasarlos en el `create` no escribe las columnas, y
                // como `pab_pasajeroid` es NOT NULL el INSERT revienta con
                // "el valor nulo en la columna pab_pasajeroid viola la
                // restriccion de no nulo". Para escribir la FK hay que pasar la
                // RELACION anidada, no la propiedad.
                boleto: { idBoleto: boleto.idBoleto } as Boleto,
                pasajero: { idPasajero: pasajero.idPasajero } as Pasajero,
                segmentId: segmento.segmentId,
                asiento: asiento,
                grupoAbordaje: '1',
                posicionAbordaje: '1',
                codigoBarras: paseDeAbordar(
                  pnr,
                  segmento.segmentId,
                  pasajero.passengerId,
                ),
                tipoCodigoBarras: TipoCodigoBarras.PDF417,
              }),
            );
          }
        }

        pasajerosRespuesta.push({
          passengerId: pasajero.passengerId,
          status: EstadoCheckInItem.CHECKED_IN,
          seatNumber: primerAsiento,
        });
      }

      await eventoRepo.insert({
        tipoEvento: 'booking.checked_in',
        ocurridoEn: new Date(),
        versionApi: VERSION_EVENTO,
        datos: {
          bookingId: bookingId,
          pnr: pnr,
          pasajeros: pasajerosRespuesta.length,
        },
        entidadOrigen: 'reserva',
        entidadId: bookingId,
      });

      return {
        bookingId: bookingId,
        status: EstadoCheckIn.COMPLETED,
        checkedInPassengers: pasajerosRespuesta,
      };
    });
  }

  /**
   * `POST /bookings/{id}/baggage`
   *
   * Anade maletas extra. Idempotente por `Idempotency-Key`.
   *
   * ── El `maximoPermitido` del DDL NO es un tope acumulado ────────────────────
   * El CHECK es `eqp_cantidad <= eqp_maximopermitido`, en la MISMA fila: limita
   * esta compra contra el maximo permitido, no la suma de todas las compras. Por
   * eso cada compra inserta su propia fila y guarda como maximo el total que el
   * pasajero puede acabar llevando. `/baggage-options` suma las filas, asi que
   * el total sale bien sin tener que actualizar filas anteriores.
   *
   * `UNIQUE (eqp_pasajeroid, eqp_itineraryid, eqp_fechacompra)` hace que dos
   * compras del mismo pasajero e itinerario en el MISMO instante choquen. Con
   * `now()` (precision de microsegundo) y una fila por peticion no es alcanzable
   * en la practica, y el 23505 que se produciria seria correcto: dos compras
   * identicas en el mismo microsegundo SI son la misma.
   */
  async agregarEquipaje(
    bookingId: string,
    dto: AddBaggageRequestDto,
    idempotencyKey: string,
    propietarioId: string,
  ): Promise<BaggageAddedResponseDto> {
    const endpoint = 'POST /vuelos/bookings/{id}/baggage';
    const previa = await this.idempotenciaRepo.findOne({
      where: { clave: idempotencyKey },
    });
    if (previa && previa.estado === EstadoIdempotencia.COMPLETED && previa.respuesta) {
      this.logger.log(
        `Idempotency-Key ${idempotencyKey} repetida en baggage: se devuelve la respuesta guardada.`,
      );
      return previa.respuesta as unknown as BaggageAddedResponseDto;
    }

    await this.idempotenciaRepo.upsert(
      {
        clave: idempotencyKey,
        propietarioId: propietarioId,
        endpoint: endpoint,
        cuerpoHash: sha256(JSON.stringify(dto)),
        estado: EstadoIdempotencia.IN_PROGRESS,
        codigoHttp: null,
        respuesta: null,
      },
      { conflictPaths: ['clave'], skipUpdateIfNoValuesChanged: true },
    );

    try {
      const respuesta = await this.dataSource.transaction(async (manager) => {
        const reservaRepo = manager.getRepository(Reserva);
        const pasajeroRepo = manager.getRepository(Pasajero);
        const reservaItinerarioRepo = manager.getRepository(ReservaItinerario);
        const equipajeRepo = manager.getRepository(EquipajePasajero);
        const eventoRepo = manager.getRepository(EventoWebhook);

        const reserva = await reservaRepo.findOne({ where: { idReserva: bookingId } });
        if (!reserva || reserva.propietarioId !== propietarioId) {
          throw new NotFoundException(`La reserva '${bookingId}' no existe.`);
        }

        if (reserva.estado === EstadoReserva.CANCELLED ||
            reserva.estado === EstadoReserva.CANCELLATION_PENDING) {
          throw conflicto(
            CodigoProblema.BOOKING_NOT_CONFIRMED,
            `No se puede anadir equipaje a una reserva ${reserva.estado}.`,
          );
        }

        // El pasajero y el itinerario tienen que ser DE ESTA reserva. Sin esto,
        // con los dos identificadores de negocio que son solo texto, se podria
        // colgar equipaje de otra reserva ajena.
        //
        // `Pasajero.reservaId` y `ReservaItinerario.reservaId` existen como
        // propiedad, pero son `@RelationId`: no admiten `where` y dan
        // `EntityPropertyNotFoundError`. Se consulta por la columna fisica.
        const pasajero = await pasajeroRepo
          .createQueryBuilder('p')
          .where('p.pas_reservaid = :reservaId', { reservaId: bookingId })
          .andWhere('p.pas_pasengerid = :passengerId', {
            passengerId: dto.passengerId,
          })
          .getOne();
        if (!pasajero) {
          throw new NotFoundException(
            `El pasajero '${dto.passengerId}' no pertenece a esta reserva.`,
          );
        }

        const itinerario = await reservaItinerarioRepo
          .createQueryBuilder('ri')
          .where('ri.rit_reservaid = :reservaId', { reservaId: bookingId })
          .andWhere('ri.rit_itineraryid = :itineraryId', {
            itineraryId: dto.itineraryId,
          })
          .getOne();
        if (!itinerario) {
          throw new NotFoundException(
            `El itinerario '${dto.itineraryId}' no pertenece a esta reserva.`,
          );
        }

        // Lo ya comprado, para el acumulado y para el maximo.
        const previo = await equipajeRepo
          .createQueryBuilder('e')
          .innerJoin('e.pasajero', 'p')
          .select('COALESCE(SUM(e.eqp_cantidad), 0)', 'total')
          .where('p.pas_reservaid = :reservaId', { reservaId: bookingId })
          .andWhere('e.eqp_itineraryid = :itineraryId', {
            itineraryId: dto.itineraryId,
          })
          .andWhere('p.pas_pasengerid = :passengerId', {
            passengerId: dto.passengerId,
          })
          .getRawOne<{ total: string }>();
        const yaComprado = Number(previo?.total ?? 0);

        // El precio sale de la tarifa de cabina de ESTE itinerario, resuelta por
        // la oferta del hold y la cabina y marca con las que se creo la reserva.
        // Sin tarifa no hay precio que cobrar y se responde 422 en vez de regalar
        // la maleta.
        //
        // Toda la cadena se lee en UNA consulta con JOINs. Antes se hacia en dos
        // pasos usando `reserva.bloqueoCupoId`, que es un `@RelationId` y solo
        // se puebla si se carga la relacion: sin `relations` llega `undefined`,
        // el `WHERE id_bloqueo_cupo = NULL` no casa con nada, y el resultado era
        // un 422 "no hay tarifa cargada" en una reserva que si la tenia. El JOIN
        // no tiene ese problema porque lee la columna fisica.
        // Los alias van EN MINUSCULAS y son el nombre FISICO de la columna.
        // `select('b.blo_ofertaid', 'ofertaId')` produce una clave `ofertaId`, y
        // leer `fila.ofertaid` daria `undefined`: el alias no se pliega a
        // minuscula. Nombrando el alias igual que la columna no hay nada que
        // traducir y el resultado es el mismo lea como lea.
        const bloqueo = await this.reservaRepo
          .createQueryBuilder('r')
          .innerJoin('r.bloqueoCupo', 'b')
          .innerJoin('b.itinerarios', 'bi')
          .select('b.blo_ofertaid', 'ofertaid')
          .addSelect('bi.bli_clasecabina', 'clasecabina')
          .addSelect('bi.bli_marcatarifa', 'marcatarifa')
          .where('r.id_reserva = :reservaId', { reservaId: bookingId })
          .andWhere('bi.bli_itineraryid = :itineraryId', {
            itineraryId: dto.itineraryId,
          })
          .getRawOne<{
            ofertaid: string;
            clasecabina: string;
            marcatarifa: string;
          }>();

        const tarifa = bloqueo
          ? await this.tarifaDelItinerario(
              bloqueo.ofertaid,
              dto.itineraryId,
              bloqueo.clasecabina,
              bloqueo.marcatarifa,
            )
          : null;
        if (!tarifa) {
          // 422 `BAGGAGE_LIMIT_EXCEEDED` es el unico miembro de equipaje del
          // catalogo, y lo que falta es la tarifa que define el limite. Se usa con
          // un mensaje que explica la causa real.
          throw noProcesable(
            CodigoProblema.BAGGAGE_LIMIT_EXCEEDED,
            'No hay tarifa de equipaje cargada para este itinerario.',
          );
        }

        const precioUnitario = Number(tarifa.precioEquipajeExtra);
        const importe = redondear(precioUnitario * dto.quantity);

        // `incluyeBodega` es la inclusion de la tarifa. El maximo total que
        // puede acabar llevando el pasajero es inclusion + comprado + esta compra.
        const equipajes = await this.tarifaEquipajeRepo.findOne({
          where: { teqTarifaCabinaId: tarifa.idTarifaCabina },
        });
        const incluido = equipajes?.incluyeBodega ?? 0;
        const maximoPermitido = incluido + yaComprado + dto.quantity;

        await equipajeRepo.insert({
          idEquipajePasajero: randomUUID(),
          // `pasajeroId` es un `@RelationId`: de solo lectura, asi que un
          // `insert` con esa propiedad NO escribe `eqp_pasajeroid` y la columna,
          // que es NOT NULL, acaba en NULL. Hay que pasar la RELACION anidada.
          pasajero: { idPasajero: pasajero.idPasajero } as Pasajero,
          itineraryId: dto.itineraryId,
          cantidad: dto.quantity,
          maximoPermitido: maximoPermitido,
          moneda: tarifa.moneda,
          precio: aImporte(importe),
          referenciaPago: dto.payment.paymentReference,
          fechaCompra: new Date(),
        });

        await eventoRepo.insert({
          tipoEvento: 'booking.baggage_added',
          ocurridoEn: new Date(),
          versionApi: VERSION_EVENTO,
          datos: {
            bookingId: bookingId,
            passengerId: dto.passengerId,
            itineraryId: dto.itineraryId,
            quantity: dto.quantity,
            amount: aImporte(importe),
            currency: tarifa.moneda,
          },
          entidadOrigen: 'reserva',
          entidadId: bookingId,
        });

        return {
          passengerId: dto.passengerId,
          itineraryId: dto.itineraryId,
          totalBaggage: yaComprado + dto.quantity,
          amountCharged: aImporte(importe),
          currency: tarifa.moneda,
        } as BaggageAddedResponseDto;
      });

      await this.idempotenciaRepo.update(
        { clave: idempotencyKey },
        {
          estado: EstadoIdempotencia.COMPLETED,
          codigoHttp: 200,
          respuesta: respuesta as unknown as Record<string, unknown>,
        },
      );

      return respuesta;
    } catch (error) {
      await this.idempotenciaRepo.update(
        { clave: idempotencyKey },
        { estado: EstadoIdempotencia.FAILED },
      );
      throw error;
    }
  }

  /**
   * La `tarifa_cabina` de un itinerario de una reserva.
   *
   * ── Por que este metodo y no dos resoluciones ───────────────────────────────
   * `/baggage-options` (Fase 8) y `/baggage` (Fase 9) necesitan la MISMA tarifa:
   * uno para MOSTRAR el precio y otro para COBRARLO. Tenian dos resoluciones
   * distintas, y `/baggage` respondia 422 "no hay tarifa cargada" mientras
   * `/baggage-options` mostraba 30.00 en la MISMA reserva, a la MISMA hora. Dos
   * caminos para la misma pregunta solo pueden discrepar; ahora hay uno.
   *
   * La cadena son tres saltos y cada uno tiene su trampa:
   *   1. `ofertaId` es el UUID de la OFERTA, no el del hold.
   *   2. `oferta_itinerario` se busca por (oferta, `itineraryId` de negocio).
   *   3. `tarifa_cabina.tca_itinerarioid` referencia el UUID de
   *      `oferta_itinerario`; junto a cabina y marca forma la clave UNIQUE.
   */
  private async tarifaDelItinerario(
    ofertaId: string | null,
    itineraryId: string,
    claseCabina: string,
    marcaTarifa: string,
  ): Promise<TarifaCabina | null> {
    if (!ofertaId) return null;

    const ofertaItin = await this.ofertaItinerarioRepo
      .createQueryBuilder('oi')
      .where('oi.oit_ofertaid = :ofertaId', { ofertaId })
      .andWhere('oi.oit_itineraryid = :itineraryId', { itineraryId })
      .getOne();
    if (!ofertaItin) return null;

    // `tca_itinerarioid` es un `@RelationId` en la entidad: no admite `where`.
    return this.tarifaCabinaRepo
      .createQueryBuilder('tc')
      .where('tc.tca_itinerarioid = :idOfertaItin', {
        idOfertaItin: ofertaItin.idOfertaItinerario,
      })
      .andWhere('tc.tca_clasecabina = :cabina', { cabina: claseCabina })
      .andWhere('tc.tca_marcatarifa = :marca', { marca: marcaTarifa })
      .getOne();
  }

  // =========================================================================
  // FASE 10 · Estado de vuelo (publico) y suscripciones a webhooks
  // =========================================================================

  /**
   * `GET /flights/{flightNumber}/status` — endpoint PUBLICO.
   *
   * El contrato declara `security: []`: sin credenciales, sin RLS y sin
   * propietario. Por eso aqui no se toca `propietarioDesde` ni ninguna politica
   * de aislamiento. Es la replica de los tableros de aeropuerto, que son de
   * libre acceso.
   *
   * ── Por que la fecha se compara como `date` ─────────────────────────────────
   * `vue_fecha` es de tipo `date` y `vue_horaSalidaProgramada` un
   * `timestamptz`. Filtrar por un rango de timestamps que cubra el dia entero es
   * la via ingenua, y falla por la zona horaria: un vuelo que sale a las 23:40
   * con el servidor en UTC-5 cae en el dia siguiente segun UTC, y el panel
   * responderia "vuelo no encontrado" para un vuelo que existe. Comparar
   * `vue_fecha` contra el `date` recibido elimina la zona horaria del camino.
   *
   * `UNIQUE (vue_numeroVuelo, vue_fecha)` garantiza que hay a lo sumo una fila,
   * asi que no hay que desambiguar con un segundo criterio.
   *
   * ── El numero de vuelo se normaliza ─────────────────────────────────────────
   * `vue_numeroVuelo` es `varchar(10)` sin CHECK de mayusculas, asi que la base
   * admite `la4041` y `LA4041` como filas distintas. Un usuario escribe
   * `la4041` en un movil y espera encontrarlo. Se pasa a mayusculas y se
   * recortan espacios; el DDL ya garantiza que el almacenado es consistente.
   */
  async estadoVuelo(
    flightNumber: string,
    query: FlightStatusQueryDto,
  ): Promise<FlightStatusDto> {
    const numero = flightNumber.trim().toUpperCase();

    // `id_aerolinea` ES el codigo IATA: es la PK y el CHECK exige `^[A-Z]{3}$`.
    //
    // El codigo se lee con `getRawAndEntities`, no con `getOne`. Un
    // `addSelect(... , 'alias')` no se adjunta a la entidad devuelta: vive en la
    // parte `raw`, y leerlo de la entidad daba `undefined`, con lo que el
    // `carrier()` caia siempre en el respaldo y devolvia `"LA4"` (tres letras
    // del numero de vuelo) en vez de `"LAT"`. Es el mismo tipo de fallo que el
    // de los alias de `getRawMany`, resuelto aqui leyendo la parte correcta.
    const { entities, raw } = await this.vueloRepo
      .createQueryBuilder('v')
      .leftJoin('v.aerolineaMarketing', 'mkt')
      .leftJoin('v.aerolineaOperadora', 'ope')
      .addSelect('mkt.id_aerolinea', 'mkt_codigo')
      .addSelect('ope.id_aerolinea', 'ope_codigo')
      .where('v.vue_numerovuelo = :numero', { numero })
      .andWhere('v.vue_fecha = :fecha', { fecha: query.date })
      .getRawAndEntities();

    const vuelo = entities[0];
    if (!vuelo) {
      // `FLIGHT_STATUS_NOT_AVAILABLE` con 404, no un `NotFoundException` a secas.
      //
      // `codigo_error` reserva ese miembro EXACTAMENTE para este caso y le asigna
      // el 404, y el contrato declara `code` como obligatorio en `ProblemDetails`.
      // Un `NotFoundException` desnudo deja la respuesta sin `code`, que es justo
      // lo que la Fase 11 vino a arreglar: un integrador que recibe un 404 no
      // puede distinguir "vuelo no encontrado" de "estado no disponible" sin
      // leer el texto, que es fragile.
      throw new ProblemaApi(
        CodigoProblema.FLIGHT_STATUS_NOT_AVAILABLE,
        `No hay ningun vuelo ${numero} con salida el ${query.date}.`,
      );
    }

    // Los alias se leen en minuscula y son el nombre fisico de la columna.
    const codigoMarketing = (raw[0] as { mkt_codigo?: string } | undefined)?.mkt_codigo ?? null;
    const codigoOperadora = (raw[0] as { ope_codigo?: string } | undefined)?.ope_codigo ?? null;

    // Si los JOIN no devolvieron nada se cae al numero de vuelo, que empieza por
    // el codigo del transportador: es la mejor aproximacion posible sin la
    // aerolinea, y es lo que el pasajero reconoceria.
    const carrier = (codigo: string | null, vueloNumero: string) =>
      codigo ?? vueloNumero.slice(0, 3).toUpperCase();

    return {
      flightNumber: vuelo.numeroVuelo,
      // `vue_fecha` es `date` y el driver puede devolverlo como texto o como
      // `Date`; `aFechaIso` cubre los dos casos.
      date: aFechaIso(vuelo.fecha),
      marketingCarrier: carrier(codigoMarketing, vuelo.numeroVuelo),
      operatingCarrier: carrier(codigoOperadora, vuelo.numeroVuelo),
      departure: {
        iataCode: vuelo.aeropuertoOrigen,
        terminal: vuelo.terminalOrigen,
        scheduledAt: vuelo.horaSalidaProgramada.toISOString(),
        estimatedAt: vuelo.horaSalidaEstimada
          ? vuelo.horaSalidaEstimada.toISOString()
          : null,
        actualAt: vuelo.horaSalidaReal ? vuelo.horaSalidaReal.toISOString() : null,
      },
      arrival: {
        iataCode: vuelo.aeropuertoDestino,
        terminal: vuelo.terminalDestino,
        scheduledAt: vuelo.horaLlegadaProgramada.toISOString(),
        estimatedAt: vuelo.horaLlegadaEstimada
          ? vuelo.horaLlegadaEstimada.toISOString()
          : null,
        actualAt: vuelo.horaLlegadaReal ? vuelo.horaLlegadaReal.toISOString() : null,
      },
      aircraft: vuelo.aeronave,
      status: vuelo.estado,
    };
  }

  /**
   * `GET /webhooks` — suscripciones ACTIVAS del propietario.
   *
   * El contrato describe la respuesta como "Suscripciones activas", asi que se
   * filtra `swb_activo = true`. Las borradas siguen en la base (ver
   * `eliminarWebhook`) y por eso el filtro es explicito y no accidental.
   */
  async listarWebhooks(propietarioId: string): Promise<WebhookSubscriptionDto[]> {
    const filas = await this.suscripcionWebhookRepo
      .createQueryBuilder('s')
      .where('s.swb_propietarioid = :propietarioId', { propietarioId })
      .andWhere('s.swb_activo = true')
      .orderBy('s.swb_fechacreacion', 'DESC')
      .getMany();

    return filas.map((f) => this.aWebhookDto(f));
  }

  /**
   * `POST /webhooks` — registra una suscripcion.
   *
   * ── El secreto se guarda como SHA-256, NO cifrado ──────────────────────────
   * La columna es `swb_secretCifrado` y el nombre sugiere cifrado, pero este
   * proyecto no tiene gestion de claves ni un worker de entrega. Un hash es lo
   * que permite NO guardar el secreto en claro sin inventar infraestructura: la
   * API nunca necesita leerlo, solo verificarlo.
   *
   * Cuando exista el worker de entrega, esto HABRA que cambiar por cifrado de
   * sobre (envelope encryption) con KMS: el worker necesita el secreto EN
   * CLARO para calcular la firma HMAC de cada evento. Un hash no le sirve. Es la
   * limitacion consciente que se hereda de no tener esa pieza todavia.
   */
  async crearWebhook(
    dto: CreateWebhookDto,
    propietarioId: string,
  ): Promise<WebhookSubscriptionDto> {
    // `https` lo valida el DTO, pero el DDL tambien lo exige. Se comprueba aqui
    // para fallar con un 400 explicito en vez de un 23514 dentro de un 500.
    if (!dto.url.toLowerCase().startsWith('https://')) {
      throw new BadRequestException(
        'La URL del webhook debe usar https. El protocolo http no se acepta.',
      );
    }

    const creada = await this.suscripcionWebhookRepo.save(
      this.suscripcionWebhookRepo.create({
        propietarioId: propietarioId,
        url: dto.url,
        // El DTO habla `events` (contrato) y la entidad `eventos` (DDL).
        eventos: dto.events as unknown as TipoEventoWebhook[],
        secretCifrado: Buffer.from(sha256(dto.secret), 'hex'),
        activo: true,
      }),
    );

    return this.aWebhookDto(creada);
  }

  /**
   * `DELETE /webhooks/{id}` — BORRADO LOGICO, responde 204.
   *
   * ── Por que logico y no fisico ─────────────────────────────────────────────
   * El DDL trae `swb_activo` y `entrega_webhook` referencia la suscripcion con
   * `ON DELETE CASCADE`. Un borrado fisico se lleva por delante el historial de
   * entregas: quedaria sin registro de que se notifico a un integrador, o de
   * que la entrega fallo tres veces. Eso es justo lo que un integrador B2B
   * necesita poder auditar cuando discrepa de un evento.
   *
   * Ademas `GET /webhooks` describe su respuesta como "Suscripciones activas",
   * lo que encaja con marcar `activo = false` y filtrar.
   *
   * 404 si la suscripcion no existe **o no es de este propietario**. No 403: igual
   * que en el resto del modulo, confirmar que existe una suscripcion ajena ya es
   * filtrar informacion sobre ella.
   */
  async eliminarWebhook(id: string, propietarioId: string): Promise<void> {
    const fila = await this.suscripcionWebhookRepo
      .createQueryBuilder('s')
      .where('s.id_suscripcion_webhook = :id', { id })
      .andWhere('s.swb_propietarioid = :propietarioId', { propietarioId })
      .andWhere('s.swb_activo = true')
      .getOne();

    if (!fila) {
      throw new NotFoundException(`La suscripcion '${id}' no existe.`);
    }

    await this.suscripcionWebhookRepo.update(
      { idSuscripcionWebhook: id },
      { activo: false },
    );
  }

  /**
   * `SuscripcionWebhook` -> `WebhookSubscriptionDto`, con el secreto enmascarado.
   *
   * La mascara guarda los cuatro ultimos caracteres del hash, no del secreto: el
   * hash es lo unico que se tiene, y cuatro caracteres bastan para que el
   * integrador distinga una suscripcion de otra sin revelar nada.
   */
  private aWebhookDto(fila: SuscripcionWebhook): WebhookSubscriptionDto {
    const huella = fila.secretCifrado.toString('hex').slice(-4);
    return {
      id: fila.idSuscripcionWebhook,
      url: fila.url,
      events: fila.eventos as unknown as string[],
      secret: 'whsec_...' + huella,
      createdAt: fila.fechaCreacion.toISOString(),
      active: fila.activo,
    };
  }

  // =========================================================================
  // FASE 11 · Emision de billetes, consulta de ticket, pases y cambio de fecha
  // =========================================================================

  /**
   * Emite los boletos de una reserva. Endpoint de DISEÑO, no del contrato.
   *
   * ── Por que hace falta ──────────────────────────────────────────────────────
   * `createBooking` (Fase 7) recorre `PENDING -> TICKET_ISSUING -> CONFIRMED` pero
   * nunca escribia filas en `boleto`. El resultado era una reserva `CONFIRMED`
   * sin boleto que, ademas, no podia emitirlos nunca: `tg_reserva_transicion` solo
   * admite entrar en `TICKET_ISSUING` desde `PENDING`, y desde `CONFIRMED` no hay
   * ninguna arista de vuelta. Cinco de las seis reservas de la base estaban en ese
   * estado, y por eso el pase de abordar se sembraba a mano.
   *
   * Este endpoint cierra el hueco, y `createBooking` pasa a llamar a la MISMA
   * rutina para que el camino normal tambien emita.
   *
   * ── Tres caminos, y solo uno toca la maquina de estados ─────────────────────
   * · `PENDING`        -> `TICKET_ISSUING` -> `CONFIRMED`. Dos updates, porque el
   *                       trigger prohibe el salto, y `res_version` suma dos.
   * · `TICKET_ISSUING` -> `CONFIRMED`. Reanuda una emision que quedo a medias.
   * · `CONFIRMED`      -> NO se transiciona. Aqui solo se rellenan los boletos que
   *                       falten, porque volver a `TICKET_ISSUING` es imposible
   *                       segun el trigger. Es raro pero coherente: la reserva ya
   *                       esta confirmada, lo que falta es la fila, no una
   *                       transicion.
   *
   * IDEMPOTENTE por construccion: `UNIQUE (bol_reservaid, bol_pasajeroid)` impide
   * duplicar y solo se insertan los que faltan. Un segundo POST responde 200 con
   * `issued: 0`.
   */
  async emitirBoletos(
    bookingId: string,
    propietarioId: string,
  ): Promise<TicketIssuanceResponseDto> {
    await this.exigirReservaPropia(bookingId, propietarioId, { pasajeros: true });

    return this.dataSource.transaction(async (manager) => {
      const reservaRepo = manager.getRepository(Reserva);
      const boletoRepo = manager.getRepository(Boleto);
      const boletoSegmentoRepo = manager.getRepository(BoletoSegmento);
      const eventoRepo = manager.getRepository(EventoWebhook);

      const reserva = await reservaRepo.findOne({ where: { idReserva: bookingId } });
      if (!reserva) {
        throw new NotFoundException(`La reserva '${bookingId}' no existe.`);
      }

      if (
        reserva.estado !== EstadoReserva.PENDING &&
        reserva.estado !== EstadoReserva.TICKET_ISSUING &&
        reserva.estado !== EstadoReserva.CONFIRMED
      ) {
        throw conflicto(
          CodigoProblema.BOOKING_NOT_CONFIRMED,
          `La reserva '${reserva.pnr}' esta en ${reserva.estado} y no admite emision de billetes.`,
        );
      }

      const segmentos = await this.segmentosDeReserva(manager, bookingId);
      if (segmentos.length === 0) {
        throw noProcesable(
          CodigoProblema.TICKET_ISSUANCE_FAILED,
          'La reserva no tiene segmentos de vuelo que emitir.',
        );
      }

      // PENDING necesita el paso intermedio obligatorio. Se hace ANTES de crear
      // los boletos: si la emision falla a mitad, la reserva se queda en
      // TICKET_ISSUING y un reintento de este mismo endpoint la cierra.
      if (reserva.estado === EstadoReserva.PENDING) {
        await reservaRepo.update(
          { idReserva: bookingId },
          { estado: EstadoReserva.TICKET_ISSUING, version: reserva.version + 1 },
        );
      }

      const pnr = reserva.pnr ?? bookingId;
      const creados = await this.emitirBoletosDe(manager, bookingId, pnr);

      // Solo se cierra la transicion si este endpoint la ha abierto. Si la reserva
      // ya estaba CONFIRMED, ni `estado` ni `version` se tocan: no ha pasado nada
      // que versionar.
      if (reserva.estado !== EstadoReserva.CONFIRMED) {
        await reservaRepo.update(
          { idReserva: bookingId },
          { estado: EstadoReserva.CONFIRMED, version: reserva.version + 2 },
        );
      }

      if (creados > 0) {
        await eventoRepo.insert({
          tipoEvento: 'booking.ticket_issued',
          ocurridoEn: new Date(),
          versionApi: VERSION_EVENTO,
          datos: {
            bookingId: bookingId,
            pnr: pnr,
            boletosEmitidos: creados,
            estadoAnterior: reserva.estado,
          },
          entidadOrigen: 'reserva',
          entidadId: bookingId,
        });
      }

      return {
        bookingId: bookingId,
        pnr: pnr,
        status: EstadoReserva.CONFIRMED,
        tickets: await this.ticketsDeReserva(manager, bookingId),
        issued: creados,
      };
    });
  }

  /**
   * Persiste los `assignedSeats` que eligio el pasajero al comprar.
   *
   * ── Por que se comprueba y no se guarda a ciegas ────────────────────────────
   * El DTO acepta `assignedSeats` desde la Fase 7 pero no lo guardaba, asi que un
   * cliente podia pedir el 12A de un vuelo donde otro acababa de tomarlo y no se
   * enteraba hasta el check-in, cuando ya no hay nada que hacer. Aqui el asiento
   * se ocupa en la MISMA transaccion que la reserva: o salen los dos, o no sale
   * ninguno.
   *
   * Se verifica contra `asiento_vuelo` del vuelo de ese segmento y se marca
   * `asi_estadisponible = false`. Sin ese marcado, dos reservas podrian vender la
   * misma butaca, que es un sobreventa.
   *
   * ── Por que el segmento se busca por `segmentId` de negocio ────────────────
   * `asiento_asignado` no tiene FK al vuelo: guarda `asa_segmentid`. Es el mismo
   * identificador que stably preserva el cambio de fecha, y por eso el asiento
   * sigue siendo el mismo despues de mudar de vuelo.
   */
  private async asignarAsientosDeCompra(
    manager: EntityManager,
    reservaId: string,
    segmentos: BookingItineraryDto[],
    pasajeros: BookingRequestDto['passengers'],
  ): Promise<void> {
    const pedidos = pasajeros.flatMap((p) =>
      (p.assignedSeats ?? []).map((asiento) => ({
        pasajeroId: p.passengerId,
        segmentId: asiento.segmentId,
        numeroAsiento: asiento.seatNumber,
      })),
    );
    if (pedidos.length === 0) return;

    const segmentoRepo = manager.getRepository(ReservaSegmento);
    const asientoRepo = manager.getRepository(AsientoVuelo);
    const pasajeroRepo = manager.getRepository(Pasajero);
    const asignarRepo = manager.getRepository(AsientoAsignado);

    // El vuelo de cada segmento se resuelve desde `reserva_segmento`, no desde el
    // DTO: `copiarItinerarios` devuelve `BookingItineraryDto[]`, que lleva el
    // `segmentId` pero no el UUID del vuelo, y `asiento_vuelo` se busca por
    // `asi_vueloid`.
    const filas = await segmentoRepo
      .createQueryBuilder('rsg')
      .innerJoin('rsg.itinerario', 'rit')
      .select('rsg.rsg_segmentid', 'segmentid')
      .addSelect('rsg.rsg_vueloid', 'vueloid')
      .where('rit.rit_reservaid = :reservaId', { reservaId })
      .getRawMany<{ segmentid: string; vueloid: string }>();
    const vueloPorSegmento = new Map(filas.map((f) => [f.segmentid, f.vueloid]));

    // `assignedSeats` usa el identificador de NEGOCIO del pasajero (`pax-1`) y
    // `asiento_asignado.asa_pasajeroid` es su UUID. Se cruzan con las ENTIDADES,
    // no con `raw`: en `getRawAndEntities` las columnas de la entidad salen
    // prefijadas por el alias (`pax_id_pasajero`) y el `addSelect` con alias
    // introduces una segunda convention mas. Con `getMany` no hay nada que
    // acertar.
    // Nombre distinto del parametro `pasajeros` a proposito: ese es la lista de
    // DTOs que viene en la peticion, y esta la que se lee de la base.
    const pasajerosDeLaReserva = await pasajeroRepo
      .createQueryBuilder('pax')
      .where('pax.pas_reservaid = :reservaId', { reservaId })
      .getMany();
    const idsPasajeros = new Map(
      pasajerosDeLaReserva.map((p) => [p.passengerId, p.idPasajero]),
    );

    for (const pedido of pedidos) {
      const vueloId = vueloPorSegmento.get(pedido.segmentId);
      if (!vueloId) {
        throw conflicto(
          CodigoProblema.SEAT_CABIN_MISMATCH,
          `El segmento '${pedido.segmentId}' no pertenece a esta reserva.`,
        );
      }

      const asiento = await asientoRepo
        .createQueryBuilder('a')
        .where('a.asi_vueloid = :vueloId', { vueloId })
        .andWhere('a.asi_numeroasiento = :asiento', { asiento: pedido.numeroAsiento })
        .getOne();

      if (!asiento) {
        throw conflicto(
          CodigoProblema.SEAT_TAKEN,
          `El asiento ${pedido.numeroAsiento} no existe en el vuelo de ese segmento.`,
        );
      }
      if (!asiento.estaDisponible) {
        throw conflicto(
          CodigoProblema.SEAT_TAKEN,
          `El asiento ${pedido.numeroAsiento} ya no esta disponible.`,
        );
      }

      // `createQueryBuilder('a').update()` NO vale para un UPDATE: el constructor
      // de alias mete `a.` en el WHERE y PostgreSQL lo rechaza con "falta una
      // entrada para la tabla a en la clausula FROM", porque en un UPDATE el alias
      // de la tabla destino no se puede anteponer a las columnas del WHERE.
      // Sin alias (`createQueryBuilder()`) el UPDATE sale bien formado.
      await manager
        .createQueryBuilder()
        .update(AsientoVuelo)
        .set({ estaDisponible: false })
        .where('asi_vueloid = :vueloId', { vueloId })
        .andWhere('asi_numeroasiento = :asiento', { asiento: pedido.numeroAsiento })
        .execute();

      const idPasajero = idsPasajeros.get(pedido.pasajeroId);
      if (!idPasajero) {
        throw new NotFoundException(
          `No se encuentra al pasajero '${pedido.pasajeroId}' en la reserva.`,
        );
      }

      await asignarRepo.save(
        asignarRepo.create({
          // FK por la RELACION: `asa_pasajeroid` es `@RelationId` y no escribe la
          // columna, que ademas es NOT NULL.
          pasajero: { idPasajero: idPasajero } as Pasajero,
          segmentId: pedido.segmentId,
          numeroAsiento: pedido.numeroAsiento,
        }),
      );
    }
  }

  /**
   * Nucleo de la emision: crea un boleto por pasajero y uno por segmento, solo de
   * los que falten. Devuelve cuantos ha creado.
   *
   * Lo comparten `createBooking` y `POST /bookings/{id}/tickets` a proposito. Son el
   * mismo proceso de negocio —emitir el boleto de una reserva— y mantener dos
   * copias solo permite que diverjan, que es justo lo que paso en la Fase 7:
   * `createBooking` recorria `PENDING -> TICKET_ISSUING -> CONFIRMED` sin escribir
   * nada en `boleto`.
   *
   * NO toca el estado de la reserva: quien llama decide la transicion, porque cada
   * punto de entrada tiene una maquina de estados distinta que cumplir.
   *
   * Idempotente por construccion: `UNIQUE (bol_reservaid, bol_pasajeroid)` impide
   * duplicar y el filtro `yaEmitidos` evita siquiera intentarlo.
   */
  private async emitirBoletosDe(
    manager: EntityManager,
    reservaId: string,
    pnr: string,
  ): Promise<number> {
    const boletoRepo = manager.getRepository(Boleto);
    const boletoSegmentoRepo = manager.getRepository(BoletoSegmento);

    const segmentos = await this.segmentosDeReserva(manager, reservaId);
    if (segmentos.length === 0) return 0;

    // Los pasajeros se leen AQUI y no se reciben como parametro. En `createBooking`
    // acaban de insertarse y no estan cargados en la entidad `Reserva` de la
    // transaccion; leerlos por el repositorio global, ademas, podria no verlos.
    const pasajeros = await manager
      .getRepository(Pasajero)
      .createQueryBuilder('pax')
      .where('pax.pas_reservaid = :reservaId', { reservaId })
      .orderBy('pax.pas_orden', 'ASC')
      .getMany();

    // `Boleto.reservaId` y `Boleto.pasajeroId` son `@RelationId`: propiedades
    // VIRTUALES que no existen como columna en la metadata. Filtrar por ellas lanza
    // `EntityPropertyNotFoundError: Property "reservaId" was not found in "Boleto"`.
    // La forma de consultar una FK asi es la RELACION anidada.
    const yaEmitidos = new Set(
      (await boletoRepo.find({ where: { reserva: { idReserva: reservaId } } })).map(
        (b) => b.pasajeroId,
      ),
    );

    let creados = 0;
    for (const pasajero of pasajeros) {
      if (yaEmitidos.has(pasajero.idPasajero)) continue;

      const boleto = await boletoRepo.save(
        boletoRepo.create({
          // `bol_ticketId` es de NEGOCIO y `UNIQUE`. Se deriva de un SHA-256 del
          // PNR y el pasajero: ESTABLE, de modo que un reintento tras un fallo a
          // mitad produce el MISMO numero en vez de uno nuevo. Con `random` un
          // reintento crearia un segundo boleto, que es justo lo que `UNIQUE` no
          // puede impedir.
          ticketId:
            'TKT-' +
            sha256(`${pnr}:${pasajero.passengerId}`).slice(0, 12).toUpperCase(),
          // `bol_reservaid` y `bol_pasajeroid` son NOT NULL, y sus propiedades
          // `reservaId`/`pasajeroId` son `@RelationId`: NO escriben la columna. Un
          // `{ reservaId }` a secas deja la FK a NULL y el INSERT revienta con
          // "el valor nulo en la columna bol_reservaid viola la restriccion de no
          // nulo". Se escriben por la RELACION, que es la unica via.
          reserva: { idReserva: reservaId } as Reserva,
          pasajero: { idPasajero: pasajero.idPasajero } as Pasajero,
          numeroBoleto: numeroDeBoleto(pnr, pasajero.passengerId),
          estado: EstadoTicket.ISSUED,
          fechaEmision: new Date(),
          motivoFallo: null,
        }),
      );
      creados += 1;

      for (const segmento of segmentos) {
        await boletoSegmentoRepo.save(
          boletoSegmentoRepo.create({
            // `bse_boletoid` es NOT NULL y `boletoId` es un `@RelationId`: un
            // `{ boletoId }` a secas no escribiria la columna y el INSERT fallaria
            // con una violacion de NOT NULL. Se escribe por la RELACION.
            boleto: { idBoleto: boleto.idBoleto } as Boleto,
            segmentId: segmento.segmentId,
            estado: EstadoTicketSegmento.ISSUED,
            // El cupon es lo que escanea el mostrador. Cumple `^[0-9]{13}$`.
            numeroCupon: cuponDeBoleto(boleto.numeroBoleto, segmento.segmentId),
          }),
        );
      }
    }

    return creados;
  }

  /**
   * `GET /bookings/{id}/tickets/{ticketId}` — un boleto concreto.
   *
   * `ticketId` es `bol_ticketId`, el identificador de NEGOCIO (varchar con
   * `UNIQUE`), no el UUID interno de la fila.
   *
   * Se filtra por `bookingId` Y `ticketId`. Con solo el segundo bastaria, porque es
   * unico, pero incluir la reserva impide leer desde esta ruta un boleto de otra
   * reserva: es el mismo aislamiento que el resto del modulo.
   */
  async obtenerTicket(
    bookingId: string,
    ticketId: string,
    propietarioId: string,
  ): Promise<TicketDetailDto> {
    await this.exigirReservaPropia(bookingId, propietarioId);

    // `reservaId` es `@RelationId` y no se puede filtrar: va la RELACION anidada.
    // `ticketId` si es un `@Column` real (`bol_ticketid`) y se filtra directo.
    const boleto = await this.boletoRepo.findOne({
      where: { reserva: { idReserva: bookingId }, ticketId: ticketId },
      relations: { pasajero: true, segmentos: true },
    });

    if (!boleto) {
      throw new NotFoundException(
        `El ticket '${ticketId}' no pertenece a esta reserva.`,
      );
    }

    const segmentos = await this.todosSegmentosDe(bookingId);
    const porSegment = new Map(segmentos.map((s) => [s.segmentId, s]));
    const asientos = await this.asientosDeReserva(bookingId);

    return {
      ticketId: boleto.ticketId,
      bookingId: boleto.reservaId,
      passengerId: boleto.pasajero?.passengerId ?? '',
      passengerName:
        `${boleto.pasajero?.nombre ?? ''} ${boleto.pasajero?.apellido ?? ''}`.trim() ||
        undefined,
      eTicketNumber: boleto.numeroBoleto,
      status: boleto.estado,
      issuedAt: boleto.fechaEmision ? boleto.fechaEmision.toISOString() : null,
      failureReason: boleto.motivoFallo,
      segments: (boleto.segmentos ?? []).map((seg) => {
        const original = porSegment.get(seg.segmentId);
        return {
          segmentId: seg.segmentId,
          status: seg.estado,
          couponNumber: seg.numeroCupon,
          flightNumber: original?.vuelo?.numeroVuelo,
          departureIataCode: original?.vuelo?.aeropuertoOrigen,
          departureAt: original?.vuelo?.horaSalidaProgramada?.toISOString(),
          arrivalIataCode: original?.vuelo?.aeropuertoDestino,
          arrivalAt: original?.vuelo?.horaLlegadaProgramada?.toISOString(),
          seatNumber:
            asientos.get(`${boleto.pasajero?.passengerId}:${seg.segmentId}`) ?? null,
        };
      }),
    };
  }

  /**
   * `GET /bookings/{id}/boarding-passes` — los pases emitidos en el check-in.
   *
   * Una lista VACIA no es un error: es una reserva que aun no ha hecho check-in, y
   * la UI necesita distinguirlo de un check-in fallido. Por eso la respuesta lleva
   * `checkedIn` ademas del array: con el array a solas, `[]` significaria "todavia
   * no" y "fallo" a la vez.
   */
  async listarPases(
    bookingId: string,
    propietarioId: string,
  ): Promise<BoardingPassListResponseDto> {
    const reserva = await this.exigirReservaPropia(bookingId, propietarioId);

    // `pase_abordar` cuelga de `boleto`, y `boleto` de la reserva. Se llega por la
    // reserva y no por UUIDs sueltos para no abrir una via de lectura sobre otros
    // viajes.
    //
    // `pax.pas_pasengerid` se trae como ALIAS en minusculas: los alias de
    // `addSelect` conservan las mayusculas, y `JSON.stringify` omite las claves
    // `undefined`, asi que un alias en camelCase desaparecia del JSON sin avisar.
    const pases = await this.paseAbordarRepo
      .createQueryBuilder('pase')
      .innerJoin('pase.boleto', 'b')
      .innerJoin('pase.pasajero', 'pax')
      .addSelect('pax.pas_pasengerid', 'paxnegocio')
      .where('b.bol_reservaid = :bookingId', { bookingId })
      .orderBy('pax.pas_orden', 'ASC')
      .addOrderBy('pase.pab_segmentid', 'ASC')
      .getRawAndEntities();

    const segmentos = await this.todosSegmentosDe(bookingId);
    const porSegment = new Map(segmentos.map((s) => [s.segmentId, s]));

    return {
      bookingId: bookingId,
      checkedIn: pases.entities.length > 0,
      boardingPasses: pases.entities.map((pase, indice) => {
        const seg = porSegment.get(pase.segmentId);
        const negocio = pases.raw[indice]?.['paxnegocio'] as string | undefined;
        return {
          passengerId: negocio ?? '',
          segmentId: pase.segmentId,
          seat: pase.asiento,
          boardingGroup: pase.grupoAbordaje,
          boardingPosition: pase.posicionAbordaje,
          barcode: pase.codigoBarras,
          barcodeType: pase.tipoCodigoBarras,
          flightNumber: seg?.vuelo?.numeroVuelo,
          departureAt: seg?.vuelo?.horaSalidaProgramada?.toISOString(),
          departureIataCode: seg?.vuelo?.aeropuertoOrigen,
          arrivalIataCode: seg?.vuelo?.aeropuertoDestino,
          arrivalAt: seg?.vuelo?.horaLlegadaProgramada?.toISOString(),
          pnr: reserva.pnr ?? undefined,
        };
      }),
    };
  }

  /**
   * `POST /bookings/{id}/date-change/search` — busca vuelos para mudar de dia.
   *
   * NO toca la reserva. Escribe una `oferta_cambio_fecha` en `VALID` con la
   * vigencia por defecto del DDL (30 minutos) y una fila por segmento en
   * `oferta_cambio_segmento`.
   *
   * ── El `segmentId` NO cambia al mudar de vuelo ──────────────────────────────
   * `oferta_cambio_segmento` tiene PK `(ocs_ofertaCambioFechaId, ocs_segmentId)` y
   * su `ocs_vueloid` apunta al vuelo NUEVO. El identificador de negocio del
   * segmento se conserva y solo se reapunta el vuelo, y por eso el boleto, el pase
   * y el asiento asignado siguen siendo validos despues del cambio.
   *
   * ── Solo se modelan importes A PAGAR ───────────────────────────────────────
   * El DDL impone `CHECK (ocf_diferenciaTarifa >= 0)` y
   * `CHECK (ocf_cambioTotalAPagar >= 0)`. Una diferencia negativa (vuelo mas
   * barato) se trunca a 0: este modulo NO devuelve dinero en un cambio de fecha.
   * Es una limitacion del modelo de datos, no una decision de negocio, y por eso
   * `changeFee` se informa como `0.00` en vez de inventar una penalidad que la
   * base no tiene donde guardar.
   */
  async buscarCambioFecha(
    bookingId: string,
    dto: DateChangeSearchRequestDto,
    propietarioId: string,
  ): Promise<DateChangeOfferDto[]> {
    const reserva = await this.exigirReservaPropia(bookingId, propietarioId, {
      itinerarios: { segmentos: { vuelo: true } },
    });

    if (reserva.estado !== EstadoReserva.CONFIRMED) {
      throw conflicto(
        CodigoProblema.BOOKING_NOT_CONFIRMED,
        `Solo una reserva confirmada puede cambiar de fecha. Esta esta en ${reserva.estado}.`,
      );
    }

    const moneda = reserva.moneda || 'USD';
    const ofertas: DateChangeOfferDto[] = [];
    // Se necesitan tantos asientos libres como pasajeros. Con 0 pasajeros seria
    // 0 y cualquier vuelo con un hueco valdria, asi que se fuerza al menos 1.
    const pasajeros = (reserva.pasajeros ?? []).length || 1;

    for (const cambio of dto.changes) {
      const itinerario = (reserva.itinerarios ?? []).find(
        (i) => i.itineraryId === cambio.itineraryId,
      );
      if (!itinerario) {
        throw new NotFoundException(
          `El itinerario '${cambio.itineraryId}' no pertenece a esta reserva.`,
        );
      }

      // El primer segmento define la ruta. En un itinerario con escala habria que
      // recalcular la conexion; este modulo mueve el primer vuelo y no encadena.
      const primerSegmento = (itinerario.segmentos ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden)[0];
      const vueloActual = primerSegmento?.vuelo;
      if (!vueloActual) continue;

      // Misma ruta, otra fecha. Se comparan IATA, no nombres, y la fecha contra
      // `vue_fecha`, que es `date`: comparar un timestamp traeria el desfase de la
      // zona horaria y descartaria el vuelo del dia correcto.
      const candidatos = await this.vueloRepo
        .createQueryBuilder('v')
        .where('v.vue_aeropuertoorigen = :origen', {
          origen: vueloActual.aeropuertoOrigen,
        })
        .andWhere('v.vue_aeropuertodestino = :destino', {
          destino: vueloActual.aeropuertoDestino,
        })
        .andWhere('v.vue_fecha = :fecha', { fecha: cambio.newDepartureDate })
        .andWhere('v.vue_estado <> :cancelado', { cancelado: 'CANCELLED' })
        .orderBy('v.vue_horasalidaprogramada', 'ASC')
        .getMany();

      const tarifaActual = await this.tarifaDeVuelo(vueloActual.idVuelo);

      for (const candidato of candidatos) {
        // El vuelo actual no es candidato: cambiar al mismo vuelo no cambia nada y
        // ensuciaria la lista.
        if (candidato.idVuelo === vueloActual.idVuelo) continue;

        const libres = await this.asientosLibresDe(candidato.idVuelo);
        if (libres < pasajeros) continue;

        const tarifaNueva = await this.tarifaDeVuelo(candidato.idVuelo);
        const baseActual = Number(tarifaActual?.total ?? 0);
        const baseNueva = Number(tarifaNueva?.total ?? 0);

        // `Math.max(0, ...)` implementa el CHECK `>= 0` del DDL: aqui no hay nada a
        // devolver. Sin tarifado cargado ambos son 0 y la diferencia es 0, que se
        // informa tal cual en vez de inventar un importe.
        const difTarifa = Math.max(0, redondear(baseNueva - baseActual));
        // El 8,3% es la proporcion de `tca_impuestos` que usan los datos semilla.
        const difImpuestos = Math.max(0, redondear((baseNueva - baseActual) * 0.083));
        const totalPagar = redondear(difTarifa + difImpuestos);

        const oferta = await this.crearOfertaCambioFecha(bookingId, moneda, {
          diferenciaTarifa: difTarifa,
          diferenciaImpuestos: difImpuestos,
          totalPagar: totalPagar,
          segmentos: [
            {
              segmentId: primerSegmento.segmentId,
              vueloId: candidato.idVuelo,
              itineraryId: cambio.itineraryId,
            },
          ],
        });

        ofertas.push({
          changeOfferId: oferta.idOfertaCambioFecha,
          expiresAt: oferta.fechaExpiracion.toISOString(),
          itineraryId: cambio.itineraryId,
          newDepartureDate: cambio.newDepartureDate,
          segments: [
            {
              segmentId: primerSegmento.segmentId,
              flightNumber: candidato.numeroVuelo,
              departureIataCode: candidato.aeropuertoOrigen,
              arrivalIataCode: candidato.aeropuertoDestino,
              departureAt: candidato.horaSalidaProgramada.toISOString(),
              arrivalAt: candidato.horaLlegadaProgramada.toISOString(),
              availableSeats: libres,
            },
          ],
          priceDifference: {
            fareDifference: aImporte(difTarifa),
            taxDifference: aImporte(difImpuestos),
            // El DDL no tiene columna de penalizacion de cambio: `ocf_motivoRechazo`
            // es texto libre de rechazo, no un cargo. Se informa 0.00.
            changeFee: aImporte(0),
            totalToPay: aImporte(totalPagar),
          },
          currency: moneda,
        });
      }
    }

    return ofertas;
  }

  /**
   * `POST /bookings/{id}/date-change` — aplica el cambio aceptado.
   *
   * Idempotente por `Idempotency-Key`, igual que `/cancel` y `/baggage`.
   *
   * ── 410 y no 409 para la oferta caducada ───────────────────────────────────
   * `codigo_error` da 410 a `CHANGE_OFFER_EXPIRED` y a `OFFER_NO_LONGER_AVAILABLE`,
   * y 410 a `QUOTE_EXPIRED` (la cotizacion de cancelacion). 410 le dice al cliente
   * "vuelve a buscar", mientras que un 409 lo interpretaria como "esta reserva no
   * admite el cambio".
   */
  async confirmarCambioFecha(
    bookingId: string,
    dto: DateChangeRequestDto,
    idempotencyKey: string,
    propietarioId: string,
  ): Promise<{ cuerpo: BookingDetailResponseDto; codigo: 200 | 202 }> {
    const endpoint = 'POST /vuelos/bookings/{id}/date-change';
    const previa = await this.idempotenciaRepo.findOne({
      where: { clave: idempotencyKey },
    });
    if (previa && previa.estado === EstadoIdempotencia.COMPLETED && previa.respuesta) {
      return {
        cuerpo: previa.respuesta as unknown as BookingDetailResponseDto,
        codigo: 200,
      };
    }

    await this.idempotenciaRepo.upsert(
      {
        clave: idempotencyKey,
        propietarioId: propietarioId,
        endpoint: endpoint,
        cuerpoHash: sha256(JSON.stringify(dto)),
        estado: EstadoIdempotencia.IN_PROGRESS,
        codigoHttp: null,
        respuesta: null,
      },
      { conflictPaths: ['clave'], skipUpdateIfNoValuesChanged: true },
    );

    try {
      const resultado = await this.dataSource.transaction(async (manager) => {
        const reservaRepo = manager.getRepository(Reserva);
        const ofertaRepo = manager.getRepository(OfertaCambioFecha);
        const cambioSegmentoRepo = manager.getRepository(OfertaCambioSegmento);
        const segmentoRepo = manager.getRepository(ReservaSegmento);
        const eventoRepo = manager.getRepository(EventoWebhook);

        const reserva = await reservaRepo.findOne({ where: { idReserva: bookingId } });
        if (!reserva || reserva.propietarioId !== propietarioId) {
          throw new NotFoundException(`La reserva '${bookingId}' no existe.`);
        }

        if (reserva.estado !== EstadoReserva.CONFIRMED) {
          throw conflicto(
            CodigoProblema.BOOKING_NOT_CONFIRMED,
            `La reserva '${reserva.pnr}' esta en ${reserva.estado} y no admite cambio de fecha.`,
          );
        }

        const oferta = await ofertaRepo.findOne({
          where: { idOfertaCambioFecha: dto.changeOfferId },
        });
        if (!oferta) {
          throw new NotFoundException(
            `La oferta de cambio '${dto.changeOfferId}' no existe. Vuelve a buscar.`,
          );
        }
        if (oferta.reservaId !== bookingId) {
          throw conflicto(
            CodigoProblema.OFFER_NO_LONGER_AVAILABLE,
            'La oferta de cambio indicada pertenece a otra reserva.',
          );
        }
        if (oferta.estado !== EstadoOfertaCambioFecha.VALID) {
          throw conflicto(
            CodigoProblema.OFFER_NO_LONGER_AVAILABLE,
            `La oferta de cambio ya esta ${oferta.estado} y no se puede reutilizar.`,
          );
        }
        if (oferta.fechaExpiracion.getTime() <= Date.now()) {
          await ofertaRepo.update(
            { idOfertaCambioFecha: dto.changeOfferId },
            { estado: EstadoOfertaCambioFecha.EXPIRED },
          );
          throw new ProblemaApi(
            CodigoProblema.CHANGE_OFFER_EXPIRED,
            'La oferta de cambio ha caducado. Vuelve a buscar para ver los precios actuales.',
          );
        }

        if (Number(oferta.cambioTotalAPagar) > 0 && !dto.payment?.paymentReference) {
          throw conflicto(
            CodigoProblema.PAYMENT_REFERENCE_INVALID,
            'El cambio tiene un importe a pagar y no se ha recibido paymentReference.',
          );
        }

        const segmentosOferta = await cambioSegmentoRepo.find({
          where: { ofertaCambioFechaId: dto.changeOfferId },
        });
        if (segmentosOferta.length === 0) {
          throw conflicto(
            CodigoProblema.OFFER_NO_LONGER_AVAILABLE,
            'La oferta de cambio no tiene segmentos aplicables.',
          );
        }

        await this.reasignarAsientosAlVueloNuevo(
          manager,
          bookingId,
          segmentosOferta,
          dto.assignedSeats,
        );

        // CONFIRMED -> CHANGE_PENDING -> CONFIRMED. DOS updates porque el trigger
        // no admite el salto directo, y `res_version` suma dos.
        await reservaRepo.update(
          { idReserva: bookingId },
          { estado: EstadoReserva.CHANGE_PENDING, version: reserva.version + 1 },
        );

        // Aqui se usa `ocs_segmentId`: se busca el `reserva_segmento` con ESE
        // identificador y se le reapunta el vuelo. El `segmentId` no se toca, y por
        // eso el boleto y el pase siguen siendo validos.
        //
        // ── El filtro TIENE que acotar a ESTA reserva ───────────────────────
        // `rsg_segmentid` NO es unico: el DDL impone `UNIQUE (rsg_itinerarioid,
        // rsg_segmentid)`, o sea que es unico DENTRO de un itinerario, no de la
        // tabla. Y como se deriva del vuelo (`SG-` + 8 hex de `id_vuelo`), TODAS
        // las reservas del mismo vuelo comparten `segmentId`.
        //
        // Un `update({ segmentId }, ...)` a secas movia de vuelo, en la misma
        // transaccion y sin error, a todos los demas pasajeros de ese vuelo. Se
        // detecto al ver que una reserva de demostracion se quedaba SIN SEGMENTOS
        // despues de una prueba de cambio de fecha.
        //
        // No se puede escribir `update({ segmentId, itinerario: { reservaId } })`:
        // un UPDATE no tiene JOIN, y TypeORM falla con "Cannot find alias for
        // relation at itinerario". Por eso el acotado va como SUBCONSULTA sobre
        // `rsg_itinerarioid`, que es la columna fisica del enlace con la reserva.
        for (const segOferta of segmentosOferta) {
          const aplicadas = await manager
            .createQueryBuilder()
            .update(ReservaSegmento)
            .set({ vuelo: { idVuelo: segOferta.vueloId } as Vuelo })
            .where(
              `rsg_itinerarioid IN (
                 SELECT id_reserva_itinerario FROM reserva_itinerario
                  WHERE rit_reservaid = :reservaId)`,
              { reservaId: bookingId },
            )
            .andWhere('rsg_segmentid = :segmentId', { segmentId: segOferta.segmentId })
            .execute();

          // Si no se actualizo exactamente una fila, o el segmento no pertenece a
          // esta reserva o hay duplicados. Se aborta la transaccion en vez de dar
          // por bueno un cambio a medias.
          if (aplicadas.affected !== 1) {
            throw conflicto(
              CodigoProblema.OFFER_NO_LONGER_AVAILABLE,
              `El cambio no se puede aplicar: el segmento '${segOferta.segmentId}' no pertenece de forma unica a esta reserva (${aplicadas.affected ?? 0} filas afectadas).`,
            );
          }
        }

        await ofertaRepo.update(
          { idOfertaCambioFecha: dto.changeOfferId },
          { estado: EstadoOfertaCambioFecha.ACCEPTED },
        );

        await reservaRepo.update(
          { idReserva: bookingId },
          { estado: EstadoReserva.CONFIRMED, version: reserva.version + 2 },
        );

        await eventoRepo.insert({
          tipoEvento: 'booking.changed',
          ocurridoEn: new Date(),
          versionApi: VERSION_EVENTO,
          datos: {
            bookingId: bookingId,
            pnr: reserva.pnr,
            changeOfferId: dto.changeOfferId,
            totalToPay: oferta.cambioTotalAPagar,
            currency: oferta.moneda,
          },
          entidadOrigen: 'reserva',
          entidadId: bookingId,
        });

        return {
          cuerpo: await this.detalleDeReserva(manager, bookingId),
          codigo: 200 as 200 | 202,
        };
      });

      await this.idempotenciaRepo.update(
        { clave: idempotencyKey },
        {
          estado: EstadoIdempotencia.COMPLETED,
          codigoHttp: resultado.codigo,
          respuesta: resultado.cuerpo as unknown as Record<string, unknown>,
        },
      );

      return resultado;
    } catch (error) {
      await this.idempotenciaRepo.update(
        { clave: idempotencyKey },
        { estado: EstadoIdempotencia.FAILED },
      );
      throw error;
    }
  }

  // =========================================================================
  // FASE 11 · Auxiliares privados
  // =========================================================================

  /**
   * Los segmentos de una reserva CON su vuelo, dentro de una transaccion.
   *
   * Existe aparte de `todosSegmentosDe` porque ese usa `this.reservaRepo`, que lee
   * FUERA de la transaccion. Con `manager` la lectura ve exactamente lo que ha
   * escrito la propia transaccion, que es lo que necesita `emitirBoletos` para no
   * devolver una lista de boletos vacia justo despues de crearlos.
   */
  private async segmentosDeReserva(
    manager: EntityManager,
    reservaId: string,
  ): Promise<ReservaSegmento[]> {
    const itinerarios = await manager
      .getRepository(ReservaItinerario)
      .createQueryBuilder('ri')
      .where('ri.rit_reservaid = :reservaId', { reservaId })
      .getMany();
    if (itinerarios.length === 0) return [];

    return manager
      .getRepository(ReservaSegmento)
      .createQueryBuilder('rs')
      .leftJoinAndSelect('rs.vuelo', 'v')
      .where('rs.rsg_itinerarioid IN (:...ids)', {
        ids: itinerarios.map((i) => i.idReservaItinerario),
      })
      .orderBy('rs.rsg_orden', 'ASC')
      .getMany();
  }

  /** Los boletos de una reserva ya serializados, dentro de una transaccion. */
  private async ticketsDeReserva(
    manager: EntityManager,
    reservaId: string,
  ): Promise<TicketDetailDto[]> {
    const [boletos, segmentos, asientos] = await Promise.all([
      manager.getRepository(Boleto).find({
        where: { reserva: { idReserva: reservaId } },
        relations: { pasajero: true, segmentos: true },
      }),
      this.segmentosDeReserva(manager, reservaId),
      this.asientosDeReserva(reservaId, manager),
    ]);

    const porSegment = new Map(segmentos.map((s) => [s.segmentId, s]));
    const orden = (boleto: Boleto) => boleto.pasajero?.orden ?? 0;
    boletos.sort((a, b) => orden(a) - orden(b));

    return boletos.map((boleto) => {
      const negocio = boleto.pasajero?.passengerId ?? '';
      return {
        ticketId: boleto.ticketId,
        bookingId: boleto.reservaId,
        passengerId: negocio,
        passengerName:
          `${boleto.pasajero?.nombre ?? ''} ${boleto.pasajero?.apellido ?? ''}`.trim() ||
          undefined,
        eTicketNumber: boleto.numeroBoleto,
        status: boleto.estado,
        issuedAt: boleto.fechaEmision ? boleto.fechaEmision.toISOString() : null,
        failureReason: boleto.motivoFallo,
        segments: (boleto.segmentos ?? []).map((seg) => {
          const original = porSegment.get(seg.segmentId);
          return {
            segmentId: seg.segmentId,
            status: seg.estado,
            couponNumber: seg.numeroCupon,
            flightNumber: original?.vuelo?.numeroVuelo,
            departureIataCode: original?.vuelo?.aeropuertoOrigen,
            departureAt: original?.vuelo?.horaSalidaProgramada?.toISOString(),
            arrivalIataCode: original?.vuelo?.aeropuertoDestino,
            arrivalAt: original?.vuelo?.horaLlegadaProgramada?.toISOString(),
            seatNumber: asientos.get(`${negocio}:${seg.segmentId}`) ?? null,
          };
        }),
      };
    });
  }

  /**
   * Asientos de una reserva, indexados por `${passengerId}:${segmentId}`.
   *
   * La clave lleva el `segmentId` porque un pasajero tiene un asiento POR SEGMENTO:
   * indexar solo por pasajero devolveria el mismo numero en los dos tramos de un
   * viaje de ida y vuelta.
   *
   * Acepta `manager` opcional para poder leer DENTRO de una transaccion.
   */
  private async asientosDeReserva(
    reservaId: string,
    manager: EntityManager | null = null,
  ): Promise<Map<string, string>> {
    const repo = manager
      ? manager.getRepository(AsientoAsignado)
      : this.asientoAsignadoRepo;
    const consulta = repo
      .createQueryBuilder('aa')
      .innerJoin('aa.pasajero', 'pax')
      .addSelect('pax.pas_pasengerid', 'paxnegocio')
      .where('pax.pas_reservaid = :reservaId', { reservaId });
    const { raw } = await consulta.getRawAndEntities();

    const mapa = new Map<string, string>();
    for (const fila of raw) {
      // Alias en minusculas a proposito: `getRawMany` conserva las mayusculas del
      // alias, y una clave en camelCase se pierde en el `JSON.stringify` en
      // silencio.
      const negocio = fila['paxnegocio'] as string | undefined;
      if (!negocio) continue;
      mapa.set(
        `${negocio}:${fila['asa_segmentid']}`,
        fila['asa_numeroasiento'] as string,
      );
    }
    return mapa;
  }

  /** Asientos libres de un vuelo, contados en la base y no en memoria. */
  private async asientosLibresDe(vueloId: string): Promise<number> {
    const fila = await this.asientoRepo
      .createQueryBuilder('a')
      .select('COUNT(*)::int', 'n')
      .where('a.asi_vueloid = :vueloId', { vueloId })
      .andWhere('a.asi_estadisponible = true')
      .getRawOne<{ n: number }>();
    return Number(fila?.n ?? 0);
  }

  /**
   * La `tarifa_cabina` mas cara de un vuelo.
   *
   * Sin esto no hay forma de saber cuanto cuesta el vuelo nuevo, y la diferencia a
   * pagar saldria 0. Se busca por `osg_vueloid` y se ordena por total descendente
   * para tener un criterio estable cuando hay mas de una tarifa.
   */
  private async tarifaDeVuelo(vueloId: string): Promise<TarifaCabina | null> {
    return this.tarifaCabinaRepo
      .createQueryBuilder('tc')
      .innerJoin('oferta_segmento', 'osg', 'osg.osg_vueloid = :vueloId', {
        vueloId,
      })
      .orderBy('tc.tca_total', 'DESC')
      .getOne();
  }

  /**
   * Inserta una `oferta_cambio_fecha` con su `oferta_cambio_segmento`.
   *
   * `ocf_fechaExpiracion` tiene DEFAULT de 30 minutos en el DDL y NO se fija aqui:
   * la vigencia de una oferta es una regla del dato, y duplicarla en el codigo solo
   * crea una oportunidad de que las dos se desincronicen.
   */
  private async crearOfertaCambioFecha(
    reservaId: string,
    moneda: string,
    datos: {
      diferenciaTarifa: number;
      diferenciaImpuestos: number;
      totalPagar: number;
      segmentos: { segmentId: string; vueloId: string; itineraryId: string }[];
    },
  ): Promise<OfertaCambioFecha> {
    const oferta = await this.ofertaCambioFechaRepo.save(
      this.ofertaCambioFechaRepo.create({
        // `ocf_reservaid` es NOT NULL y `reservaId` es un `@RelationId`: un
        // `{ reservaId }` a solas deja la FK a NULL ("el valor nulo en la columna
        // ocf_reservaid viola la restriccion de no nulo"). Se escribe por la
        // RELACION.
        reserva: { idReserva: reservaId } as Reserva,
        estado: EstadoOfertaCambioFecha.VALID,
        moneda: moneda,
        diferenciaTarifa: aImporte(datos.diferenciaTarifa),
        diferenciaImpuestos: aImporte(datos.diferenciaImpuestos),
        // El CHECK `ocf_cambioTotalAPagar = diferenciaTarifa + diferenciaImpuestos`
        // obliga a que los tres campos sean coherentes, asi que se calculan juntos
        // y con el mismo redondeo para que la suma cuadre al centimo.
        cambioTotalAPagar: aImporte(datos.totalPagar),
        motivoRechazo: null,
      }),
    );

    for (const seg of datos.segmentos) {
      await this.ofertaCambioSegmentoRepo.save(
        this.ofertaCambioSegmentoRepo.create({
          ofertaCambioFechaId: oferta.idOfertaCambioFecha,
          segmentId: seg.segmentId,
          // `vueloId` es una columna fisica, no un `@RelationId`: se escribe por la
          // RELACION. Un `{ vueloId }` a secas no escribiria nada y el NOT NULL
          // reventaria.
          vuelo: { idVuelo: seg.vueloId } as Vuelo,
          itineraryId: seg.itineraryId,
        }),
      );
    }

    return oferta;
  }

  /**
   * Traslada los asientos de la reserva al vuelo NUEVO.
   *
   * `asiento_asignado` no tiene FK al vuelo: guarda `asa_segmentId` de negocio y
   * `asa_numeroAsiento`. Como el `segmentId` se conserva al cambiar de fecha, la
   * BUTACA sigue siendo la misma en otro avion, y el `asiento_vuelo` del vuelo viejo
   * no se toca: la disponibilidad pertenece a cada vuelo.
   *
   * Se comprueba en el vuelo de destino ANTES de ocupar. Ocupar y luego fallar
   * dejaria el vuelo nuevo con un asiento marcado como ocupado que nadie
   * purchased, y el trigger no lo revierte.
   *
   * `pedidos` son los `assignedSeats` que el cliente ha pedido. Si vienen, mandan
   * sobre el asiento previo: es la unica forma que tiene el pasajero de elegir
   * butaca al cambiar de fecha.
   */
  private async reasignarAsientosAlVueloNuevo(
    manager: EntityManager,
    reservaId: string,
    segmentosOferta: OfertaCambioSegmento[],
    pedidos?: { segmentId: string; seatNumber: string }[],
  ): Promise<void> {
    const asignados = await manager
      .getRepository(AsientoAsignado)
      .createQueryBuilder('aa')
      .innerJoin('aa.pasajero', 'pax')
      .where('pax.pas_reservaid = :reservaId', { reservaId })
      .getRawAndEntities();

    if (asignados.raw.length === 0) return;

    const asientoRepo = manager.getRepository(AsientoVuelo);
    const asignarRepo = manager.getRepository(AsientoAsignado);

    // Un pedido por (segmento, asiento) es unica: si el cliente manda el mismo
    // asiento para dos pasajeros, el segundo lo encontraria ocupado por el primero
    // y el error 409 seria correcto, no un falso positivo.
    const pedidoPor = new Map(pedidos?.map((p) => [p.segmentId, p.seatNumber]) ?? []);

    for (const fila of asignados.raw) {
      const segmentoId = fila['asa_segmentid'] as string;
      const idAsientoAsignado = fila['id_asiento_asignado'] as string;
      const asientoPrevio = fila['asa_numeroasiento'] as string;

      const nuevoVueloId = segmentosOferta.find(
        (s) => s.segmentId === segmentoId,
      )?.vueloId;
      if (!nuevoVueloId) continue;

      // El `assignedSeats` del cliente manda sobre el asiento previo: es la unica
      // via que tiene el pasajero de elegir butaca al cambiar de fecha.
      const butacaPedida = pedidoPor.get(segmentoId);
      const butaca = butacaPedida ?? asientoPrevio;

      const asiento = await asientoRepo
        .createQueryBuilder('a')
        .where('a.asi_vueloid = :vueloId', { vueloId: nuevoVueloId })
        .andWhere('a.asi_numeroasiento = :asiento', { asiento: butaca })
        .getOne();
      if (!asiento) {
        throw conflicto(
          CodigoProblema.SEAT_TAKEN,
          `El asiento ${butaca} no existe en el vuelo de destino.`,
        );
      }

      if (!asiento.estaDisponible) {
        throw conflicto(
          CodigoProblema.SEAT_TAKEN,
          `El asiento ${butaca} ya esta ocupado en el vuelo de destino.`,
        );
      }

      // Sin alias de tabla: en un UPDATE, `a.asi_vueloid` no es valido. Ver la
      // nota equivalente en `asignarAsientosDeCompra`.
      await manager
        .createQueryBuilder()
        .update(AsientoVuelo)
        .set({ estaDisponible: false })
        .where('asi_vueloid = :vueloId', { vueloId: nuevoVueloId })
        .andWhere('asi_numeroasiento = :asiento', { asiento: butaca })
        .execute();

      // Si eligio otra butaca se actualiza `asiento_asignado`. Si no, se conserva
      // la que ya tenia, porque `asa_segmentid` no ha cambiado.
      if (butacaPedida && butacaPedida !== asientoPrevio) {
        await asignarRepo.update(
          { idAsientoAsignado: idAsientoAsignado },
          { numeroAsiento: butacaPedida },
        );
      }
    }
  }

  /**
   * `GET /bookings/{id}` DENTRO de una transaccion.
   *
   * Existe para que el cambio de fecha devuelva el detalle YA actualizado. La via
   * publica (`obtenerReserva`) lee por `this.reservaRepo`, fuera de la
   * transaccion, y con el segmento reapuntado todavia sin confirmar devolveria el
   * vuelo anterior.
   */
  private async detalleDeReserva(
    manager: EntityManager,
    reservaId: string,
  ): Promise<BookingDetailResponseDto> {
    const reserva = await manager.getRepository(Reserva).findOne({
      where: { idReserva: reservaId },
      relations: {
        pasajeros: true,
        itinerarios: { segmentos: { vuelo: true } },
      },
    });
    if (!reserva) {
      throw new NotFoundException(`La reserva '${reservaId}' no existe.`);
    }

    return {
      bookingId: reserva.idReserva,
      pnr: reserva.pnr ?? '',
      status: reserva.estado,
      grandTotal: {
        currency: reserva.moneda,
        baseFare: aImporte(0),
        taxes: aImporte(0),
        total: aImporte(Number(reserva.total ?? 0)),
      },
      createdAt: reserva.fechaCreacion.toISOString(),
      updatedAt: reserva.fechaActualizacion.toISOString(),
      passengers: (reserva.pasajeros ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((p) => ({
          passengerId: p.passengerId,
          passengerType: p.tipo,
          firstName: p.nombre,
          lastName: p.apellido,
          documentType: p.tipoDocumento,
          documentNumber: p.numeroDocumento,
          nationality: p.nacionalidad,
          birthDate: p.fechaNacimiento,
          gender: p.genero,
          contact: { email: p.email, phone: p.telefono },
        })),
      itineraries: (reserva.itinerarios ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((itinerario) => ({
          itineraryId: itinerario.itineraryId,
          order: itinerario.orden,
          totalDurationMinutes: itinerario.duracionTotalMinutos,
          stopsCount: itinerario.escalas,
          segments: (itinerario.segmentos ?? [])
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((seg) => ({
              segmentId: seg.segmentId,
              flightNumber: seg.vuelo?.numeroVuelo ?? '',
              departureIataCode: seg.vuelo?.aeropuertoOrigen ?? '',
              departureAt: seg.vuelo?.horaSalidaProgramada?.toISOString() ?? '',
              arrivalIataCode: seg.vuelo?.aeropuertoDestino ?? '',
              arrivalAt: seg.vuelo?.horaLlegadaProgramada?.toISOString() ?? '',
              status: seg.estado,
            })),
        })),
      tickets: [],
    };
  }


  // =========================================================================
  // Stubs preexistentes (se mantienen para no romper otros consumidores)
  // =========================================================================

  create(createVueloDto: unknown): unknown {
    return null;
  }

  findAll(): unknown[] {
    return [];
  }

  findOne(id: string): unknown {
    return null;
  }
}
