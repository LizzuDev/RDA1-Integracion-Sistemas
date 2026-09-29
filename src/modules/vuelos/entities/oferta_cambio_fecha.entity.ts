import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { OfertaCambioSegmento } from './oferta_cambio_segmento.entity';
import { Reserva } from './reserva.entity';
import { EstadoOfertaCambioFecha } from './vuelos.enums';

/**
 * Bloque 6 — Postventa
 * Tabla: `oferta_cambio_fecha`
 *
 * `DateChangeSearchResponse` y `DateChangeRequest`. Tabla INEXISTENTE en el
 * borrador 3 del plan, pero sin ella el `changeOfferId` no tenía destino y los
 * códigos `CHANGE_OFFER_EXPIRED` y `FARE_NOT_CHANGEABLE` quedaban sin soporte.
 *
 * CHECK (ocf_estado IN ('VALID','ACCEPTED','EXPIRED','REJECTED'))
 * CHECK (ocf_moneda ~ '^[A-Z]{3}$')
 * CHECK (ocf_diferenciaTarifa|diferenciaImpuestos|cambioTotalAPagar >= 0)
 * CHECK (ocf_cambioTotalAPagar = ocf_diferenciaTarifa + ocf_diferenciaImpuestos)
 *
 * ## `id_oferta_cambio_fecha` es el `changeOfferId` del contrato
 * El OpenAPI lo declara `format: uuid`, así que aquí SÍ coincide con la PK
 * interna, a diferencia de `offerId` / `ticketId` / `passengerId`, que son
 * identificadores de negocio del GDS.
 */
@Entity({ name: 'oferta_cambio_fecha' })
export class OfertaCambioFecha {
  /** PK. Generada por PostgreSQL. Es el `changeOfferId` del contrato. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_oferta_cambio_fecha' })
  idOfertaCambioFecha: string;

  /**
   * FK a la reserva (`ocf_reservaId`). `ON DELETE CASCADE`.
   */
  @ManyToOne(() => Reserva, (reserva) => reserva.ofertasCambioFecha, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ocf_reservaid' })
  reserva: Reserva;

  /** Valor crudo de `ocf_reservaId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: OfertaCambioFecha) => entity.reserva)
  reservaId: string;

  /** Instante de creación de la oferta de cambio. */
  @Column({
    name: 'ocf_fechacreacion',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaCreacion: Date;

  /**
   * `DateChangeSearchResponse[].expiresAt`.
   * `DEFAULT (now() + INTERVAL '30 minutes')` en el DDL.
   * Superada, la aceptación produce `CHANGE_OFFER_EXPIRED` (HTTP 410).
   */
  @Column({
    name: 'ocf_fechaexpiracion',
    type: 'timestamptz',
    default: () => "(now() + INTERVAL '30 minutes')",
  })
  fechaExpiracion: Date;

  /**
   * Estado de la oferta. Nace `VALID`.
   * El trigger `trg_cambio_consumir` (§4.5 del plan) exige `VALID` y no
   * expirada para aceptar, y marca `ACCEPTED` en la misma transacción.
   */
  @Column({
    name: 'ocf_estado',
    type: 'varchar',
    length: 20,
    default: EstadoOfertaCambioFecha.VALID,
    enum: EstadoOfertaCambioFecha,
  })
  estado: EstadoOfertaCambioFecha;

  /**
   * `priceDifference.totalToPay` (y moneda compartida por los tres importes).
   */
  @Column({ name: 'ocf_moneda', type: 'varchar', length: 3 })
  moneda: string;

  /** `priceDifference.fareDifference`. */
  @Column({
    name: 'ocf_diferenciatarifa',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  diferenciaTarifa: string;

  /** `priceDifference.taxDifference`. */
  @Column({
    name: 'ocf_diferenciaimpuestos',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  diferenciaImpuestos: string;

  /**
   * `priceDifference.totalToPay` (incluye `changeFee`).
   * Invariante del DDL: `cambioTotalAPagar = diferenciaTarifa + diferenciaImpuestos`.
   */
  @Column({
    name: 'ocf_cambiototalapagar',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  cambioTotalAPagar: string;

  /**
   * Motivo del rechazo, cuando el GDS no ofrece alternativa.
   * No está en el contrato: alimenta el `detail` de `ProblemDetails`.
   */
  @Column({
    name: 'ocf_motivorechazo',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  motivoRechazo: string | null;

  // ---------------------------------------------------------------------
  // Lado inverso
  // ---------------------------------------------------------------------

  /** Segmentos propuestos para el cambio. Tabla puente con PK COMPUESTA. */
  @OneToMany(
    () => OfertaCambioSegmento,
    (segmento) => segmento.ofertaCambioFecha,
  )
  segmentos: OfertaCambioSegmento[];
}
