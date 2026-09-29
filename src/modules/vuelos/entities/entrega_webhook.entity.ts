import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { EventoWebhook } from './evento_webhook.entity';
import { SuscripcionWebhook } from './suscripcion_webhook.entity';

/**
 * Bloque 6 — Soporte
 * Tabla: `entrega_webhook`
 *
 * Registro de los intentos de entrega de un `evento_webhook` a una
 * `suscripcion_webhook`. Soporta el backoff exponencial del worker.
 *
 * UNIQUE (enw_eventoId, enw_suscripcionId)   -- una entrega por par
 * CHECK (enw_intentos >= 0 AND enw_intentos <= 10)
 * CHECK (enw_ultimoCodigoHttp BETWEEN 100 AND 599)
 *
 * El `UNIQUE` queda en el DDL: ambas columnas son FKs de esta entidad, que aquí
 * son propiedades VIRTUALES vía `@RelationId`.
 */
@Entity({ name: 'entrega_webhook' })
export class EntregaWebhook {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_entrega_webhook' })
  idEntregaWebhook: string;

  /** FK al evento (`enw_eventoId`). `ON DELETE CASCADE`. */
  @ManyToOne(() => EventoWebhook, (evento) => evento.entregas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'enw_eventoid' })
  evento: EventoWebhook;

  /** Valor crudo de `enw_eventoId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: EntregaWebhook) => entity.evento)
  eventoId: string;

  /**
   * FK a la suscripción (`enw_suscripcionId`). `ON DELETE CASCADE`.
   *
   * Nótese que `DELETE /webhooks/{id}` hace borrado LÓGICO
   * (`suscripcion_webhook.swb_activo = false`), así que estas entregas nunca
   * desaparecen por una baja de suscripción: son el histórico de lo entregado.
   */
  @ManyToOne(
    () => SuscripcionWebhook,
    (suscripcion) => suscripcion.entregas,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'enw_suscripcionid' })
  suscripcion: SuscripcionWebhook;

  /** Valor crudo de `enw_suscripcionId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: EntregaWebhook) => entity.suscripcion)
  suscripcionId: string;

  /**
   * Contador de intentos, acotado por el `CHECK` a 10.
   * Al superar el tope, `enw_completada` queda en `false` de forma terminal y el
   * evento pasa a estado de fallo permanente.
   */
  @Column({ name: 'enw_intentos', type: 'smallint', default: 0 })
  intentos: number;

  /** Instante del último intento de entrega. */
  @Column({
    name: 'enw_ultimointentoen',
    type: 'timestamptz',
    nullable: true,
  })
  ultimoIntentoEn: Date | null;

  /**
   * Código HTTP de la última respuesta del suscriptor.
   * `CHECK (enw_ultimoCodigoHttp BETWEEN 100 AND 599)`. NULL si nunca se intentó.
   */
  @Column({
    name: 'enw_ultimocodigohttp',
    type: 'smallint',
    nullable: true,
  })
  ultimoCodigoHttp: number | null;

  /** Último error de red o de protocolo, si lo hubo. */
  @Column({
    name: 'enw_ultimoerror',
    type: 'text',
    nullable: true,
  })
  ultimoError: string | null;

  /**
   * Próximo reintento programmed por el backoff.
   * El índice PARCIAL `ix_entrega_reintento` del DDL
   * (`WHERE enw_completada = false`) lo convierte en la cola del worker.
   */
  @Column({
    name: 'enw_proximareintentoen',
    type: 'timestamptz',
    nullable: true,
  })
  proximaReintentoEn: Date | null;

  /** `true` cuando la entrega pudo servirse y el receptor respondió 2xx. */
  @Column({ name: 'enw_completada', type: 'boolean', default: false })
  completada: boolean;
}
