-- ============================================================================
-- MIGRACIÓN 2026-10-12 · ALOJAMIENTOS: integración con proveedores e integridad
-- PostgreSQL / Supabase · solo toca la tabla "alojamientos"
--
-- Cómo aplicarla (editor SQL de Supabase):
--   1. Ejecuta el PASO 0 y revisa que todas las filas digan 0.
--      Si alguna no es 0, corrige esos registros (o avisa) antes de seguir.
--   2. Ejecuta el PASO 1 completo. Va en una transacción: si algo falla no se
--      aplica nada.
--   3. (Opcional) El PASO 2 completa datos de los hoteles ya cargados.
--   4. El PASO 3 comprueba el resultado.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- El backend YA NO modifica el esquema al arrancar; solo avisa en el log si
-- faltan columnas. Ejecuta esta migración antes de desplegar el backend nuevo.
-- ============================================================================


-- ============================================================================
-- PASO 0 · DIAGNÓSTICO (solo lectura)
-- Cuenta las filas que impedirían crear las restricciones del PASO 1.
-- ============================================================================
SELECT 'nombre vacío'                    AS problema, count(*) FROM alojamientos WHERE btrim(nombre) = ''
UNION ALL SELECT 'destino vacío',                  count(*) FROM alojamientos WHERE btrim(destino) = ''
UNION ALL SELECT 'precio_noche <= 0',              count(*) FROM alojamientos WHERE precio_noche <= 0
UNION ALL SELECT 'capacidad_adultos < 1',          count(*) FROM alojamientos WHERE capacidad_adultos < 1
UNION ALL SELECT 'capacidad_ninos < 0',            count(*) FROM alojamientos WHERE capacidad_ninos < 0
UNION ALL SELECT 'habitaciones < 1',               count(*) FROM alojamientos WHERE habitaciones < 1
UNION ALL SELECT 'camas < 1',                      count(*) FROM alojamientos WHERE camas < 1
UNION ALL SELECT 'banos < 0',                      count(*) FROM alojamientos WHERE banos < 0
UNION ALL SELECT 'moneda no ISO 4217 (3 letras)',  count(*) FROM alojamientos WHERE moneda IS NOT NULL AND upper(btrim(moneda)) !~ '^[A-Z]{3}$'
UNION ALL SELECT 'photos no es un arreglo',        count(*) FROM alojamientos WHERE photos IS NOT NULL AND jsonb_typeof(photos) <> 'array'
UNION ALL SELECT 'amenidades no es un arreglo',    count(*) FROM alojamientos WHERE amenidades IS NOT NULL AND jsonb_typeof(amenidades) <> 'array'
UNION ALL SELECT 'host no es un objeto',           count(*) FROM alojamientos WHERE host IS NOT NULL AND jsonb_typeof(host) NOT IN ('object', 'null')
UNION ALL SELECT 'ratings no es un objeto',        count(*) FROM alojamientos WHERE ratings IS NOT NULL AND jsonb_typeof(ratings) <> 'object'
UNION ALL SELECT 'ratings.score fuera de 0–10',    count(*) FROM alojamientos WHERE CASE WHEN jsonb_typeof(ratings->'score') = 'number' THEN (ratings->>'score')::numeric NOT BETWEEN 0 AND 10 ELSE false END
UNION ALL SELECT 'ubicacion.country no ISO alfa-2', count(*) FROM alojamientos WHERE jsonb_typeof(ubicacion) = 'object' AND ubicacion->>'country' IS NOT NULL AND ubicacion->>'country' !~ '^[A-Z]{2}$'
UNION ALL SELECT 'ubicacion no es un objeto',      count(*) FROM alojamientos WHERE ubicacion IS NOT NULL AND jsonb_typeof(ubicacion) <> 'object'
UNION ALL SELECT 'id con más de 50 caracteres',    count(*) FROM alojamientos WHERE char_length(id) > 50;


-- ============================================================================
-- PASO 1 · ESQUEMA (transacción)
-- ============================================================================
BEGIN;

-- 1.1 Columnas nuevas ---------------------------------------------------------
-- Integración con proveedores: de dónde viene cada alojamiento.
ALTER TABLE alojamientos ADD COLUMN IF NOT EXISTS proveedor_id          VARCHAR(60);
ALTER TABLE alojamientos ADD COLUMN IF NOT EXISTS id_externo            VARCHAR(100);
ALTER TABLE alojamientos ADD COLUMN IF NOT EXISTS ultima_sincronizacion TIMESTAMP WITHOUT TIME ZONE;
-- Publicación: ACTIVO se muestra y se puede reservar; INACTIVO queda oculto sin borrar su historial.
ALTER TABLE alojamientos ADD COLUMN IF NOT EXISTS estado                VARCHAR(20) NOT NULL DEFAULT 'ACTIVO';
-- Políticas de la casa: horarios de entrada y salida, cancelación, mascotas, fumar.
ALTER TABLE alojamientos ADD COLUMN IF NOT EXISTS politicas             JSONB;

-- 1.2 Normalizar datos existentes antes de las restricciones ------------------
UPDATE alojamientos SET moneda            = upper(btrim(moneda))      WHERE moneda IS NOT NULL AND moneda <> upper(btrim(moneda));
UPDATE alojamientos SET moneda            = 'USD'                     WHERE moneda IS NULL;
UPDATE alojamientos SET tipo_propiedad    = 'Hotel / Resort'          WHERE tipo_propiedad IS NULL;
UPDATE alojamientos SET tipo_alojamiento  = 'Habitación privada'      WHERE tipo_alojamiento IS NULL;
UPDATE alojamientos SET capacidad_adultos = 2                         WHERE capacidad_adultos IS NULL;
UPDATE alojamientos SET capacidad_ninos   = 0                         WHERE capacidad_ninos IS NULL;
UPDATE alojamientos SET habitaciones      = 1                         WHERE habitaciones IS NULL;
UPDATE alojamientos SET camas             = 1                         WHERE camas IS NULL;
UPDATE alojamientos SET banos             = 1.0                       WHERE banos IS NULL;
UPDATE alojamientos SET tiene_piscina     = false                     WHERE tiene_piscina IS NULL;
UPDATE alojamientos SET photos            = '[]'::jsonb               WHERE photos IS NULL;
UPDATE alojamientos SET amenidades        = '[]'::jsonb               WHERE amenidades IS NULL;
UPDATE alojamientos SET ratings           = '{"score": 9.0, "number_of_reviews": 0}'::jsonb WHERE ratings IS NULL;
UPDATE alojamientos SET ubicacion         = jsonb_build_object('city', destino) WHERE ubicacion IS NULL;
UPDATE alojamientos SET host              = NULL                      WHERE host = 'null'::jsonb;
UPDATE alojamientos SET creado_en         = now()                     WHERE creado_en IS NULL;
UPDATE alojamientos SET actualizado_en    = coalesce(creado_en, now()) WHERE actualizado_en IS NULL;

-- 1.3 Tipos y NOT NULL (alineados con la entidad del backend) -----------------
-- host, descripcion, politicas y los campos de proveedor siguen admitiendo NULL:
-- el backend los guarda vacíos en las altas manuales.
ALTER TABLE alojamientos
  ALTER COLUMN moneda            TYPE VARCHAR(10),
  ALTER COLUMN moneda            SET NOT NULL,
  ALTER COLUMN tipo_propiedad    SET NOT NULL,
  ALTER COLUMN tipo_alojamiento  SET NOT NULL,
  ALTER COLUMN capacidad_adultos SET NOT NULL,
  ALTER COLUMN capacidad_ninos   SET NOT NULL,
  ALTER COLUMN habitaciones      SET NOT NULL,
  ALTER COLUMN camas             SET NOT NULL,
  ALTER COLUMN banos             SET NOT NULL,
  ALTER COLUMN tiene_piscina     SET NOT NULL,
  ALTER COLUMN photos            SET NOT NULL,
  ALTER COLUMN amenidades        SET NOT NULL,
  ALTER COLUMN ratings           SET NOT NULL,
  ALTER COLUMN ubicacion         SET NOT NULL,
  ALTER COLUMN creado_en         SET NOT NULL,
  ALTER COLUMN actualizado_en    SET NOT NULL;

-- 1.4 Restricciones de integridad ---------------------------------------------
-- Son más permisivas que la validación de la API (que sigue siendo la primera
-- barrera). Protegen la tabla de cargas manuales o scripts con datos imposibles.
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_nombre;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_nombre       CHECK (btrim(nombre) <> '');
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_destino;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_destino      CHECK (btrim(destino) <> '');
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_precio;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_precio       CHECK (precio_noche > 0);
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_moneda;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_moneda       CHECK (moneda ~ '^[A-Z]{3}$');
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_capacidad;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_capacidad    CHECK (capacidad_adultos >= 1 AND capacidad_ninos >= 0);
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_inventario;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_inventario   CHECK (habitaciones >= 1 AND camas >= 1 AND banos >= 0);
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_estado;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_estado       CHECK (estado IN ('ACTIVO', 'INACTIVO'));
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_proveedor;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_proveedor    CHECK (proveedor_id IS NULL OR proveedor_id ~ '^[a-z0-9-]{2,60}$');
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_id_externo;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_id_externo   CHECK (id_externo IS NULL OR id_externo ~ '^[A-Za-z0-9._-]{1,100}$');
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_photos;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_photos       CHECK (jsonb_typeof(photos) = 'array');
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_amenidades;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_amenidades   CHECK (jsonb_typeof(amenidades) = 'array');
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_host;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_host         CHECK (host IS NULL OR jsonb_typeof(host) = 'object');
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_ratings;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_ratings      CHECK (
  jsonb_typeof(ratings) = 'object'
  AND CASE WHEN jsonb_typeof(ratings->'score') = 'number' THEN (ratings->>'score')::numeric BETWEEN 0 AND 10 ELSE true END
);
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_ubicacion;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_ubicacion    CHECK (
  jsonb_typeof(ubicacion) = 'object'
  AND (ubicacion->>'country' IS NULL OR ubicacion->>'country' ~ '^[A-Z]{2}$')
);
ALTER TABLE alojamientos DROP CONSTRAINT IF EXISTS chk_alojamientos_politicas;
ALTER TABLE alojamientos ADD  CONSTRAINT chk_alojamientos_politicas    CHECK (
  politicas IS NULL OR (
    jsonb_typeof(politicas) = 'object'
    AND (politicas->>'checkin_desde'  IS NULL OR politicas->>'checkin_desde'  ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    AND (politicas->>'checkin_hasta'  IS NULL OR politicas->>'checkin_hasta'  ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    AND (politicas->>'checkout_hasta' IS NULL OR politicas->>'checkout_hasta' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  )
);

-- 1.5 Índices -----------------------------------------------------------------
-- Idempotencia de la sincronización: un proveedor no puede repetir su id externo.
CREATE UNIQUE INDEX IF NOT EXISTS ux_alojamientos_proveedor_externo
  ON alojamientos (proveedor_id, id_externo)
  WHERE proveedor_id IS NOT NULL AND id_externo IS NOT NULL;
-- Catálogo público: solo activos y no borrados.
CREATE INDEX IF NOT EXISTS idx_alojamientos_publicos
  ON alojamientos (destino, precio_noche)
  WHERE estado = 'ACTIVO' AND deleted_at IS NULL;
-- Panel de gestión: filtrar por proveedor y por estado.
CREATE INDEX IF NOT EXISTS idx_alojamientos_proveedor ON alojamientos (proveedor_id) WHERE proveedor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alojamientos_estado    ON alojamientos (estado);
-- Los del esquema original, por si la tabla se creó sin ellos.
CREATE INDEX IF NOT EXISTS idx_alojamientos_destino   ON alojamientos (destino);
CREATE INDEX IF NOT EXISTS idx_alojamientos_precio    ON alojamientos (precio_noche);

-- 1.6 actualizado_en automático -----------------------------------------------
-- El backend ya lo pone al guardar; el trigger cubre los cambios hechos a mano
-- desde Supabase o con scripts.
CREATE OR REPLACE FUNCTION alojamientos_tocar_actualizado_en()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alojamientos_actualizado_en ON alojamientos;
CREATE TRIGGER trg_alojamientos_actualizado_en
  BEFORE UPDATE ON alojamientos
  FOR EACH ROW EXECUTE FUNCTION alojamientos_tocar_actualizado_en();

-- 1.7 Documentación en la propia base de datos --------------------------------
COMMENT ON TABLE  alojamientos                       IS 'Catálogo de alojamientos: altas manuales del panel y datos sincronizados por proveedores.';
COMMENT ON COLUMN alojamientos.id                    IS 'aloj-<uuid> en altas manuales; <proveedor_id>-<id_externo> (o hash si supera 50) en las de proveedor.';
COMMENT ON COLUMN alojamientos.precio_noche          IS 'Precio por noche y habitación, en la moneda de la columna moneda.';
COMMENT ON COLUMN alojamientos.moneda                IS 'Código ISO 4217 (USD, EUR…).';
COMMENT ON COLUMN alojamientos.capacidad_adultos     IS 'Máximo de adultos por habitación.';
COMMENT ON COLUMN alojamientos.capacidad_ninos       IS 'Máximo de niños por habitación.';
COMMENT ON COLUMN alojamientos.habitaciones          IS 'Inventario: habitaciones vendibles por noche.';
COMMENT ON COLUMN alojamientos.photos                IS 'Arreglo de {url, caption}. Solo URLs https.';
COMMENT ON COLUMN alojamientos.amenidades            IS 'Arreglo de textos (WiFi gratis, Piscina…).';
COMMENT ON COLUMN alojamientos.host                  IS '{id, nombre, tiempo_respuesta, es_superhost, foto_perfil} o NULL.';
COMMENT ON COLUMN alojamientos.ratings               IS '{score 0–10, limpieza, ubicacion, servicio, number_of_reviews}.';
COMMENT ON COLUMN alojamientos.ubicacion             IS '{address, city, country ISO 3166-1 alfa-2, coordinates {latitude, longitude}}.';
COMMENT ON COLUMN alojamientos.proveedor_id          IS 'NULL = alta manual en el panel; si no, el proveedor que lo sincroniza (ALOJAMIENTOS_API_KEYS).';
COMMENT ON COLUMN alojamientos.id_externo            IS 'Id del alojamiento en el sistema del proveedor. Único por proveedor.';
COMMENT ON COLUMN alojamientos.estado                IS 'ACTIVO = visible y reservable; INACTIVO = oculto, conserva sus reservas.';
COMMENT ON COLUMN alojamientos.politicas             IS '{checkin_desde, checkin_hasta, checkout_hasta (HH:MM), cancelacion, mascotas, fumar}.';
COMMENT ON COLUMN alojamientos.ultima_sincronizacion IS 'Último cambio recibido del proveedor.';
COMMENT ON COLUMN alojamientos.deleted_at            IS 'Borrado lógico (TypeORM soft delete).';

COMMIT;


-- ============================================================================
-- PASO 2 · DATOS (opcional, recomendado)
-- Completa los hoteles ya cargados para que su ficha muestre país y políticas.
-- Solo rellena lo que está vacío; no pisa datos existentes.
-- ============================================================================
BEGIN;

-- País (ISO 3166-1 alfa-2) y ciudad según el destino, si la ubicación no los trae.
UPDATE alojamientos a
SET ubicacion = a.ubicacion
      || jsonb_build_object('city', coalesce(a.ubicacion->>'city', a.destino))
      || jsonb_build_object('country', coalesce(a.ubicacion->>'country', p.pais))
FROM (VALUES
  ('Cancún', 'MX'), ('Cartagena', 'CO'), ('Medellín', 'CO'),
  ('Quito', 'EC'), ('Guayaquil', 'EC'), ('Cuenca', 'EC'), ('Otavalo', 'EC'), ('Baños', 'EC'),
  ('Cusco', 'PE'), ('Lima', 'PE'), ('Punta Cana', 'DO')
) AS p(destino, pais)
WHERE a.destino = p.destino
  AND (a.ubicacion->>'country' IS NULL OR a.ubicacion->>'city' IS NULL);

-- Políticas estándar de hotel para los que no tienen ninguna.
-- Ajústalas luego por hotel desde el panel (Gestión → Alojamientos).
UPDATE alojamientos
SET politicas = '{
  "checkin_desde": "15:00",
  "checkin_hasta": "23:00",
  "checkout_hasta": "12:00",
  "cancelacion": "Cancelación gratuita hasta 48 horas antes de la llegada.",
  "mascotas": false,
  "fumar": false
}'::jsonb
WHERE politicas IS NULL;

COMMIT;


-- ============================================================================
-- PASO 3 · COMPROBACIÓN
-- ============================================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'alojamientos'
ORDER BY ordinal_position;

SELECT conname AS restriccion, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'alojamientos'::regclass AND contype = 'c'
ORDER BY conname;

SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'alojamientos' ORDER BY indexname;

SELECT estado, coalesce(proveedor_id, '(manual)') AS origen, count(*)
FROM alojamientos
WHERE deleted_at IS NULL
GROUP BY 1, 2
ORDER BY 1, 2;


-- ============================================================================
-- REVERTIR (solo si hiciera falta; borra los datos de las columnas nuevas)
-- ============================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_alojamientos_actualizado_en ON alojamientos;
-- DROP FUNCTION IF EXISTS alojamientos_tocar_actualizado_en();
-- DROP INDEX IF EXISTS ux_alojamientos_proveedor_externo, idx_alojamientos_publicos,
--                      idx_alojamientos_proveedor, idx_alojamientos_estado;
-- ALTER TABLE alojamientos
--   DROP CONSTRAINT IF EXISTS chk_alojamientos_nombre,      DROP CONSTRAINT IF EXISTS chk_alojamientos_destino,
--   DROP CONSTRAINT IF EXISTS chk_alojamientos_precio,      DROP CONSTRAINT IF EXISTS chk_alojamientos_moneda,
--   DROP CONSTRAINT IF EXISTS chk_alojamientos_capacidad,   DROP CONSTRAINT IF EXISTS chk_alojamientos_inventario,
--   DROP CONSTRAINT IF EXISTS chk_alojamientos_estado,      DROP CONSTRAINT IF EXISTS chk_alojamientos_proveedor,
--   DROP CONSTRAINT IF EXISTS chk_alojamientos_id_externo,  DROP CONSTRAINT IF EXISTS chk_alojamientos_photos,
--   DROP CONSTRAINT IF EXISTS chk_alojamientos_amenidades,  DROP CONSTRAINT IF EXISTS chk_alojamientos_host,
--   DROP CONSTRAINT IF EXISTS chk_alojamientos_ratings,     DROP CONSTRAINT IF EXISTS chk_alojamientos_ubicacion,
--   DROP CONSTRAINT IF EXISTS chk_alojamientos_politicas,
--   DROP COLUMN IF EXISTS proveedor_id, DROP COLUMN IF EXISTS id_externo, DROP COLUMN IF EXISTS estado,
--   DROP COLUMN IF EXISTS politicas,    DROP COLUMN IF EXISTS ultima_sincronizacion;
-- COMMIT;
