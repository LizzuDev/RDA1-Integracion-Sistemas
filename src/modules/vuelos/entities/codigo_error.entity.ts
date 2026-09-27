import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';

import { EventoError } from './evento_error.entity';

/**
 * Bloque 6 — Soporte
 * Tabla: `codigo_error`  —  CATÁLOGO
 *
 * Los 24 valores de `ProblemDetails.code` del contrato, con su HTTP por defecto,
 * título y `type` URI. El DDL la siembra con `INSERT ... ON CONFLICT DO
 * NOTHING`.
 *
 * Centralizar el catálogo evita que la aplicación invente códigos que el
 * contrato no define, y permite que un cliente B2B los consulte de forma
 * estable.
 *
 * CHECK (cer_codigo ~ '^[A-Z_]+$')
 *
 * ## PK textual
 * `cer_codigo VARCHAR(40) PRIMARY KEY`: el código ES la clave (`@PrimaryColumn`).
 */
@Entity({ name: 'codigo_error' })
export class CodigoError {
  /**
   * PK. `ProblemDetails.code`, p. ej. `'SEAT_TAKEN'`, `'QUOTE_EXPIRED'`.
   */
  @PrimaryColumn({ name: 'cer_codigo', type: 'varchar', length: 40 })
  codigo: string;

  /**
   * HTTP por defecto del código. En los envoltorios del contrato
   * (`ProblemDetails400`, `409`, `410`, `422`, `429`) es el status que lo
   * acompaña; `ProblemDetails.status` lo hereda de aquí.
   */
  @Column({ name: 'cer_httpstatus', type: 'smallint' })
  httpStatus: number;

  /** `ProblemDetails.title`. */
  @Column({ name: 'cer_titulo', type: 'varchar', length: 100 })
  titulo: string;

  /**
   * `ProblemDetails.type` canónico, p. ej. `'urn:gds:error:seat-taken'`.
   *
   * Nótese que `evento_error.eve_tipo` puede sobrescribirlo por evento cuando
   * hace falta granularidad adicional; este es el valor por defecto estable.
   */
  @Column({ name: 'cer_tipouri', type: 'varchar', length: 255 })
  tipoUri: string;

  // ---------------------------------------------------------------------
  // Lado inverso
  // ---------------------------------------------------------------------

  /** Ocurrencias registradas de este código. */
  @OneToMany(() => EventoError, (evento) => evento.codigoError)
  eventos: EventoError[];
}
