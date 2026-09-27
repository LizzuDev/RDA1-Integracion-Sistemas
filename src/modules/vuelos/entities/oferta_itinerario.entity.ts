import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { Oferta } from './oferta.entity';
import { OfertaSegmento } from './oferta_segmento.entity';

/**
 * Bloque 2 — Ofertas y Tarifas
 * Tabla: `oferta_itinerario`
 *
 * `ItineraryOption` dentro de una oferta. Un vuelo con escalas genera varios
 * itinerarios alternativos, cada uno con su duración total y su número de
 * paradas, y cada uno con sus propios segmentos y tarifas.
 *
 * UNIQUE (oit_ofertaId, oit_itineraryId)
 * UNIQUE (oit_ofertaId, oit_orden)
 * CHECK (oit_orden >= 1) / CHECK (oit_duracionTotalMinutos >= 0) / CHECK (oit_escalas >= 0)
 *
 * Los dos `UNIQUE` viven en `vuelos_schema.sql` y no se replican con
 * `@Unique` porque ambos indexan `oit_ofertaId`, que aquí es una propiedad
 * VIRTUAL vía `@RelationId` (el constructor de índices de TypeORM requiere
 * columnas reales). Con `synchronize: false` no se pierde nada.
 *
 * ## Nota sobre `oit_escalas`
 * El SQL no puede imponer `oit_escalas = (nº de segmentos) - 1` porque es una
 * regla que cruza filas. La verifica el trigger `trg_escalas_consistentes`
 * (§4.5 del plan de base de datos), no un `CHECK`.
 */
@Entity({ name: 'oferta_itinerario' })
export class OfertaItinerario {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_oferta_itinerario' })
  idOfertaItinerario: string;

  /**
   * FK a la oferta (`oit_ofertaId`). `ON DELETE CASCADE`: los itinerarios no
   * sobreviven a su oferta.
   */
  @ManyToOne(() => Oferta, (oferta) => oferta.itinerarios, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'oit_ofertaid' })
  oferta: Oferta;

  /** Valor crudo de `oit_ofertaId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: OfertaItinerario) => entity.oferta)
  ofertaId: string;

  /**
   * `ItineraryOption.itineraryId`. Identificador de negocio (`type: string` en
   * el contrato), único DENTRO de la oferta, no global. Es el valor que el
   * cliente devuelve en `HoldRequest.itinerarySelections[].itineraryId`.
   */
  @Column({ name: 'oit_itineraryid', type: 'varchar', length: 64 })
  itineraryId: string;

  /** Posición del itinerario dentro de la oferta (multidestino: 1..n). */
  @Column({ name: 'oit_orden', type: 'smallint' })
  orden: number;

  /** `ItineraryOption.totalDurationMinutes`. */
  @Column({ name: 'oit_duraciontotalminutos', type: 'integer' })
  duracionTotalMinutos: number;

  /**
   * `ItineraryOption.stopsCount`. Validado contra el número real de
   * `oferta_segmento` por el trigger `trg_escalas_consistentes`.
   */
  @Column({ name: 'oit_escalas', type: 'smallint' })
  escalas: number;

  // ---------------------------------------------------------------------
  // Lado inverso
  // ---------------------------------------------------------------------

  /** Segmentos del itinerario (`osg_itinerarioId`, ON DELETE CASCADE). */
  @OneToMany(() => OfertaSegmento, (segmento) => segmento.itinerario)
  segmentos: OfertaSegmento[];
}
