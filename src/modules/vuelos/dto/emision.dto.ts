/**
 * DTOs de la Fase 11: emision de billetes, consulta de un ticket, pases de
 * abordar y cambio de fecha.
 *
 * ── Un solo juego de DTOs de ticket ──────────────────────────────────────────
 * Antes de esta fase, `GET /bookings/{id}/tickets` usaba sus propios `TicketDto`
 * y `TicketSegmentDto` en `booking-list.dto.ts`. Con la emision y la consulta
 * individual, el mismo recurso se devuelve desde tres sitios, y tres juegos de
 * DTO para el mismo recurso solo pueden divergir. Aqui vive la version
 * completa, y `GET /tickets` la reutiliza.
 *
 * Lo que se gana respecto a la version de la Fase 8 son `passengerName`,
 * `flightNumber`, las IATA, las horas y `seatNumber`: sin eso, un cliente que
 * quiere pintar un boarding pass tiene que hacer una segunda peticion a la
 * cabecera de la reserva y cruzarla por su cuenta.
 *
 * ── Orden de declaracion ─────────────────────────────────────────────────────
 * Con `@nestjs/swagger` los decoradores se EVALUAN al declarar la clase. Una
 * clase usada en `@ApiProperty({ type: X })` tiene que estar declarada ANTES de
 * quien la referencia, o recibe `undefined` y la aplicacion no arranca. Cuando
 * la referencia se hace con una flecha (`type: () => X`) el orden ya no importa,
 * pero se mantiene igualmente el orden natural para que el archivo se lea bien.
 *
 * ── `ticketId` NO es un UUID ─────────────────────────────────────────────────
 * Es el identificador de NEGOCIO del GDS (`bol_ticketId`), un `varchar`. Por eso
 * la ruta valida con un DTO y no con `ParseUUIDPipe`: un numero de boleto como
 * `014-2384719264` no es un UUID, y rechazarlo seria un error de diseño.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

// ===========================================================================
// Tickets
// ===========================================================================

/** Un segmento del boleto, con los datos de vuelo que la UI necesita. */
export class TicketSegmentDetailDto {
  @ApiProperty({ example: 'SG-770de505' })
  segmentId: string;

  @ApiProperty({ enum: ['PENDING', 'ISSUED', 'FAILED'] })
  status: string;

  @ApiPropertyOptional({ example: '0048501374921', nullable: true })
  couponNumber?: string | null;

  // Extension documentada: no estan en `TicketSegment` del contrato, pero sin
  // ellos el pase de abordar no puede decir de donde sale el vuelo.
  @ApiPropertyOptional({ example: 'LA4041' })
  flightNumber?: string;

  @ApiPropertyOptional({ example: 'GYE' })
  departureIataCode?: string;

  @ApiPropertyOptional({ example: 'LIM' })
  arrivalIataCode?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  departureAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  arrivalAt?: string;

  @ApiPropertyOptional({ example: '12A', nullable: true })
  seatNumber?: string | null;
}

/** `Ticket` del contrato, con el detalle de sus segmentos. */
export class TicketDetailDto {
  /** `bol_ticketId`: identificador de NEGOCIO del GDS, no un UUID. */
  @ApiProperty({ example: 'TKT-0001' })
  ticketId: string;

  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ example: 'pax-1' })
  passengerId: string;

  @ApiPropertyOptional({ example: 'Ana Perez', description: 'Nombre completo, para la UI.' })
  passengerName?: string;

  @ApiPropertyOptional({ example: '014-2384719264', nullable: true })
  eTicketNumber?: string | null;

  @ApiProperty({ enum: ['PENDING', 'ISSUING', 'ISSUED', 'FAILED', 'VOIDED', 'REFUNDED'] })
  status: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  issuedAt?: string | null;

  @ApiProperty({ type: [TicketSegmentDetailDto] })
  segments: TicketSegmentDetailDto[];

  @ApiPropertyOptional({ example: null, nullable: true })
  failureReason?: string | null;
}

/** `TicketListResponse`. Lo usan `GET /tickets` y `POST /tickets`. */
export class TicketListResponseDto {
  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ type: [TicketDetailDto] })
  tickets: TicketDetailDto[];
}

/**
 * Respuesta de la EMISION (`POST /tickets`), que es un endpoint de diseño y no
 * del contrato, asi que puede tener su propia forma.
 *
 * `issued` cuenta los creados en ESTA llamada. Sin el, un reintento responderia
 * 200 con la lista completa y el cliente no sabria si su peticion sirvio de algo
 * o si ya estaban todos emitidos.
 */
export class TicketIssuanceResponseDto {
  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ example: 'QZXEDP' })
  pnr: string;

  @ApiProperty({
    enum: ['CONFIRMED', 'TICKET_ISSUING'],
    description:
      'CONFIRMED si la emision se completo en esta llamada. TICKET_ISSUING si ' +
      'queda en curso (por ejemplo, sin transicion posible desde el estado actual).',
  })
  status: string;

  @ApiProperty({ type: [TicketDetailDto] })
  tickets: TicketDetailDto[];

  @ApiProperty({ example: 2, description: 'Boletos creados en esta llamada.' })
  issued: number;
}

/**
 * Los DOS parametros de `GET /bookings/{bookingId}/tickets/{ticketId}`.
 *
 * ── Por que los dos y no solo el `ticketId` ──────────────────────────────────
 * Un `@Param()` sin nombre recibe el objeto COMPLETO de parametros de ruta, y el
 * `ValidationPipe` global corre con `forbidNonWhitelisted: true`: si el DTO solo
 * declarase `ticketId`, el `bookingId` de la misma ruta responderia
 * `property bookingId should not exist` con un 400 para SIEMPRE. Se comprobo en la
 * primera version de esta ruta, que por eso no llegaba nunca al servicio.
 *
 * Declarar tambien `bookingId` tiene un efecto secundario bueno: su validacion
 * pasa a ser la del DTO y no la de `ParseUUIDPipe`, asi que un UUID invalido
 * devuelve un `invalidParams` con el nombre del campo, igual que el resto de
 * errores de forma.
 */
export class TicketRouteParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'bookingId debe ser un UUID.' })
  bookingId: string;

  /**
   * `bol_ticketId`: identificador de NEGOCIO del GDS, no un UUID.
   *
   * Por eso no se usa `ParseUUIDPipe` aqui: `TKT-A1B2C3D4E5F6` es un ticket
   * valido y rechazarlo seria un error de diseno, no de validacion.
   */
  @ApiProperty({ example: 'TKT-A1B2C3D4E5F6' })
  @IsString({ message: 'ticketId debe ser una cadena.' })
  @MinLength(1, { message: 'ticketId no puede estar vacio.' })
  @MaxLength(64, { message: 'ticketId es demasiado largo.' })
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'ticketId solo admite letras, digitos y guiones.',
  })
  ticketId: string;
}

// ===========================================================================
// Pases de abordar
// ===========================================================================

/** `BoardingPass` del contrato. */
export class BoardingPassDto {
  @ApiProperty({ example: 'pax-1' })
  passengerId: string;

  @ApiProperty({ example: 'SG-770de505' })
  segmentId: string;

  @ApiProperty({ example: '12A' })
  seat: string;

  @ApiPropertyOptional({ example: '1', nullable: true })
  boardingGroup?: string | null;

  @ApiPropertyOptional({ example: '1', nullable: true })
  boardingPosition?: string | null;

  @ApiProperty({ example: 'M1QZXEDP/SG-770de505/pax-1***...' })
  barcode: string;

  @ApiProperty({ enum: ['AZTEC', 'PDF417', 'QR'] })
  barcodeType: string;

  // Extension documentada: el vuelo y la hora son lo primero que se mira en un
  // papel, y el contrato no los incluye en el pase.
  @ApiPropertyOptional({ example: 'LA4041' })
  flightNumber?: string;

  @ApiPropertyOptional({ example: '2026-11-03T11:10:00.000Z' })
  departureAt?: string;

  @ApiPropertyOptional({ example: 'GYE' })
  departureIataCode?: string;

  @ApiPropertyOptional({ example: 'LIM' })
  arrivalIataCode?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  arrivalAt?: string;

  @ApiPropertyOptional({ example: 'QZXEDP' })
  pnr?: string;
}

/** `BoardingPassListResponse`. */
export class BoardingPassListResponseDto {
  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ type: [BoardingPassDto] })
  boardingPasses: BoardingPassDto[];

  /**
   * `true` cuando hay un check-in registrado.
   *
   * Con la lista vacia no se distingue "el check-in no ha ocurrido todavia" de
   * "el check-in fallo", y son dos pantallas distintas. Extension documentada.
   */
  @ApiProperty({ example: true, description: 'Hay check-in registrado para la reserva.' })
  checkedIn: boolean;
}

// ===========================================================================
// Cambio de fecha
// ===========================================================================

/** `PaymentReference`. */
export class PaymentReferenceForChangeDto {
  @ApiProperty({ example: 'pay_01HZX9K2QF' })
  @IsString({ message: 'paymentReference debe ser una cadena.' })
  @MinLength(4, { message: 'paymentReference es demasiado corto.' })
  @MaxLength(120, { message: 'paymentReference es demasiado largo.' })
  paymentReference: string;
}

/** `SeatAssignment`. */
export class SeatAssignmentForChangeDto {
  @ApiProperty({ example: 'SG-770de505' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  segmentId: string;

  @ApiProperty({ example: '12A' })
  @IsString()
  @MinLength(1)
  @MaxLength(5)
  seatNumber: string;
}

/** Un tramo a cambiar, en `DateChangeSearchRequest`. */
export class DateChangeItemDto {
  /** El itinerario de la reserva que se quiere mover. */
  @ApiProperty({ example: 'IT-0-770de505' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  itineraryId: string;

  /**
   * Nueva fecha de SALIDA, `YYYY-MM-DD`.
   *
   * Se compara contra `vue_fecha`, que es `date`. La hora no interviene:
   * "cambiar del 3 al 4" es mudar de dia, no de tramo horario.
   */
  @ApiProperty({ example: '2026-11-05' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'newDepartureDate debe tener formato YYYY-MM-DD.',
  })
  newDepartureDate: string;
}

/** `DateChangeSearchRequest`. */
export class DateChangeSearchRequestDto {
  @ApiProperty({ type: [DateChangeItemDto] })
  @IsArray()
  @ArrayNotEmpty({ message: 'changes debe traer al menos un itinerario.' })
  @ArrayMinSize(1)
  @ArrayMaxSize(6, { message: 'No se pueden cambiar mas de 6 itinerario a la vez.' })
  @ValidateNested({ each: true })
  @Type(() => DateChangeItemDto)
  changes: DateChangeItemDto[];
}

/** Un vuelo candidato. */
export class DateChangeCandidateDto {
  @ApiProperty({ example: 'SG-770de505', description: 'El segmentId que se conserva.' })
  segmentId: string;

  @ApiProperty({ example: 'LA4042' })
  flightNumber: string;

  @ApiProperty({ example: 'GYE' })
  departureIataCode: string;

  @ApiProperty({ example: 'LIM' })
  arrivalIataCode: string;

  @ApiProperty({ format: 'date-time' })
  departureAt: string;

  @ApiProperty({ format: 'date-time' })
  arrivalAt: string;

  @ApiProperty({ example: 42 })
  availableSeats: number;
}

/** `DateChangeSearchResponse.priceDifference`. */
export class PriceDifferenceDto {
  @ApiProperty({ example: '30.00' })
  fareDifference: string;

  @ApiProperty({ example: '4.90' })
  taxDifference: string;

  @ApiProperty({ example: '0.00' })
  changeFee: string;

  @ApiProperty({ example: '34.90' })
  totalToPay: string;
}

/** Un elemento de `DateChangeSearchResponse`. */
export class DateChangeOfferDto {
  @ApiProperty({ format: 'uuid', description: 'ocf_idOfertaCambioFecha.' })
  changeOfferId: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt: string;

  @ApiProperty({ example: 'IT-0-770de505' })
  itineraryId: string;

  @ApiProperty({ example: '2026-11-05' })
  newDepartureDate: string;

  @ApiProperty({ type: [DateChangeCandidateDto] })
  segments: DateChangeCandidateDto[];

  @ApiProperty({ type: PriceDifferenceDto })
  priceDifference: PriceDifferenceDto;

  @ApiProperty({ example: 'USD' })
  currency: string;
}

/** `DateChangeRequest`. */
export class DateChangeRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'changeOfferId debe ser un UUID.' })
  changeOfferId: string;

  /**
   * Referencia de pago de la diferencia.
   *
   * El esquema NO la marca como requerida, pero sin ella no se puede cobrar una
   * diferencia mayor que cero. Se valida en el servicio para poder responder 409
   * `PAYMENT_REFERENCE_INVALID` con un mensaje accionable, en vez de un 400 de
   * validacion de forma que el cliente no puede satisfacer sin adivinar.
   */
  @ApiPropertyOptional({ type: () => PaymentReferenceForChangeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentReferenceForChangeDto)
  payment?: PaymentReferenceForChangeDto;

  @ApiPropertyOptional({ type: () => [SeatAssignmentForChangeDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => SeatAssignmentForChangeDto)
  assignedSeats?: SeatAssignmentForChangeDto[];
}
