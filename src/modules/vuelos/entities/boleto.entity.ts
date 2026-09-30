import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { BoletoSegmento } from './boleto_segmento.entity';
import { PaseAbordar } from './pase_abordar.entity';
import { Pasajero } from './pasajero.entity';
import { Reserva } from './reserva.entity';
import { EstadoTicket } from './vuelos.enums';

/**
 * Bloque 5 — Boletos, Check-in, Pases de abordar
 * Tabla: `boleto`
 *
 * `Ticket` completo. El borrador 3 del plan tenía 4 columnas para un schema de
 * 8: le faltaban el estado, el número de ticket, la fecha de emisión y el
 * motivo de fallo, sin los cuales el flujo `202` de emisión asíncrona no podía
 * representarse.
 *
 * UNIQUE (bol_ticketId)
 * UNIQUE (bol_reservaId, bol_pasajeroId)     -- un boleto por pasajero y reserva
 * CHECK (bol_estado IN (...))
 * CHECK ((bol_estado = 'ISSUED') = (bol_numeroBoleto IS NOT NULL AND bol_fechaEmision IS NOT NULL))
 *
 * ## `bol_ticketId` NO es la PK
 * El contrato declara `Ticket.ticketId` como `type: string` `readOnly`, no
 * `format: uuid`: es el identificador de negocio emitido por el GDS. La PK
 * interna `id_boleto` es un UUID que solo existe en la base de datos.
 */
@Entity({ name: 'boleto' })
// `bol_numeroBoleto` es nullable: la unicidad real está en el índice PARCIAL
// `uq_boleto_numero` del DDL (`WHERE bol_numeroBoleto IS NOT NULL`), que
// TypeORM no puede expresar sobre un `@Column` con `unique: true` sin
// duplicar la restricción en los tickets aún no emitidos.
export class Boleto {
  /** PK interna. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_boleto' })
  idBoleto: string;

  /** `Ticket.ticketId` (`readOnly`). Identificador de negocio del GDS. */
  @Column({
    name: 'bol_ticketid',
    type: 'varchar',
    length: 64,
    unique: true,
  })
  ticketId: string;

  /**
   * FK a la reserva (`bol_reservaId`), `Ticket.bookingId`.
   * `ON DELETE CASCADE`: `TicketListResponse` siempre se pide por reserva.
   */
  @ManyToOne(() => Reserva, (reserva) => reserva.boletos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bol_reservaid' })
  reserva: Reserva;

  /** Valor crudo de `bol_reservaId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: Boleto) => entity.reserva)
  reservaId: string;

  /** FK al pasajero (`bol_pasajeroId`), `Ticket.passengerId`. */
  @ManyToOne(() => Pasajero, (pasajero) => pasajero.boletos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bol_pasajeroid' })
  pasajero: Pasajero;

  /** Valor crudo de `bol_pasajeroId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: Boleto) => entity.pasajero)
  pasajeroId: string;

  /**
   * `Ticket.eTicketNumber` (`nullable: true`, `readOnly`).
   *
   * NULL mientras el boleto no está `ISSUED`: el GDS lo asigna al emitir. El
   * `CHECK` del DDL obliga a que exista número y fecha SI Y SOLO SI el estado
   * es `ISSUED`, lo que hace imposible un `ISSUED` sin emitir.
   *
   * La unicidad va en el índice parcial `uq_boleto_numero`.
   */
  @Column({ name: 'bol_numeroboleto', type: 'varchar', length: 15, nullable: true })
  numeroBoleto: string | null;

  /**
   * `Ticket.status`. Nace `PENDING`.
   * `VOIDED` y `REFUNDED` son terminales: el trigger `trg_ticket_idempotente`
   * impide reabrir un boleto emitido (`TICKET_ALREADY_ISSUED`).
   */
  @Column({
    name: 'bol_estado',
    type: 'varchar',
    length: 10,
    default: EstadoTicket.PENDING,
    enum: EstadoTicket,
  })
  estado: EstadoTicket;

  /**
   * `Ticket.issuedAt` (`format: date-time`, `nullable: true`, `readOnly`).
   *
   * NULL hasta la emisión real. El borrador 3 del plan la declaraba
   * `NOT NULL DEFAULT now()`, lo que mentía sobre la fecha de emisión.
   */
  @Column({
    name: 'bol_fechaemision',
    type: 'timestamptz',
    nullable: true,
  })
  fechaEmision: Date | null;

  /**
   * `Ticket.failureReason` (`nullable: true`, `readOnly`).
   * Alimenta el diagnóstico de `TICKET_ISSUANCE_FAILED`.
   */
  @Column({
    name: 'bol_motivofallo',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  motivoFallo: string | null;

  // ---------------------------------------------------------------------
  // Lados inversos
  // ---------------------------------------------------------------------

  /** Cupones por segmento (`bse_boletoId`, ON DELETE CASCADE). */
  @OneToMany(() => BoletoSegmento, (segmento) => segmento.boleto)
  segmentos: BoletoSegmento[];

  /** Pases de abordaje (`pab_boletoId`, ON DELETE CASCADE). */
  @OneToMany(() => PaseAbordar, (pase) => pase.boleto)
  pasesAbordar: PaseAbordar[];
}
