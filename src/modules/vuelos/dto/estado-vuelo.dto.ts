/**
 * DTOs de estado de vuelo y de suscripciones a webhooks (Fase 10).
 *
 * ── El estado de vuelo es PUBLICO ────────────────────────────────────────────
 * El contrato declara `security: []` en `GET /flights/{flightNumber}/status`: es
 * un endpoint abierto, sin credenciales y sin RLS. Por eso NO se pide la
 * `X-Device-Fingerprint` ni se filtra por propietario. Un pasajero consulta el
 * estado de su vuelo sin iniciar sesion, que es como funcionan los tableros de
 * aeropuerto.
 *
 * ── El secreto NUNCA se devuelve ─────────────────────────────────────────────
 * `WebhookSubscription` declara `secret` como obligatorio y sin `readOnly`, asi
 * que por contrato tambien deberia venir en la respuesta. Devolverlo seria una
 * fuga de credencial: quien lea la respuesta podria firmar como el integrador y
 * suplantar a la API. Se devuelve un valor ENMASCARADO (`whsec_...a1b2`), que
 * cumple el esquema porque el campo existe, sin filtrar el secreto. Es una
 * desviacion consciente del contrato, documentada aqui y en el contexto.
 *
 * ── `events` y no `eventos` ──────────────────────────────────────────────────
 * El contrato llama al campo `events`; la entidad se llama `eventos` porque
 * todo el DDL esta en espanol. El DTO habla el idioma del contrato y el servicio
 * traduce. Si el DTO usara el nombre de la entidad, el cliente tendria que
 * conocer el nombre interno de la columna.
 *
 * ── Aqui no hay logica de negocio ────────────────────────────────────────────
 * El enmascarado, el hash y el borrado logico viven en el servicio. Un DTO
 * describe el transporte.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty } from 'class-validator';

/** `FlightStatus.status`. El mismo enum que `vuelo.vue_estado` del DDL. */
export const ESTADOS_VUELO_PUBLICO = [
  'SCHEDULED',
  'BOARDING',
  'DEPARTED',
  'DELAYED',
  'ARRIVED',
  'CANCELLED',
  'DIVERTED',
] as const;

/**
 * Los doce eventos de `WebhookSubscription.events`.
 *
 * Coinciden uno a uno con `TIPOS_EVENTO_WEBHOOK` en `vuelos.enums.ts`, que a su
 * vez replica el enum del contrato. El DDL limita `cardinality` a 12, asi que
 * cualquier lista distinta seria rechazada por la base sin avisar.
 */
export const EVENTOS_WEBHOOK = [
  'booking.confirmed',
  'booking.failed',
  'booking.changed',
  'booking.cancelled',
  'booking.baggage_added',
  'hold.expired',
  'flight.schedule_changed',
  'flight.cancelled',
  'booking.ticket_issuing',
  'booking.ticket_issued',
  'booking.ticket_failed',
  'booking.checked_in',
] as const;

/** Un extremo del vuelo en su estado operativo. */
export class FlightEndpointStatusDto {
  @ApiProperty({ example: 'GYE', description: 'Codigo IATA del aeropuerto.' })
  iataCode: string;

  @ApiPropertyOptional({
    example: '2',
    nullable: true,
    description: 'Terminal de salida o de llegada.',
  })
  terminal?: string | null;

  @ApiProperty({ format: 'date-time' })
  scheduledAt: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  estimatedAt?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  actualAt?: string | null;
}

/**
 * `FlightStatus`.
 *
 * OJO: la forma de `departure`/`arrival` aqui NO es la de `FlightEndpoint` que
 * usa la busqueda. Alli es `{ iataCode, at, terminal }`, un solo instante; aqui
 * son tres (`scheduledAt`, `estimatedAt`, `actualAt`), porque un panel de
 * aeropuerto tiene que distinguir la hora publicada, la estimada y la real.
 * Reutilizar el DTO de busqueda perderia la mitad de la informacion que existe
 * justamente para esto.
 */
export class FlightStatusDto {
  @ApiProperty({ example: 'LA4041' })
  flightNumber: string;

  @ApiProperty({ example: '2026-11-03', description: 'format: date' })
  date: string;

  @ApiProperty({
    example: 'LAT',
    description: 'Codigo IATA de la transportadora comercial.',
  })
  marketingCarrier: string;

  @ApiProperty({
    example: 'LAT',
    description: 'Codigo IATA de la aerolinea que opera el vuelo.',
  })
  operatingCarrier: string;

  @ApiProperty({ type: FlightEndpointStatusDto })
  departure: FlightEndpointStatusDto;

  @ApiProperty({ type: FlightEndpointStatusDto })
  arrival: FlightEndpointStatusDto;

  @ApiPropertyOptional({ example: 'Boeing 737-800', nullable: true })
  aircraft?: string | null;

  @ApiProperty({ enum: ESTADOS_VUELO_PUBLICO })
  status: string;
}

/** Query de `GET /flights/{flightNumber}/status`. */
export class FlightStatusQueryDto {
  /**
   * Fecha de SALIDA en `YYYY-MM-DD`. Obligatoria segun el contrato.
   *
   * Se compara contra `vue_fecha`, que es de tipo `date`: la hora no interviene,
   * y por eso `?date=2026-11-03` encuentra el vuelo aunque su
   * `horaSalidaProgramada` sea a las 23:40. Comparar contra el timestamp daria
   * "no encontrado" segun la franja del dia, que es el fallo clasico de este
   * endpoint.
   */
  @ApiProperty({ example: '2026-11-03' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date debe tener formato YYYY-MM-DD.' })
  date: string;
}

/** Cuerpo de `POST /webhooks`. */
export class CreateWebhookDto {
  /**
   * Destino de las notificaciones.
   *
   * El DDL impone `CHECK (swb_url ~ '^https://')`: solo HTTPS. Se replica aqui
   * para que el cliente reciba un 400 con un mensaje util en vez de un 23514
   * envuelto en un 500. La consecuencia practica es que `http://localhost` no
   * vale, ni en desarrollo, y la UI lo dice antes de que el usuario lo descubra
   * asi.
   */
  @ApiProperty({ example: 'https://integrador.example.com/hooks/vuelos' })
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  url: string;

  /**
   * Eventos a los que suscribirse. Entre 1 y 12, que es lo que admite el CHECK
   * `cardinality(swb_eventos)` del DDL.
   */
  @ApiProperty({ enum: EVENTOS_WEBHOOK, isArray: true, example: ['booking.cancelled'] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsIn(EVENTOS_WEBHOOK, { each: true })
  events: string[];

  /**
   * Secreto con el que el integrador firma las notificaciones (HMAC).
   *
   * Solo se acepta en la creacion y nunca se devuelve: la respuesta lleva una
   * mascara. Ver la nota de cabecera.
   */
  @ApiProperty({ example: 'whsec_9f3a2b1c8d7e6f5a4b3c2d1e0f9a8b7c' })
  @IsString()
  @MinLength(16, { message: 'secret debe tener al menos 16 caracteres.' })
  @MaxLength(200)
  secret: string;
}

/** `WebhookSubscription`, tal y como la devuelve la API. */
export class WebhookSubscriptionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'https://integrador.example.com/hooks/vuelos' })
  url: string;

  @ApiProperty({ enum: EVENTOS_WEBHOOK, isArray: true })
  events: string[];

  /**
   * MASCARA del secreto, nunca el secreto.
   *
   * `whsec_...a1b2` permite al integrador confirmar que es el suyo sin que
   * quien lea la respuesta pueda firmar eventos falsos.
   */
  @ApiProperty({ example: 'whsec_...a1b2', description: 'Mascara, no el secreto real.' })
  secret: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ example: true })
  active: boolean;
}
