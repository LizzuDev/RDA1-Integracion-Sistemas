import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { Reserva } from './reserva.entity';

/**
 * Bloque 6 — Postventa
 * Tabla: `historial_cambio`
 *
 * `BookingDetail.changes[]`. Tabla INEXISTENTE en el borrador 3 del plan.
 *
 * Es un HISTORIAL append-only de la reserva: no se actualiza ni se borra, solo
 * se añaden entradas. Por eso no tiene columnas `updatedAt` ni estado, y su
 * índice `ix_hca_reserva_fecha` del DDL
 * (`hca_reservaId, hca_fechaCambio DESC`) está pensado para leer en orden
 * inverso cronológico.
 */
@Entity({ name: 'historial_cambio' })
export class HistorialCambio {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_historial_cambio' })
  idHistorialCambio: string;

  /** FK a la reserva (`hca_reservaId`). `ON DELETE CASCADE`. */
  @ManyToOne(() => Reserva, (reserva) => reserva.historialCambios, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'hca_reservaid' })
  reserva: Reserva;

  /** Valor crudo de `hca_reservaId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: HistorialCambio) => entity.reserva)
  reservaId: string;

  /** `BookingDetail.changes[].changedAt`. */
  @Column({
    name: 'hca_fechacambio',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaCambio: Date;

  /**
   * `BookingDetail.changes[].description`.
   * Descripción legible del cambio (cambio de fecha, equipaje, cancelación).
   */
  @Column({ name: 'hca_descripcion', type: 'varchar', length: 500 })
  descripcion: string;
}
