import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Aerolinea } from './aerolinea.entity';
import { BloqueoCupo } from './bloqueo_cupo.entity';
import { OfertaItinerario } from './oferta_itinerario.entity';
import { TarifaCabina } from './tarifa_cabina.entity';

/**
 * Bloque 2 — Ofertas y Tarifas
 * Tabla: `oferta`
 *
 * Raíz del agregado de búsqueda (`POST /search`). El borrador 3 del plan de
 * base de datos no tenía ninguna tabla de ofertas, pese a que
 * `HoldRequest.offerId` y `FlightOffer.offerId` la referencian: sin esta tabla
 * el endpoint de hold no tenía destino posible.
 *
 * CHECK (ofe_moneda ~ '^[A-Z]{3}$')
 * CHECK (ofe_tarifaBase >= 0) / CHECK (ofe_impuestos >= 0) / CHECK (ofe_total >= 0)
 * CHECK (ofe_total = ofe_tarifaBase + ofe_impuestos)
 * CHECK (ofe_huellaCatalogo ~ '^[a-f0-9]{64}$')
 * UNIQUE (ofe_offerId)
 *
 * ## `ofe_offerId` no es la PK
 * El contrato declara `offerId` como `type: string` (no `format: uuid`), así que
 * es un identificador de negocio emitido por el GDS. La PK interna `id_oferta`
 * es un UUID que solo existe dentro de la base de datos.
 */
@Entity({ name: 'oferta' })
export class Oferta {
  /** PK interna. Generada por PostgreSQL (`gen_random_uuid()`). */
  @PrimaryGeneratedColumn('uuid', { name: 'id_oferta' })
  idOferta: string;

  /**
   * `FlightOffer.offerId`; también path param de
   * `GET /offers/{offerId}/seatmap`. Identificador de negocio del GDS.
   * Declarado `UNIQUE` en el SQL (restricción en línea, sin nombre explícito).
   */
  @Column({ name: 'ofe_offerid', type: 'varchar', length: 64, unique: true })
  offerId: string;

  /**
   * `FlightOffer.airline.code`. Aerolínea de la oferta.
   */
  @ManyToOne(() => Aerolinea, (aerolinea) => aerolinea.ofertas, {
    nullable: false,
  })
  @JoinColumn({ name: 'ofe_aerolineaid' })
  aerolinea: Aerolinea;

  /** Instante de creación de la oferta (GDS). */
  @Column({
    name: 'ofe_fechacreacion',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaCreacion: Date;

  /**
   * Vigencia de la oferta. Base del `410`/`OFFER_NO_LONGER_AVAILABLE`: una
   * búsqueda con un `offerId` cuya `ofe_expiraEn` ya pasó debe rechazarse.
   */
  @Column({ name: 'ofe_expiraen', type: 'timestamptz' })
  expiraEn: Date;

  /** `MoneyAmount.currency` de `FlightOffer.grandTotal` — `^[A-Z]{3}$`. */
  @Column({ name: 'ofe_moneda', type: 'varchar', length: 3 })
  moneda: string;

  /**
   * `MoneyAmount.baseFare`.
   *
   * NUMERIC(12,2) se tipa como `string` a propósito: el driver `pg` devuelve
   * `numeric` como texto para no perder precisión, y el contrato OpenAPI
   * declara estos campos como `type: string`. Ver `numeric.transformer.ts`.
   */
  @Column({ name: 'ofe_tarifabase', type: 'numeric', precision: 12, scale: 2 })
  tarifaBase: string;

  /** `MoneyAmount.taxes`. */
  @Column({ name: 'ofe_impuestos', type: 'numeric', precision: 12, scale: 2 })
  impuestos: string;

  /** `MoneyAmount.total`. Invariante: `total = tarifaBase + impuestos`. */
  @Column({ name: 'ofe_total', type: 'numeric', precision: 12, scale: 2 })
  total: string;

  /**
   * SHA-256 del resultado de búsqueda que originó la oferta. Permite detectar
   * que un `offerId` sigue vigente frente al catálogo real del GDS
   * (`OFFER_NO_LONGER_AVAILABLE`). `CHAR(64)` → tipo `char` (bpchar) en PG.
   */
  @Column({
    name: 'ofe_huellacatalogo',
    type: 'char',
    length: 64,
    nullable: true,
  })
  huellaCatalogo: string | null;

  // ---------------------------------------------------------------------
  // Lados inversos
  // ---------------------------------------------------------------------

  /** Itinerarios de la oferta (`oit_ofertaId`, ON DELETE CASCADE). */
  @OneToMany(() => OfertaItinerario, (itinerario) => itinerario.oferta)
  itinerarios: OfertaItinerario[];

  /** Tarifas pre-compra (`tca_ofertaId`, ON DELETE CASCADE). */
  @OneToMany(() => TarifaCabina, (tarifa) => tarifa.oferta)
  tarifas: TarifaCabina[];

  /**
   * Holds que retienen esta oferta (`blo_ofertaId`, ON DELETE RESTRICT).
   * Un hold es la prueba del precio congelado, así que impide borrar la oferta.
   */
  @OneToMany(() => BloqueoCupo, (bloqueo) => bloqueo.oferta)
  bloqueos: BloqueoCupo[];
}
