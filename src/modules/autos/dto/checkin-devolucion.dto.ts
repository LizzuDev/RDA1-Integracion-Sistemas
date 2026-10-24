import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckinDevolucionDto {
  @ApiProperty({ description: 'Odómetro al momento de la devolución del vehículo', example: 12950 })
  @IsNumber({}, { message: 'km_retorno debe ser numérico.' })
  @Min(0, { message: 'km_retorno no puede ser negativo.' })
  km_retorno: number;

  @ApiProperty({ description: 'Nivel actual de combustible en porcentaje (0-100)', example: 100, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'nivel_combustible debe ser numérico.' })
  @Min(0)
  @Max(100)
  nivel_combustible?: number;

  @ApiProperty({ description: 'Observaciones de patio al recibir el auto', example: 'Vehículo en excelente estado', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
