import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { CheckinPasajero } from './checkin_pasajero.entity';
import { Reserva } from './reserva.entity';
import { EstadoCheckIn } from './vuelos.enums';

/**
 * Bloque 5 — Boletos, Check-in, Pases de abordar
 * Tabla: `checkin`
 *
 * Cabecera del check-in de una reserva. Responde a
 * `POST /bookings/{bookingId}/check-in` y da el `status` de
 * `CheckInResponse`.
 *
 * UNIQUE (chi_reservaId)  -- en línea, y por eso la relación es 1:1
 * CHECK (chi_estado IN ('NOT_ELIGIBLE','AVAILABLE','IN_PROGRESS','COMPLETED','FAILED'))
 */
@Entity({ name: 'checkin' })
export class Checkin {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_checkin' })
  idCheckin: string;

  /**
   * FK a la reserva (`chi_reservaId`), `NOT NULL UNIQUE`.
   *
   * Como el DDL declara `UNIQUE` en línea, solo puede existir UN check-in por
   * reserva: la relación es 1:1, no 1:N. Por eso se modela con `@OneToOne`
   * (lado propietario) y no con `@ManyToOne`.
   */
  @OneToOne(() => Reserva, (reserva) => reserva.checkin, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'chi_reservaid' })
  reserva: Reserva;

  /**
   * `CheckInStatus`. Nace `AVAILABLE`.
   *
   * `COMPLETED` es lo que habilita emitir pases de abordaje: el trigger
   * `trg_pase_abordar_estado` lo exige y devuelve
   * `BOARDING_PASS_NOT_AVAILABLE` en caso contrario.
   */
  @Column({
    name: 'chi_estado',
    type: 'varchar',
    length: 20,
    default: EstadoCheckIn.AVAILABLE,
    enum: EstadoCheckIn,
  })
  estado: EstadoCheckIn;

  /** Instante del último intento de check-in. */
  @Column({
    name: 'chi_fechahora',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaHora: Date;

  /**
   * Motivo del fallo. Diagnóstico de `CHECK_IN_FAILED`.
   * No está declarado en el contrato: `ProblemDetails.detail` lo cubre en la
   * respuesta de error.
   */
  @Column({
    name: 'chi_motivofallo',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  motivoFallo: string | null;

  // ---------------------------------------------------------------------
  // Lado inverso
  // ---------------------------------------------------------------------

  /**
   * Detalle por pasajero. Tabla puente con PK COMPUESTA
   * `(cpa_checkinId, cpa_pasajeroId)`, por lo que la relación es 1:N pero sin
   * columna FK única propia: la FK compuesta ES la clave primaria.
   */
  @OneToMany(() => CheckinPasajero, (checkinPasajero) => checkinPasajero.checkin)
  pasajeros: CheckinPasajero[];
}
