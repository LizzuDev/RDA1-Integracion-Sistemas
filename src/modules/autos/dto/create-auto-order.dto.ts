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
  IsIn,
  ValidateNested
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

function sanitizeString(val: any): any {
  if (typeof val === 'string') {
    return val.trim().replace(/\s{2,}/g, ' ');
  }
  return val;
}

export class ConductorAutoDto {
  @ApiProperty({ description: 'Nombre completo del conductor titular', example: 'Pedro Ramírez' })
  @IsString({ message: 'El nombre del conductor debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre del conductor es obligatorio.' })
  @MinLength(2, { message: 'El nombre del conductor debe tener al menos 2 caracteres.' })
  @MaxLength(80, { message: 'El nombre del conductor no puede superar 80 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  nombre: string;

  @ApiProperty({ description: 'Correo electrónico del conductor', example: 'pedro.ramirez@email.com' })
  @IsEmail({}, { message: 'El correo electrónico del conductor no tiene un formato válido.' })
  @MaxLength(120, { message: 'El correo del conductor no puede superar 120 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  email: string;

  @ApiProperty({ description: 'Teléfono de contacto', example: '+593998765432', required: false })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto.' })
  @MaxLength(25, { message: 'El teléfono no puede exceder 25 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  telefono?: string;

  @ApiProperty({ description: 'Número de cédula o licencia', example: '1723456789', required: false })
  @IsOptional()
  @IsString({ message: 'La licencia debe ser texto.' })
  @MaxLength(25, { message: 'La licencia no puede exceder 25 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  licencia?: string;

  @ApiProperty({ description: 'Edad del conductor', example: 28 })
  @IsInt({ message: 'La edad del conductor debe ser un número entero.' })
  @Min(18, { message: 'El conductor debe tener al menos 18 años.' })
  @Max(99, { message: 'La edad máxima permitida es de 99 años.' })
  edad: number;

  @ApiProperty({ description: 'Número de vuelo de llegada', example: 'EQ-312', required: false })
  @IsOptional()
  @IsString({ message: 'El número de vuelo debe ser texto.' })
  @MaxLength(15, { message: 'El número de vuelo no puede exceder 15 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  numero_vuelo?: string;
}

export class CreateAutoOrderDto {
  @ApiProperty({ description: 'ID del vehículo a alquilar', example: 'auto-spark-01' })
  @IsString({ message: 'El ID del vehículo debe ser texto.' })
  @IsNotEmpty({ message: 'El ID del vehículo es obligatorio.' })
  @MaxLength(50, { message: 'El ID del vehículo no puede exceder 50 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  vehicle_id: string;

  @ApiProperty({ description: 'Cantidad de días de alquiler', example: 3 })
  @IsInt({ message: 'La cantidad de días debe ser un número entero.' })
  @Min(1, { message: 'El período mínimo de alquiler es de 1 día.' })
  @Max(30, { message: 'El período máximo continuo de alquiler es de 30 días.' })
  dias: number;

  @ApiProperty({ description: 'Tipo de cobertura solicitada', example: 'BASICA', enum: ['BASICA', 'TOTAL', 'Basica', 'Total'] })
  @IsString()
  @IsIn(['BASICA', 'TOTAL', 'Basica', 'Total'], { message: 'El tipo de cobertura debe ser BASICA o TOTAL.' })
  tipo_cobertura: string;

  @ApiProperty({ description: 'Datos del conductor titular', type: ConductorAutoDto })
  @ValidateNested()
  @Type(() => ConductorAutoDto)
  @IsNotEmpty({ message: 'Los datos del conductor son obligatorios.' })
  conductor: ConductorAutoDto;

  @ApiProperty({ description: 'Método de pago', example: 'TARJETA', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  payment_method?: string;

  @ApiProperty({ description: 'Clave de idempotencia opcional', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotency_key?: string;
}
