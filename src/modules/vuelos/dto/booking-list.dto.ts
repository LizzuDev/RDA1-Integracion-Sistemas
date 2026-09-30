/**
 * DTOs de lectura de reservas: `GET /vuelos/bookings`,
 * `GET /vuelos/bookings/{bookingId}`, `/tickets` y `/baggage-options`.
 *
 * ── El cursor es opaco, no un offset ──────────────────────────────────────────
 * Un `?offset=20` se rompe en cuanto entra una reserva nueva, porque todas las
 * filas se desplazan y el usuario repite ver una que ya vio o se salta otra. El
 * contrato declara `cursor` como `string` y la respuesta trae `nextCursor`, asi
 * que lo que se devuelve es un token opaco: la última fila leída, de forma que
 * la siguiente pagina empieza "despues de este punto" y no se duplica nada.
 *
 * ── El límite viene del contrato ─────────────────────────────────────────────
 * `limit` tiene `maximum: 50` y `default: 10`. Se valida aqui para que un
 * `?limit=1000` no se convierta en un escaneo de la tabla.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { MoneyAmountDto } from './search-response.dto';

export const ESTADOS_RESERVA = [
  'PENDING',
  'PENDING_PAYMENT',
  'TICKET_ISSUING',
  'CONFIRMED',
  'FAILED',
  'CHANGE_PENDING',
  'CANCELLATION_PENDING',
  'CANCELLED',
] as const;

const ISO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class ListarReservasQueryDto {
  /** Filtra por PNR exacto. El DDL tiene `UNIQUE (res_pnr)`. */
  @ApiPropertyOptional({ example: 'QZXEDP' })
  @IsOptional()
  @IsString()
  pnr?: string;

  @ApiPropertyOptional({ enum: ESTADOS_RESERVA })
  @IsOptional()
  @IsIn(ESTADOS_RESERVA, {
    message: `status debe ser uno de: ${ESTADOS_RESERVA.join(', ')}`,
  })
  status?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'format: date' })
  @IsOptional()
  @Matches(ISO_FECHA, { message: 'createdFrom debe tener formato YYYY-MM-DD.' })
  createdFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'format: date' })
  @IsOptional()
  @Matches(ISO_FECHA, { message: 'createdTo debe tener formato YYYY-MM-DD.' })
  createdTo?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @IsOptional()
  // Viene de la query string, asi que llega como texto: sin `@Type` el
  // `@IsInt` de class-validator lo rechazaria siempre.
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt({ message: 'limit debe ser un numero entero.' })
  @Min(1, { message: 'limit debe ser al menos 1.' })
  @Max(50, { message: 'limit no puede superar 50 (limite del contrato).' })
  limit?: number = 10;

  /** Token opaco devuelto por la respuesta anterior. */
  @ApiPropertyOptional({ description: 'Token opaco de `nextCursor`.' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

/**
 * `BaggageOptionsResponse[]`. Un objeto por cada par pasajero x itinerario de la
 * reserva: el equipaje se compra por pasajero y por trayecto, no por reserva.
 */
export class BaggageOptionDto {
  @ApiProperty({ example: 'pax-1' })
  passengerId: string;

  @ApiProperty({ example: 'IT-0-770de505' })
  itineraryId: string;

  @ApiProperty({ example: { currency: 'USD', total: '0.00' } })
  price: MoneyAmountDto;

  /** Included allowance + extra already purchased. */
  @ApiProperty({ example: 0 })
  maxAllowed: number;

  @ApiProperty({ example: 0 })
  alreadyPurchased: number;
}

/*
 * Los DTOs de ticket (`TicketDetailDto`, `TicketSegmentDetailDto` y
 * `TicketListResponseDto`) viven en `dto/emision.dto.ts` desde la Fase 11, no
 * aqui.
 *
 * Antes vivian en este archivo y eran mas pobres: sin el asiento, y `GET
 * /tickets` era el unico sitio que los serializaba. Con la emision y la
 * consulta individual, el mismo recurso se devuelve desde tres sitios y dos
 * juegos de DTO solo pueden divergir. Uno solo, en un sitio.
 */

/** Fila de `BookingListResponse.items`. */
export class ReservaResumenDto {
  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ example: 'QZXEDP' })
  pnr: string | null;

  @ApiProperty({ enum: ESTADOS_RESERVA })
  status: string;

  @ApiPropertyOptional({ example: 'GYE', nullable: true })
  origin?: string | null;

  @ApiPropertyOptional({ example: 'LIM', nullable: true })
  destination?: string | null;

  @ApiPropertyOptional({ example: '2026-11-03', nullable: true })
  departureDate?: string | null;

  @ApiProperty({ example: { currency: 'USD', total: '0.00' } })
  grandTotal: MoneyAmountDto;
}

export class ReservaListResponseDto {
  /** `null` cuando no hay mas paginas: es la senal de fin, no un string vacio. */
  @ApiPropertyOptional({ nullable: true })
  nextCursor?: string | null;

  @ApiProperty({ type: [ReservaResumenDto] })
  items: ReservaResumenDto[];
}
