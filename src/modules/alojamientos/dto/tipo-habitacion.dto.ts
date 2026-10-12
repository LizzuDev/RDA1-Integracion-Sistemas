import { ApiProperty, PartialType } from '@nestjs/swagger';
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { REGIMENES, Regimen } from '../entities/tipo-habitacion.entity';

/** Opcional pero no anulable (ver create-alojamiento.dto.ts). */
const SiSeEnvia = () => ValidateIf((_obj, valor) => valor !== undefined);

export class FotoTipoHabitacionDto {
  @ApiProperty({ example: 'https://cdn.proveedor.com/suite/1.jpg' })
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'url debe ser una URL https.' })
  @MaxLength(500)
  url: string;

  @ApiProperty({ required: false, example: 'Vista al mar' })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  caption?: string;
}

/**
 * Tipo de habitación (Booking: "room type"). Mismo contrato para el panel y
 * para los proveedores (dentro de `tiposHabitacion` al sincronizar).
 */
export class CreateTipoHabitacionDto {
  @ApiProperty({
    required: false,
    example: 'suite-vista-mar',
    description: 'Identificador estable dentro del alojamiento. Si no se envía se genera a partir del nombre.',
  })
  @Matches(/^[A-Za-z0-9._-]{1,60}$/, { message: 'codigo solo admite letras, números, ".", "_" y "-" (máx. 60).' })
  @SiSeEnvia()
  codigo?: string;

  @ApiProperty({ example: 'Suite con vista al mar' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  nombre: string;

  @ApiProperty({ required: false, example: 'Balcón privado y bañera de hidromasaje.' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 2, description: 'Adultos por habitación' })
  @IsInt()
  @Min(1)
  @Max(30)
  capacidadAdultos: number;

  @ApiProperty({ required: false, example: 1, description: 'Niños por habitación' })
  @IsInt()
  @Min(0)
  @Max(20)
  @SiSeEnvia()
  capacidadNinos?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @Min(1)
  @Max(50)
  @SiSeEnvia()
  camas?: number;

  @ApiProperty({ required: false, example: '1 cama king' })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  descripcionCamas?: string;

  @ApiProperty({ required: false, example: 42 })
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsPositive()
  @Max(10000)
  @IsOptional()
  tamanoM2?: number;

  @ApiProperty({ example: 180, description: 'Precio por noche y habitación, en la moneda del alojamiento' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(100000)
  precioPorNoche: number;

  @ApiProperty({ example: 4, description: 'Habitaciones de este tipo que se venden por noche' })
  @IsInt()
  @Min(0)
  @Max(1000)
  cantidad: number;

  @ApiProperty({ required: false, enum: REGIMENES, default: 'SOLO_ALOJAMIENTO' })
  @IsIn(REGIMENES as unknown as string[])
  @SiSeEnvia()
  regimen?: Regimen;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 48,
    description: 'Horas antes de la llegada con cancelación gratuita. null = no reembolsable.',
  })
  @IsInt()
  @Min(0)
  @Max(720)
  @IsOptional()
  cancelacionGratuitaHoras?: number | null;

  @ApiProperty({ required: false, example: ['Aire acondicionado', 'Minibar'] })
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  @SiSeEnvia()
  amenidades?: string[];

  @ApiProperty({ required: false, type: [FotoTipoHabitacionDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FotoTipoHabitacionDto)
  @SiSeEnvia()
  photos?: FotoTipoHabitacionDto[];

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @SiSeEnvia()
  activo?: boolean;

  @ApiProperty({ required: false, example: 1, description: 'Orden en la ficha del hotel' })
  @IsInt()
  @Min(1)
  @Max(1000)
  @SiSeEnvia()
  orden?: number;
}

export class UpdateTipoHabitacionDto extends PartialType(CreateTipoHabitacionDto, { skipNullProperties: false }) {}
