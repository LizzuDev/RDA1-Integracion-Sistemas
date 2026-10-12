-- ============================================================================
-- MIGRACIÓN 2026-10-13 · ALOJAMIENTOS: modelo relacional completo
-- PostgreSQL / Supabase · solo toca tablas de Alojamientos
--
-- REQUISITO: aplicar antes 2026-10-12_alojamientos_integracion.sql.
--
-- Qué añade:
--   proveedores_alojamiento  Proveedores que sincronizan inventario (API key hasheada).
--   tipos_habitacion         Tipos de habitación por alojamiento (doble, suite…),
--                            cada uno con su precio, capacidad, régimen y cupo.
--   huespedes_reserva        Huéspedes de cada reserva (titular + acompañantes).
--   reservas_alojamiento     + usuario (FK a auth.users), tipo de habitación,
--                            adultos/niños, tarifa contratada, contacto, cancelación.
--
--   alojamientos 1 ── N tipos_habitacion 1 ── N reservas_alojamiento 1 ── N huespedes_reserva
--   proveedores_alojamiento 1 ── N alojamientos          auth.users 1 ── N reservas_alojamiento
--
-- Cómo aplicarla (editor SQL de Supabase):
--   1. PASO 0 (diagnóstico): todas las filas deben dar 0. Si no, avisa antes de seguir.
--   2. PASO 1 completo (una transacción: o se aplica todo o nada).
--   3. PASO 2 para comprobar.
-- Es idempotente: se puede volver a ejecutar.
-- ============================================================================


-- ============================================================================
-- PASO 0 · DIAGNÓSTICO (solo lectura)
-- ============================================================================
SELECT 'falta la migración 2026-10-12 (columna alojamientos.estado)' AS problema,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name = 'alojamientos' AND column_name = 'estado') THEN 0 ELSE 1 END AS count
UNION ALL SELECT 'reservas con fecha_fin <= fecha_inicio',     count(*) FROM reservas_alojamiento WHERE fecha_fin <= fecha_inicio
UNION ALL SELECT 'reservas con estado desconocido',            count(*) FROM reservas_alojamiento WHERE upper(coalesce(estado, 'CONFIRMED')) NOT IN ('CONFIRMED', 'CONFIRMADA', 'PENDING', 'PENDIENTE', 'CANCELLED', 'CANCELADA')
UNION ALL SELECT 'reservas con total < 0',                     count(*) FROM reservas_alojamiento WHERE total < 0
UNION ALL SELECT 'reservas con habitaciones_count < 1',        count(*) FROM reservas_alojamiento WHERE habitaciones_count < 1
UNION ALL SELECT 'reservas con huespedes < 1',                 count(*) FROM reservas_alojamiento WHERE huespedes < 1
UNION ALL SELECT 'reservas de un alojamiento que no existe',   count(*) FROM reservas_alojamiento r WHERE NOT EXISTS (SELECT 1 FROM alojamientos a WHERE a.id = r.alojamiento_id)
UNION ALL SELECT 'reservas sin nombre de cliente',             count(*) FROM reservas_alojamiento WHERE btrim(cliente_nombre) = ''
UNION ALL SELECT 'reseñas con puntuaciones fuera de 0–10',     count(*) FROM resenas_alojamiento WHERE puntuacion NOT BETWEEN 0 AND 10 OR limpieza NOT BETWEEN 0 AND 10 OR servicio NOT BETWEEN 0 AND 10 OR calidad NOT BETWEEN 0 AND 10
UNION ALL SELECT 'reseñas con comentario vacío',               count(*) FROM resenas_alojamiento WHERE btrim(comentario) = '';

-- Informativo (no bloquea): cuántas reservas se vincularán a su usuario por correo.
-- SELECT count(*) AS vinculables FROM reservas_alojamiento r JOIN auth.users u ON lower(u.email) = lower(r.cliente_email);


-- ============================================================================
-- PASO 1 · ESQUEMA Y DATOS (transacción)
-- ============================================================================
BEGIN;

-- Función genérica para mantener actualizado_en (ya existe si se aplicó la 2026-10-12).
CREATE OR REPLACE FUNCTION alojamientos_tocar_actualizado_en()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;


-- ----------------------------------------------------------------------------
-- 1. PROVEEDORES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores_alojamiento (
  id               VARCHAR(60)  PRIMARY KEY,
  nombre           VARCHAR(150) NOT NULL,
  email_contacto   VARCHAR(150),
  -- SHA-256 (hex) de la API key. La clave en claro solo se muestra una vez al crearla o rotarla.
  api_key_hash     CHAR(64),
  -- Primeros caracteres de la clave, para reconocerla en el panel sin exponerla.
  api_key_prefijo  VARCHAR(16),
  activo           BOOLEAN      NOT NULL DEFAULT true,
  ultimo_uso       TIMESTAMP WITHOUT TIME ZONE,
  creado_en        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT chk_proveedores_id     CHECK (id ~ '^[a-z0-9-]{2,60}$'),
  CONSTRAINT chk_proveedores_nombre CHECK (btrim(nombre) <> ''),
  CONSTRAINT chk_proveedores_hash   CHECK (api_key_hash IS NULL OR api_key_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT chk_proveedores_email  CHECK (email_contacto IS NULL OR email_contacto ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_proveedores_api_key ON proveedores_alojamiento (api_key_hash) WHERE api_key_hash IS NOT NULL;

DROP TRIGGER IF EXISTS trg_proveedores_actualizado_en ON proveedores_alojamiento;
CREATE TRIGGER trg_proveedores_actualizado_en
  BEFORE UPDATE ON proveedores_alojamiento
  FOR EACH ROW EXECUTE FUNCTION alojamientos_tocar_actualizado_en();

-- Los proveedores que ya sincronizaron algo se registran (sin clave: el backend
-- les asigna la de ALOJAMIENTOS_API_KEYS al arrancar, o se genera desde el panel).
INSERT INTO proveedores_alojamiento (id, nombre)
SELECT DISTINCT proveedor_id, proveedor_id FROM alojamientos WHERE proveedor_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS fk_alojamientos_proveedor;
ALTER TABLE alojamientos ADD  CONSTRAINT fk_alojamientos_proveedor
  FOREIGN KEY (proveedor_id) REFERENCES proveedores_alojamiento (id) ON UPDATE CASCADE ON DELETE RESTRICT;


-- ----------------------------------------------------------------------------
-- 2. TIPOS DE HABITACIÓN
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tipos_habitacion (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  alojamiento_id              VARCHAR(50)  NOT NULL REFERENCES alojamientos (id) ON DELETE CASCADE,
  -- Identificador estable dentro del alojamiento (lo usan los proveedores para sincronizar).
  codigo                      VARCHAR(60)  NOT NULL,
  nombre                      VARCHAR(150) NOT NULL,
  descripcion                 TEXT,
  capacidad_adultos           SMALLINT     NOT NULL DEFAULT 2,
  capacidad_ninos             SMALLINT     NOT NULL DEFAULT 0,
  camas                       SMALLINT     NOT NULL DEFAULT 1,
  descripcion_camas           VARCHAR(150),
  tamano_m2                   NUMERIC(6, 1),
  precio_noche                NUMERIC(10, 2) NOT NULL,
  -- Habitaciones de este tipo que se venden por noche.
  cantidad                    SMALLINT     NOT NULL DEFAULT 1,
  regimen                     VARCHAR(20)  NOT NULL DEFAULT 'SOLO_ALOJAMIENTO',
  -- Horas antes de la llegada hasta las que se cancela gratis. NULL = no reembolsable.
  cancelacion_gratuita_horas  SMALLINT     DEFAULT 48,
  amenidades                  JSONB        NOT NULL DEFAULT '[]'::jsonb,
  photos                      JSONB        NOT NULL DEFAULT '[]'::jsonb,
  activo                      BOOLEAN      NOT NULL DEFAULT true,
  orden                       SMALLINT     NOT NULL DEFAULT 1,
  creado_en                   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en              TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT ux_tipos_habitacion_codigo  UNIQUE (alojamiento_id, codigo),
  CONSTRAINT chk_tipos_codigo            CHECK (codigo ~ '^[A-Za-z0-9._-]{1,60}$'),
  CONSTRAINT chk_tipos_nombre            CHECK (btrim(nombre) <> ''),
  CONSTRAINT chk_tipos_capacidad         CHECK (capacidad_adultos BETWEEN 1 AND 30 AND capacidad_ninos BETWEEN 0 AND 20),
  CONSTRAINT chk_tipos_camas             CHECK (camas BETWEEN 1 AND 50),
  CONSTRAINT chk_tipos_tamano            CHECK (tamano_m2 IS NULL OR tamano_m2 > 0),
  CONSTRAINT chk_tipos_precio            CHECK (precio_noche > 0),
  CONSTRAINT chk_tipos_cantidad          CHECK (cantidad BETWEEN 0 AND 1000),
  CONSTRAINT chk_tipos_regimen           CHECK (regimen IN ('SOLO_ALOJAMIENTO', 'DESAYUNO', 'MEDIA_PENSION', 'PENSION_COMPLETA', 'TODO_INCLUIDO')),
  CONSTRAINT chk_tipos_cancelacion       CHECK (cancelacion_gratuita_horas IS NULL OR cancelacion_gratuita_horas BETWEEN 0 AND 720),
  CONSTRAINT chk_tipos_amenidades        CHECK (jsonb_typeof(amenidades) = 'array'),
  CONSTRAINT chk_tipos_photos            CHECK (jsonb_typeof(photos) = 'array')
);
CREATE INDEX IF NOT EXISTS idx_tipos_habitacion_alojamiento ON tipos_habitacion (alojamiento_id, orden) WHERE activo;

DROP TRIGGER IF EXISTS trg_tipos_habitacion_actualizado_en ON tipos_habitacion;
CREATE TRIGGER trg_tipos_habitacion_actualizado_en
  BEFORE UPDATE ON tipos_habitacion
  FOR EACH ROW EXECUTE FUNCTION alojamientos_tocar_actualizado_en();

-- Cada alojamiento existente recibe un tipo "estándar" con sus datos actuales.
INSERT INTO tipos_habitacion (alojamiento_id, codigo, nombre, capacidad_adultos, capacidad_ninos, camas,
                              precio_noche, cantidad, regimen, amenidades)
SELECT a.id, 'estandar', coalesce(nullif(btrim(a.tipo_alojamiento), ''), 'Habitación estándar'),
       LEAST(GREATEST(a.capacidad_adultos, 1), 30), LEAST(GREATEST(a.capacidad_ninos, 0), 20), LEAST(GREATEST(a.camas, 1), 50),
       a.precio_noche, LEAST(GREATEST(a.habitaciones, 1), 1000),
       CASE WHEN a.amenidades::text ILIKE '%desayuno%' THEN 'DESAYUNO' ELSE 'SOLO_ALOJAMIENTO' END,
       '[]'::jsonb
FROM alojamientos a
ON CONFLICT (alojamiento_id, codigo) DO NOTHING;

-- El alojamiento resume sus tipos ACTIVOS: precio "desde", total de habitaciones
-- y capacidad máxima por habitación (es lo que usan el buscador y los filtros).
CREATE OR REPLACE FUNCTION alojamientos_resumir_tipos()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_alojamiento VARCHAR(50) := coalesce(NEW.alojamiento_id, OLD.alojamiento_id);
BEGIN
  UPDATE alojamientos a
  SET precio_noche      = r.precio,
      habitaciones      = r.habitaciones,
      capacidad_adultos = r.adultos,
      capacidad_ninos   = r.ninos
  FROM (
    SELECT min(precio_noche) AS precio, sum(cantidad) AS habitaciones,
           max(capacidad_adultos) AS adultos, max(capacidad_ninos) AS ninos
    FROM tipos_habitacion
    WHERE alojamiento_id = v_alojamiento AND activo AND cantidad > 0
  ) r
  WHERE a.id = v_alojamiento AND r.precio IS NOT NULL
    AND (a.precio_noche, a.habitaciones, a.capacidad_adultos, a.capacidad_ninos)
        IS DISTINCT FROM (r.precio, r.habitaciones::int, r.adultos::int, r.ninos::int);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_tipos_habitacion_resumen ON tipos_habitacion;
CREATE TRIGGER trg_tipos_habitacion_resumen
  AFTER INSERT OR UPDATE OR DELETE ON tipos_habitacion
  FOR EACH ROW EXECUTE FUNCTION alojamientos_resumir_tipos();


-- ----------------------------------------------------------------------------
-- 3. RESERVAS: usuario, tipo de habitación, ocupación, tarifa y contacto
-- ----------------------------------------------------------------------------
ALTER TABLE reservas_alojamiento ADD COLUMN IF NOT EXISTS usuario_id            UUID;
ALTER TABLE reservas_alojamiento ADD COLUMN IF NOT EXISTS tipo_habitacion_id    UUID;
ALTER TABLE reservas_alojamiento ADD COLUMN IF NOT EXISTS adultos               SMALLINT;
ALTER TABLE reservas_alojamiento ADD COLUMN IF NOT EXISTS ninos                 SMALLINT;
ALTER TABLE reservas_alojamiento ADD COLUMN IF NOT EXISTS precio_noche          NUMERIC(10, 2);
ALTER TABLE reservas_alojamiento ADD COLUMN IF NOT EXISTS moneda                VARCHAR(3);
ALTER TABLE reservas_alojamiento ADD COLUMN IF NOT EXISTS cliente_telefono      VARCHAR(30);
ALTER TABLE reservas_alojamiento ADD COLUMN IF NOT EXISTS peticiones_especiales TEXT;
ALTER TABLE reservas_alojamiento ADD COLUMN IF NOT EXISTS hora_llegada          VARCHAR(20);
ALTER TABLE reservas_alojamiento ADD COLUMN IF NOT EXISTS motivo_cancelacion    VARCHAR(500);
ALTER TABLE reservas_alojamiento ADD COLUMN IF NOT EXISTS cancelada_en          TIMESTAMP WITHOUT TIME ZONE;

-- Normalizar datos existentes.
UPDATE reservas_alojamiento SET estado = CASE upper(coalesce(estado, 'CONFIRMED'))
         WHEN 'CONFIRMADA' THEN 'CONFIRMED' WHEN 'PENDIENTE' THEN 'PENDING' WHEN 'CANCELADA' THEN 'CANCELLED'
         ELSE upper(coalesce(estado, 'CONFIRMED')) END
WHERE estado IS NULL OR estado <> upper(estado) OR upper(estado) IN ('CONFIRMADA', 'PENDIENTE', 'CANCELADA');
UPDATE reservas_alojamiento SET noches             = greatest(fecha_fin - fecha_inicio, 1) WHERE noches IS NULL OR noches <> fecha_fin - fecha_inicio;
UPDATE reservas_alojamiento SET habitaciones_count = 1        WHERE habitaciones_count IS NULL;
UPDATE reservas_alojamiento SET huespedes          = 1        WHERE huespedes IS NULL;
UPDATE reservas_alojamiento SET adultos            = huespedes WHERE adultos IS NULL;
UPDATE reservas_alojamiento SET ninos              = huespedes - adultos WHERE ninos IS NULL;
UPDATE reservas_alojamiento SET cliente_email      = lower(btrim(cliente_email)) WHERE cliente_email IS NOT NULL AND cliente_email <> lower(btrim(cliente_email));
UPDATE reservas_alojamiento r SET moneda = upper(coalesce(r.total_price->>'currency', a.moneda, 'USD'))
FROM alojamientos a WHERE a.id = r.alojamiento_id AND r.moneda IS NULL;
UPDATE reservas_alojamiento SET precio_noche = round(total / greatest(noches * habitaciones_count, 1), 2) WHERE precio_noche IS NULL;
UPDATE reservas_alojamiento SET cancelada_en = actualizado_en WHERE estado = 'CANCELLED' AND cancelada_en IS NULL;
UPDATE reservas_alojamiento SET creado_en = now() WHERE creado_en IS NULL;
UPDATE reservas_alojamiento SET actualizado_en = creado_en WHERE actualizado_en IS NULL;
-- Las reservas anteriores pasan al tipo "estándar" de su alojamiento.
UPDATE reservas_alojamiento r SET tipo_habitacion_id = t.id
FROM tipos_habitacion t
WHERE t.alojamiento_id = r.alojamiento_id AND t.codigo = 'estandar' AND r.tipo_habitacion_id IS NULL;

ALTER TABLE reservas_alojamiento
  ALTER COLUMN estado             SET DEFAULT 'CONFIRMED',
  ALTER COLUMN estado             SET NOT NULL,
  ALTER COLUMN noches             SET NOT NULL,
  ALTER COLUMN huespedes          SET NOT NULL,
  ALTER COLUMN habitaciones_count SET NOT NULL,
  ALTER COLUMN adultos            SET NOT NULL,
  ALTER COLUMN ninos              SET NOT NULL,
  ALTER COLUMN ninos              SET DEFAULT 0,
  ALTER COLUMN precio_noche       SET NOT NULL,
  ALTER COLUMN moneda             SET NOT NULL,
  ALTER COLUMN moneda             SET DEFAULT 'USD',
  ALTER COLUMN tipo_habitacion_id SET NOT NULL,
  ALTER COLUMN creado_en          SET NOT NULL,
  ALTER COLUMN actualizado_en     SET NOT NULL;

ALTER TABLE reservas_alojamiento DROP CONSTRAINT IF EXISTS chk_reservas_fechas;
ALTER TABLE reservas_alojamiento ADD  CONSTRAINT chk_reservas_fechas     CHECK (fecha_fin > fecha_inicio AND noches = fecha_fin - fecha_inicio);
ALTER TABLE reservas_alojamiento DROP CONSTRAINT IF EXISTS chk_reservas_estado;
ALTER TABLE reservas_alojamiento ADD  CONSTRAINT chk_reservas_estado     CHECK (estado IN ('CONFIRMED', 'PENDING', 'CANCELLED'));
ALTER TABLE reservas_alojamiento DROP CONSTRAINT IF EXISTS chk_reservas_ocupacion;
ALTER TABLE reservas_alojamiento ADD  CONSTRAINT chk_reservas_ocupacion  CHECK (habitaciones_count >= 1 AND adultos >= 1 AND ninos >= 0 AND huespedes = adultos + ninos);
ALTER TABLE reservas_alojamiento DROP CONSTRAINT IF EXISTS chk_reservas_importes;
ALTER TABLE reservas_alojamiento ADD  CONSTRAINT chk_reservas_importes   CHECK (total >= 0 AND precio_noche >= 0);
ALTER TABLE reservas_alojamiento DROP CONSTRAINT IF EXISTS chk_reservas_moneda;
ALTER TABLE reservas_alojamiento ADD  CONSTRAINT chk_reservas_moneda     CHECK (moneda ~ '^[A-Z]{3}$');
ALTER TABLE reservas_alojamiento DROP CONSTRAINT IF EXISTS chk_reservas_cliente;
ALTER TABLE reservas_alojamiento ADD  CONSTRAINT chk_reservas_cliente    CHECK (btrim(cliente_nombre) <> '');
ALTER TABLE reservas_alojamiento DROP CONSTRAINT IF EXISTS chk_reservas_cancelacion;
ALTER TABLE reservas_alojamiento ADD  CONSTRAINT chk_reservas_cancelacion CHECK (estado = 'CANCELLED' OR cancelada_en IS NULL);

-- FK al alojamiento: RESTRICT en lugar de CASCADE. Borrar un hotel ya no borra
-- el historial de reservas (el backend lo da de baja lógica si tiene reservas).
DO $$
DECLARE v_fk text;
BEGIN
  FOR v_fk IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'reservas_alojamiento'::regclass AND contype = 'f'
      AND confrelid = 'alojamientos'::regclass
  LOOP
    EXECUTE format('ALTER TABLE reservas_alojamiento DROP CONSTRAINT %I', v_fk);
  END LOOP;
END $$;
ALTER TABLE reservas_alojamiento ADD CONSTRAINT fk_reservas_alojamiento
  FOREIGN KEY (alojamiento_id) REFERENCES alojamientos (id) ON DELETE RESTRICT;

ALTER TABLE reservas_alojamiento DROP CONSTRAINT IF EXISTS fk_reservas_tipo_habitacion;
ALTER TABLE reservas_alojamiento ADD  CONSTRAINT fk_reservas_tipo_habitacion
  FOREIGN KEY (tipo_habitacion_id) REFERENCES tipos_habitacion (id) ON DELETE RESTRICT;

-- Usuario de Supabase Auth (auth.users). NULL = reserva sin sesión iniciada.
-- Las reservas existentes se vinculan por correo. Si se borra el usuario, la
-- reserva se conserva (historial contable) sin el vínculo.
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    UPDATE reservas_alojamiento r SET usuario_id = u.id
    FROM auth.users u
    WHERE r.usuario_id IS NULL AND r.cliente_email IS NOT NULL AND lower(u.email) = lower(r.cliente_email);

    ALTER TABLE reservas_alojamiento DROP CONSTRAINT IF EXISTS fk_reservas_usuario;
    ALTER TABLE reservas_alojamiento ADD CONSTRAINT fk_reservas_usuario
      FOREIGN KEY (usuario_id) REFERENCES auth.users (id) ON DELETE SET NULL;
  ELSE
    RAISE NOTICE 'auth.users no existe: se omite la FK de usuario_id.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_reservas_codigo        ON reservas_alojamiento (codigo_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario             ON reservas_alojamiento (usuario_id, creado_en DESC) WHERE usuario_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reservas_email               ON reservas_alojamiento (lower(cliente_email));
CREATE INDEX IF NOT EXISTS idx_reservas_ocupacion           ON reservas_alojamiento (tipo_habitacion_id, fecha_inicio, fecha_fin) WHERE estado = 'CONFIRMED';
CREATE INDEX IF NOT EXISTS idx_reservas_alojamiento         ON reservas_alojamiento (alojamiento_id);

DROP TRIGGER IF EXISTS trg_reservas_actualizado_en ON reservas_alojamiento;
CREATE TRIGGER trg_reservas_actualizado_en
  BEFORE UPDATE ON reservas_alojamiento
  FOR EACH ROW EXECUTE FUNCTION alojamientos_tocar_actualizado_en();


-- ----------------------------------------------------------------------------
-- 4. HUÉSPEDES DE CADA RESERVA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS huespedes_reserva (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id        UUID         NOT NULL REFERENCES reservas_alojamiento (id) ON DELETE CASCADE,
  orden             SMALLINT     NOT NULL,
  es_titular        BOOLEAN      NOT NULL DEFAULT false,
  tipo              VARCHAR(10)  NOT NULL DEFAULT 'ADULTO',
  nombre            VARCHAR(100) NOT NULL,
  apellido          VARCHAR(100) NOT NULL DEFAULT '',
  edad              SMALLINT,
  documento_tipo    VARCHAR(20),
  documento_numero  VARCHAR(30),
  nacionalidad      VARCHAR(2),
  email             VARCHAR(150),
  telefono          VARCHAR(30),
  creado_en         TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT ux_huespedes_orden       UNIQUE (reserva_id, orden),
  CONSTRAINT chk_huespedes_orden      CHECK (orden >= 1),
  CONSTRAINT chk_huespedes_tipo       CHECK (tipo IN ('ADULTO', 'NINO')),
  CONSTRAINT chk_huespedes_nombre     CHECK (btrim(nombre) <> ''),
  CONSTRAINT chk_huespedes_edad       CHECK ((tipo = 'NINO' AND edad BETWEEN 0 AND 17) OR (tipo = 'ADULTO' AND (edad IS NULL OR edad >= 18))),
  CONSTRAINT chk_huespedes_titular    CHECK (NOT es_titular OR tipo = 'ADULTO'),
  CONSTRAINT chk_huespedes_documento  CHECK (documento_tipo IS NULL OR documento_tipo IN ('CEDULA', 'PASAPORTE', 'DNI', 'OTRO')),
  CONSTRAINT chk_huespedes_pais       CHECK (nacionalidad IS NULL OR nacionalidad ~ '^[A-Z]{2}$')
);
-- Un solo titular por reserva.
CREATE UNIQUE INDEX IF NOT EXISTS ux_huespedes_titular ON huespedes_reserva (reserva_id) WHERE es_titular;

-- Las reservas existentes reciben a su titular (el cliente que reservó).
INSERT INTO huespedes_reserva (reserva_id, orden, es_titular, tipo, nombre, apellido, email, telefono)
SELECT r.id, 1, true, 'ADULTO',
       split_part(btrim(r.cliente_nombre), ' ', 1),
       btrim(substr(btrim(r.cliente_nombre), length(split_part(btrim(r.cliente_nombre), ' ', 1)) + 1)),
       r.cliente_email, r.cliente_telefono
FROM reservas_alojamiento r
WHERE NOT EXISTS (SELECT 1 FROM huespedes_reserva h WHERE h.reserva_id = r.id);


-- ----------------------------------------------------------------------------
-- 5. RESEÑAS: integridad
-- ----------------------------------------------------------------------------
ALTER TABLE resenas_alojamiento DROP CONSTRAINT IF EXISTS chk_resenas_puntuaciones;
ALTER TABLE resenas_alojamiento ADD  CONSTRAINT chk_resenas_puntuaciones CHECK (
  puntuacion BETWEEN 0 AND 10 AND limpieza BETWEEN 0 AND 10 AND servicio BETWEEN 0 AND 10 AND calidad BETWEEN 0 AND 10
);
ALTER TABLE resenas_alojamiento DROP CONSTRAINT IF EXISTS chk_resenas_comentario;
ALTER TABLE resenas_alojamiento ADD  CONSTRAINT chk_resenas_comentario CHECK (btrim(comentario) <> '');
CREATE INDEX IF NOT EXISTS idx_resenas_alojamiento_fecha ON resenas_alojamiento (alojamiento_id, creado_en DESC);


-- ----------------------------------------------------------------------------
-- 6. Documentación en la base de datos
-- ----------------------------------------------------------------------------
COMMENT ON TABLE  proveedores_alojamiento                   IS 'Sistemas externos que sincronizan alojamientos con una API key.';
COMMENT ON COLUMN proveedores_alojamiento.api_key_hash      IS 'SHA-256 (hex) de la API key; la clave en claro nunca se guarda.';
COMMENT ON TABLE  tipos_habitacion                          IS 'Tipos de habitación de cada alojamiento: precio, capacidad, régimen y cupo propios.';
COMMENT ON COLUMN tipos_habitacion.cantidad                 IS 'Habitaciones de este tipo que se venden por noche (inventario).';
COMMENT ON COLUMN tipos_habitacion.cancelacion_gratuita_horas IS 'Horas antes de la llegada con cancelación gratuita; NULL = no reembolsable.';
COMMENT ON TABLE  huespedes_reserva                         IS 'Personas que se alojan en cada reserva (titular y acompañantes).';
COMMENT ON COLUMN reservas_alojamiento.usuario_id           IS 'Usuario de Supabase Auth que reservó; NULL si reservó sin sesión.';
COMMENT ON COLUMN reservas_alojamiento.tipo_habitacion_id   IS 'Tipo de habitación reservado.';
COMMENT ON COLUMN reservas_alojamiento.precio_noche         IS 'Tarifa por noche y habitación contratada (no cambia si luego cambia el precio del hotel).';
COMMENT ON COLUMN alojamientos.precio_noche                 IS 'Precio "desde": el menor de sus tipos de habitación activos (lo mantiene un trigger).';
COMMENT ON COLUMN alojamientos.habitaciones                 IS 'Total de habitaciones: suma de sus tipos activos (lo mantiene un trigger).';

COMMIT;


-- ============================================================================
-- PASO 2 · COMPROBACIÓN
-- ============================================================================
SELECT 'proveedores' AS tabla, count(*) FROM proveedores_alojamiento
UNION ALL SELECT 'tipos_habitacion', count(*) FROM tipos_habitacion
UNION ALL SELECT 'reservas sin tipo', count(*) FROM reservas_alojamiento WHERE tipo_habitacion_id IS NULL
UNION ALL SELECT 'reservas vinculadas a usuario', count(*) FROM reservas_alojamiento WHERE usuario_id IS NOT NULL
UNION ALL SELECT 'huespedes_reserva', count(*) FROM huespedes_reserva;

SELECT conrelid::regclass AS tabla, conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE contype = 'f' AND conrelid::regclass::text IN ('alojamientos', 'tipos_habitacion', 'reservas_alojamiento', 'huespedes_reserva', 'resenas_alojamiento')
ORDER BY 1, 2;


-- ============================================================================
-- REVERTIR (solo si hiciera falta; borra tipos, huéspedes y proveedores)
-- ============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS huespedes_reserva;
-- ALTER TABLE reservas_alojamiento
--   DROP CONSTRAINT IF EXISTS fk_reservas_tipo_habitacion, DROP CONSTRAINT IF EXISTS fk_reservas_usuario,
--   DROP CONSTRAINT IF EXISTS chk_reservas_fechas, DROP CONSTRAINT IF EXISTS chk_reservas_estado,
--   DROP CONSTRAINT IF EXISTS chk_reservas_ocupacion, DROP CONSTRAINT IF EXISTS chk_reservas_importes,
--   DROP CONSTRAINT IF EXISTS chk_reservas_moneda, DROP CONSTRAINT IF EXISTS chk_reservas_cliente,
--   DROP CONSTRAINT IF EXISTS chk_reservas_cancelacion,
--   DROP COLUMN IF EXISTS usuario_id, DROP COLUMN IF EXISTS tipo_habitacion_id, DROP COLUMN IF EXISTS adultos,
--   DROP COLUMN IF EXISTS ninos, DROP COLUMN IF EXISTS precio_noche, DROP COLUMN IF EXISTS moneda,
--   DROP COLUMN IF EXISTS cliente_telefono, DROP COLUMN IF EXISTS peticiones_especiales, DROP COLUMN IF EXISTS hora_llegada,
--   DROP COLUMN IF EXISTS motivo_cancelacion, DROP COLUMN IF EXISTS cancelada_en;
-- DROP TRIGGER IF EXISTS trg_reservas_actualizado_en ON reservas_alojamiento;
-- DROP TABLE IF EXISTS tipos_habitacion;
-- DROP FUNCTION IF EXISTS alojamientos_resumir_tipos();
-- ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS fk_alojamientos_proveedor;
-- DROP TABLE IF EXISTS proveedores_alojamiento;
-- ALTER TABLE resenas_alojamiento DROP CONSTRAINT IF EXISTS chk_resenas_puntuaciones, DROP CONSTRAINT IF EXISTS chk_resenas_comentario;
-- COMMIT;
