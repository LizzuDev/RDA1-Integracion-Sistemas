import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';

import { TarifaCabina } from './tarifa_cabina.entity';
import { TipoPasajero } from './vuelos.enums';

/**
 * Bloque 2 — Ofertas y Tarifas
 * Tabla: `tarifa_precio_pasajero`
 *
 * `CabinPricing.pricePerPassengerType[]`: el desglose de precio por tipo de
 * pasajero. La BD almacena un precio por cada uno de ADULT / YOUTH / CHILD /
 * INFANT, porque el GDS cobra distinto por categoría (`PassengerBreakdown`).
 *
 * ## PK compuesta
 * `PRIMARY KEY (tpp_tarifaCabinaId, tpp_tipoPasajero)` → dos `@PrimaryColumn`.
 * La primera es además FK, y se modela con `@JoinColumn` sobre el mismo nombre
 * (no con un `@Column` adicional: duplicaría la metadata).
 *
 * CHECK (tpp_tipoPasajero IN ('ADULT','YOUTH','CHILD','INFANT'))
 * CHECK (tpp_moneda ~ '^[A-Z]{3}$')
 * CHECK (tpp_total = tpp_tarifaBase + tpp_impuestos)
 */
@Entity({ name: 'tarifa_precio_pasajero' })
@Unique('uq_tarifa_precio_pasajero_tarifa_tipo', ['tarifaCabinaId', 'tipoPasajero'])
export class TarifaPrecioPasajero {
  /**
   * Primer componente de la PK y FK a la tarifa (`tpp_tarifaCabinaId`).
   * `ON DELETE CASCADE`.
   */
  @PrimaryColumn({ name: 'tpp_tarifacabinaid', type: 'uuid' })
  tarifaCabinaId: string;

  /** Tarifa a la que pertenece este precio. Lado propietario. */
  @ManyToOne(
    () => TarifaCabina,
    (tarifaCabina) => tarifaCabina.pricePerPassengerType,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'tpp_tarifacabinaid' })
  tarifaCabina: TarifaCabina;

  /**
   * Segundo componente de la PK.
   * `pricePerPassengerType[].passengerType`.
   */
  @PrimaryColumn({
    name: 'tpp_tipopasajero',
    type: 'varchar',
    length: 10,
    enum: TipoPasajero,
  })
  tipoPasajero: TipoPasajero;

  /** `MoneyAmount.currency` de `pricePerPassengerType[].price`. */
  @Column({ name: 'tpp_moneda', type: 'varchar', length: 3 })
  moneda: string;

  /** `pricePerPassengerType[].price.baseFare`. `string` (NUMERIC exacto). */
  @Column({
    name: 'tpp_tarifabase',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  tarifaBase: string;

  /** `pricePerPassengerType[].price.taxes`. */
  @Column({
    name: 'tpp_impuestos',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  impuestos: string;

  /** `pricePerPassengerType[].price.total`. `total = tarifaBase + impuestos`. */
  @Column({ name: 'tpp_total', type: 'numeric', precision: 12, scale: 2 })
  total: string;
}
