import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { Boleto } from './boleto.entity';
import { EstadoTicketSegmento } from './vuelos.enums';

/**
 * Bloque 5 — Boletos, Check-in, Pases de abordar
 * Tabla: `boleto_segmento`
 *
 * `Ticket.segments[]`: el estado y el cupón individual de cada segmento del
 * boleto. Tabla INEXISTENTE en el borrador 3 del plan, pese a que el contrato
 * declara `TicketSegment` con `segmentId` y `status` como `required`.
 *
 * UNIQUE (bse_boletoId, bse_segmentId)
 * CHECK (bse_estado IN ('PENDING','ISSUED','FAILED'))
 *
 * ## `bse_segmentId` es un identificador de negocio
 * Apunta a `reserva_segmento.rsg_segmentId` (`VARCHAR(64)`), no a una PK UUID.
 * El DDL no declara `REFERENCES` porque el cupón pertenece a un boleto concreto
 * y la trazabilidad segmentId-reserva ya la da `boleto.bol_reservaId`.
 *
 * El `UNIQUE` queda en el DDL: indexa `bse_boletoId`, que aquí es una propiedad
 * VIRTUAL vía `@RelationId`.
 */
@Entity({ name: 'boleto_segmento' })
export class BoletoSegmento {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_boleto_segmento' })
  idBoletoSegmento: string;

  /** FK al boleto (`bse_boletoId`). `ON DELETE CASCADE`. */
  @ManyToOne(() => Boleto, (boleto) => boleto.segmentos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bse_boletoid' })
  boleto: Boleto;

  /** Valor crudo de `bse_boletoId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: BoletoSegmento) => entity.boleto)
  boletoId: string;

  /** `TicketSegment.segmentId`. Referencia LÓGICA a `reserva_segmento.rsg_segmentId`. */
  @Column({ name: 'bse_segmentid', type: 'varchar', length: 64 })
  segmentId: string;

  /**
   * `TicketSegmentStatus`. Nace `PENDING`.
   *
   * Existe a nivel de segmento y no solo en el boleto porque una emisión puede
   * quedar parcial: el boleto figura `ISSUED` mientras un cupón concreto sigue
   * `FAILED` y hay que reemitirlo.
   */
  @Column({
    name: 'bse_estado',
    type: 'varchar',
    length: 10,
    default: EstadoTicketSegmento.PENDING,
    enum: EstadoTicketSegmento,
  })
  estado: EstadoTicketSegmento;

  /**
   * `TicketSegment.couponNumber` (`nullable: true`).
   * El GDS asigna un cupón por segmento; NULL mientras el segmento no se emite.
   */
  @Column({
    name: 'bse_numerocupon',
    type: 'varchar',
    length: 15,
    nullable: true,
  })
  numeroCupon: string | null;
}
