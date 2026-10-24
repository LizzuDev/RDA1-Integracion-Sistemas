import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelAutoOrderDto {
  @ApiProperty({ description: 'Motivo de la cancelación', example: 'Cambio de itinerario de vuelo', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @ApiProperty({ description: 'Alias para motivo de cancelación', example: 'Cambio de itinerario de vuelo', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;

  @ApiProperty({ description: 'Actor solicitante de la cancelación', example: 'SAGA_ORCHESTRATOR', required: false })
  @IsOptional()
  @IsString()
  solicitante?: string;
}
