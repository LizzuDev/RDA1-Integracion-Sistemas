import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, MaxLength } from 'class-validator';

export class CheckinEntregaDto {
  @ApiProperty({ description: 'Número de licencia de conducir física presentada en mostrador', example: '1723456789' })
  @IsString({ message: 'licencia_conducir debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'licencia_conducir es obligatoria.' })
  @MaxLength(50)
  licencia_conducir: string;

  @ApiProperty({ description: 'Odómetro al momento de la entrega de llaves', example: 12500 })
  @IsNumber({}, { message: 'km_salida debe ser numérico.' })
  @Min(0, { message: 'km_salida no puede ser negativo.' })
  km_salida: number;

  @ApiProperty({ description: 'Nombre o ID del técnico/agente que formaliza la entrega', example: 'Roberto Paredes', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tecnico_entrega?: string;
}
