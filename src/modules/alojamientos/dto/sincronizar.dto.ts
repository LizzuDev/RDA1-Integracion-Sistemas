import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsOptional, Matches } from 'class-validator';
import { MAX_SINCRONIZACION } from '../alojamientos.service';

/**
 * Lote de sincronización de un proveedor. Cada elemento sigue el contrato de
 * `CreateAlojamientoDto` + `idExterno` obligatorio; se valida elemento a
 * elemento en el servicio para poder devolver el resultado de cada uno.
 */
export class SincronizarAlojamientosDto {
  @ApiProperty({
    description: `Alojamientos del proveedor (1–${MAX_SINCRONIZACION}). Mismo formato que POST /alojamientos, con idExterno obligatorio.`,
    example: [
      {
        idExterno: 'HTL-0042',
        nombre: 'Hostal Andino',
        destino: 'Otavalo',
        precioPorNoche: 38.9,
        moneda: 'USD',
        capacidadAdultos: 3,
        capacidadNinos: 1,
        habitaciones: 4,
        tienePiscina: false,
        photos: [{ url: 'https://example.com/hostal-andino.jpg' }],
        politicas: { checkin_desde: '14:00', checkout_hasta: '11:00' },
      },
    ],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'alojamientos debe incluir al menos un elemento.' })
  @ArrayMaxSize(MAX_SINCRONIZACION, { message: `Se admiten como máximo ${MAX_SINCRONIZACION} alojamientos por lote.` })
  alojamientos: unknown[];

  @ApiProperty({
    required: false,
    example: 'grupo3-alojamientos',
    description: 'Solo para administradores. Con API key de proveedor se toma de la clave.',
  })
  @Matches(/^[a-z0-9-]{2,60}$/, { message: 'proveedorId solo admite minúsculas, números y "-" (2–60).' })
  @IsOptional()
  proveedorId?: string;
}
