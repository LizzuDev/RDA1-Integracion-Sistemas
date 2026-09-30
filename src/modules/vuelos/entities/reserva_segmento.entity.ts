import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { EstadoVuelo } from './vuelos.enums';
import { ReservaItinerario } from './reserva_itinerario.entity';
import { TarifaCabina } from './tarifa_cabina.entity';
import { Vuelo } from './vuelo.entity';

/**
 * Bloque 4 — Reservas y Emisión
 * Tabla: `reserva_segmento`
 *
 * `FlightSegment` comprado. Es el nexo entre un itinerario de la reserva y el
 * vuelo concreto que se reservó, y guarda la tarifa que se pagó en ese
 * segmento. `BookingDetail.itineraries[].segments[]` se construye desde aquí.
 *
 * UNIQUE (rsg_itinerarioId, rsg_segmentId)
 * CHECK (rsg_orden >= 1) / CHECK (rsg_escalaMinutos >= 0)
 * CHECK (rsg_estado IN (...))
 *
 * ## `rsg_segmentId` es un identificador de negocio
 * Es la clave que el cliente envía en `PassengerItem.assignedSeats[].segmentId`
 * y en `DateChangeRequest.assignedSeats[].segmentId`, y la que usan
 * `asiento_asignado.asa_segmentId` y `boleto_segmento.bse_segmentId`. Por eso
 * no es la PK (que es un UUID interno) sino un valor único dentro del
 * itinerario.
 *
 * ## Los datos de `vuelo` NO se duplican
 * `iataCode`, `at`, `terminal`, `aircraft`, `durationMinutes` y los códigos de
 * `marketingCarrier` / `operatingCarrier` se derivan uniendo `vuelo`, con la
 * misma proyección que usa `vista_oferta_segmento_api` (§5.2).
 *
 * El `UNIQUE` queda en el DDL: indexa `rsg_itinerarioId`, que aquí es una
 * propiedad VIRTUAL vía `@RelationId`.
 */
@Entity({ name: 'reserva_segmento' })
export class ReservaSegmento {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_reserva_segmento' })
  idReservaSegmento: string;

  /** FK al itinerario (`rsg_itinerarioId`). `ON DELETE CASCADE`. */
  @ManyToOne(
    () => ReservaItinerario,
    (itinerario) => itinerario.segmentos,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'rsg_itinerarioid' })
  itinerario: ReservaItinerario;

  /** Valor crudo de `rsg_itinerarioId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: ReservaSegmento) => entity.itinerario)
  itinerarioId: string;

  /**
   * FK al vuelo (`rsg_vueloId`).
   *
   * `ON DELETE RESTRICT`: un vuelo con reservas históricas nunca se borra.
   */
  @ManyToOne(() => Vuelo, (vuelo) => vuelo.segmentosReserva, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'rsg_vueloid' })
  vuelo: Vuelo;

  /** Valor crudo de `rsg_vueloId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: ReservaSegmento) => entity.vuelo)
  vueloId: string;

  /** `FlightSegment.segmentId` del segmento comprado. */
  @Column({ name: 'rsg_segmentid', type: 'varchar', length: 64 })
  segmentId: string;

  /** Posición del segmento dentro del itinerario (orden de vuelo). */
  @Column({ name: 'rsg_orden', type: 'smallint' })
  orden: number;

  /**
   * `FlightSegment.layoverMinutes`. NULL en un vuelo directo; 0 significaría
   * "escala instantánea", que no existe.
   */
  @Column({
    name: 'rsg_escalaminutos',
    type: 'integer',
    nullable: true,
  })
  escalaMinutos: number | null;

  /**
   * `FlightSegment.status`. El contrato lo declara `nullable: true`: el GDS
   * puede no tener estado para ese segmento.
   */
  @Column({
    name: 'rsg_estado',
    type: 'varchar',
    length: 20,
    nullable: true,
    enum: EstadoVuelo,
  })
  estado: EstadoVuelo | null;

  /**
   * FK a la tarifa efectivamente comprada en este segmento
   * (`rsg_tarifaCabinaId`).
   *
   * `ON DELETE SET NULL` y nullable: si la tarifa se purga, el segmento de la
   * reserva sobrevive. Es la fuente de `FARE_NOT_CHANGEABLE` y de la validación
   * `SEAT_CABIN_MISMATCH` (el trigger `trg_asiento_valido` compara la cabina
   * del asiento con la de esta tarifa).
   */
  @ManyToOne(
    () => TarifaCabina,
    (tarifaCabina) => tarifaCabina.segmentosReserva,
    { nullable: true, onDelete: 'SET NULL' },
  )
  @JoinColumn({ name: 'rsg_tarifacabinaid' })
  tarifaCabina: TarifaCabina | null;

  /** Valor crudo de `rsg_tarifaCabinaId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: ReservaSegmento) => entity.tarifaCabina)
  tarifaCabinaId: string | null;
}
