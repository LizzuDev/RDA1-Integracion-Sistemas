/**
 * DTOs de postventa: check-in, cotizacion de cancelacion, cancelacion y equipaje.
 *
 * ── Por que la cotizacion PERSISTE y no se calcula al vuelo ───────────────────
 * `GET /cancellation-quote` no altera el estado de la reserva, pero si deja una
 * fila en `cotizacion_cancelacion` con `cco_estado = 'VALID'` y una
 * `cco_fechaexpiracion`. No es un efecto secundario: es lo que permite que
 * `POST /cancel` exija un `quoteId` y verifique que la cifra que el usuario
 * acepto es la que se ejecuta.
 *
 * Sin esa fila, el `quoteId` seria decorativo: el usuario veria un importe y,
 * entre ese momento y el de confirmar, el calculo se repetiria con otro importe,
 * y el reembolso no seria el que se le mostro. El DDL ya modela el ciclo
 * `VALID -> CONSUMED -> EXPIRED`, asi que el endpoint lo consume.
 *
 * ── Orden de declaracion ─────────────────────────────────────────────────────
 * Con `@nestjs/swagger` los decoradores se EVALUAN al declarar la clase. Una
 * clase usada en `@ApiProperty({ type: X })` tiene que estar declarada ANTES de
 * quien la referencia, o recibe `undefined` y la aplicacion no arranca. Ya ha
 * pasado dos veces en este modulo; el orden de este archivo es intencionado.
 *
 * ── Aqui no hay reglas de negocio ────────────────────────────────────────────
 * Las reglas de penalizacion, la ventana de check-in y la vigencia de la
 * cotizacion viven en `vuelos.service.ts`. Un DTO describe el transporte; las
 * constantes de negocio se versionan con la logica, no con el contrato.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** `PaymentReference`. Referencia a un pago gestionado por la Payment API. */
export class PaymentReferenceDto {
  /**
   * Esta API no procesa tarjetas, ni 3DS, ni autorizacion, ni captura: solo
   * guarda el identificador que devolvio la Payment API. Por eso se llama
   * `reference` y no `token`, y por eso no se persiste ningun dato de tarjeta.
   */
  @ApiProperty({ example: 'pay_01HZX9K2QF' })
  @IsString({ message: 'paymentReference debe ser una cadena.' })
  @MinLength(4, { message: 'paymentReference es demasiado corto.' })
  @MaxLength(120, { message: 'paymentReference es demasiado largo.' })
  paymentReference: string;
}

/** `CancelBookingRequest`. El `quoteId` es obligatorio: sin el no hay cifra aceptada. */
export class CancelBookingRequestDto {
  /**
   * `cco_idCotizacionCancelacion` de la cotizacion mostrada al usuario.
   *
   * Aceptar un importe y luego confirmar citando el id de OTRA cotizacion es
   * justamente el hueco que evita ligar la confirmacion a la cifra mostrada.
   */
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'quoteId debe ser un UUID.' })
  quoteId: string;

  @ApiPropertyOptional({ example: 'Cambio de planes', maxLength: 200 })
  @IsOptional()
  @IsString({ message: 'reason debe ser una cadena.' })
  @MaxLength(200, { message: 'reason no puede superar 200 caracteres.' })
  reason?: string;
}

/** `AddBaggageRequest`. */
export class AddBaggageRequestDto {
  /** `pas_pasengerId` de NEGOCIO, no el UUID `id_pasajero`. */
  @ApiProperty({ example: 'pax-1' })
  @IsString({ message: 'passengerId debe ser una cadena.' })
  @MinLength(1)
  @MaxLength(64)
  passengerId: string;

  /** `eqp_itineraryId` de negocio: el equipaje se compra por trayecto. */
  @ApiProperty({ example: 'IT-0-770de505' })
  @IsString({ message: 'itineraryId debe ser una cadena.' })
  @MinLength(1)
  @MaxLength(64)
  itineraryId: string;

  @ApiProperty({ minimum: 1, maximum: 10, example: 1 })
  // El JSON puede traerlo como numero o como texto ("2"). Sin `@Type`, el
  // `@IsInt` de class-validator lo rechazaria si llega como texto.
  @Type(() => Number)
  @IsInt({ message: 'quantity debe ser un numero entero.' })
  @Min(1, { message: 'quantity debe ser al menos 1.' })
  @Max(10, { message: 'quantity no puede superar 10 maletas por operacion.' })
  quantity: number;

  @ApiProperty({ type: PaymentReferenceDto })
  @Type(() => PaymentReferenceDto)
  // Sin `ValidateNested`, los `@IsString`/`@MinLength` de `PaymentReferenceDto`
  // nunca se ejecutan: el objeto pasaria sin comprobar.
  @ValidateNested({ message: 'payment debe ser { paymentReference: "..." }.' })
  @IsObject({ message: 'payment debe ser un objeto.' })
  payment: PaymentReferenceDto;
}

/**
 * `CancellationQuoteResponse`. Los importes van como `string`, no como `number`:
 * son `NUMERIC(12,2)` y el pasillo por un float es donde aparecen los céntimos
 * fantasma (`0.1 + 0.2`).
 */
export class CancellationQuoteResponseDto {
  /**
   * `cco_idCotizacionCancelacion`: la fila que `POST /cancel` va a exigir y
   * pasar a `CONSUMED`.
   */
  @ApiProperty({ format: 'uuid' })
  quoteId: string;

  /**
   * `false` cuando la reserva no admite reembolso: el vuelo ya salio, o la
   * tarifa marcada no es reembolsable. Con `false`, `refundAmount` es 0 y la
   * cancelacion va a `CANCELLATION_PENDING` para que finanzas la cierre.
   */
  @ApiProperty({ example: true })
  isRefundable: boolean;

  @ApiProperty({ example: '120.00' })
  refundAmount: string;

  @ApiProperty({ example: '30.00' })
  penaltyAmount: string;

  @ApiProperty({ example: 'USD' })
  currency: string;

  /**
   * `cco_fechaExpiracion`. Pasada esta fecha la cotizacion queda `EXPIRED` y
   * `POST /cancel` la rechaza: el importe mostrado ya no es el vigente.
   */
  @ApiProperty({ format: 'date-time' })
  expiresAt: string;
}

/** Un elemento de `CheckInResponse.checkedInPassengers`. */
export class CheckInPassengerDto {
  @ApiProperty({ example: 'pax-1' })
  passengerId: string;

  @ApiProperty({ enum: ['CHECKED_IN', 'NOT_CHECKED_IN', 'FAILED'] })
  status: string;

  /**
   * `cse_asiento`. Se devuelve el asiento con el que se hizo el check-in para
   * que la UI pueda pintar el pase de abordar sin pedir otro endpoint.
   */
  @ApiPropertyOptional({ example: '12A', nullable: true })
  seatNumber?: string | null;
}

/** `CheckInResponse`. */
export class CheckInResponseDto {
  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({
    enum: ['NOT_ELIGIBLE', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
  })
  status: string;

  @ApiProperty({ type: [CheckInPassengerDto] })
  checkedInPassengers: CheckInPassengerDto[];
}

/** `BaggageAddedResponse`. */
export class BaggageAddedResponseDto {
  @ApiProperty({ example: 'pax-1' })
  passengerId: string;

  @ApiProperty({ example: 'IT-0-770de505' })
  itineraryId: string;

  /**
   * `eqp_cantidad` ACUMULADO de ese pasajero en ese itinerario, no solo lo
   * recien anadido: la UI necesita "3 maletas en total" sin volver a preguntar.
   */
  @ApiProperty({ example: 2, minimum: 1 })
  totalBaggage: number;

  /**
   * Extension propia, documentada como tal: el importe cobrado. El contrato no
   * lo pide, pero sin el la UI mostraria "maleta anadida" sin decir cuanto costo,
   * que es justo el dato que el usuario quiere ver tras una compra.
   */
  @ApiPropertyOptional({ example: '25.00' })
  amountCharged?: string;

  @ApiPropertyOptional({ example: 'USD' })
  currency?: string;
}

/**
 * Respuesta de `POST /cancel`.
 *
 * El contrato declara los codigos 200 y 202 sin esquema de cuerpo. Se devuelve
 * estado e importe para que la UI confirme en la misma pantalla en la que pidio
 * la cancelacion, sin una segunda consulta.
 */
export class CancelBookingResponseDto {
  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ example: 'QZXEDP' })
  pnr: string;

  @ApiProperty({ enum: ['CANCELLED', 'CANCELLATION_PENDING'] })
  status: string;

  @ApiProperty({ example: '90.00' })
  refundAmount: string;

  @ApiProperty({ example: '30.00' })
  penaltyAmount: string;

  @ApiProperty({ example: 'USD' })
  currency: string;
}
