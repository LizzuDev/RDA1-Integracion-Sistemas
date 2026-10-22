import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  Min,
  Max,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PriceDto } from './nested-types.dto';

/**
 * Función auxiliar para colapsar espacios y recortar extremos en cadenas de texto
 */
function sanitizeString(val: any): any {
  if (typeof val === 'string') {
    return val.trim().replace(/\s{2,}/g, ' ');
  }
  return val;
}

export class ReservationRequestDto {
  @ApiProperty({ description: 'Fecha para la reserva (YYYY-MM-DD)', example: '2026-10-25', format: 'date' })
  @IsString({ message: 'La fecha debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La fecha de reserva es obligatoria.' })
  @MaxLength(10, { message: 'La fecha no puede exceder 10 caracteres.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'El formato de fecha debe ser estrictamente YYYY-MM-DD.' })
  @Transform(({ value }) => sanitizeString(value))
  date: string;

  @ApiProperty({ description: 'Hora o turno seleccionado', example: '10:00', required: false })
  @IsString({ message: 'El turno horario debe ser una cadena de texto.' })
  @IsOptional()
  @MaxLength(10, { message: 'La hora seleccionada no puede exceder 10 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  time?: string;

  @ApiProperty({ description: 'Cantidad total de tickets', example: 2 })
  @IsInt({ message: 'La cantidad de tickets debe ser un número entero.' })
  @Min(1, { message: 'Debe reservar al menos 1 ticket.' })
  @Max(30, { message: 'El límite máximo por reserva es de 30 tickets.' })
  ticket_count: number;

  @ApiProperty({ description: 'Nombre completo del cliente titular', example: 'Juan Pérez' })
  @IsString({ message: 'El nombre del cliente debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre del cliente no puede estar vacío.' })
  @MinLength(2, { message: 'El nombre del cliente debe tener al menos 2 caracteres.' })
  @MaxLength(80, { message: 'El nombre del cliente no puede exceder 80 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  customer_name: string;

  @ApiProperty({ description: 'Email del cliente', example: 'juan@example.com', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido.' })
  @MaxLength(120, { message: 'El correo electrónico no puede exceder 120 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  customer_email?: string;

  @ApiProperty({ description: 'Número de documento de identidad o pasaporte', example: '1723456789', required: false })
  @IsOptional()
  @IsString({ message: 'El documento debe ser una cadena de texto.' })
  @MaxLength(20, { message: 'El documento no puede exceder 20 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  document_id?: string;

  @ApiProperty({ description: 'Teléfono de contacto', example: '+593987654321', required: false })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto.' })
  @MaxLength(25, { message: 'El teléfono no puede exceder 25 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  customer_phone?: string;

  @ApiProperty({ description: 'Requerimientos especiales, alergias o movilidad reducida', example: 'Silla de ruedas', required: false })
  @IsOptional()
  @IsString({ message: 'Los requerimientos especiales deben ser una cadena de texto.' })
  @MaxLength(300, { message: 'Los requerimientos especiales no pueden exceder 300 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  special_requirements?: string;
}

export enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED'
}

export class ReservationResponseDto {
  @ApiProperty({ description: 'ID único de reserva', format: 'uuid', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  reservation_id: string;

  @ApiProperty({ description: 'Estado de la reserva', enum: ReservationStatus, example: ReservationStatus.CONFIRMED })
  status: ReservationStatus;

  @ApiProperty({ description: 'Cantidad de tickets reservados', example: 2 })
  ticket_count: number;

  @ApiProperty({ description: 'Precio total de la reserva', type: PriceDto })
  total_price: PriceDto;
}

export class CancelReservationRequestDto {
  @ApiProperty({ description: 'Razón justificada de la cancelación', example: 'Imprevisto de viaje' })
  @IsString({ message: 'La razón de cancelación debe ser texto.' })
  @IsNotEmpty({ message: 'El motivo de cancelación no puede estar vacío.' })
  @MinLength(5, { message: 'El motivo de cancelación debe tener al menos 5 caracteres descriptivos.' })
  @MaxLength(500, { message: 'El motivo de cancelación no puede superar 500 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  reason: string;
}

export class CheckinAtraccionDto {
  @ApiProperty({ description: 'Documento de identidad o pasaporte del visitante', example: '1723456789' })
  @IsString({ message: 'El documento de identidad debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El documento de identidad es obligatorio para el check-in.' })
  @MinLength(5, { message: 'El documento de identidad debe tener al menos 5 caracteres.' })
  @MaxLength(20, { message: 'El documento de identidad no puede exceder 20 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  documento_identidad: string;

  @ApiProperty({ description: 'Guía turístico asignado opcional', example: 'Carlos Villacís', required: false })
  @IsOptional()
  @IsString({ message: 'El nombre del guía debe ser una cadena de texto.' })
  @MaxLength(80, { message: 'El nombre del guía no puede exceder 80 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  guia_asignado?: string;
}
