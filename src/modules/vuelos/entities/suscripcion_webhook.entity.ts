import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { EntregaWebhook } from './entrega_webhook.entity';
import { TipoEventoWebhook } from './vuelos.enums';

/**
 * Bloque 6 — Soporte
 * Tabla: `suscripcion_webhook`
 *
 * `WebhookSubscription`. Tabla INEXISTENTE en el borrador 3 del plan, pese a
 * que el contrato expone `POST /webhooks` y `DELETE /webhooks/{id}`.
 *
 * CHECK (swb_url ~ '^https://')
 * CHECK (cardinality(swb_eventos) BETWEEN 1 AND 12)
 *
 * ## Sin columna de propietario indexada
 * `swb_propietarioId` es el `sub` del JWT (scope `flights:webhooks`) y la RLS
 * `p_webhook_owner` del DDL lo filtra. El DDL no crea índice explícito sobre
 * él; se deja así para ajustarse al esquema.
 */
@Entity({ name: 'suscripcion_webhook' })
export class SuscripcionWebhook {
  /**
   * PK. Generada por PostgreSQL. Es el `WebhookSubscription.id`
   * (`format: uuid`, `readOnly`).
   */
  @PrimaryGeneratedColumn('uuid', { name: 'id_suscripcion_webhook' })
  idSuscripcionWebhook: string;

  /**
   * `sub` del JWT. Sin tabla de usuarios asociada (decisión de diseño).
   * `GET /webhooks` devuelve solo las suscripciones de este propietario.
   */
  @Column({ name: 'swb_propietarioid', type: 'uuid' })
  propietarioId: string;

  /**
   * `WebhookSubscription.url` (`format: uri`).
   *
   * `VARCHAR(2048)` porque una URL de callback con query string y firma puede
   * ser larga. El `CHECK` del DDL exige `https://`: el `secret` viaja en la
   * carga útil y no debe ir en claro.
   */
  @Column({ name: 'swb_url', type: 'varchar', length: 2048 })
  url: string;

  /**
   * `WebhookSubscription.events[]` (12 valores).
   *
   * `VARCHAR(50)[]` con `array: true`. El tipo de TypeScript es la union
   * `TipoEventoWebhook`; nótese que NO se usa `enum` en la opción `enum:` de
   * TypeORM porque el dominio es abierto y versionado con la API (ver nota en
   * `vuelos.enums.ts`). Para validar en los DTO:
   * `@IsArray() @ArrayMinSize(1) @ArrayMaxSize(12)
   *   @IsIn(TIPOS_EVENTO_WEBHOOK)`.
   */
  @Column({
    name: 'swb_eventos',
    type: 'varchar',
    length: 50,
    array: true,
    nullable: false,
  })
  eventos: TipoEventoWebhook[];

  /**
   * `WebhookSubscription.secret`.
   *
   * `BYTEA` mapeado como `Buffer` de Node.js: es material cifrado en reposo
   * (§6.6 del plan), no texto. El DDL lo declara `NOT NULL` y no hay columna
   * de texto plano: el secreto se entrega UNA sola vez en el `POST` y nunca se
   * devuelve en el `GET`, por lo que la API tampoco debe exponerlo en las
   * respuestas de `WebhookSubscription`.
   */
  @Column({ name: 'swb_secretcifrado', type: 'bytea' })
  secretCifrado: Buffer;

  /** Fecha de alta de la suscripción. */
  @Column({
    name: 'swb_fechacreacion',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaCreacion: Date;

  /**
   * Marca de baja lógica.
   *
   * `DELETE /webhooks/{id}` responde `204` pero NO borra la fila: se desactiva.
   * Así se conserva la trazabilidad de las entregas ya realizadas, que es lo
   * que exige la tabla `entrega_webhook` en cascada.
   */
  @Column({ name: 'swb_activo', type: 'boolean', default: true })
  activo: boolean;

  // ---------------------------------------------------------------------
  // Lado inverso
  // ---------------------------------------------------------------------

  /** Intentos de entrega a esta suscripción (`enw_suscripcionId`). */
  @OneToMany(() => EntregaWebhook, (entrega) => entrega.suscripcion)
  entregas: EntregaWebhook[];
}
