import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AccionAuditoria } from './vuelos.enums';

/**
 * Bloque 6 — Soporte
 * Tabla: `log_auditoria_vuelos`
 *
 * Auditoría de la Write Box del módulo. Tabla APPEND-ONLY: el DDL instala el
 * trigger `tg_auditoria_no_borrar` que RECHAZA `DELETE`, `UPDATE` y `TRUNCATE`,
 * de modo que ni siquiera `flights_app` (que no tiene permiso de `DELETE`) puede
 * alterar el histórico.
 *
 * CHECK (log_accion IN ('CREATED','UPDATED','STATUS_CHANGED','DELETED','ACCESS'))
 *
 * ## PII: la aplicación debe filtrar
 * El plan (§6.6) exige que `log_datosAntiguos` / `log_datosNuevos` **omitan**
 * los campos sensibles de `pasajero` (`pas_numeroDocumento`,
 * `pas_fechaNacimiento`, `pas_email`, `pas_telefono`) y `swb_secretCifrado`. Se
 * recomienda construir el snapshot con una allow-list de campos en lugar de un
 * volcado con `JSON.stringify(entidad)`, porque una allow-list no puede filtrar
 * por olvido.
 */
@Entity({ name: 'log_auditoria_vuelos' })
@Index('ix_log_entidad', ['tipoEntidad', 'entidadId', 'fechaHora'])
export class LogAuditoriaVuelos {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_log_auditoria_vuelos' })
  idLogAuditoriaVuelos: string;

  /**
   * Tipo de entidad auditada, p. ej. `'reserva'`, `'vuelo'`, `'boleto'`.
   * Como el módulo tiene muchas tablas candidatas, se modela como string en
   * lugar de FK.
   */
  @Column({ name: 'log_tipoentidad', type: 'varchar', length: 30 })
  tipoEntidad: string;

  /** PK de la entidad auditada. */
  @Column({ name: 'log_entidadid', type: 'uuid' })
  entidadId: string;

  /** Tipo de acción registrada. */
  @Column({
    name: 'log_accion',
    type: 'varchar',
    length: 30,
    enum: AccionAuditoria,
  })
  accion: AccionAuditoria;

  /**
   * Estado anterior de la entidad (`JSONB`). NULL en una creación.
   * OJO: sin los campos PII (ver nota de cabecera).
   */
  @Column({
    name: 'log_datosantiguos',
    type: 'jsonb',
    nullable: true,
  })
  datosAntiguos: Record<string, unknown> | null;

  /**
   * Estado posterior de la entidad (`JSONB`). NULL en un borrado.
   * OJO: sin los campos PII (ver nota de cabecera).
   */
  @Column({
    name: 'log_datosnuevos',
    type: 'jsonb',
    nullable: true,
  })
  datosNuevos: Record<string, unknown> | null;

  /**
   * `sub` del JWT o identificador del worker que ejecutó la acción.
   * NULL para procesos internos sin usuario asociado.
   */
  @Column({
    name: 'log_realizadopor',
    type: 'uuid',
    nullable: true,
  })
  realizadoPor: string | null;

  /** Instante de la acción. `DEFAULT now()`. */
  @Column({
    name: 'log_fechahora',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaHora: Date;

  /**
   * IP de origen. Tipo `INET` nativo de PostgreSQL, no `varchar`: permite
   * comparar rangos con operadores de red (`<<=`, `>>`) y el DDL lo rechaza si
   * no es una IP válida.
   *
   * Solo tiene sentido detrás de un proxy: usar el valor de
   * `X-Forwarded-For` con confianza adecuada, nunca el de la conexión directo.
   */
  @Column({ name: 'log_ip', type: 'inet', nullable: true })
  ip: string | null;

  /**
   * `Idempotency-Key` asociada a la petición que originó el cambio.
   * Permite correlacionar una entrada de auditoría con la fila de
   * `idempotencia` y reconstruir el replay.
   */
  @Column({
    name: 'log_idempotencykey',
    type: 'uuid',
    nullable: true,
  })
  idempotencyKey: string | null;
}
