/**
 * DTOs de `POST /vuelos/offers/hold` (Bloqueo de Cupos).
 *
 * Reflejan `HoldRequest` y `HoldResponse` del contrato v1.5.0.0.
 *
 * ── Requisitos del contrato que se validan aquí ──────────────────────────────
 * · `Idempotency-Key` es OBLIGATORIA y con `format: uuid`. Se valida en el
 *   controlador, no aquí, porque es una cabecera y no un campo del cuerpo.
 * · `offerId`, `itinerarySelections` y `passengersBreakdown` son `required`.
 * · `PassengerBreakdown.adults` tiene `minimum: 1`, y el resto `minimum: 0`.
 *   El DDL lo refuerza con `CHECK (blo_adultos >= 1)`, así que la validación
 *   duplicada no es redundante: evita un 500 del CHECK por un 400 del DTO.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

import { PassengerBreakdownDto } from './search.dto';
import { ClaseCabina } from '../entities/vuelos.enums';

/**
 * Las cuatro clases de cabina del DDL.
 *
 * Se derivan del enum `ClaseCabina` con `Object.values` en vez de escribir la
 * lista a mano: el `CHECK` de `bloqueo_itinerario.bli_clasecabina` y el enum
 * vienen del mismo sitio, y dos listas escritas a mano siempre acaban
 * discrepando.
 */
export const CABIN_CLASSES = Object.values(ClaseCabina);

/**
 * Una seleccion de itinerario dentro de `HoldRequest.itinerarySelections`.
 *
 * `itineraryId` debe existir en `oferta_itinerario` para la oferta indicada; se
 * valida contra la base de datos en el servicio, no aqui, porque requires I/O.
 */
export class ItinerarySelectionDto {
  @ApiProperty({ example: 'IT-0-1a2b3c4d' })
  @IsString()
  itineraryId: string;

  @ApiProperty({ enum: CABIN_CLASSES, example: 'ECONOMY' })
  @IsIn(CABIN_CLASSES)
  cabinClass: ClaseCabina;

  /**
   * `fareBrand` se valida como texto no vacio, no contra una lista cerrada: el
   * catalogo de marcas tarifarias lo define el GDS y no esta en el contrato.
   * Cerrar la lista aqui seria inventar una restriccion que el contrato no tiene.
   */
  @ApiProperty({ example: 'STANDARD' })
  @IsString()
  @Matches(/\S/, { message: 'fareBrand no puede estar vacio.' })
  fareBrand: string;
}

export class HoldRequestDto {
  /**
   * `ofe_offerid` de la tabla `oferta`. Es el identificador de negocio que
   * devuelve `POST /vuelos/search`; por eso la busqueda persiste la oferta en
   * vez de inventar un id que luego no se podria bloquear.
   */
  @ApiProperty({ example: 'OF-770de505' })
  @IsString()
  @Matches(/\S/, { message: 'offerId es obligatorio.' })
  offerId: string;

  @ApiProperty({ type: [ItinerarySelectionDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos un itinerario.' })
  @ArrayMaxSize(6, { message: 'No puede seleccionar mas de 6 itinerarios.' })
  @ValidateNested({ each: true })
  @Type(() => ItinerarySelectionDto)
  itinerarySelections: ItinerarySelectionDto[];

  @ApiProperty({ type: PassengerBreakdownDto })
  @ValidateNested()
  @Type(() => PassengerBreakdownDto)
  passengersBreakdown: PassengerBreakdownDto;
}

export class HoldResponseDto {
  /** `id_bloqueo_cupo`. El DDL lo genera con `gen_random_uuid()`. */
  @ApiProperty({ format: 'uuid', example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  holdId: string;

  /** El contrato solo admite `HELD` en la respuesta de creacion. */
  @ApiProperty({ enum: ['HELD'] })
  status: 'HELD';

  /** `blo_fechaexpiracion`. */
  @ApiProperty({ format: 'date-time' })
  expiresAt: string;

  /** `blo_ttlminutos`. `CHECK (blo_ttlMinutos IN (15, 30))`. */
  @ApiProperty({ enum: [15, 30] })
  ttlMinutes: number;

  /** `blo_preciocongelado` y `blo_moneda`. */
  @ApiProperty({ example: { currency: 'USD', baseFare: '0.00', taxes: '0.00', total: '0.00' } })
  lockedPrice: {
    currency: string;
    baseFare?: string;
    taxes?: string;
    total: string;
  };
}

export class HoldStatusResponseDto {
  @ApiProperty({ enum: ['HELD', 'RELEASED', 'EXPIRED', 'CONSUMED'] })
  status: string;

  @ApiPropertyOptional({ format: 'date-time' })
  expiresAt?: string;

  @ApiProperty({ example: 900 })
  remainingSeconds: number;

  @ApiProperty()
  lockedPrice: HoldResponseDto['lockedPrice'];
}

/** `Idempotency-Key`: cabecera obligatoria del contrato, `format: uuid`. */
export const IDEMPOTENCY_KEY_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const IDEMPOTENCY_KEY_ERROR =
  'Idempotency-Key es obligatoria y debe ser un UUID (format: uuid).';
