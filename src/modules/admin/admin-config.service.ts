import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Configuración global de la plataforma (tabla `admin_config`, clave/valor).
 *
 * También es el dueño del esquema de las tablas del panel de administración:
 * como TypeORM corre con `synchronize: false`, las tablas se crean aquí con
 * `CREATE TABLE IF NOT EXISTS` al arrancar el módulo (idempotente). El mismo DDL
 * está en `database/admin_schema.sql` por si se prefiere ejecutarlo a mano.
 */
export interface PlatformConfig {
  comisionBase: number;
  tasaImpuestos: number;
  stripeEnabled: boolean;
  emailsEnabled: boolean;
  maintenanceMode: boolean;
}

export const CONFIG_DEFAULTS: PlatformConfig = {
  comisionBase: 15,
  tasaImpuestos: 15,
  stripeEnabled: true,
  emailsEnabled: true,
  maintenanceMode: false,
};

/** camelCase (API) <-> snake_case (BD) */
const CLAVES: Record<keyof PlatformConfig, string> = {
  comisionBase: 'comision_base',
  tasaImpuestos: 'tasa_impuestos',
  stripeEnabled: 'stripe_enabled',
  emailsEnabled: 'emails_enabled',
  maintenanceMode: 'maintenance_mode',
};

export const ADMIN_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS admin_config (
  clave       VARCHAR(60) PRIMARY KEY,
  valor       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id      VARCHAR(64),
  actor_email   VARCHAR(255),
  accion        VARCHAR(80) NOT NULL,
  entidad_tipo  VARCHAR(60),
  entidad_id    VARCHAR(160),
  detalle       JSONB,
  ip            VARCHAR(64),
  user_agent    TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS liquidaciones (
  id            BIGSERIAL PRIMARY KEY,
  vertical      VARCHAR(30) NOT NULL,
  periodo       CHAR(7) NOT NULL,
  reservas      INT NOT NULL DEFAULT 0,
  monto_bruto   NUMERIC(12,2) NOT NULL DEFAULT 0,
  comision_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  comision      NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_pagado  NUMERIC(12,2) NOT NULL DEFAULT 0,
  referencia    VARCHAR(120),
  aprobado_por  VARCHAR(255),
  aprobado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_clave ON liquidaciones (vertical, periodo);
`;

@Injectable()
export class AdminConfigService implements OnModuleInit {
  private readonly logger = new Logger(AdminConfigService.name);
  private schemaListo: Promise<void> | null = null;

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.asegurarEsquema().catch(() => undefined);
  }

  /** Crea las tablas del panel una sola vez por proceso. */
  asegurarEsquema(): Promise<void> {
    if (!this.schemaListo) {
      this.schemaListo = this.dataSource
        .query(ADMIN_SCHEMA_SQL)
        .then(() => this.logger.log('Esquema del panel admin verificado (admin_config, admin_audit_logs, liquidaciones).'))
        .catch((e) => {
          this.schemaListo = null; // se reintenta en la próxima petición
          this.logger.error(`No se pudo crear el esquema del panel admin: ${e.message}`);
          throw e;
        });
    }
    return this.schemaListo;
  }

  async getConfig(): Promise<PlatformConfig & { updatedAt: string | null; updatedBy: string | null }> {
    await this.asegurarEsquema();
    const rows: { clave: string; valor: any; updated_at: Date; updated_by: string | null }[] =
      await this.dataSource.query('SELECT clave, valor, updated_at, updated_by FROM admin_config');

    const cfg: PlatformConfig = { ...CONFIG_DEFAULTS };
    let updatedAt: Date | null = null;
    let updatedBy: string | null = null;
    for (const [campo, clave] of Object.entries(CLAVES) as [keyof PlatformConfig, string][]) {
      const row = rows.find((r) => r.clave === clave);
      if (!row) continue;
      (cfg as any)[campo] = typeof CONFIG_DEFAULTS[campo] === 'number' ? Number(row.valor) : Boolean(row.valor);
      if (!updatedAt || new Date(row.updated_at) > updatedAt) {
        updatedAt = new Date(row.updated_at);
        updatedBy = row.updated_by;
      }
    }
    return { ...cfg, updatedAt: updatedAt ? updatedAt.toISOString() : null, updatedBy };
  }

  /**
   * Guarda solo los campos enviados. Devuelve la config nueva y la lista de
   * cambios {campo, antes, despues} para registrarla en auditoría.
   */
  async updateConfig(body: Partial<PlatformConfig>, actor: string | null) {
    const actual = await this.getConfig();
    const cambios: { campo: string; antes: any; despues: any }[] = [];

    for (const campo of Object.keys(CLAVES) as (keyof PlatformConfig)[]) {
      if (body?.[campo] === undefined) continue;
      let valor: number | boolean;
      if (typeof CONFIG_DEFAULTS[campo] === 'number') {
        valor = Number(body[campo]);
        if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
          throw new BadRequestException(`${campo} debe ser un número entre 0 y 100.`);
        }
        valor = Math.round(valor * 100) / 100;
      } else {
        if (typeof body[campo] !== 'boolean') throw new BadRequestException(`${campo} debe ser true o false.`);
        valor = body[campo] as boolean;
      }
      if (actual[campo] === valor) continue;
      cambios.push({ campo, antes: actual[campo], despues: valor });
      await this.dataSource.query(
        `INSERT INTO admin_config (clave, valor, updated_at, updated_by)
         VALUES ($1, $2::jsonb, now(), $3)
         ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now(), updated_by = EXCLUDED.updated_by`,
        [CLAVES[campo], JSON.stringify(valor), actor],
      );
    }
    return { config: await this.getConfig(), cambios };
  }

  /** Lectura tolerante a fallos para otros módulos (p. ej. envío de emails). */
  async getValor<K extends keyof PlatformConfig>(campo: K): Promise<PlatformConfig[K]> {
    try {
      return (await this.getConfig())[campo];
    } catch {
      return CONFIG_DEFAULTS[campo];
    }
  }
}
