import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  VersionColumn,
} from 'typeorm';

import { bigintToNumber } from './numeric.transformer';
import { BloqueoCupo } from './bloqueo_cupo.entity';
import { Boleto } from './boleto.entity';
import { Checkin } from './checkin.entity';
import { CotizacionCancelacion } from './cotizacion_cancelacion.entity';
import { HistorialCambio } from './historial_cambio.entity';
import { OfertaCambioFecha } from './oferta_cambio_fecha.entity';
import { EstadoReserva } from './vuelos.enums';
import { Pasajero } from './pasajero.entity';
import { ReservaItinerario } from './reserva_itinerario.entity';
import { TarifaCabina } from './tarifa_cabina.entity';

/**
 * Bloque 4 — Reservas y Emisión
 * Tabla: `reserva`
 *
 * Raíz del agregado de reserva. Responde a `GET /bookings`,
 * `GET /bookings/{bookingId}` y es el padre de pasajeros, itinerarios y
 * segmentos comprados.
 *
 * CHECK (res_total = res_tarifaBase + res_impuestos)
 * CHECK (res_pnr IS NULL OR res_pnr ~ '^[A-Z0-9]{6}$')
 * CHECK (res_moneda ~ '^[A-Z]{3}$')
 * CHECK (res_estado IN (...8 estados...))
 * UNIQUE (res_pnr)   -- en línea, sobre una columna nullable
 *
 * ## `res_pnr` es NULLABLE a propósito
 * El DDL lo declara `UNIQUE` sin `NOT NULL`. El PNR lo asigna el GDS al emitir
 * el ticket, dentro de un flujo asíncrono que responde `202`; una reserva en
 * `PENDING` o `TICKET_ISSUING` todavía no lo tiene. En PostgreSQL un `UNIQUE`
 * admite múltiples NULL, de modo que la restricción no estorba. El borrador 3
 * del plan lo exigía `NOT NULL`, lo que hacía imposible el flujo `202`.
 *
 * ## `res_propietarioId` no es una FK
 * Es el `sub` del JWT. El módulo no gestiona usuarios (decisión de diseño), así
 * que es un UUID plano. La RLS `p_reserva_owner` del DLD lo usa para impedir
 * que un cliente lea la reserva de otro (defensa contra IDOR).
 */
@Entity({ name: 'reserva' })
export class Reserva {
  /** PK. Generada por PostgreSQL; es el `bookingId` (`format: uuid`) del contrato. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_reserva' })
  idReserva: string;

  /**
   * `BookingDetail.pnr` y filtro `?pnr=` de `GET /bookings`.
   * NULL hasta que el GDS lo asigne. `UNIQUE` en línea en el DDL.
   */
  @Column({
    name: 'res_pnr',
    type: 'varchar',
    length: 6,
    nullable: true,
    unique: true,
  })
  pnr: string | null;

  /** `sub` del JWT. Sin tabla de usuarios asociada. Base de la política RLS. */
  @Column({ name: 'res_propietarioid', type: 'uuid' })
  propietarioId: string;

  /**
   * `BookingDetail.status`. `DEFAULT 'PENDING'`.
   *
   * Las transiciones válidas las valida el trigger `trg_reserva_transicion`
   * del DDL, que incluye `CANCELLED` como estado terminal. TypeORM no las
   * controla: se documentan aquí para que la lógica de negocio las respete.
   */
  @Column({
    name: 'res_estado',
    type: 'varchar',
    length: 30,
    default: EstadoReserva.PENDING,
    enum: EstadoReserva,
  })
  estado: EstadoReserva;

  /**
   * FK al hold consumido (`res_bloqueoCupoId`), `BookingRequest.holdId`.
   *
   * `ON DELETE SET NULL` y nullable: la reserva sobrevive al hold (que es
   * volátil por diseño) y se conserva la trazabilidad mientras exista.
   */
  @ManyToOne(() => BloqueoCupo, (bloqueoCupo) => bloqueoCupo.reservas, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'res_bloqueocupoid' })
  bloqueoCupo: BloqueoCupo | null;

  /** Valor crudo de `res_bloqueoCupoId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: Reserva) => entity.bloqueoCupo)
  bloqueoCupoId: string | null;

  /** `MoneyAmount.currency` de `BookingDetail.grandTotal`. */
  @Column({ name: 'res_moneda', type: 'varchar', length: 3 })
  moneda: string;

  /**
   * `MoneyAmount.baseFare` de `BookingDetail.grandTotal`.
   * Base de `AMOUNT_MISMATCH`: se compara contra `bloqueo_cupo.precioCongelado`
   * para detectar que el total cobrado no cuadra con el precio retenido.
   */
  @Column({
    name: 'res_tarifabase',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  tarifaBase: string;

  /** `MoneyAmount.taxes` de `BookingDetail.grandTotal`. */
  @Column({
    name: 'res_impuestos',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  impuestos: string;

  /** `MoneyAmount.total` de `BookingDetail.grandTotal`. `total = tarifaBase + impuestos`. */
  @Column({ name: 'res_total', type: 'numeric', precision: 12, scale: 2 })
  total: string;

  /**
   * `PaymentReference.paymentReference` (`BookingRequest.payment`).
   * NULL hasta que exista el pago acreditado. Base de
   * `PAYMENT_REFERENCE_INVALID` y `PAYMENT_NOT_AUTHORIZED`.
   *
   * La API NO procesa tarjetas, 3DS, autorización ni captura: solo guarda la
   * referencia que devuelve la Payment API.
   */
  @Column({
    name: 'res_referenciapago',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  referenciaPago: string | null;

  /**
   * `BookingDetail.createdAt`.
   * Eje del filtro `createdFrom`/`createdTo` y de la paginación por cursor
   * (`nextCursor` codifica el par `createdAt` + `bookingId`).
   */
  @Column({
    name: 'res_fechacreacion',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaCreacion: Date;

  /**
   * `BookingDetail.updatedAt`.
   *
   * NO se usa `@UpdateDateColumn`: el DDL instala el trigger `tg_touch_reserva`
   * que la mantiene al día, y esa es la fuente de verdad. Mapearla además con
   * `@UpdateDateColumn` duplicaría la responsabilidad y permitiría que una
   * escritura que no pase por TypeORM deje la columna desfasada frente al
   * trigger.
   */
  @Column({
    name: 'res_fechaactualizacion',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaActualizacion: Date;

  /**
   * Instante de corte del check-in. Base de `CUTOFF_PASSED` y
   * `CHECK_IN_NOT_AVAILABLE` en `POST /bookings/{bookingId}/check-in`.
   * NULL hasta que el GDS lo comunica.
   */
  @Column({
    name: 'res_cortecheckin',
    type: 'timestamptz',
    nullable: true,
  })
  corteCheckIn: Date | null;

  /**
   * Bloqueo OPTIMISTA (`SELECT ... WHERE res_version = ?`, §4.2 del plan).
   *
   * `BIGINT NOT NULL DEFAULT 0` en el DDL. `@VersionColumn` lo incrementa en
   * SQL en cada `save()` y añade la condición de versión al UPDATE, de modo
   * que una actualización concurrente perdiende no pisa a otra. Es la defensa
   * complementaria al bloqueo pesimista de §4.1 (`FOR UPDATE`): el pesimista
   * serializa transacciones, el optimista detecta colisiones entre procesos
   * que no comparten transacción.
   *
   * `transformer: bigintToNumber` es necesario porque el driver `pg` devuelve
   * `BIGINT` como `string` y `@VersionColumn` compara la versión como número.
   *
   * Complemento en el DDL: `REVOKE UPDATE (res_version, ...) ON reserva` para
   * que la capa de aplicación no pueda saltarse el control de concurrencia.
   */  @VersionColumn({
    name: 'res_version',
    type: 'bigint',
    transformer: bigintToNumber,
  })
  version: number;

  // ---------------------------------------------------------------------
  // Lados inversos
  // ---------------------------------------------------------------------

  /** Pasajeros de la reserva (`pas_reservaId`, ON DELETE CASCADE). */
  @OneToMany(() => Pasajero, (pasajero) => pasajero.reserva)
  pasajeros: Pasajero[];

  /** Itinerarios comprados (`rit_reservaId`, ON DELETE CASCADE). */
  @OneToMany(() => ReservaItinerario, (itinerario) => itinerario.reserva)
  itinerarios: ReservaItinerario[];

  /**
   * Tarifas post-compra (`tca_reservaId`, ON DELETE CASCADE).
   *
   * Lado INVERSO de la relación polimórfica de `TarifaCabina`: la FK vive en
   * `tarifa_cabina`, así que aquí no lleva `@JoinColumn`.
   */
  @OneToMany(() => TarifaCabina, (tarifa) => tarifa.reserva)
  tarifas: TarifaCabina[];

  /**
   * Boletos emitidos (`bol_reservaId`, ON DELETE CASCADE).
   * Alimenta `GET /bookings/{bookingId}/tickets`.
   */
  @OneToMany(() => Boleto, (boleto) => boleto.reserva)
  boletos: Boleto[];

  /**
   * Check-in de la reserva. Es 1:1 porque el DDL declara
   * `chi_reservaId UUID NOT NULL UNIQUE`: no puede haber dos check-ins por
   * reserva. Lado INVERSO, por lo que no lleva `@JoinColumn`.
   */
  @OneToOne(() => Checkin, (checkin) => checkin.reserva)
  checkin: Checkin | null;

  /** Cotizaciones de cancelación (`cco_reservaId`, ON DELETE CASCADE). */
  @OneToMany(
    () => CotizacionCancelacion,
    (cotizacion) => cotizacion.reserva,
  )
  cotizacionesCancelacion: CotizacionCancelacion[];

  /** Ofertas de cambio de fecha (`ocf_reservaId`, ON DELETE CASCADE). */
  @OneToMany(
    () => OfertaCambioFecha,
    (cambio) => cambio.reserva,
  )
  ofertasCambioFecha: OfertaCambioFecha[];

  /** `BookingDetail.changes[]` (`hca_reservaId`, ON DELETE CASCADE). */
  @OneToMany(() => HistorialCambio, (cambio) => cambio.reserva)
  historialCambios: HistorialCambio[];
}
