import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { TarifaCabina } from './tarifa_cabina.entity';

/**
 * Bloque 2 — Ofertas y Tarifas
 * Tabla: `tarifa_equipaje`
 *
 * `CabinPricing.baggageAllowance`: qué equipaje incluye la tarifa comprada.
 *
 * ## PK compartida con la FK
 * `teq_tarifaCabinaId UUID PRIMARY KEY REFERENCES tarifa_cabina(id_tarifa_cabina)`
 * — la misma columna es PK y FK. En TypeORM esto se modela declarando la
 * columna con `@PrimaryColumn` y la relación con `@JoinColumn` sobre ese MISMO
 * nombre. No se puede declarar además un `@Column` para la misma columna física:
 * produciría metadata duplicada y TypeORM fallaría al inicializar.
 *
 * `teq_incluyeBodega` es la fuente del `maxAllowed` que devuelve
 * `BaggageOptionsResponse` y del `CHECK (eqp_cantidad <= eqp_maximoPermitido)`
 * que impide `BAGGAGE_LIMIT_EXCEEDED`.
 *
 * CHECK (teq_incluyeMano >= 0) / CHECK (teq_incluyeBodega >= 0)
 */
@Entity({ name: 'tarifa_equipaje' })
export class TarifaEquipaje {
  /**
   * PK y FK a la tarifa. Lado propietario de la relación.
   * Expone el mismo valor que la columna física, por lo que no hace falta
   * `@RelationId`.
   */
  @PrimaryColumn({ name: 'teq_tarifacabinaid', type: 'uuid' })
  teqTarifaCabinaId: string;

  /** Tarifa a la que pertenece este allowance. `ON DELETE CASCADE`. */
  @OneToOne(
    () => TarifaCabina,
    (tarifaCabina) => tarifaCabina.baggageAllowance,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'teq_tarifacabinaid' })
  tarifaCabina: TarifaCabina;

  /**
   * `baggageAllowance.personalItemIncluded`.
   * El SQL usa `DEFAULT false`.
   */
  @Column({
    name: 'teq_incluyepersonal',
    type: 'boolean',
    default: false,
  })
  incluyePersonal: boolean;

  /**
   * `baggageAllowance.carryOnIncluded` — piezas de equipaje de mano incluidas.
   * `SMALLINT`, `DEFAULT 0`.
   */
  @Column({ name: 'teq_incluyemano', type: 'smallint', default: 0 })
  incluyeMano: number;

  /**
   * `baggageAllowance.checkedBaggageIncluded` — piezas de bodega incluidas.
   * `SMALLINT`, `DEFAULT 0`.
   */
  @Column({ name: 'teq_incluyebodega', type: 'smallint', default: 0 })
  incluyeBodega: number;
}
