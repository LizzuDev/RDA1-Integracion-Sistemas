import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

const SiSeEnvia = () => ValidateIf((_obj, valor) => valor !== undefined);

export class CreateProveedorDto {
  @ApiProperty({ example: 'grupo3-alojamientos', description: 'Minúsculas, números y "-" (2–60). No se puede cambiar.' })
  @Matches(/^[a-z0-9-]{2,60}$/, { message: 'id solo admite minúsculas, números y "-" (2–60).' })
  id: string;

  @ApiProperty({ example: 'Grupo 3 · Sistema de Alojamientos' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre: string;

  @ApiProperty({ required: false, example: 'soporte@grupo3.ec' })
  @IsEmail()
  @MaxLength(150)
  @IsOptional()
  emailContacto?: string;
}

export class UpdateProveedorDto extends PartialType(PickType(CreateProveedorDto, ['nombre', 'emailContacto'] as const), {
  skipNullProperties: false,
}) {
  @ApiProperty({ required: false, description: 'false = la API key deja de funcionar (sin borrar nada).' })
  @IsBoolean()
  @SiSeEnvia()
  activo?: boolean;
}
