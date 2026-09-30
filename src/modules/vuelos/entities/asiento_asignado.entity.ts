import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { Pasajero } from './pasajero.entity';

/**
 * Bloque 4 — Reservas y Emisión
 * Tabla: `asiento_asignado`
 *
 * `PassengerItem.assignedSeats[]`. El borrador 3 del plan no tenía dónde
 * guardarlo pese a que el contrato lo declara `required` cuando se envía.
 *
 * UNIQUE (asa_segmentId, asa_numeroAsiento)   -- anti-doble-venta
 * UNIQUE (asa_pasajeroId, asa_segmentId)      -- un asiento por pasajero/segmento
 *
 * ## `asa_segmentId` es un identificador de negocio, NO una FK
 * Apunta a `reserva_segmento.rsg_segmentId`, que es `VARCHAR(64)`. El DDL no
 * declara `REFERENCES` porque un pasajero puede itinerarios de más de una
 * reserva, y la FK cruzaría aggregates. La llave compuesta
 * `(asa_pasajeroId, asa_segmentId)` garantiza que ambos pertenecen al mismo
 * contexto, que es lo que realmente importa.
 *
 * ## Por qué NO hay FK a `asiento_vuelo`
 * El inventario de asientos es dinámico (se reinicia por vuelo), mientras que
 * esta tabla es histórica: un asiento asignado en una reserva emitted sigue
 * existiendo aunque el GDS libere el asiento. Vincularlos por FK crearía
 * borrados en cascada sobre datos ya emitidos. La validación en tiempo de
 * compra la hace el trigger `trg_asiento_valido` (§4.5), que comprueba que el
 * asiento exista, esté libre y su cabina coincida con la tarifa comprada →
 * `SEAT_TAKEN` y `SEAT_CABIN_MISMATCH`.
 *
 * ## Por qué NO hay `@Unique` aquí
 * Los dos `UNIQUE` del DDL involucran `asa_pasajeroId`, que en esta entidad
 * es una propiedad VIRTUAL vía `@RelationId`. El constructor de índices de
 * TypeORM exige columnas reales, así que se dejan en el DDL; con
 * `synchronize: false` no se pierde nada.
 */
@Entity({ name: 'asiento_asignado' })
export class AsientoAsignado {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_asiento_asignado' })
  idAsientoAsignado: string;

  /**
   * FK al pasajero (`asa_pasajeroId`). `ON DELETE CASCADE`.
   */
  @ManyToOne(() => Pasajero, (pasajero) => pasajero.asientosAsignados, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'asa_pasajeroid' })
  pasajero: Pasajero;

  /** Valor crudo de `asa_pasajeroId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: AsientoAsignado) => entity.pasajero)
  pasajeroId: string;

  /**
   * `assignedSeats[].segmentId`. Referencia LÓGICA a
   * `reserva_segmento.rsg_segmentId` (ver nota de cabecera).
   */
  @Column({ name: 'asa_segmentid', type: 'varchar', length: 64 })
  segmentId: string;

  /**
   * `assignedSeats[].seatNumber`, p. ej. `'12A'`.
   *
   * Junto con `asa_segmentId` forma la llave que impide vender dos veces el
   * mismo asiento en el mismo segmento: es la garantía de `SEAT_TAKEN` a nivel
   * de motor, no solo de aplicación.
   */
  @Column({ name: 'asa_numeroasiento', type: 'varchar', length: 5 })
  numeroAsiento: string;
}
