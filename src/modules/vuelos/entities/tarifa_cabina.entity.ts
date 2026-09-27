import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  Unique,
} from 'typeorm';

import { Oferta } from './oferta.entity';
import { Reserva } from './reserva.entity';
import { ReservaSegmento } from './reserva_segmento.entity';
import { TarifaEquipaje } from './tarifa_equipaje.entity';
import { TarifaPrecioPasajero } from './tarifa_precio_pasajero.entity';
import { ClaseCabina } from './vuelos.enums';

/**
 * Bloque 2 — Ofertas y Tarifas
 * Tabla: `tarifa_cabina`
 *
 * `CabinPricing`. Es la tabla más delicada del módulo por su **padre
 * polimórfico**: una tarifa pertenece O a una oferta (pre-compra, consultable y
 * volátil) O a una reserva (post-compra, ya inmutable). Nunca a ambas.
 *
 * CHECK (num_nonnulls(tca_ofertaId, tca_reservaId) = 1)   ← la invariante clave
 * CHECK (tca_claseCabina IN ('ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST'))
 * CHECK (tca_total = tca_tarifaBase + tca_impuestos)
 * CHECK (tca_marcaTarifa, tca_tarifaBase, tca_impuestos, tca_precioEquipajeExtra >= 0)
 * UNIQUE (tca_itinerarioId, tca_claseCabina, tca_marcaTarifa)
 *
 * ## Por qué `tca_itinerarioId` NO es una FK
 * El SQL lo declara `UUID NOT NULL` **sin** `REFERENCES`, de forma intencionada:
 * apunta a `oferta_itinerario.id_oferta_itinerario` cuando el padre es una
 * oferta, y a `reserva_itinerario.id_reserva_itinerario` cuando es una reserva.
 * Una FK única es imposible porque ambas tablas son independientes. Por eso
 * aquí se mapea como columna plana y la coherencia la garantiza el trigger
 * `trg_tarifa_itinerario_valido` (§4.5 del plan de base de datos), no TypeORM.
 *
 * ## Estado de la iteración
 * `tca_reservaId` era una FK diferida en el SQL. Ahora que la entidad `Reserva`
 * existe, se mapeó como relación `@ManyToOne` (Bloques 3 y 4). El
 * `CHECK (num_nonnulls(tca_ofertaId, tca_reservaId) = 1)` sigue sin poder
 * expresarse en TypeORM: lo garantiza PostgreSQL.
 */
@Entity({ name: 'tarifa_cabina' })
@Unique('uq_tarifa_cabina_itinerario_cabina_marca', [
  'itinerarioId',
  'claseCabina',
  'marcaTarifa',
])
export class TarifaCabina {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_tarifa_cabina' })
  idTarifaCabina: string;

  /**
   * Padre "pre-compra". NULL cuando la tarifa ya está comprada y pertenece a una
   * reserva. `ON DELETE CASCADE`.
   */
  @ManyToOne(() => Oferta, (oferta) => oferta.tarifas, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tca_ofertaid' })
  oferta: Oferta | null;

  /**
   * Padre "post-compra": tarifas ya compradas y congeladas en una reserva.
   *
   * La FK es real en el DDL (`fk_tarifa_cabina_reserva`, añadida diferida con
   * `ALTER TABLE` porque `reserva` se crea después en el script), con
   * `ON DELETE CASCADE`.
   *
   * Hasta que la entidad `Reserva` existió, esta columna se mapeó como plana.
   * Ahora es una relación `@ManyToOne`: la entidad es un espejo del DDL, así
   * que dejarla plana significaría que TypeORM no conoce una FK que sí existe.
   */
  @ManyToOne(() => Reserva, (reserva) => reserva.tarifas, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tca_reservaid' })
  reserva: Reserva | null;

  /**
   * Valor crudo de `tca_reservaId` (virtual; ver nota de `@RelationId`).
   *
   * El `@Unique` de esta entidad se apoya en `itinerarioId`, que es una
   * columna real, así que no se ve afectado por usar `@RelationId` aquí.
   */
  @RelationId((entity: TarifaCabina) => entity.reserva)
  reservaId: string | null;

  /**
   * Referencia lógica al itinerario (ver nota de cabecera). `NOT NULL` en el SQL.
   */
  @Column({ name: 'tca_itinerarioid', type: 'uuid' })
  itinerarioId: string;

  /**
   * `CabinPricing.cabinClass`. Es la tarifa comprada la que fija la cabina
   * legítima de cada asiento (`SEAT_CABIN_MISMATCH`).
   */
  @Column({
    name: 'tca_clasecabina',
    type: 'varchar',
    length: 20,
    enum: ClaseCabina,
  })
  claseCabina: ClaseCabina;

  /** `CabinPricing.fareBrand`, p. ej. `'LIGHT'`, `'FLEX'`. */
  @Column({ name: 'tca_marcatarifa', type: 'varchar', length: 50 })
  marcaTarifa: string;

  /**
   * `CabinPricing.availableSeats`. Es una CACHÉ del recuento real sobre
   * `asiento_vuelo`; la vista de búsqueda debe refrescarla. No sustituye al
   * inventario real, que es la fuente de verdad.
   */
  @Column({ name: 'tca_asientosdisponibles', type: 'smallint' })
  asientosDisponibles: number;

  /**
   * `CabinPricing.fareRules.isRefundable`. Se congela en el momento de la
   * compra: cambiar la tarifa del GDS después no debe alterar el derecho de
   * reembolso de una reserva ya emitida.
   */
  @Column({ name: 'tca_esreembolsable', type: 'boolean' })
  esReembolsable: boolean;

  /** `CabinPricing.fareRules.isChangeable`. Base del `FARE_NOT_CHANGEABLE`. */
  @Column({ name: 'tca_esmodificable', type: 'boolean' })
  esModificable: boolean;

  /** `MoneyAmount.currency`. `^[A-Z]{3}$`. */
  @Column({ name: 'tca_moneda', type: 'varchar', length: 3 })
  moneda: string;

  /** `MoneyAmount.baseFare` de la tarifa. `string` para no perder precisión. */
  @Column({
    name: 'tca_tarifabase',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  tarifaBase: string;

  /** `MoneyAmount.taxes` de la tarifa. */
  @Column({
    name: 'tca_impuestos',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  impuestos: string;

  /** `MoneyAmount.total` de la tarifa. `total = tarifaBase + impuestos`. */
  @Column({ name: 'tca_total', type: 'numeric', precision: 12, scale: 2 })
  total: string;

  /**
   * `CabinPricing.extraCheckedBaggagePrice`. Se usa como base de
   * `BaggageOptionsResponse.price` en `GET /bookings/{id}/baggage-options`.
   */
  @Column({
    name: 'tca_precioequipajeextra',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  precioEquipajeExtra: string;

  // ---------------------------------------------------------------------
  // Lados inversos
  // ---------------------------------------------------------------------

  /**
   * `CabinPricing.baggageAllowance`.
   *
   * Relación 1:1 porque `tarifa_equipaje.teq_tarifaCabinaId` es a la vez PK y
   * FK. TypeORM exige que el lado propietario declare la columna con
   * `@PrimaryColumn`; el lado inverso usa `@OneToOne` sin `@JoinColumn`.
   */
  @OneToOne(() => TarifaEquipaje, (equipaje) => equipaje.tarifaCabina)
  baggageAllowance: TarifaEquipaje | null;

  /** `CabinPricing.pricePerPassengerType[]`. Relación 1:N (PK compuesta). */
  @OneToMany(() => TarifaPrecioPasajero, (precio) => precio.tarifaCabina)
  pricePerPassengerType: TarifaPrecioPasajero[];

  /**
   * Segmentos de reserva que compraron con esta tarifa
   * (`rsg_tarifaCabinaId`, ON DELETE SET NULL). Lado INVERSO: la FK vive en
   * `reserva_segmento`.
   */
  @OneToMany(() => ReservaSegmento, (segmento) => segmento.tarifaCabina)
  segmentosReserva: ReservaSegmento[];
}
