import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

function sanitizeString(val: any): any {
  if (typeof val === 'string') {
    return val.trim().replace(/\s{2,}/g, ' ');
  }
  return val;
}

export class CheckinAutoDto {
  @ApiProperty({ description: 'Cédula de identidad o Pasaporte del conductor', example: '1723456789' })
  @IsString({ message: 'El documento de identidad debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El documento de identidad es obligatorio para el check-in.' })
  @MinLength(5, { message: 'El documento de identidad debe tener al menos 5 caracteres.' })
  @MaxLength(20, { message: 'El documento de identidad no puede superar 20 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  documento_identidad: string;

  @ApiProperty({ description: 'Número de licencia de conducir física', example: 'LIC-998877', required: false })
  @IsOptional()
  @IsString({ message: 'El número de licencia debe ser una cadena de texto.' })
  @MaxLength(25, { message: 'El número de licencia no puede exceder 25 caracteres.' })
  @Transform(({ value }) => sanitizeString(value))
  numero_licencia?: string;
}
