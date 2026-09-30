import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  RelationId,
} from 'typeorm';

import { CheckinPasajero } from './checkin_pasajero.entity';
import { EstadoCheckInItem } from './vuelos.enums';

/**
 * Bloque 5 — Boletos, Check-in, Pases de abordar
 * Tabla: `checkin_segmento`  —  PK COMPUESTA de TRES columnas
 *
 *     CREATE TABLE checkin_segmento (
 *         cse_checkinId  UUID        NOT NULL,
 *         cse_pasajeroId UUID        NOT NULL,
 *         cse_segmentId  VARCHAR(64) NOT NULL,
 *         cse_asiento    VARCHAR(5),
 *         cse_estado     VARCHAR(20) NOT NULL CHECK (...),
 *         PRIMARY KEY (cse_checkinId, cse_pasajeroId, cse_segmentId),
 *         FOREIGN KEY (cse_checkinId, cse_pasajeroId)
 *           REFERENCES checkin_pasajero(cpa_checkinId, cpa_pasajeroId)
 *           ON DELETE CASCADE
 *     );
 *
 * ## La FK compuesta, en TypeORM
 * La relación con `CheckinPasajero` tiene FK de DOS columnas y ninguna de ellas
 * es una clave ajena única, así que TypeORM no puede deducirla. Se declara
 * `@ManyToOne` con un `@JoinColumns` (plural) que nombra las dos columnas de
 * unión, y sus dos contrapartes con `@PrimaryColumn` + `@RelationId`.
 *
 * `cse_segmentId` es el tercer componente de la PK y NO participa de la FK:
 * es el identificador de negocio del segmento (`reserva_segmento.rsg_segmentId`).
 *
 * Contrato: `CheckInResponse.checkedInPassengers[].segments[]`.
 */
@Entity({ name: 'checkin_segmento' })
export class CheckinSegmento {
  /** Componente 1 de la PK y 1 de la FK compuesta. */
  @PrimaryColumn({ name: 'cse_checkinid', type: 'uuid' })
  checkinId: string;

  /** Componente 2 de la PK y 2 de la FK compuesta. */
  @PrimaryColumn({ name: 'cse_pasajeroid', type: 'uuid' })
  pasajeroId: string;

  /**
   * Componente 3 de la PK. Identificador de negocio del segmento; NO forma
   * parte de la FK a `checkin_pasajero`.
   */
  @PrimaryColumn({ name: 'cse_segmentid', type: 'varchar', length: 64 })
  segmentId: string;

  /**
   * Fila puente de `checkin_pasajero`.
   *
   * `@JoinColumns` (plural) porque la FK es compuesta. El orden debe coincidir
   * con el de las columnas de unión declaradas abajo.
   *
   * `referencedColumnName` puede ser el nombre de la PROPIEDAD o el de la
   * columna física; TypeORM acepta ambos. Aquí se usa la propiedad
   * (`checkinId`, `pasajeroId`) de `CheckinPasajero`, que a su vez apunta por
   * `@JoinColumn` a las columnas `cpa_checkinid` / `cpa_pasajeroid`.
   *
   * No se debe cambiar por el nombre de la columna: con `cpa_checkinid`
   * TypeORM responde `Referenced column cpa_checkinid was not found in entity
   * CheckinPasajero`, porque en esa entidad esa columna la declara DOS veces
   * (la `@PrimaryColumn` y la `@JoinColumn` de la relación `checkin`) y no está
   * en el mapa de columnas de forma unívoca. Ver la nota de `CheckinPasajero`
   * sobre ese duplicado.
   */
  @ManyToOne(
    () => CheckinPasajero,
    (checkinPasajero) => checkinPasajero.segmentos,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn([
    { name: 'cse_checkinid', referencedColumnName: 'checkinId' },
    { name: 'cse_pasajeroid', referencedColumnName: 'pasajeroId' },
  ])
  checkinPasajero: CheckinPasajero;

  /**
   * Valor crudo de la PK compuesta. `@RelationId` admite una tupla para
   * relaciones con FK compuesta.
   */
  @RelationId((entity: CheckinSegmento) => entity.checkinPasajero)
  checkinPasajeroId: { cse_checkinid: string; cse_pasajeroid: string };

  /**
   * `segments[].seat` (`nullable: true`).
   * Puede quedar NULL si el pasajero no tenía asiento asignado.
   */
  @Column({
    name: 'cse_asiento',
    type: 'varchar',
    length: 5,
    nullable: true,
  })
  asiento: string | null;

  /**
   * `segments[].status`. A nivel de segmento porque un pasajero puede haber
   * hecho check-in en un tramo y fallar en otro.
   */
  @Column({
    name: 'cse_estado',
    type: 'varchar',
    length: 20,
    enum: EstadoCheckInItem,
  })
  estado: EstadoCheckInItem;
}
