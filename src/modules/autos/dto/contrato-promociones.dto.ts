import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, Min, Max, IsOptional, IsArray, IsString } from 'class-validator';

export class UpdateContratoPromocionesAutosDto {
  @ApiProperty({ description: 'Indica si acepta combos y promociones', example: true })
  @IsBoolean()
  permite_promociones: boolean;

  @ApiProperty({ description: 'Porcentaje máximo de descuento para combos (0-50%)', example: 15.0 })
  @IsNumber()
  @Min(0)
  @Max(50)
  porcentaje_descuento_maximo: number;

  @ApiProperty({ description: 'Destinos habilitados para combos', example: ['Quito', 'Guayaquil'], required: false })
  @IsOptional()
  @IsArray()
  destinos_habilitados?: string[];

  @ApiProperty({ description: 'Vigencia del acuerdo (YYYY-MM-DD)', example: '2026-12-31', required: false })
  @IsOptional()
  @IsString()
  vigencia_hasta?: string;

  @ApiProperty({ description: 'Condiciones de aplicación de la promoción', example: 'Descuento aplicable en paquetes turísticos', required: false })
  @IsOptional()
  @IsString()
  condiciones_combo?: string;
}
