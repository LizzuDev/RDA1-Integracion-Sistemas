import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Min,
  Max,
  MaxLength
} from 'class-validator';
import { Transform } from 'class-transformer';

function sanitizeString(val: any): any {
  if (typeof val === 'string') {
    return val.trim().replace(/\s{2,}/g, ' ');
  }
  return val;
}

export class RegistroMantenimientoDto {
  @ApiProperty({ description: 'ID o credencial del técnico responsable', example: 'TEC-MEC-01' })
  @IsString({ message: 'El ID del técnico debe ser texto.' })
  @IsNotEmpty({ message: 'El ID del técnico es obligatorio.' })
  @MaxLength(50, { message: 'El ID del técnico no puede exceder 50 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  tecnico_id: string;

  @ApiProperty({ description: 'Kilometraje registrado en el odómetro', example: 45200 })
  @IsNumber({}, { message: 'El kilometraje debe ser un valor numérico.' })
  @Min(0, { message: 'El kilometraje no puede ser negativo.' })
  kilometraje_registrado: number;

  @ApiProperty({ description: 'Nivel actual de combustible en porcentaje (0-100)', example: 100 })
  @IsNumber({}, { message: 'El nivel de combustible debe ser numérico.' })
  @Min(0, { message: 'El nivel de combustible mínimo es 0.' })
  @Max(100, { message: 'El nivel de combustible máximo es 100.' })
  nivel_combustible: number;

  @ApiProperty({ description: 'Condición visual de la carrocería', example: 'Sin rayones ni golpes', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Las condiciones de carrocería no pueden exceder 200 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  condiciones_carroceria?: string;

  @ApiProperty({ description: 'Estado y desgaste de los neumáticos', example: 'Óptimo 80%', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El estado de los neumáticos no puede exceder 100 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  estado_neumaticos?: string;

  @ApiProperty({ description: 'Observaciones y diagnóstico del técnico', example: 'Cambio de aceite y filtros realizado con éxito', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Las observaciones no pueden exceder 500 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  observaciones?: string;

  @ApiProperty({ description: 'Indica si se completó el servicio de mantenimiento', example: true, required: false })
  @IsOptional()
  @IsBoolean({ message: 'mantenimiento_realizado debe ser booleano.' })
  mantenimiento_realizado?: boolean;

  @ApiProperty({ description: 'Próximo kilometraje objetivo fijado para mantenimiento', example: 55000, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'El próximo kilometraje debe ser un número.' })
  @Min(0)
  nuevo_proximo_mantenimiento_km?: number;
}
