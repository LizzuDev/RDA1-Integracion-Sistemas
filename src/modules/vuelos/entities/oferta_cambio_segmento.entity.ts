import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  RelationId,
} from 'typeorm';

import { OfertaCambioFecha } from './oferta_cambio_fecha.entity';
import { Vuelo } from './vuelo.entity';

/**
 * Bloque 6 — Postventa
 * Tabla: `oferta_cambio_segmento`  —  PK COMPUESTA, sin id propio
 *
 *     CREATE TABLE oferta_cambio_segmento (
 *         ocs_ofertaCambioFechaId UUID        NOT NULL
 *             REFERENCES oferta_cambio_fecha(id_oferta_cambio_fecha) ON DELETE CASCADE,
 *         ocs_segmentId           VARCHAR(64) NOT NULL,
 *         ocs_vueloId             UUID        NOT NULL
 *             REFERENCES vuelo(id_vuelo) ON DELETE RESTRICT,
 *         ocs_itineraryId         VARCHAR(64) NOT NULL,
 *         PRIMARY KEY (ocs_ofertaCambioFechaId, ocs_segmentId)
 *     );
 *
 * ## Tabla SIN columna `id_...`
 * A diferencia del resto del módulo, aquí no hay id autogenerado: la PK es
 * compuesta. Por eso NO se usa `@PrimaryGeneratedColumn`, sino dos
 * `@PrimaryColumn`.
 *
 * `ocs_vueloId` es `ON DELETE RESTRICT`: un vuelo con una propuesta de cambio
 * viva no se elimina.
 */
@Entity({ name: 'oferta_cambio_segmento' })
export class OfertaCambioSegmento {
  /** Componente 1 de la PK y FK a la oferta de cambio. */
  @PrimaryColumn({ name: 'ocs_ofertacambiofechaid', type: 'uuid' })
  ofertaCambioFechaId: string;

  /**
   * Oferta de cambio a la que pertenece esta fila. Lado propietario.
   * `ON DELETE CASCADE`.
   */
  @ManyToOne(
    () => OfertaCambioFecha,
    (ofertaCambioFecha) => ofertaCambioFecha.segmentos,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'ocs_ofertacambiofechaid' })
  ofertaCambioFecha: OfertaCambioFecha;

  /**
   * Componente 2 de la PK. Identificador de negocio del segmento NUEVO
   * propuesto. Lo genera la capa de aplicación al crear la propuesta: el
   * `segmentId` definitivo lo asigna el GDS al confirmar el cambio.
   */
  @PrimaryColumn({ name: 'ocs_segmentid', type: 'varchar', length: 64 })
  segmentId: string;

  /**
   * Vuelo propuesto para ese segmento. `ON DELETE RESTRICT`.
   */
  @ManyToOne(() => Vuelo, (vuelo) => vuelo.segmentosOfertaCambio, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'ocs_vueloid' })
  vuelo: Vuelo;

  /** Valor crudo de `ocs_vueloId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: OfertaCambioSegmento) => entity.vuelo)
  vueloId: string;

  /**
   * Itinerario al que aplica el cambio. Referencia LÓGICA a
   * `DateChangeSearchRequest.changes[].itineraryId`
   * (`reserva_itinerario.rit_itineraryId`).
   */
  @Column({ name: 'ocs_itineraryid', type: 'varchar', length: 64 })
  itineraryId: string;
}
