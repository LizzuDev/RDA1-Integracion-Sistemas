import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { CaracteristicaAsiento, ClaseCabina } from './vuelos.enums';
import { Vuelo } from './vuelo.entity';

/**
 * Bloque 1 — Catálogo e Inventario
 * Tabla: `asiento_vuelo`
 *
 * Mapa de asientos por segmento. Alimenta `GET /offers/{offerId}/seatmap`
 * mediante la vista `vista_mapa_asientos` (§5.3) y la vista
 * `vista_ocupacion_vuelo` (§5.7).
 *
 * CHECK (asi_numeroAsiento ~ '^[0-9]{1,2}[A-K]$')
 * CHECK (asi_fila > 0)
 * CHECK (asi_claseCabina IN ('ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST'))
 * UNIQUE (asi_vueloId, asi_numeroAsiento)
 * INDEX ix_asiento_vuelo_cabina (asi_vueloId, asi_claseCabina) WHERE asi_estaDisponible
 *
 * ## Las restricciones se dejan en el DDL, no en los decoradores
 * El `UNIQUE` y el índice PARCIAL se declaran en `vuelos_schema.sql` y NO se
 * replican con `@Unique`/`@Index`. Motivo técnico: ambos indexan
 * `asi_vueloId`, que es una propiedad VIRTUAL obtenida con `@RelationId`. El
 * constructor de índices de TypeORM resuelve las rutas de propiedad contra
 * columnas reales, y un `RelationId` no tiene `databaseName`, de modo que
 * declararlos generaría metadata inválida. Como `synchronize` es `false` (el
 * SQL es la fuente de verdad), replicarlos tampoco aportaría nada.
 */
@Entity({ name: 'asiento_vuelo' })
export class AsientoVuelo {
  /** PK. Generada por PostgreSQL (`gen_random_uuid()`). */
  @PrimaryGeneratedColumn('uuid', { name: 'id_asiento_vuelo' })
  idAsientoVuelo: string;

  /**
   * FK al vuelo. `ON DELETE CASCADE`: al eliminar un vuelo desaparece su
   * inventario de asientos, que no tiene valor por sí solo.
   */
  @ManyToOne(() => Vuelo, (vuelo) => vuelo.asientos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'asi_vueloid' })
  vuelo: Vuelo;

  /**
   * Valor crudo de la FK `asi_vueloId`.
   *
   * Se usa `@RelationId` y NO un `@Column` adicional: declarar `@Column` y
   * `@JoinColumn` sobre la misma columna física (`asi_vueloId`) produce metadata
   * duplicada y TypeORM falla al construir la conexión. `@RelationId` expone el
   * mismo dato como propiedad virtual, sin registrar una segunda columna.
   */
  @RelationId((entity: AsientoVuelo) => entity.vuelo)
  vueloId: string;

  /**
   * `SeatMapResponse.seats[].seatNumber`, p. ej. `'12A'`.
   * El `CHECK` del SQL restringe a 1-2 dígitos seguidos de una letra A-K.
   */
  @Column({ name: 'asi_numeroasiento', type: 'varchar', length: 5 })
  numeroAsiento: string;

  /**
   * `SeatMapResponse.rows[].rowNumber`. `SMALLINT` en el SQL.
   * La vista `vista_mapa_asientos` agrupa por (segmentId, cabina, fila).
   */
  @Column({ name: 'asi_fila', type: 'smallint' })
  fila: number;

  /**
   * Cabina a la que pertenece el asiento. Base de `SEAT_CABIN_MISMATCH`:
   * el trigger `trg_asiento_valido` (§4.5) exige que coincida con la tarifa
   * comprada por el pasajero.
   */
  @Column({
    name: 'asi_clasecabina',
    type: 'varchar',
    length: 20,
    enum: ClaseCabina,
  })
  claseCabina: ClaseCabina;

  /**
   * `SeatMapResponse.seats[].isAvailable`. Inventario scarce: se protege con
   * `SELECT ... FOR UPDATE SKIP LOCKED` (§4.1) para evitar la sobreventa.
   */
  @Column({
    name: 'asi_estadisponible',
    type: 'boolean',
    default: true,
  })
  estaDisponible: boolean;

  /**
   * `SeatMapResponse.seats[].characteristics`.
   *
   * `VARCHAR(20)[]` con `DEFAULT '{}'`. El SQL no valida el contenido de los
   * elementos (no hay `CHECK` posible sin una función auxiliar en PostgreSQL),
   * de modo que el enum `CaracteristicaAsiento` es la única barrera de
   * validación. La vista lo expone con `to_json(...)`.
   */
  @Column({
    name: 'asi_caracteristicas',
    type: 'varchar',
    length: 20,
    array: true,
    nullable: false,
    default: () => "'{}'",
  })
  caracteristicas: CaracteristicaAsiento[];
}
