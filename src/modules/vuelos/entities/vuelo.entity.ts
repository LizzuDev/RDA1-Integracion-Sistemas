import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Aerolinea } from './aerolinea.entity';
import { AsientoVuelo } from './asiento_vuelo.entity';
import { OfertaCambioSegmento } from './oferta_cambio_segmento.entity';
import { OfertaSegmento } from './oferta_segmento.entity';
import { ReservaSegmento } from './reserva_segmento.entity';
import { EstadoVuelo } from './vuelos.enums';

/**
 * Bloque 1 — Catálogo e Inventario
 * Tabla: `vuelo`
 *
 * Instancia **fechada** de un vuelo: la clave natural es
 * `(vue_numeroVuelo, vue_fecha)`, no el instante de salida. Responde a
 * `GET /flights/{flightNumber}/status` (endpoint público) y es la única fuente
 * de verdad operativa de horarios, terminales y estado, tanto para
 * `vista_busqueda_vuelos` (§5.1) como para `vista_oferta_segmento_api` (§5.2).
 *
 * CHECK (vue_numeroVuelo, vue_fecha) → UNIQUE
 * CHECK (vue_horaLlegadaProgramada > vue_horaSalidaProgramada)
 * CHECK (vue_aeropuertoOrigen <> vue_aeropuertoDestino)
 * CHECK (vue_horaSalidaReal IS NULL OR vue_horaSalidaReal >= vue_horaSalidaProgramada - INTERVAL '12 hours')
 * CHECK (vue_estado IN (...))
 * CHECK (vue_aeropuertoOrigen ~ '^[A-Z]{3}$')   /  CHECK (vue_aeropuertoDestino ~ '^[A-Z]{3}$')
 * CHECK (vue_duracionMinutos > 0)
 *
 * Todos los instantes son `TIMESTAMPTZ` (RFC 3339 con offset en el contrato),
 * por eso se tipan como `Date` y no como `string`. Los campos `DATE`
 * (`vue_fecha`) se tipan como `string` para evitar desplazamientos de zona
 * horaria: es el patrón correcto para columnas `date` sin hora.
 */
@Entity({ name: 'vuelo' })
@Unique('uq_vuelo_numero_fecha', ['numeroVuelo', 'fecha'])
@Index('ix_vuelo_busqueda', [
  'aeropuertoOrigen',
  'aeropuertoDestino',
  'fecha',
  'horaSalidaProgramada',
])
export class Vuelo {
  /** PK. Generada por PostgreSQL (`gen_random_uuid()`), nunca por la aplicación. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_vuelo' })
  idVuelo: string;

  /**
   * `FlightStatus.flightNumber` y path param de `/flights/{flightNumber}/status`.
   * No es la clave primaria: la clave natural es (numeroVuelo, fecha).
   */
  @Column({ name: 'vue_numerovuelo', type: 'varchar', length: 10 })
  numeroVuelo: string;

  /** `FlightStatus.date`, y query param `date` del endpoint de estado. */
  @Column({ name: 'vue_fecha', type: 'date' })
  fecha: string;

  // ---------------------------------------------------------------------
  // Aerolíneas (DOS FKs a la misma tabla → requieren nombre de relación)
  // ---------------------------------------------------------------------

  /**
   * `FlightStatus.marketingCarrier` / `FlightSegment.marketingCarrier`.
   * Aerolínea que vende el vuelo (FK `vue_aerolineaMarketingId`).
   */
  @ManyToOne(() => Aerolinea, (aerolinea) => aerolinea.vuelosComoMarketing, {
    nullable: false,
  })
  @JoinColumn({ name: 'vue_aerolineamarketingid' })
  aerolineaMarketing: Aerolinea;

  /**
   * `FlightStatus.operatingCarrier` / `FlightSegment.operatingCarrier`.
   * Aerolínea que realmente opera el vuelo (FK `vue_aerolineaOperadoraId`).
   * Puede coincidir con la comercial o diferir en códigos compartidos.
   */
  @ManyToOne(() => Aerolinea, (aerolinea) => aerolinea.vuelosComoOperadora, {
    nullable: false,
  })
  @JoinColumn({ name: 'vue_aerolineaoperadoraid' })
  aerolineaOperadora: Aerolinea;

  // ---------------------------------------------------------------------
  // Aeropuertos y terminales
  // ---------------------------------------------------------------------

  /** `FlightEndpoint.iataCode` de la salida / `departure.iataCode`. */
  @Column({ name: 'vue_aeropuertoorigen', type: 'varchar', length: 3 })
  aeropuertoOrigen: string;

  /** `FlightEndpoint.iataCode` de la llegada / `arrival.iataCode`. */
  @Column({ name: 'vue_aeropuertodestino', type: 'varchar', length: 3 })
  aeropuertoDestino: string;

  /** `FlightEndpoint.terminal` de salida — `nullable: true` en el contrato. */
  @Column({
    name: 'vue_terminalorigen',
    type: 'varchar',
    length: 3,
    nullable: true,
  })
  terminalOrigen: string | null;

  /** `FlightEndpoint.terminal` de llegada — `nullable: true` en el contrato. */
  @Column({
    name: 'vue_terminaldestino',
    type: 'varchar',
    length: 3,
    nullable: true,
  })
  terminalDestino: string | null;

  // ---------------------------------------------------------------------
  // Horarios
  // ---------------------------------------------------------------------

  /** `departure.scheduledAt`. */
  @Column({ name: 'vue_horasalidaprogramada', type: 'timestamptz' })
  horaSalidaProgramada: Date;

  /** `departure.estimatedAt` — `nullable: true` en el contrato. */
  @Column({
    name: 'vue_horasalidaestimada',
    type: 'timestamptz',
    nullable: true,
  })
  horaSalidaEstimada: Date | null;

  /** `departure.actualAt` — `nullable: true` en el contrato. */
  @Column({
    name: 'vue_horasalidareal',
    type: 'timestamptz',
    nullable: true,
  })
  horaSalidaReal: Date | null;

  /** `arrival.scheduledAt`. */
  @Column({ name: 'vue_horallegadaprogramada', type: 'timestamptz' })
  horaLlegadaProgramada: Date;

  /** `arrival.estimatedAt` — `nullable: true` en el contrato. */
  @Column({
    name: 'vue_horallegadaestimada',
    type: 'timestamptz',
    nullable: true,
  })
  horaLlegadaEstimada: Date | null;

  /** `arrival.actualAt` — `nullable: true` en el contrato. */
  @Column({
    name: 'vue_horallegadareal',
    type: 'timestamptz',
    nullable: true,
  })
  horaLlegadaReal: Date | null;

  // ---------------------------------------------------------------------
  // Atributos y estado
  // ---------------------------------------------------------------------

  /** `FlightSegment.aircraft` / `FlightStatus.aircraft` — nullable en el contrato. */
  @Column({ name: 'vue_aeronave', type: 'varchar', length: 40, nullable: true })
  aeronave: string | null;

  /** `FlightSegment.durationMinutes` (`minimum: 0`, `nullable: true`). */
  @Column({
    name: 'vue_duracionminutos',
    type: 'integer',
    nullable: true,
  })
  duracionMinutos: number | null;

  /**
   * `FlightSegment.status` / `FlightStatus.status`.
   * `DEFAULT 'SCHEDULED'` en la BD.
   */
  @Column({
    name: 'vue_estado',
    type: 'varchar',
    length: 20,
    default: EstadoVuelo.SCHEDULED,
  })
  estado: EstadoVuelo;

  // ---------------------------------------------------------------------
  // Lados inversos
  // ---------------------------------------------------------------------

  /** Inventario de asientos del vuelo (FK `asi_vueloId`, ON DELETE CASCADE). */
  @OneToMany(() => AsientoVuelo, (asiento) => asiento.vuelo)
  asientos: AsientoVuelo[];

  /** Segmentos de oferta que apuntan a este vuelo (ON DELETE RESTRICT). */
  @OneToMany(() => OfertaSegmento, (segmento) => segmento.vuelo)
  segmentosOferta: OfertaSegmento[];

  /**
   * Segmentos de reserva que apuntan a este vuelo (ON DELETE RESTRICT).
   * Un vuelo con reservas históricas nunca se elimina.
   */
  @OneToMany(() => ReservaSegmento, (segmento) => segmento.vuelo)
  segmentosReserva: ReservaSegmento[];

  /** Segmentos propuestos en ofertas de cambio de fecha (`ocs_vueloId`). */
  @OneToMany(
    () => OfertaCambioSegmento,
    (segmento) => segmento.vuelo,
  )
  segmentosOfertaCambio: OfertaCambioSegmento[];
}
