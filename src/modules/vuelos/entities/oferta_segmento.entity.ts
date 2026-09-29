import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { OfertaItinerario } from './oferta_itinerario.entity';
import { EstadoVuelo } from './vuelos.enums';
import { Vuelo } from './vuelo.entity';

/**
 * Bloque 2 — Ofertas y Tarifas
 * Tabla: `oferta_segmento`
 *
 * `FlightSegment` de una oferta. Es la tabla que materializa la clave `segmentId`
 * usada por `GET /offers/{offerId}/seatmap?segmentId=…` y por
 * `PassengerItem.assignedSeats[].segmentId`.
 *
 * UNIQUE (osg_itinerarioId, osg_segmentId)
 * CHECK (osg_orden >= 1) / CHECK (osg_escalaMinutos >= 0)
 * CHECK (osg_estado IN (...))
 *
 * El `UNIQUE` vive en `vuelos_schema.sql` y no se replica con `@Unique` porque
 * indexa `osg_itinerarioId`, que aquí es una propiedad VIRTUAL vía `@RelationId`
 * (el constructor de índices de TypeORM requiere columnas reales). Con
 * `synchronize: false` no se pierde nada.
 *
 * ## Los datos del vuelo NO se duplican aquí
 * `FlightEndpoint` (`iataCode`, `at`, `terminal`) y los campos `marketingCarrier` /
 * `operatingCarrier` / `aircraft` / `durationMinutes` se derivan uniendo `vuelo`
 * mediante la vista `vista_oferta_segmento_api` (§5.2). Así una reprogramación
 * del vuelo se refleja en todas las ofertas vivas sin duplicar horarios, y
 * `iataCode`/`terminal` no pueden quedar desincronizados entre copias.
 */
@Entity({ name: 'oferta_segmento' })
export class OfertaSegmento {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_oferta_segmento' })
  idOfertaSegmento: string;

  /**
   * FK al itinerario (`osg_itinerarioId`). `ON DELETE CASCADE`.
   */
  @ManyToOne(() => OfertaItinerario, (itinerario) => itinerario.segmentos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'osg_itinerarioid' })
  itinerario: OfertaItinerario;

  /** Valor crudo de `osg_itinerarioId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: OfertaSegmento) => entity.itinerario)
  itinerarioId: string;

  /**
   * FK al vuelo (`osg_vueloId`).
   *
   * `ON DELETE RESTRICT` y no CASCADE a propósito: no se permite borrar un
   * vuelo que todavía aparece en alguna oferta; primero deben expirar.
   */
  @ManyToOne(() => Vuelo, (vuelo) => vuelo.segmentosOferta, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'osg_vueloid' })
  vuelo: Vuelo;

  /** Valor crudo de `osg_vueloId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: OfertaSegmento) => entity.vuelo)
  vueloId: string;

  /**
   * `FlightSegment.segmentId`. Identificador de negocio, único dentro del
   * itinerario. Es la clave de consulta del seatmap y el valor que el cliente
   * envía en `assignedSeats[].segmentId`.
   */
  @Column({ name: 'osg_segmentid', type: 'varchar', length: 64 })
  segmentId: string;

  /** Posición del segmento dentro del itinerario (orden de vuelo). */
  @Column({ name: 'osg_orden', type: 'smallint' })
  orden: number;

  /**
   * `FlightSegment.layoverMinutes`. `nullable: true`: no hay escala en un
   * segmento directo, y un valor de 0 significaría "escala instantánea".
   */
  @Column({
    name: 'osg_escalaminutos',
    type: 'integer',
    nullable: true,
  })
  escalaMinutos: number | null;

  /**
   * `FlightSegment.status` — el contrato lo declara `nullable: true`, a
   * diferencia de `vuelo.vue_estado`, que es `NOT NULL`. Refleja el caso en que
   * el GDS aún no ha publicado estado para ese segmento concreto.
   */
  @Column({
    name: 'osg_estado',
    type: 'varchar',
    length: 20,
    nullable: true,
    enum: EstadoVuelo,
  })
  estado: EstadoVuelo | null;
}
