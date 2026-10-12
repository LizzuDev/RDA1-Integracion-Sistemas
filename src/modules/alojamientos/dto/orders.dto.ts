import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, ValidateNested, IsOptional, IsEmail, MinLength, MaxLength, IsDefined, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { AccommodationsGuestsDto } from './contract-common.dto';

// --- Order Preview ---
export class OrderPreviewRequestDto {
  @ApiProperty({ description: 'ID del alojamiento a reservar', example: 'aloj-1' })
  @IsNotEmpty()
  accommodation_id: string | number;

  @ApiProperty({
    description: 'Tipo de habitación (product_id de /availability, o su código). Si no se indica, el más barato con cupo.',
    example: '3f1c2a9e-7b6d-4e8f-9a0b-1c2d3e4f5a6b',
    required: false,
  })
  @IsString()
  @MaxLength(60)
  @IsOptional()
  product_id?: string;

  @ApiProperty({ description: 'Composición de huéspedes', type: AccommodationsGuestsDto, required: false })
  @ValidateNested()
  @Type(() => AccommodationsGuestsDto)
  @IsOptional()
  guests?: AccommodationsGuestsDto;

  @ApiProperty({ description: 'Fecha de check-in (YYYY-MM-DD)', example: '2026-10-15', format: 'date', required: false })
  @IsString()
  @IsOptional()
  checkin?: string;

  @ApiProperty({ description: 'Fecha de check-out (YYYY-MM-DD)', example: '2026-10-18', format: 'date', required: false })
  @IsString()
  @IsOptional()
  checkout?: string;
}

export class OrderPreviewResponseDto {
  @ApiProperty({ description: 'Identificador único de la petición', example: 'req_prev_101' })
  request_id: string;

  @ApiProperty({
    description: 'Datos de la orden previsualizada',
    example: {
      order_preview_id: 'prev_771822',
      accommodation_id: 'aloj-1',
      product_id: '3f1c2a9e-7b6d-4e8f-9a0b-1c2d3e4f5a6b',
      tipo_habitacion: { id: '3f1c2a9e-7b6d-4e8f-9a0b-1c2d3e4f5a6b', codigo: 'doble', nombre: 'Habitación doble' },
      price_per_night: 120.0,
      total_price: 360.0,
      currency: 'USD',
      nights: 3,
      rooms: 1,
    },
  })
  data: {
    order_preview_id: string;
    accommodation_id: string | number;
    /** Tipo de habitación cotizado (el `product_id` de /availability). */
    product_id?: string;
    tipo_habitacion?: { id: string; codigo: string; nombre: string };
    price_per_night?: number;
    total_price: number;
    currency: string;
    nights?: number;
    rooms?: number;
    /** Momento en que caduca la cotización (ISO 8601). */
    expires_at?: string;
  };
}

// --- Customer Details ---
export class CustomerDetailsDto {
  @ApiProperty({ description: 'Nombre de pila del titular de la reserva', example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ description: 'Apellido del titular de la reserva', example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({ description: 'Correo electrónico para confirmación y factura', example: 'juan.perez@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Teléfono de contacto internacional', example: '+593 991234567', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

// --- Order Create ---
export class OrderCreateRequestDto {
  @ApiProperty({ description: 'ID de la orden previa obtenido en /orders/preview', example: 'prev_771822' })
  @IsString()
  @IsNotEmpty()
  order_preview_id: string;

  @ApiProperty({
    description: 'Referencia del pago generado por la Payment API (conecta con facturación)',
    example: 'pay_3NxQ1mJZqEvB',
    minLength: 4,
    maxLength: 120,
  })
  @IsString()
  @MinLength(4, { message: 'payment_reference debe tener al menos 4 caracteres' })
  @MaxLength(120, { message: 'payment_reference no debe exceder 120 caracteres' })
  payment_reference: string;

  @ApiProperty({ description: 'Datos del cliente que realiza la reserva', type: CustomerDetailsDto })
  // `@ValidateNested` NO hace obligatorio el campo: sin `@IsDefined`, una orden
  // sin datos del cliente pasaba la validación y reventaba con un 500.
  @IsDefined({ message: 'customer_details es obligatorio' })
  @IsObject()
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customer_details: CustomerDetailsDto;
}

// --- Order Detail Response ---
export class OrderDetailDto {
  @ApiProperty({ description: 'UUID de la orden / reserva generada', format: 'uuid', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  order_id: string;

  @ApiProperty({ description: 'Código de confirmación de reserva', example: 'BKG-583921' })
  codigo_reserva?: string;

  @ApiProperty({ description: 'Estado de la orden', enum: ['CONFIRMED', 'CANCELLED', 'PENDING'], example: 'CONFIRMED' })
  status: string;

  @ApiProperty({ description: 'Detalles del alojamiento reservado' })
  accommodation_details: any;

  @ApiProperty({ description: 'Precio total pagado', example: 360.0 })
  total_price: number;

  @ApiProperty({ description: 'Moneda de la transacción', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Fecha y hora de creación de la orden (ISO 8601)', example: '2026-10-07T12:00:00Z' })
  creation_date: string;

  @ApiProperty({ description: 'Referencia de pago registrada', example: 'pay_3NxQ1mJZqEvB', required: false })
  payment_reference?: string;

  @ApiProperty({ description: 'Tipo de habitación reservado', required: false })
  tipo_habitacion?: { id: string; codigo?: string; nombre?: string } | null;

  @ApiProperty({ description: 'Nombre completo del huésped', required: false })
  customer_name?: string;

  @ApiProperty({ description: 'Email del huésped', required: false })
  customer_email?: string;

  @ApiProperty({ description: 'Enlaces HATEOAS (Richardson Nivel 3)', required: false })
  _links?: any;
}

// --- Order Modify ---
export class OrderModifyRequestDto {
  @ApiProperty({ description: 'Nueva distribución de huéspedes', type: AccommodationsGuestsDto, required: false })
  @ValidateNested()
  @Type(() => AccommodationsGuestsDto)
  @IsOptional()
  guests?: AccommodationsGuestsDto;

  @ApiProperty({ description: 'Nueva fecha de check-in (YYYY-MM-DD)', example: '2026-10-16', format: 'date', required: false })
  @IsString()
  @IsOptional()
  checkin?: string;

  @ApiProperty({ description: 'Nueva fecha de check-out (YYYY-MM-DD)', example: '2026-10-19', format: 'date', required: false })
  @IsString()
  @IsOptional()
  checkout?: string;
}
