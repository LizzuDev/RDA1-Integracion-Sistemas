import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { Reserva } from './reserva.entity';
import { EstadoCotizacionCancelacion } from './vuelos.enums';

/**
 * Bloque 6 — Postventa
 * Tabla: `cotizacion_cancelacion`
 *
 * `CancellationQuoteResponse` y `CancelBookingRequest`. Tabla INEXISTENTE en el
 * borrador 3 del plan, pese a que `CancelBookingRequest.quoteId` es `required`
 * y los códigos `QUOTE_EXPIRED` (410) y `ALREADY_CANCELLED` (409) dependen de
 * ella.
 *
 * UNIQUE (cco_reservaId, cco_fechaExpiracion)
 * CHECK (cco_estado IN ('VALID','CONSUMED','EXPIRED'))
 * CHECK (cco_montoReembolso >= 0) / CHECK (cco_montoPenalizacion >= 0)
 *
 * ## `id_cotizacion_cancelacion` es el `quoteId` del contrato
 * Declarado `format: uuid`, así que coincide con la PK interna.
 */
@Entity({ name: 'cotizacion_cancelacion' })
export class CotizacionCancelacion {
  /** PK. Generada por PostgreSQL. Es el `quoteId` del contrato. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_cotizacion_cancelacion' })
  idCotizacionCancelacion: string;

  /** FK a la reserva (`cco_reservaId`). `ON DELETE CASCADE`. */
  @ManyToOne(() => Reserva, (reserva) => reserva.cotizacionesCancelacion, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cco_reservaid' })
  reserva: Reserva;

  /** Valor crudo de `cco_reservaId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: CotizacionCancelacion) => entity.reserva)
  reservaId: string;

  /**
   * `CancellationQuoteResponse.isRefundable`.
   *
   * Se congela al cotizar: snapshot del `tarifa_cabina.tca_esReembolsable` del
   * momento. La API no procesa el reembolso: solo devuelve la referencia.
   */
  @Column({ name: 'cco_esreembolsable', type: 'boolean' })
  esReembolsable: boolean;

  /** `CancellationQuoteResponse.refundAmount`. */
  @Column({
    name: 'cco_montoreembolso',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  montoReembolso: string;

  /** `CancellationQuoteResponse.penaltyAmount`. */
  @Column({
    name: 'cco_montopenalizacion',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  montoPenalizacion: string;

  /** `CancellationQuoteResponse.currency`. */
  @Column({ name: 'cco_moneda', type: 'varchar', length: 3 })
  moneda: string;

  /**
   * `CancellationQuoteResponse.expiresAt`.
   * Superada, la cancelación responde `QUOTE_EXPIRED` (HTTP 410).
   */
  @Column({ name: 'cco_fechaexpiracion', type: 'timestamptz' })
  fechaExpiracion: Date;

  /**
   * Estado de la cotización. Nace `VALID`.
   *
   * El trigger `trg_cotizacion_unica` (§4.5 del plan) exige `VALID` y no
   * expirada para cancelar, y la marca `CONSUMED` en la misma transacción: el
   * consumo es de un solo uso.
   */
  @Column({
    name: 'cco_estado',
    type: 'varchar',
    length: 20,
    default: EstadoCotizacionCancelacion.VALID,
    enum: EstadoCotizacionCancelacion,
  })
  estado: EstadoCotizacionCancelacion;

  /**
   * `CancelBookingRequest.reason`. Texto libre del cliente.
   */
  @Column({
    name: 'cco_motivo',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  motivo: string | null;

  /**
   * Instante en que se consumió la cotización.
   * NULL mientras siga `VALID`. La vista `vista_reembolsos_financieros`
   * (§5.8) solo agrega las filas `CONSUMED` con este campo informado.
   */
  @Column({
    name: 'cco_fechacancelacion',
    type: 'timestamptz',
    nullable: true,
  })
  fechaCancelacion: Date | null;
}
