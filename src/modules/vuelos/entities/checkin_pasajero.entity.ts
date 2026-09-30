import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  RelationId,
} from 'typeorm';

import { Checkin } from './checkin.entity';
import { CheckinSegmento } from './checkin_segmento.entity';
import { Pasajero } from './pasajero.entity';
import { EstadoCheckInItem } from './vuelos.enums';

/**
 * Bloque 5 — Boletos, Check-in, Pases de abordar
 * Tabla: `checkin_pasajero`  —  TABLA PUENTE con PK COMPUESTA
 *
 *     CREATE TABLE checkin_pasajero (
 *         cpa_checkinId  UUID NOT NULL REFERENCES checkin(id_checkin)   ON DELETE CASCADE,
 *         cpa_pasajeroId UUID NOT NULL REFERENCES pasajero(id_pasajero) ON DELETE CASCADE,
 *         cpa_estado     VARCHAR(20) NOT NULL CHECK (...),
 *         PRIMARY KEY (cpa_checkinId, cpa_pasajeroId)
 *     );
 *
 * ## Cómo se mapea una PK compuesta que es a su vez FK
 * Cada componente de la PK es ademas una FK. Es el patron "FK que es PK": la
 * columna se declara con `@PrimaryColumn` y encima se declara la relacion con
 * `@ManyToOne` + `@JoinColumn` apuntando al MISMO nombre fisico.
 *
 * `JoinColumnOptions` NO admite `insert: false` ni `update: false` (esos flags
 * solo existen en `@Column`), asi que la relacion si escribe la columna. No es
 * un problema: TypeORM tolera que la columna figure en `metadata.columns` por la
 * `@PrimaryColumn` y en `relation.joinColumns` por la relacion, y el INSERT
 * resulting es correcto con una sola columna.
 *
 * Lo que SI importa, y ya se documenta en `checkin_segmento.entity.ts`, es que
 * la entidad HIJA use en `referencedColumnName` el NOMBRE DE LA PROPIEDAD
 * (`checkinId`), no el de la columna (`cpa_checkinid`). Con el nombre de columna
 * TypeORM responde `Referenced column cpa_checkinid was not found in entity
 * CheckinPasajero`, porque esa columna aparece dos veces en los metadatos y no
 * es univoca. Con el nombre de la propiedad resuelve sin ambiguedad.
 *
 * Por que no se quita el `@JoinColumn`: sin el, TypeORM deduciria el nombre de
 * la columna a partir del nombre de la RELACION (`checkin` -> `checkinId`),
 * que no existe en la tabla, y generaria un `JOIN` a una columna inexistente.
 *
 * Nótese que NO se usa una "clase unida" (`*Closure`): TypeORM resuelve
 * nativamente las relaciones 1:N con FK compuesta sin necesidad de tabla de
 * cierre artificial, y aquí además el DDL ya provee la tabla puente. Añadir una
 * tabla intermedia virtual duplicaría el modelo.
 *
 * Contrato: `CheckInResponse.checkedInPassengers[]`.
 */
@Entity({ name: 'checkin_pasajero' })
export class CheckinPasajero {
  /**
   * Componente 1 de la PK y FK a `checkin` (`cpa_checkinid`).
   */
  @PrimaryColumn({ name: 'cpa_checkinid', type: 'uuid' })
  checkinId: string;

  /** Check-in al que pertenece esta fila. Lado propietario. */
  @ManyToOne(() => Checkin, (checkin) => checkin.pasajeros, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cpa_checkinid' })
  checkin: Checkin;

  /**
   * Componente 2 de la PK y FK a `pasajero` (`cpa_pasajeroid`).
   * Mismo tratamiento que arriba.
   */
  @PrimaryColumn({ name: 'cpa_pasajeroid', type: 'uuid' })
  pasajeroId: string;

  /** Pasajero al que corresponde el estado de check-in. Lado propietario. */
  @ManyToOne(() => Pasajero, (pasajero) => pasajero.checkins, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cpa_pasajeroid' })
  pasajero: Pasajero;

  /**
   * `checkedInPassengers[].status`.
   *
   * Un pasajero puede fallar el check-in de forma individual sin que el del
   * check-in completo falle: por eso el estado se guarda en los dos niveles.
   */
  @Column({
    name: 'cpa_estado',
    type: 'varchar',
    length: 20,
    enum: EstadoCheckInItem,
  })
  estado: EstadoCheckInItem;

  // ---------------------------------------------------------------------
  // Lado inverso
  // ---------------------------------------------------------------------

  /**
   * Detalle por segmento. Tabla puente con PK COMPUESTA de TRES columnas y FK
   * compuesta a esta tabla, declarada en el DDL como
   * `FOREIGN KEY (cse_checkinId, cse_pasajeroId) REFERENCES checkin_pasajero(...)`.
   */
  @OneToMany(
    () => CheckinSegmento,
    (checkinSegmento) => checkinSegmento.checkinPasajero,
  )
  segmentos: CheckinSegmento[];
}
