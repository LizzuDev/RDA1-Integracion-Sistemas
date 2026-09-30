import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';

import { Oferta } from './oferta.entity';
import { OfertaSegmento } from './oferta_segmento.entity';
import { Vuelo } from './vuelo.entity';

/**
 * Bloque 1 — Catálogo e Inventario
 * Tabla: `aerolinea`
 *
 * Soporta `FlightOffer.airline{code,name}` y da integridad referencial a los
 * códigos IATA de `marketingCarrier` / `operatingCarrier`.
 *
 * A diferencia del resto de tablas del módulo, la PK **no** es un UUID: es el
 * propio código IATA de 3 caracteres (`id_aerolinea VARCHAR(3) PRIMARY KEY`).
 * No se genera en la aplicación.
 *
 * CHECK (id_aerolinea ~ '^[A-Z]{3}$')
 * CHECK (length(btrim(ael_nombre)) > 0)
 */
@Entity({ name: 'aerolinea' })
export class Aerolinea {
  /**
   * PK. Código IATA de la aerolínea, p. ej. `'LAT'`, `'AMX'`.
   * Sirve además de FK en `vuelo.vue_aerolineaMarketingId`,
   * `vuelo.vue_aerolineaOperadoraId` y `oferta.ofe_aerolineaId`.
   */
  @PrimaryColumn({ name: 'id_aerolinea', type: 'varchar', length: 3 })
  idAerolinea: string;

  /**
   * Nombre comercial completo, p. ej. `'LATAM Airlines'`.
   * Alimenta `FlightOffer.airline.name`.
   */
  @Column({ name: 'ael_nombre', type: 'varchar', length: 100 })
  nombre: string;

  // ---------------------------------------------------------------------
  // Lados inversos
  // ---------------------------------------------------------------------

  /**
   * Vuelos en los que esta aerolínea actúa como comercial (`marketingCarrier`).
   * El nombre de la relación es obligatorio: `Vuelo` declara DOS `ManyToOne`
   * hacia `aerolinea`, y TypeORM no puede desambiguar sin él.
   */
  @OneToMany(() => Vuelo, (vuelo) => vuelo.aerolineaMarketing)
  vuelosComoMarketing: Vuelo[];

  /**
   * Vuelos operados por esta aerolínea (`operatingCarrier`).
   * Puede diferir de la comercial cuando hay códigos compartidos.
   */
  @OneToMany(() => Vuelo, (vuelo) => vuelo.aerolineaOperadora)
  vuelosComoOperadora: Vuelo[];

  /** Ofertas cuyo `airline.code` es esta aerolínea. */
  @OneToMany(() => Oferta, (oferta) => oferta.aerolinea)
  ofertas: Oferta[];

  /** Vuelos referenciados por algún `oferta_segmento`. */
  @OneToMany(() => OfertaSegmento, (segmento) => segmento.vuelo)
  segmentosOferta: OfertaSegmento[];
}
