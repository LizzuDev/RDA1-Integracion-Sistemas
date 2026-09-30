import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { AsientoAsignado } from './asiento_asignado.entity';
import { Boleto } from './boleto.entity';
import { CheckinPasajero } from './checkin_pasajero.entity';
import { EquipajePasajero } from './equipaje_pasajero.entity';
import { PaseAbordar } from './pase_abordar.entity';
import { Genero, TipoDocumento, TipoPasajero } from './vuelos.enums';
import { Reserva } from './reserva.entity';

/**
 * Bloque 4 — Reservas y Emisión
 * Tabla: `pasajero`
 *
 * `PassengerItem` completo. El borrador 3 del plan solo contemplaba 4 de sus 11
 * campos obligatorios (nombre, apellido, tipo y número de documento).
 *
 * UNIQUE (pas_reservaId, pas_pasengerId)
 * CHECK (pas_tipo IN ('ADULT','YOUTH','CHILD','INFANT'))
 * CHECK (pas_tipoDocumento IN ('PASSPORT','NATIONAL_ID'))
 * CHECK (pas_nacionalidad ~ '^[A-Z]{3}$')
 * CHECK (pas_genero IN ('M','F','X'))
 * CHECK (pas_fechaNacimiento <= CURRENT_DATE)
 * CHECK (length(btrim(pas_nombre|apellido|numeroDocumento|telefono)) > 0)
 * CHECK (pas_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
 * CHECK ((pas_tipo = 'INFANT') = (pas_adultoAsociadoId IS NOT NULL))
 *
 * ## `pas_pasengerId` NO es la PK
 * El contrato declara `PassengerItem.passengerId` como `type: string` (no
 * `format: uuid`): es un identificador de correlación que elige el cliente
 * dentro de la reserva, no un UUID del sistema. Por eso la unicidad es
 * COMPUESTA `(pas_reservaId, pas_pasengerId)` y no global.
 *
 * ## `pas_adultoAsociadoId` NO es una FK
 * Es `VARCHAR(64)` y apunta lógicamente al `pas_pasengerId` de un ADULTO de la
 * MISMA reserva. El DDL no declara `REFERENCES` porque el orden de inserción
 * de los pasajeros no está garantizado (un infante puede declararse antes que
 * su adulto), y una FK duro a una columna no-PK de otra fila provocaría
 * insertos fallidos. Lo valida el trigger `trg_infants_con_adulto` (§4.5).
 *
 * ## Datos sensibles
 * `pas_numeroDocumento`, `pas_fechaNacimiento`, `pas_email` y `pas_telefono`
 * son PII. El plan (§6.6) exige cifrado en reposo y que el log de auditoría
 * los OMITA: nunca deben entrar en `log_datosAntiguos` / `log_datosNuevos`.
 */
@Entity({ name: 'pasajero' })
export class Pasajero {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_pasajero' })
  idPasajero: string;

  /**
   * FK a la reserva (`pas_reservaId`). `ON DELETE CASCADE`.
   */
  @ManyToOne(() => Reserva, (reserva) => reserva.pasajeros, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pas_reservaid' })
  reserva: Reserva;

  /** Valor crudo de `pas_reservaId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: Pasajero) => entity.reserva)
  reservaId: string;

  /** `PassengerItem.passengerId`. Identificador de negocio elegido por el cliente. */
  @Column({ name: 'pas_pasengerid', type: 'varchar', length: 64 })
  passengerId: string;

  /** `PassengerItem.passengerType`. */
  @Column({
    name: 'pas_tipo',
    type: 'varchar',
    length: 10,
    enum: TipoPasajero,
  })
  tipo: TipoPasajero;

  /**
   * `PassengerItem.associatedAdultId`.
   *
   * Referencia LÓGICA al `pas_pasengerId` de un adulto de la misma reserva.
   * Obligatorio si y solo si el pasajero es `INFANT` (lo exige el `CHECK` del
   * DDL). Un infante no puede tener asiento propio: de ahí
   * `INFANT_SEAT_NOT_ALLOWED`.
   */
  @Column({
    name: 'pas_adultoasociadoid',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  adultoAsociadoId: string | null;

  /** `PassengerItem.firstName`. */
  @Column({ name: 'pas_nombre', type: 'varchar', length: 100 })
  nombre: string;

  /** `PassengerItem.lastName`. */
  @Column({ name: 'pas_apellido', type: 'varchar', length: 100 })
  apellido: string;

  /** `PassengerItem.documentType`. */
  @Column({
    name: 'pas_tipodocumento',
    type: 'varchar',
    length: 15,
    enum: TipoDocumento,
  })
  tipoDocumento: TipoDocumento;

  /**
   * `PassengerItem.documentNumber`. PII: cifrar en reposo (§6.6).
   * No indexar en claro; si hace falta, indexar el hash.
   */
  @Column({ name: 'pas_numerodocumento', type: 'varchar', length: 50 })
  numeroDocumento: string;

  /** `PassengerItem.nationality`. Código de país IATA de 3 letras. */
  @Column({ name: 'pas_nacionalidad', type: 'varchar', length: 3 })
  nacionalidad: string;

  /**
   * `PassengerItem.documentExpiryDate` (`format: date`, opcional en el contrato).
   * `DATE` -> `string`: usar `Date` en una columna `date` provoca desplazamientos
   * de zona horaria.
   */
  @Column({
    name: 'pas_fechaexpiraciondocumento',
    type: 'date',
    nullable: true,
  })
  fechaExpiracionDocumento: string | null;

  /**
   * `PassengerItem.birthDate` (`format: date`).
   * `CHECK (pas_fechaNacimiento <= CURRENT_DATE)` en el DDL. PII (§6.6).
   */
  @Column({ name: 'pas_fechanacimiento', type: 'date' })
  fechaNacimiento: string;

  /** `PassengerItem.gender`. `X` es el valor neutro admitido por el contrato. */
  @Column({
    name: 'pas_genero',
    type: 'varchar',
    length: 1,
    enum: Genero,
  })
  genero: Genero;

  /**
   * `PassengerItem.contact.email`. 254 = límite RFC 5321.
   * PII: cifrar en reposo.
   */
  @Column({ name: 'pas_email', type: 'varchar', length: 254 })
  email: string;

  /** `PassengerItem.contact.phone`. PII: cifrar en reposo. */
  @Column({ name: 'pas_telefono', type: 'varchar', length: 32 })
  telefono: string;

  /**
   * Orden de presentación dentro de la reserva (adultos antes que infantes).
   * No está en el contrato: es un dato de persistencia para reconstruir el
   * orden de `BookingRequest.passengers[]` fielmente.
   */
  @Column({ name: 'pas_orden', type: 'smallint' })
  orden: number;

  /** Instante de alta del pasajero en la reserva. */
  @Column({
    name: 'pas_creadoen',
    type: 'timestamptz',
    default: () => 'now()',
  })
  creadoEn: Date;

  // ---------------------------------------------------------------------
  // Lado inverso
  // ---------------------------------------------------------------------

  /**
   * Asientos asignados (`asa_pasajeroId`, ON DELETE CASCADE).
   *
   * Nota: `asiento_asignado` NO tiene FK a `asiento_vuelo`; se enlaza por
   * `asa_segmentId`, un identificador de negocio. La integridad del asiento
   * (que exista, esté libre y su cabina coincida) la comprueba el trigger
   * `trg_asiento_valido` (§4.5), no TypeORM.
   */
  @OneToMany(() => AsientoAsignado, (asiento) => asiento.pasajero)
  asientosAsignados: AsientoAsignado[];

  /**
   * Boletos del pasajero (`bol_pasajeroId`, ON DELETE CASCADE).
   * El DDL declara `UNIQUE (bol_reservaId, bol_pasajeroId)`, así que un
   * pasajero tiene como máximo un boleto por reserva, pero puede tener boletos
   * de varias reservas distintas.
   */
  @OneToMany(() => Boleto, (boleto) => boleto.pasajero)
  boletos: Boleto[];

  /**
   * Filas de check-in de este pasajero.
   * Es 1:N porque la tabla `checkin_pasajero` es puente con PK COMPUESTA
   * `(cpa_checkinId, cpa_pasajeroId)`: un pasajero puede pasar por check-in en
   * reservas distintas, e incluso más de una vez si la reserva se reemite.
   */
  @OneToMany(() => CheckinPasajero, (checkinPasajero) => checkinPasajero.pasajero)
  checkins: CheckinPasajero[];

  /** Pases de abordar emitidos (`pab_pasajeroId`, ON DELETE CASCADE). */
  @OneToMany(() => PaseAbordar, (pase) => pase.pasajero)
  pasesAbordar: PaseAbordar[];

  /** Equipaje post-emisión (`eqp_pasajeroId`, ON DELETE CASCADE). */
  @OneToMany(() => EquipajePasajero, (equipaje) => equipaje.pasajero)
  equipajes: EquipajePasajero[];
}
