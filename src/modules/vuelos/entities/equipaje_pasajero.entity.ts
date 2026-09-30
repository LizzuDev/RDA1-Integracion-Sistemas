import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { Pasajero } from './pasajero.entity';

/**
 * Bloque 6 — Postventa
 * Tabla: `equipaje_pasajero`
 *
 * `AddBaggageRequest` / `BaggageOptionsResponse` / `BaggageAddedResponse`.
 *
 * ## Tabla REDISEÑADA respecto al borrador 3 del plan
 * El borrador definía `equipaje (equ_boletoId, equ_limitePeso, equ_tipo)` con
 * `MANO`/`BODEGA`. Eso CONTRADICE el contrato, que no menciona ni `limitePeso`
 * ni `tipo` en ningún punto, y cuya unidad es
 * `(passengerId, itineraryId, quantity)`. Por eso el nombre, las columnas y las
 * PK cambiaron por completo: es el mismo dominio, modelado según el contrato.
 *
 * UNIQUE (eqp_pasajeroId, eqp_itineraryId, eqp_fechaCompra)
 * CHECK (eqp_cantidad >= 1)
 * CHECK (eqp_cantidad <= eqp_maximoPermitido)   -- evita BAGGAGE_LIMIT_EXCEEDED
 * CHECK (eqp_maximoPermitido >= 0) / CHECK (eqp_precio >= 0)
 *
 * ## `eqp_itineraryId` es un identificador de negocio
 * Referencia LÓGICA a `reserva_itinerario.rit_itineraryId`. El DDL no declara
 * `REFERENCES` porque el equipaje comprado es un hecho histórico de la reserva.
 *
 * ## Por qué se guarda `eqp_maximoPermitido`
 * Es una COPIA del `tarifa_equipaje.teq_incluyeBodega` del momento de la compra.
 * Sin esa copia, la cotización de `baggage-options` cambiaría a retroactively si
 * el GDS modificara la tarifa, y `alreadyPurchased` dejaría de ser coherente con
 * `maxAllowed`.
 */
@Entity({ name: 'equipaje_pasajero' })
export class EquipajePasajero {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_equipaje_pasajero' })
  idEquipajePasajero: string;

  /**
   * FK al pasajero (`eqp_pasajeroId`), `AddBaggageRequest.passengerId`.
   * `ON DELETE CASCADE`.
   */
  @ManyToOne(() => Pasajero, (pasajero) => pasajero.equipajes, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eqp_pasajeroid' })
  pasajero: Pasajero;

  /** Valor crudo de `eqp_pasajeroId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: EquipajePasajero) => entity.pasajero)
  pasajeroId: string;

  /** `AddBaggageRequest.itineraryId`. Referencia LÓGICA (ver nota de cabecera). */
  @Column({ name: 'eqp_itineraryid', type: 'varchar', length: 64 })
  itineraryId: string;

  /** `AddBaggageRequest.quantity` (`minimum: 1`). */
  @Column({ name: 'eqp_cantidad', type: 'smallint' })
  cantidad: number;

  /**
   * `BaggageOptionsResponse.maxAllowed`.
   * Copia congelada de `tarifa_equipaje.teq_incluyeBodega` en el momento de la
   * compra (ver nota de cabecera).
   */
  @Column({ name: 'eqp_maximopermitido', type: 'smallint' })
  maximoPermitido: number;

  /** `BaggageOptionsResponse.price.currency`. */
  @Column({ name: 'eqp_moneda', type: 'varchar', length: 3 })
  moneda: string;

  /**
   * `BaggageOptionsResponse.price.total`.
   * `NUMERIC(12,2)` tipado como `string`: nunca pasa por `number` (IEEE-754).
   */
  @Column({
    name: 'eqp_precio',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  precio: string;

  /**
   * `AddBaggageRequest.payment.paymentReference`.
   * La API no procesa tarjetas: solo guarda la referencia de la Payment API.
   * Base de `PAYMENT_REFERENCE_INVALID` / `PAYMENT_NOT_AUTHORIZED`.
   */
  @Column({
    name: 'eqp_referenciapago',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  referenciaPago: string | null;

  /**
   * Instante de la compra.
   *
   * completa la PK lógica `(eqp_pasajeroId, eqp_itineraryId, eqp_fechaCompra)`:
   * permite comprar equipaje en varias fechas para el mismo itinerario, que es el
   * caso normal cuando el equipaje se añade después de un cambio de fecha.
   */
  @Column({
    name: 'eqp_fechacompra',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaCompra: Date;
}
