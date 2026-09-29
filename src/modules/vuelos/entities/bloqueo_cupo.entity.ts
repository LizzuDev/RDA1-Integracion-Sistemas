import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  VersionColumn,
} from 'typeorm';

import { bigintToNumber } from './numeric.transformer';
import { Oferta } from './oferta.entity';
import { BloqueoItinerario } from './bloqueo_itinerario.entity';
import { EstadoHold } from './vuelos.enums';
import { Reserva } from './reserva.entity';

/**
 * Bloque 3 — Bloqueo de Cupos (Hold)
 * Tabla: `bloqueo_cupo`
 *
 * Retiene inventario y congela un precio durante 15 o 30 minutos. Responde a
 * `POST /offers/hold` y `GET /offers/hold/{holdId}`.
 *
 * CHECK (blo_ttlMinutos IN (15, 30))
 * CHECK (blo_estado IN ('HELD','RELEASED','EXPIRED','CONSUMED'))
 * CHECK (blo_moneda ~ '^[A-Z]{3}$')
 * CHECK (blo_precioCongelado >= 0)
 * CHECK (blo_adultos >= 1)            -- PassengerBreakdown.adults (minimum: 1)
 * CHECK (blo_adultos|jovenes|ninos|infants >= 0)
 * CHECK (blo_fechaExpiracion > blo_fechaCreacion)
 *
 * ## `blo_propietarioId` no es una FK
 * Es el `sub` del JWT. El módulo no gestiona usuarios (decisión de diseño del
 * proyecto), así que es un UUID plano sin tabla referenciada. La RLS
 * `p_hold_owner` del DDL lo usa para aislar los holds de cada cliente.
 */
@Entity({ name: 'bloqueo_cupo' })
export class BloqueoCupo {
  /** PK. Generada por PostgreSQL (`gen_random_uuid()`); es el `holdId` del contrato. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_bloqueo_cupo' })
  idBloqueoCupo: string;

  /**
   * FK a la oferta retenida (`blo_ofertaId`).
   *
   * `ON DELETE RESTRICT`: no se borra una oferta que tiene un hold vivo, porque
   * ese hold es la prueba del precio congelado que se está usando.
   */
  @ManyToOne(() => Oferta, (oferta) => oferta.bloqueos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'blo_ofertaid' })
  oferta: Oferta;

  /** Valor crudo de `blo_ofertaId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: BloqueoCupo) => entity.oferta)
  ofertaId: string;

  /**
   * `sub` del JWT. Sin relación: el módulo no tiene tabla de usuarios.
   * Alimenta la política RLS `p_hold_owner`.
   */
  @Column({ name: 'blo_propietarioid', type: 'uuid' })
  propietarioId: string;

  /** Instante de creación del hold. */
  @Column({
    name: 'blo_fechacreacion',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaCreacion: Date;

  /**
   * `HoldResponse.expiresAt` / `HoldStatusResponse.expiresAt`.
   *
   * `NOT NULL` y SIN default en el SQL a propósito: se calcula en el INSERT
   * como `fechaCreacion + make_interval(mins => ttlMinutos)`, no con un DEFAULT
   * frágil que ignoraría el TTL elegido.
   */
  @Column({ name: 'blo_fechaexpiracion', type: 'timestamptz' })
  fechaExpiracion: Date;

  /** `HoldResponse.ttlMinutes`. `CHECK (blo_ttlMinutos IN (15, 30))`. */
  @Column({ name: 'blo_ttlminutos', type: 'smallint', default: 15 })
  ttlMinutos: number;

  /**
   * `HoldStatusResponse.status`. Nace siempre en `HELD`.
   * Las transiciones válidas las controla el trigger de la máquina de estados.
   */
  @Column({
    name: 'blo_estado',
    type: 'varchar',
    length: 20,
    default: EstadoHold.HELD,
    enum: EstadoHold,
  })
  estado: EstadoHold;

  /** `MoneyAmount.currency` de `HoldResponse.lockedPrice`. */
  @Column({ name: 'blo_moneda', type: 'varchar', length: 3 })
  moneda: string;

  /**
   * `HoldResponse.lockedPrice.total`.
   *
   * INMUTABLE: el trigger `tg_hold_inmutable` del DDL rechaza cualquier UPDATE
   * que altere este valor (ni `blo_ofertaId`, ni `blo_propietarioId`, ni
   * `blo_fechaCreacion`). Es el precio congelado quejustify la reserva.
   */
  @Column({
    name: 'blo_preciocongelado',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  precioCongelado: string;

  // ---------------------------------------------------------------------
  // Desglose de pasajeros (PassengerBreakdown)
  // ---------------------------------------------------------------------

  /** `PassengerBreakdown.adults`. `CHECK (blo_adultos >= 1)`: siempre hay un adulto. */
  @Column({ name: 'blo_adultos', type: 'smallint', default: 0 })
  adultos: number;

  /** `PassengerBreakdown.youths`. */
  @Column({ name: 'blo_jovenes', type: 'smallint', default: 0 })
  jovenes: number;

  /** `PassengerBreakdown.children`. */
  @Column({ name: 'blo_ninos', type: 'smallint', default: 0 })
  ninos: number;

  /**
   * `PassengerBreakdown.infants`.
   *
   * Base normativa de `INFANT_SEAT_NOT_ALLOWED`: un infante no puede llevar
   * asiento propio, así que el desglose se congela aquí para poder validar el
   * cupo total bajo un único bloqueo pesimista de fila.
   */
  @Column({ name: 'blo_infants', type: 'smallint', default: 0 })
  infantes: number;

  /**
   * Suma de los cuatro desgloses. Columna GENERATED en PostgreSQL:
   *
   *     blo_totalPasajeros SMALLINT GENERATED ALWAYS AS
   *       (blo_adultos + blo_jovenes + blo_ninos + blo_infants) STORED
   *
   * `generatedType: 'STORED'` la mapea como solo lectura: TypeORM no la
   * incluye en los INSERT ni en los UPDATE. No se calcula en JavaScript para
   * evitar que ambas copias se desincronicen.
   */
  @Column({
    name: 'blo_totalpasajeros',
    type: 'smallint',
    generatedType: 'STORED',
    insert: false,
    update: false,
  })
  totalPasajeros: number;

  /**
   * Bloqueo OPTIMISTA (`SELECT ... WHERE blo_version = ?`, §4.2 del plan).
   *
   * El DDL lo define como `BIGINT NOT NULL DEFAULT 0`. `@VersionColumn` lo
   * incrementa en SQL (`blo_version = blo_version + 1`) en cada `save()` y
   * añade la condición de versión al UPDATE, de modo que dos transacciones
   * concurrentes no puedan sobrescribirse.
   *
   * `transformer: bigintToNumber` es necesario porque el driver `pg` devuelve
   * `BIGINT` como `string` y `@VersionColumn` compara la versión como número.
   *
   * Límite del mecanismo: solo protege las escrituras que pasan por
   * `repository.save()` / `update()`. Un `queryRunner.query()` crudo lo evita,
   * por lo que las operaciones sensibles (expiración de holds,Transiciones de
   * estado) deben usar siempre el repositorio.
   */
  @VersionColumn({
    name: 'blo_version',
    type: 'bigint',
    transformer: bigintToNumber,
  })
  version: number;

  // ---------------------------------------------------------------------
  // Lados inversos
  // ---------------------------------------------------------------------

  /** Itinerarios retenidos (`bli_bloqueoCupoId`, ON DELETE CASCADE). */
  @OneToMany(
    () => BloqueoItinerario,
    (itinerario) => itinerario.bloqueoCupo,
  )
  itinerarios: BloqueoItinerario[];

  /**
   * Reservas que consumieron este hold (`res_bloqueoCupoId`, ON DELETE SET NULL).
   * OneToMany y no OneToOne porque el DDL no impone unicidad en esa FK: una
   * reserva puede quedar huérfana si el hold se borra, y debe seguir existiendo.
   */
  @OneToMany(() => Reserva, (reserva) => reserva.bloqueoCupo)
  reservas: Reserva[];
}
