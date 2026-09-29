/**
 * DTOs de RESPUESTA para `POST /search`.
 *
 * Reflejan exactamente `SearchResponse` del contrato v1.5.0.0. Existen como
 * clases (y no como objetos sueltos en el controlador) por dos motivos:
 *  1. `@nestjs/swagger` los documenta solos en `/api/docs`.
 *  2. Obligan al compilador a que la forma de la respuesta no se desvíe del
 *     contrato: si se anade o renombra una propiedad, el error aparece al
 *     compilar y no al integrar.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MoneyAmountDto {
  @ApiProperty({ example: 'USD', pattern: '^[A-Z]{3}$' })
  currency: string;

  @ApiPropertyOptional({ example: '100.00', description: 'Se serializa como string, no number.' })
  baseFare?: string;

  @ApiPropertyOptional({ example: '20.00', description: 'Se serializa como string, no number.' })
  taxes?: string;

  @ApiProperty({ example: '120.00' })
  total: string;
}

export class FlightEndpointDto {
  @ApiProperty({ example: 'GYE', pattern: '^[A-Z]{3}$' })
  iataCode: string;

  @ApiProperty({ example: '2026-12-15T06:10:00-05:00', format: 'date-time' })
  at: string;

  @ApiPropertyOptional({ example: 'B', nullable: true })
  terminal: string | null;
}

export class FlightSegmentDto {
  @ApiProperty({ example: 'SG-1a2b3c4d' })
  segmentId: string;

  @ApiProperty({ example: 'LA4041' })
  flightNumber: string;

  @ApiProperty({ type: FlightEndpointDto })
  departure: FlightEndpointDto;

  @ApiProperty({ type: FlightEndpointDto })
  arrival: FlightEndpointDto;

  @ApiPropertyOptional({ example: 90, nullable: true })
  layoverMinutes?: number | null;

  @ApiProperty({ example: 'LAT', description: 'Codigo IATA de la aerolinea comercial.' })
  marketingCarrier: string;

  @ApiProperty({ example: 'LAT', description: 'Codigo IATA de la aerolinea que opera el vuelo.' })
  operatingCarrier: string;

  @ApiPropertyOptional({ example: 'Boeing 767-300', nullable: true })
  aircraft?: string | null;

  @ApiPropertyOptional({ example: 305, minimum: 0, nullable: true })
  durationMinutes?: number | null;

  @ApiPropertyOptional({
    example: 'SCHEDULED',
    nullable: true,
    enum: ['SCHEDULED', 'BOARDING', 'DEPARTED', 'DELAYED', 'ARRIVED', 'CANCELLED', 'DIVERTED'],
  })
  status?: string | null;
}

export class FareRulesDto {
  @ApiProperty({ example: true })
  isRefundable: boolean;

  @ApiProperty({ example: true })
  isChangeable: boolean;
}

export class BaggageAllowanceDto {
  @ApiPropertyOptional({ example: true })
  personalItemIncluded?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  carryOnIncluded?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  checkedBaggageIncluded?: number;
}

export class PassengerPriceDto {
  @ApiProperty({ example: 'ADULT' })
  passengerType: string;

  @ApiProperty({ type: MoneyAmountDto })
  price: MoneyAmountDto;
}

export class CabinPricingDto {
  @ApiProperty({ example: 'ECONOMY', enum: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] })
  cabinClass: string;

  @ApiProperty({ example: 'STANDARD' })
  fareBrand: string;

  @ApiProperty({ example: 42, minimum: 0 })
  availableSeats: number;

  @ApiProperty({ type: FareRulesDto })
  fareRules: FareRulesDto;

  @ApiPropertyOptional({ type: BaggageAllowanceDto })
  baggageAllowance?: BaggageAllowanceDto;

  @ApiPropertyOptional({ type: MoneyAmountDto })
  extraCheckedBaggagePrice?: MoneyAmountDto;

  @ApiProperty({ type: [PassengerPriceDto] })
  pricePerPassengerType: PassengerPriceDto[];
}

export class ItineraryOptionDto {
  @ApiProperty({ example: 'IT-0-1a2b3c4d' })
  itineraryId: string;

  @ApiProperty({ example: 305 })
  totalDurationMinutes: number;

  @ApiProperty({ example: 0 })
  stopsCount: number;

  @ApiProperty({ type: [FlightSegmentDto] })
  segments: FlightSegmentDto[];

  @ApiProperty({ type: [CabinPricingDto] })
  pricingOptions: CabinPricingDto[];
}

export class AirlineDto {
  @ApiProperty({ example: 'LAT' })
  code: string;

  @ApiProperty({ example: 'LATAM Airlines' })
  name: string;
}

export class FlightOfferDto {
  @ApiProperty({ example: 'OF-1a2b3c4d' })
  offerId: string;

  @ApiProperty({ type: AirlineDto })
  airline: AirlineDto;

  @ApiProperty({ type: [ItineraryOptionDto] })
  itineraries: ItineraryOptionDto[];

  @ApiProperty({ type: MoneyAmountDto })
  grandTotal: MoneyAmountDto;
}

export class SearchResponseDto {
  @ApiProperty({ example: 1 })
  totalOffers: number;

  @ApiProperty({ type: [FlightOfferDto] })
  offers: FlightOfferDto[];
}
