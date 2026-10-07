-- Tablas del Panel de Administración (se crean solas al arrancar el backend:
-- AdminConfigService.asegurarEsquema). Este archivo es por si se quiere
-- ejecutar a mano en el SQL Editor de Supabase.

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
