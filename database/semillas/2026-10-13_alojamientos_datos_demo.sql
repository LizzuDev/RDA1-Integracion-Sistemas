-- ============================================================================
-- DATOS DE DEMOSTRACIÓN · ALOJAMIENTOS (tipos de habitación)
-- Requisito: migraciones 2026-10-12 y 2026-10-13 ya aplicadas.
--
-- Qué hace: a cada alojamiento ACTIVO que solo tiene su tipo «estándar» le
-- añade dos tipos más, calculados a partir de su propio precio:
--   superior  →  precio × 1.30, desayuno incluido, cancelación gratis 24 h
--   suite     →  precio × 1.80, 1 habitación, no reembolsable
-- y completa la ficha del «estándar» (camas, m², cancelación 48 h) si está vacía.
--
-- No borra ni modifica reservas, reseñas ni datos que ya tengas.
-- Es idempotente: ejecutarlo dos veces no duplica nada.
-- OJO: cada tipo nuevo SUMA habitaciones al hotel (el trigger recalcula el
-- total): un hotel con 3 estándar pasa a tener 3 + 2 superior + 1 suite = 6.
-- ============================================================================


-- ============================================================================
-- PASO 0 · QUÉ HAY AHORA (solo lectura). Pásame estos resultados si algo no cuadra.
-- ============================================================================
SELECT 'alojamientos activos'                AS dato, count(*)::text AS valor FROM alojamientos WHERE estado = 'ACTIVO' AND deleted_at IS NULL
UNION ALL SELECT 'alojamientos inactivos o de baja',      count(*)::text FROM alojamientos WHERE estado <> 'ACTIVO' OR deleted_at IS NOT NULL
UNION ALL SELECT 'tipos de habitación',                   count(*)::text FROM tipos_habitacion
UNION ALL SELECT 'alojamientos sin ningún tipo',          count(*)::text FROM alojamientos a WHERE NOT EXISTS (SELECT 1 FROM tipos_habitacion t WHERE t.alojamiento_id = a.id)
UNION ALL SELECT 'alojamientos con un solo tipo',         count(*)::text FROM alojamientos a WHERE (SELECT count(*) FROM tipos_habitacion t WHERE t.alojamiento_id = a.id) = 1
UNION ALL SELECT 'reservas',                              count(*)::text FROM reservas_alojamiento
UNION ALL SELECT 'reservas vinculadas a una cuenta',      count(*)::text FROM reservas_alojamiento WHERE usuario_id IS NOT NULL
UNION ALL SELECT 'reservas sin tipo de habitación',       count(*)::text FROM reservas_alojamiento WHERE tipo_habitacion_id IS NULL
UNION ALL SELECT 'huéspedes registrados',                 count(*)::text FROM huespedes_reserva
UNION ALL SELECT 'reservas sin titular',                  count(*)::text FROM reservas_alojamiento r WHERE NOT EXISTS (SELECT 1 FROM huespedes_reserva h WHERE h.reserva_id = r.id AND h.es_titular)
UNION ALL SELECT 'proveedores',                           count(*)::text FROM proveedores_alojamiento
UNION ALL SELECT 'reseñas',                               count(*)::text FROM resenas_alojamiento
UNION ALL SELECT 'reseñas de ejemplo (mock-user-*)',      count(*)::text FROM resenas_alojamiento WHERE usuario_id LIKE 'mock-user-%';

-- Detalle por alojamiento: qué tipos tiene y cuántas reservas.
SELECT a.id, a.nombre, a.estado, a.precio_noche AS precio_desde, a.habitaciones,
       string_agg(t.codigo || ' (' || t.precio_noche || ' × ' || t.cantidad || CASE WHEN t.activo THEN '' ELSE ', inactivo' END || ')', ', ' ORDER BY t.orden) AS tipos,
       (SELECT count(*) FROM reservas_alojamiento r WHERE r.alojamiento_id = a.id) AS reservas
FROM alojamientos a
LEFT JOIN tipos_habitacion t ON t.alojamiento_id = a.id
GROUP BY a.id
ORDER BY a.nombre;


-- ============================================================================
-- PASO 1 · DATOS (transacción)
-- ============================================================================
BEGIN;

-- Alojamientos a los que se añaden tipos: activos, con UN solo tipo, y que
-- ese tipo sea el «estándar» (no se toca a quien ya tiene tipos propios).
CREATE TEMP TABLE semilla_base ON COMMIT DROP AS
SELECT a.id AS alojamiento_id, a.tipo_propiedad, t.id AS tipo_id, t.precio_noche, t.cantidad,
       t.capacidad_adultos, t.capacidad_ninos, t.camas
FROM alojamientos a
JOIN tipos_habitacion t ON t.alojamiento_id = a.id AND t.codigo = 'estandar'
WHERE a.estado = 'ACTIVO' AND a.deleted_at IS NULL
  AND (SELECT count(*) FROM tipos_habitacion x WHERE x.alojamiento_id = a.id) = 1;

-- Completar la ficha del estándar solo donde está vacía.
UPDATE tipos_habitacion t
SET descripcion_camas = coalesce(t.descripcion_camas, CASE WHEN t.camas > 1 THEN t.camas || ' camas individuales' ELSE '1 cama doble' END),
    tamano_m2         = coalesce(t.tamano_m2, 28),
    amenidades        = CASE WHEN jsonb_array_length(t.amenidades) = 0 THEN '["WiFi gratis", "Baño privado", "TV de pantalla plana"]'::jsonb ELSE t.amenidades END,
    orden             = 1
FROM semilla_base s
WHERE t.id = s.tipo_id;

INSERT INTO tipos_habitacion (alojamiento_id, codigo, nombre, descripcion, capacidad_adultos, capacidad_ninos, camas,
                              descripcion_camas, tamano_m2, precio_noche, cantidad, regimen, cancelacion_gratuita_horas,
                              amenidades, orden)
SELECT s.alojamiento_id, 'superior', 'Habitación superior',
       'Más amplia que la estándar, con desayuno incluido y vistas exteriores.',
       s.capacidad_adultos, s.capacidad_ninos, s.camas,
       '1 cama king', 36, round(s.precio_noche * 1.30, 2), greatest(1, s.cantidad / 2),
       'DESAYUNO', 24,
       '["WiFi gratis", "Desayuno buffet", "Vista exterior", "Cafetera"]'::jsonb, 2
FROM semilla_base s
ON CONFLICT (alojamiento_id, codigo) DO NOTHING;

INSERT INTO tipos_habitacion (alojamiento_id, codigo, nombre, descripcion, capacidad_adultos, capacidad_ninos, camas,
                              descripcion_camas, tamano_m2, precio_noche, cantidad, regimen, cancelacion_gratuita_horas,
                              amenidades, orden)
SELECT s.alojamiento_id, 'suite', 'Suite',
       'Sala de estar independiente y la mejor vista del alojamiento. Tarifa no reembolsable.',
       least(s.capacidad_adultos + 1, 30), least(s.capacidad_ninos + 1, 20), least(s.camas + 1, 50),
       '1 cama king + sofá cama', 55, round(s.precio_noche * 1.80, 2), 1,
       CASE WHEN s.tipo_propiedad ILIKE '%todo incluido%' THEN 'TODO_INCLUIDO' ELSE 'DESAYUNO' END, NULL,
       '["WiFi gratis", "Desayuno buffet", "Sala de estar", "Bañera de hidromasaje", "Minibar"]'::jsonb, 3
FROM semilla_base s
ON CONFLICT (alojamiento_id, codigo) DO NOTHING;

COMMIT;


-- ============================================================================
-- PASO 2 · COMPROBACIÓN: vuelve a ejecutar la consulta de detalle del PASO 0.
-- Cada hotel activo debería tener estandar, superior y suite, y su
-- precio_desde seguir siendo el del estándar.
-- ============================================================================


-- ============================================================================
-- REVERTIR (solo los tipos de demostración que no tengan reservas)
-- ============================================================================
-- DELETE FROM tipos_habitacion t
-- WHERE t.codigo IN ('superior', 'suite')
--   AND NOT EXISTS (SELECT 1 FROM reservas_alojamiento r WHERE r.tipo_habitacion_id = t.id);
