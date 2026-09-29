import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { CodigoError } from './codigo_error.entity';

/**
 * Bloque 6 — Soporte
 * Tabla: `evento_error`
 *
 * Registro de un `ProblemDetails` emitido por la API. Es lo que permite
 * diagnosticar en soporte qué códigos de error concentrate cada integración.
 *
 * ## Trazabilidad contra el contrato
 * | `ProblemDetails` | Columna |
 * |---|---|
 * | `.code`      | `eve_codigoErrorId` (FK → `codigo_error.cer_codigo`) |
 * | `.status`    | `codigo_error.cer_httpStatus`, por JOIN |
 * | `.title`     | `codigo_error.cer_titulo`, por JOIN |
 * | `.type`      | `eve_tipo` (permite sobrescribir el `cer_tipoUri` canónico) |
 * | `.invalidParams` | `eve_parametrosInvalidos` (`JSONB`) |
 * | header `Retry-After` | `eve_retryAfterSegundos` |
 * | —            | `eve_ocurridoEn`, `eve_correo` (FK lógica a un usuario) |
 *
 * ## ⚠️ `ProblemDetails.detail` NO tiene columna
 * El DDL no define ningún campo para `.detail`. Las alternativas son:
 *   1. Añadir `eve_detalle TEXT` al DDL (recomendado: `detail` es `optional`
 *      en el contrato pero es el texto que el usuario final lee).
 *   2. Dejarlo fuera de la persistencia y construirlo solo en la capa HTTP a
 *      partir de `cer_titulo` + el código.
 * Se deja constancia aquí porque es una discrepancia real entre el contrato y
 * el esquema actual, no un descuido de mapeo.
 */
@Entity({ name: 'evento_error' })
export class EventoError {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'eve_id' })
  idEventoError: string;

  /**
   * `ProblemDetails.code`. FK al catálogo.
   *
   * El DDL declara `REFERENCES codigo_error(cer_codigo)` SIN `ON DELETE`, es
   * decir `NO ACTION`: un código del catálogo no se puede borrar mientras tenga
   * eventos registrados.
   */
  @ManyToOne(() => CodigoError, (codigoError) => codigoError.eventos, {
    nullable: false,
  })
  @JoinColumn({ name: 'eve_codigoerrorid' })
  codigoError: CodigoError;

  /** Valor crudo de `eve_codigoErrorId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: EventoError) => entity.codigoError)
  codigoErrorId: string;

  /**
   * `ProblemDetails.type` del evento concreto.
   * Puede ser igual al `codigoError.tipoUri` o más específico.
   */
  @Column({ name: 'eve_tipo', type: 'varchar', length: 255 })
  tipo: string;

  /**
   * `ProblemDetails.detail`. Mensaje legible por humanos (añadido en revisión).
   */
  @Column({ name: 'eve_detalle', type: 'text', nullable: true })
  detalle: string | null;

  /**
   * `ProblemDetails.invalidParams[]` — array de `{ name, reason }` que señala
   * QUÉ campo del request falló.
   *
   * `JSONB` (no `text[]`) porque el contrato lo declara como array de objetos
   * con dos propiedades de texto, no como array de cadenas.
   */
  @Column({
    name: 'eve_parametrosinvalidos',
    type: 'jsonb',
    nullable: true,
  })
  parametrosInvalidos: Array<{ name: string; reason: string }> | null;

  /**
   * Valor del header `Retry-After`, presente en las respuestas `409` y `429`.
   * `CHECK (eve_retryAfterSegundos >= 0)`.
   */
  @Column({
    name: 'eve_retryaftersegundos',
    type: 'integer',
    nullable: true,
  })
  retryAfterSegundos: number | null;

  /** Instante en que se emitió el error. */
  @Column({
    name: 'eve_ocurridoen',
    type: 'timestamptz',
    default: () => 'now()',
  })
  ocurridoEn: Date;

  /**
   * `sub` del usuario afectado (FK lógica), cuando el error se puede atribuir
   * a un cliente concreto. NULL para errores del endpoint público `/search`.
   */
  @Column({
    name: 'eve_correo',
    type: 'uuid',
    nullable: true,
  })
  correo: string | null;
}
