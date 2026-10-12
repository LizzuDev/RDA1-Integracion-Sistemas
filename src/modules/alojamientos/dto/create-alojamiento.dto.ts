import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Contrato de alta/actualización de un alojamiento.
 *
 * Es el MISMO para el panel de gestión y para los sistemas de los proveedores
 * que sincronizan su inventario (POST /alojamientos/sincronizar). Antes solo
 * aceptaba 7 campos y, como la validación global rechaza campos no declarados,
 * un proveedor no podía enviar fotos, descripción, ubicación, moneda ni
 * políticas: la petición entera fallaba con 400.
 */

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export class FotoAlojamientoDto {
  @ApiProperty({ example: 'https://cf.bstatic.com/xdata/images/hotel/1.jpg' })
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Cada foto debe ser una URL https.' })
  @MaxLength(500)
  url: string;

  @ApiProperty({ required: false, example: 'Vista principal' })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  caption?: string;
}

export class CoordenadasDto {
  @ApiProperty({ example: -0.2201 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -78.5123 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class UbicacionAlojamientoDto {
  @ApiProperty({ required: false, example: 'Plaza San Francisco, Centro Histórico' })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false, example: 'Quito' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false, example: 'EC', description: 'Código ISO 3166-1 alfa-2' })
  @Matches(/^[A-Z]{2}$/, { message: 'country debe ser un código ISO de 2 letras mayúsculas (ej. EC).' })
  @IsOptional()
  country?: string;

  @ApiProperty({ required: false, type: CoordenadasDto })
  @ValidateNested()
  @Type(() => CoordenadasDto)
  @IsOptional()
  coordinates?: CoordenadasDto;
}

export class PoliticasAlojamientoDto {
  @ApiProperty({ required: false, example: '14:00' })
  @Matches(HORA, { message: 'checkin_desde debe tener formato HH:MM.' })
  @IsOptional()
  checkin_desde?: string;

  @ApiProperty({ required: false, example: '23:00' })
  @Matches(HORA, { message: 'checkin_hasta debe tener formato HH:MM.' })
  @IsOptional()
  checkin_hasta?: string;

  @ApiProperty({ required: false, example: '11:00' })
  @Matches(HORA, { message: 'checkout_hasta debe tener formato HH:MM.' })
  @IsOptional()
  checkout_hasta?: string;

  @ApiProperty({ required: false, example: 'Cancelación gratuita hasta 48 horas antes de la llegada.' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  cancelacion?: string;

  @ApiProperty({ required: false, example: false })
  @IsBoolean()
  @IsOptional()
  mascotas?: boolean;

  @ApiProperty({ required: false, example: false })
  @IsBoolean()
  @IsOptional()
  fumar?: boolean;
}

export class CreateAlojamientoDto {
  @ApiProperty({ description: 'Nombre del alojamiento', example: 'Resort Las Palmas' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  nombre: string;

  @ApiProperty({ description: 'Destino o ciudad', example: 'Cancún' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  destino: string;

  @ApiProperty({ description: 'Precio por noche', example: 120.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(100000)
  precioPorNoche: number;

  @ApiProperty({ description: 'Capacidad de adultos por habitación', example: 2 })
  @IsInt()
  @Min(1)
  @Max(30)
  capacidadAdultos: number;

  @ApiProperty({ description: 'Capacidad de niños por habitación', example: 1 })
  @IsInt()
  @Min(0)
  @Max(20)
  capacidadNinos: number;

  @ApiProperty({ description: 'Número de habitaciones (inventario) del alojamiento', example: 1 })
  @IsInt()
  @Min(1)
  @Max(1000)
  habitaciones: number;

  @ApiProperty({ description: 'Indica si el alojamiento tiene piscina', example: true })
  @IsBoolean()
  tienePiscina: boolean;

  // ── Opcionales: contenido de la ficha ─────────────────────────────────────
  @ApiProperty({ required: false, example: 'Palacio renacentista en la Plaza San Francisco.' })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ required: false, example: 'Hoteles' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  tipoPropiedad?: string;

  @ApiProperty({ required: false, example: 'Habitación doble' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  tipoAlojamiento?: string;

  @ApiProperty({ required: false, example: 'USD', description: 'Código ISO 4217' })
  @Matches(/^[A-Z]{3}$/, { message: 'moneda debe ser un código ISO 4217 de 3 letras (ej. USD).' })
  @IsOptional()
  moneda?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  camas?: number;

  @ApiProperty({ required: false, example: 1.5 })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(20)
  @IsOptional()
  banos?: number;

  @ApiProperty({ required: false, type: [FotoAlojamientoDto] })
  @IsArray()
  @ArrayMaxSize(30, { message: 'Se admiten como máximo 30 fotos.' })
  @ValidateNested({ each: true })
  @Type(() => FotoAlojamientoDto)
  @IsOptional()
  photos?: FotoAlojamientoDto[];

  @ApiProperty({ required: false, example: ['WiFi gratis', 'Piscina', 'Pet friendly'] })
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  @IsOptional()
  amenidades?: string[];

  @ApiProperty({ required: false, type: UbicacionAlojamientoDto })
  @ValidateNested()
  @Type(() => UbicacionAlojamientoDto)
  @IsOptional()
  ubicacion?: UbicacionAlojamientoDto;

  @ApiProperty({ required: false, type: PoliticasAlojamientoDto })
  @ValidateNested()
  @Type(() => PoliticasAlojamientoDto)
  @IsOptional()
  politicas?: PoliticasAlojamientoDto;

  // ── Opcionales: integración y estado ──────────────────────────────────────
  @ApiProperty({
    required: false,
    example: 'HTL-0042',
    description: 'Id del alojamiento en el sistema del proveedor (obligatorio al sincronizar).',
  })
  @Matches(/^[A-Za-z0-9._-]{1,100}$/, { message: 'idExterno solo admite letras, números, ".", "_" y "-" (máx. 100).' })
  @IsOptional()
  idExterno?: string;

  @ApiProperty({
    required: false,
    example: 'grupo3-alojamientos',
    description: 'Proveedor dueño del dato. Solo lo fija un administrador; con API key se toma de la clave.',
  })
  @Matches(/^[a-z0-9-]{2,60}$/, { message: 'proveedorId solo admite minúsculas, números y "-" (2–60).' })
  @IsOptional()
  proveedorId?: string;

  @ApiProperty({ required: false, enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO' })
  @IsIn(['ACTIVO', 'INACTIVO'])
  @IsOptional()
  estado?: 'ACTIVO' | 'INACTIVO';
}
