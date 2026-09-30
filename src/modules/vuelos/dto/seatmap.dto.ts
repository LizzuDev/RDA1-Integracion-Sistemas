/**
 * DTOs de `GET /vuelos/offers/{offerId}/seatmap`.
 *
 * Reflejan `SeatMapResponse` del contrato v1.5.0.0. El propio contrato lo
 * describe como "mapa basico de asientos sin precios", asi que aqui no hay
 * ningun campo de importe: el precio de un asiento concreto no existe todavia
 * y anadirlo seria inventarlo.
 */
import { ApiProperty } from '@nestjs/swagger';
import { CaracteristicaAsiento } from '../entities/vuelos.enums';

export const CARACTERISTICAS_ASIENTO = [
  'WINDOW',
  'AISLE',
  'EXTRA_LEGROOM',
  'EMERGENCY_EXIT',
] as const;

export class SeatDto {
  /**
   * `asi_numeroasiento`. El DDL impose `CHECK (~ '^[0-9]{1,2}[A-K]$')`, o sea
   * que el formato ya viene resuelto por la base: no hay que normalizarlo.
   */
  @ApiProperty({ example: '1A' })
  seatNumber: string;

  /** `asi_estadisponible`. Un asiento no disponible no se puede seleccionar. */
  @ApiProperty({ example: true })
  isAvailable: boolean;

  @ApiProperty({ enum: CARACTERISTICAS_ASIENTO, isArray: true, example: ['WINDOW'] })
  characteristics: CaracteristicaAsiento[];
}

export class SeatRowDto {
  /** `asi_fila`. Es `smallint` en el DDL, no texto. */
  @ApiProperty({ example: 1 })
  rowNumber: number;

  @ApiProperty({ type: [SeatDto] })
  seats: SeatDto[];
}

export class CabinSeatsDto {
  @ApiProperty({ example: 'ECONOMY' })
  cabinClass: string;

  @ApiProperty({ type: [SeatRowDto] })
  rows: SeatRowDto[];
}

export class SeatMapResponseDto {
  /** `osg_segmentid` del segmento al que pertenece el mapa. */
  @ApiProperty({ example: 'SG-1a2b3c4d' })
  segmentId: string;

  @ApiProperty({ type: [CabinSeatsDto] })
  cabins: CabinSeatsDto[];
}
