import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { EstadoIdempotencia } from './vuelos.enums';

/**
 * Bloque 6 — Soporte
 * Tabla: `idempotencia`
 *
 * Requisito transversal del contrato: el header `Idempotency-Key`
 * (`format: uuid`, `required: true`) en los SEIS endpoints mutantes:
 * `POST /offers/hold`, `POST /bookings`, `POST /bookings/{id}/baggage`,
 * `POST /bookings/{id}/date-change`, `POST /bookings/{id}/cancel`.
 *
 * UNIQUE (idm_clave, idm_propietarioId, idm_endpoint)
 * CHECK (idm_estado IN ('IN_PROGRESS','COMPLETED','FAILED'))
 *
 * ## `idm_clave` es la PK, pero NO es autogenerada
 * El DDL no le pone `DEFAULT gen_random_uuid()`: la clave la genera el
 * CLIENTE y viaja en el header. Por eso se usa `@PrimaryColumn('uuid')` y no
 * `@PrimaryGeneratedColumn` — que además no existiría en el DDL.
 *
 * ## Protocolo de uso
 * 1. `INSERT` de la fila con `idm_estado = 'IN_PROGRESS'` y `ON CONFLICT DO
 *    NOTHING`, en la MISMA transacción que la operación. Si entra, se es el
 *    primero y se ejecuta. Si no entra, ya existe: se relee.
 * 2. Replay con el mismo `idm_cuerpoHash`: devolver la respuesta guardada en
 *    `idm_respuesta` con `idm_codigoHttp`, sin repetir el efecto.
 * 3. Replay con hash DISTINTO: el cliente reutilizó la clave para otra
 *    petición → `409`.
 * 4. `idm_propietarioId` forma parte de la unicidad para que la clave de un
 *    usuario no colisione ni sea adivinable por otro (`404`, no `409`).
 */
@Entity({ name: 'idempotencia' })
// Índice parcial equivalente a `ix_idm_expiracion` del DDL, declarado aquí
// porque `idm_expiracionEn` es una columna real (no una propiedad virtual).
@Index('ix_idm_expiracion', ['expiracionEn'])
export class Idempotencia {
  /**
   * PK. `UUID PRIMARY KEY` SIN default: es el `Idempotency-Key` del cliente.
   */
  @PrimaryColumn({ name: 'idm_clave', type: 'uuid' })
  clave: string;

  /**
   * `sub` del JWT. Entra en la unicidad compuesta, de modo que la misma clave
   * usada por dos usuarios son dos filas distintas y no se filtran entre sí.
   */
  @Column({ name: 'idm_propietarioid', type: 'uuid' })
  propietarioId: string;

  /**
   * Ruta + verbo, p. ej. `'POST /bookings'`.
   * Detecta la reutilización de una clave entre endpoints distintos.
   */
  @Column({ name: 'idm_endpoint', type: 'varchar', length: 128 })
  endpoint: string;

  /**
   * SHA-256 del cuerpo canónico de la petición. `CHAR(64)` → tipo `char`.
   * Es lo que permite distinguir un reintento legítimo de un cambio de payload.
   */
  @Column({ name: 'idm_cuerpohash', type: 'char', length: 64 })
  cuerpoHash: string;

  /**
   * Estado del replay. Nace `IN_PROGRESS`.
   * `COMPLETED` guarda la respuesta para poder repetirla; `FAILED` permite
   * reintentar.
   */
  @Column({
    name: 'idm_estado',
    type: 'varchar',
    length: 20,
    default: EstadoIdempotencia.IN_PROGRESS,
    enum: EstadoIdempotencia,
  })
  estado: EstadoIdempotencia;

  /** Código HTTP de la respuesta original, para el replay. */
  @Column({
    name: 'idm_codigohttp',
    type: 'smallint',
    nullable: true,
  })
  codigoHttp: number | null;

  /**
   * Respuesta original serializada, para devolverla íntegra en el replay.
   * `JSONB`: la forma depende del endpoint, así que no hay un tipo fijo.
   */
  @Column({
    name: 'idm_respuesta',
    type: 'jsonb',
    nullable: true,
  })
  respuesta: Record<string, unknown> | null;

  /** Instante de la primera petición con esta clave. */
  @Column({
    name: 'idm_creadoen',
    type: 'timestamptz',
    default: () => 'now()',
  })
  creadoEn: Date;

  /**
   * `DEFAULT (now() + INTERVAL '24 hours')` en el DDL.
   * La fila se purga pasado ese plazo; no es una fecha de negocio.
   */
  @Column({
    name: 'idm_expiracionen',
    type: 'timestamptz',
    default: () => "(now() + INTERVAL '24 hours')",
  })
  expiracionEn: Date;
}
