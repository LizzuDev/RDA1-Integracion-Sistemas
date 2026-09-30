import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { EntregaWebhook } from './entrega_webhook.entity';
import { TipoEventoWebhook } from './vuelos.enums';

/**
 * Bloque 6 — Soporte
 * Tabla: `evento_webhook`  —  TRANSACTIONAL OUTBOX
 *
 * `WebhookPayload`. No es un log de auditoría: es la bandeja de salida del
 * patrón *outbox*, y su valor real es que el evento se escribe en la MISMA
 * transacción que el cambio de estado que lo origina.
 *
 * ## Por qué outbox y no publicar directamente
 * Si el `POST` de una reserva confirma y publica el webhook en la misma
 * petición, un fallo de red deja al cliente con un error aunque la reserva sí
 * se haya confirmado, y reintentar puede duplicar. Con outbox:
 *   1. La transacción escribe la reserva Y el evento; si algo falla, no hay
 *      ninguno de los dos.
 *   2. Un worker posterior lee `evw_procesado = false` y entrega con reintentos.
 * Esto es lo que hace que los eventos `booking.confirmed` / `flight.cancelled`
 * sean fiables, y de paso los desacopla del endpoint que los origina.
 *
 * `id_evento_webhook` es el `WebhookPayload.eventId`, y funciona como clave de
 * idempotencia para el receptor: si reintenta, ya lo había visto.
 */
@Entity({ name: 'evento_webhook' })
export class EventoWebhook {
  /**
   * PK. Generada por PostgreSQL. Es el `WebhookPayload.eventId`, clave de
   * idempotencia del consumidor.
   */
  @PrimaryGeneratedColumn('uuid', { name: 'id_evento_webhook' })
  idEventoWebhook: string;

  /**
   * `WebhookPayload.eventType`. Union type `TipoEventoWebhook` (no `enum`: el
   * dominio crece con la API; ver `vuelos.enums.ts`).
   */
  @Column({ name: 'evw_tipoevento', type: 'varchar', length: 50 })
  tipoEvento: TipoEventoWebhook;

  /** `WebhookPayload.occurredAt`. */
  @Column({
    name: 'evw_ocurridoen',
    type: 'timestamptz',
    default: () => 'now()',
  })
  ocurridoEn: Date;

  /**
   * `WebhookPayload.apiVersion`. `DEFAULT '1.5.0.0'` en el DDL, alineado con
   * `info.version` del OpenAPI, para que el receptor pueda decidir si entiende
   * el payload.
   */
  @Column({
    name: 'evw_versionapi',
    type: 'varchar',
    length: 20,
    default: '1.5.0.0',
  })
  versionApi: string;

  /**
   * `WebhookPayload.data` — `{ bookingId, pnr, status, refundAmount }`.
   *
   * `JSONB` y no columnas tipadas: el shape varía por tipo de evento (un
   * `flight.cancelled` no lleva `pnr`), y el contrato lo declara como objeto
   * libre. `JSONB` además permite indexar con GIN si un día hace falta.
   */
  @Column({ name: 'evw_datos', type: 'jsonb' })
  datos: Record<string, unknown>;

  /**
   * Entidad que originó el evento, p. ej. `'reserva'`, `'vuelo'`, `'boleto'`.
   * Trazabilidad; no es FK porque el módulo tiene muchas tablas candidatas.
   */
  @Column({
    name: 'evw_entidadorigen',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  entidadOrigen: string | null;

  /** PK de la entidad origen, para saltar directamente al registro. */
  @Column({
    name: 'evw_entidadid',
    type: 'uuid',
    nullable: true,
  })
  entidadId: string | null;

  /**
   * Marca de despacho.
   *
   * El índice PARCIAL `ix_evento_pendiente` del DDL
   * (`WHERE evw_procesado = false`) es lo que mantiene el barrido del worker
   * barato: solo mira los eventos sin procesar.
   */
  @Column({ name: 'evw_procesado', type: 'boolean', default: false })
  procesado: boolean;

  /** Instante de despacho por el worker. */
  @Column({
    name: 'evw_procesadoen',
    type: 'timestamptz',
    nullable: true,
  })
  procesadoEn: Date | null;

  // ---------------------------------------------------------------------
  // Lado inverso
  // ---------------------------------------------------------------------

  /** Un intento de entrega por suscripción (`enw_eventoId`). */
  @OneToMany(() => EntregaWebhook, (entrega) => entrega.evento)
  entregas: EntregaWebhook[];
}
