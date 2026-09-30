import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { BloqueoCupo } from './bloqueo_cupo.entity';
import { ClaseCabina } from './vuelos.enums';

/**
 * Bloque 3 — Bloqueo de Cupos (Hold)
 * Tabla: `bloqueo_itinerario`
 *
 * `HoldRequest.itinerarySelections[]`: qué itinerarios y con qué tarifa queda
 * retenido el cupo. Sin esta tabla, un hold multidestino no podría registrar
 * más de un itinerario.
 *
 * UNIQUE (bli_bloqueoCupoId, bli_itineraryId)
 * CHECK (bli_claseCabina IN ('ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST'))
 * CHECK (bli_orden >= 1)
 *
 * ## El `UNIQUE` queda en el DDL
 * Indexa `bli_bloqueoCupoId`, que aquí es una propiedad VIRTUAL vía
 * `@RelationId`; el constructor de índices de TypeORM requiere columnas
 * reales. Con `synchronize: false` no se pierde nada.
 */
@Entity({ name: 'bloqueo_itinerario' })
export class BloqueoItinerario {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_bloqueo_itinerario' })
  idBloqueoItinerario: string;

  /**
   * FK al hold (`bli_bloqueoCupoId`). `ON DELETE CASCADE`: al liberar o
   * expirar un hold sus itinerarios desaparecen con él.
   */
  @ManyToOne(() => BloqueoCupo, (bloqueoCupo) => bloqueoCupo.itinerarios, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bli_bloqueocupoid' })
  bloqueoCupo: BloqueoCupo;

  /** Valor crudo de `bli_bloqueoCupoId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: BloqueoItinerario) => entity.bloqueoCupo)
  bloqueoCupoId: string;

  /**
   * `HoldRequest.itinerarySelections[].itineraryId`.
   * Identificador de negocio, único dentro del hold. Es el `itineraryId` que el
   * cliente seleccionó de los que ofrecía `oferta_itinerario`.
   */
  @Column({ name: 'bli_itineraryid', type: 'varchar', length: 64 })
  itineraryId: string;

  /** `HoldRequest.itinerarySelections[].cabinClass`. */
  @Column({
    name: 'bli_clasecabina',
    type: 'varchar',
    length: 20,
    enum: ClaseCabina,
  })
  claseCabina: ClaseCabina;

  /**
   * `HoldRequest.itinerarySelections[].fareBrand`.
   * Junto con (claseCabina, fareBrand) identifica una tarifa concreta de
   * `oferta.itinerarios[].pricingOptions[]`.
   */
  @Column({ name: 'bli_marcatarifa', type: 'varchar', length: 50 })
  marcaTarifa: string;

  /** Posición del itinerario dentro del hold (multidestino: 1..n). */
  @Column({ name: 'bli_orden', type: 'smallint' })
  orden: number;
}
