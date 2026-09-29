import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { Reserva } from './reserva.entity';
import { ReservaSegmento } from './reserva_segmento.entity';

/**
 * Bloque 4 — Reservas y Emisión
 * Tabla: `reserva_itinerario`
 *
 * `ItineraryOption` YA COMPRADO. Es el snapshot de lo que el cliente eligió
 * durante el hold: sin esta tabla, `BookingDetail.itineraries[]` no tendría de
 * dónde leer, ni la vista `vista_listado_reservas` podría calcular
 * `origin`/`destination`/`departureDate`.
 *
 * UNIQUE (rit_reservaId, rit_itineraryId)
 * UNIQUE (rit_reservaId, rit_orden)
 * CHECK (rit_orden >= 1) / CHECK (rit_duracionTotalMinutos >= 0) / CHECK (rit_escalas >= 0)
 *
 * ## Los dos `UNIQUE` quedan en el DDL
 * Ambos indexan `rit_reservaId`, que aquí es una propiedad VIRTUAL vía
 * `@RelationId`; el constructor de índices de TypeORM requiere columnas reales.
 *
 * ## Por qué se duplica en lugar de apuntar a `oferta_itinerario`
 * Es deliberado: la reserva es un CONGELADO. Si apuntara a la oferta, un cambio
 * de horario o de tarifa del GDS alteraría el histórico de una reserva ya
 * emitida, y con ella los derechos de `isRefundable` / `isChangeable`.
 */
@Entity({ name: 'reserva_itinerario' })
export class ReservaItinerario {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_reserva_itinerario' })
  idReservaItinerario: string;

  /**
   * FK a la reserva (`rit_reservaId`). `ON DELETE CASCADE`: al cancelar y
   * purgar una reserva desaparecen sus itinerarios.
   */
  @ManyToOne(() => Reserva, (reserva) => reserva.itinerarios, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rit_reservaid' })
  reserva: Reserva;

  /** Valor crudo de `rit_reservaId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: ReservaItinerario) => entity.reserva)
  reservaId: string;

  /**
   * `ItineraryOption.itineraryId`. Identificador de negocio heredado del
   * `bloqueo_itinerario.bli_itineraryId` que el cliente seleccionó.
   */
  @Column({ name: 'rit_itineraryid', type: 'varchar', length: 64 })
  itineraryId: string;

  /** Posición del itinerario dentro de la reserva (multidestino: 1..n). */
  @Column({ name: 'rit_orden', type: 'smallint' })
  orden: number;

  /** `ItineraryOption.totalDurationMinutes`, congelado en la compra. */
  @Column({ name: 'rit_duraciontotalminutos', type: 'integer' })
  duracionTotalMinutos: number;

  /**
   * `ItineraryOption.stopsCount`.
   *
   * El SQL no puede imponer `escalas = (nº de reserva_segmento) - 1` porque es
   * una regla que cruza filas; la verifica el trigger `trg_escalas_consistentes`
   * (§4.5 del plan).
   */
  @Column({ name: 'rit_escalas', type: 'smallint' })
  escalas: number;

  // ---------------------------------------------------------------------
  // Lado inverso
  // ---------------------------------------------------------------------

  /** Segmentos comprados (`rsg_itinerarioId`, ON DELETE CASCADE). */
  @OneToMany(() => ReservaSegmento, (segmento) => segmento.itinerario)
  segmentos: ReservaSegmento[];
}
