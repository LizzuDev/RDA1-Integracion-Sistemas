import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Bloque 6 — Soporte
 * Tabla: `limite_dispositivo`
 *
 * Rate limit del endpoint público `POST /search`, que exige el header
 * `X-Device-Fingerprint` (`required: true`, sin `security`) y puede responder
 * `429` con el header `Retry-After` y el código `RATE_LIMIT_EXCEEDED`.
 *
 * CHECK (lim_contador >= 0)
 *
 * ## PK textual, no UUID
 * `lim_huella VARCHAR(128) PRIMARY KEY`: la huella del dispositivo ES la clave.
 * Se usa `@PrimaryColumn` (no `@PrimaryGeneratedColumn`) porque la identifica el
 * cliente.
 */
@Entity({ name: 'limite_dispositivo' })
export class LimiteDispositivo {
  /**
   * PK. Valor del header `X-Device-Fingerprint`.
   * `VARCHAR(128)`: suficiente para un hash o una huella de 128 caracteres.
   */
  @PrimaryColumn({ name: 'lim_huella', type: 'varchar', length: 128 })
  huella: string;

  /**
   * Inicio de la ventana de conteo actual (ventana fija o deslizante, según la
   * política del servicio). `NOT NULL` en el DDL: la primera petición la fija.
   */
  @Column({ name: 'lim_ventanainicio', type: 'timestamptz' })
  ventanaInicio: Date;

  /**
   * Peticiones contabilizadas en la ventana actual.
   * Al superar el umbral, la API responde `429` y escribe `bloqueadoHasta`.
   */
  @Column({ name: 'lim_contador', type: 'integer', default: 0 })
  contador: number;

  /**
   * Instante hasta el que el dispositivo está bloqueado.
   *
   * Es la fuente del valor del header `Retry-After` en la respuesta `429`.
   * NULL cuando no hay bloqueo activo. El índice PARCIAL `ix_limite_bloqueado`
   * del DDL (`WHERE lim_bloqueadoHasta IS NOT NULL`) mantiene barato el barrido
   * de desbloqueos.
   */
  @Column({
    name: 'lim_bloqueadohasta',
    type: 'timestamptz',
    nullable: true,
  })
  bloqueadoHasta: Date | null;
}
