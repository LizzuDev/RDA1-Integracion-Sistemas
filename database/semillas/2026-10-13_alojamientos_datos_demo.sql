-- ============================================================================
-- DATOS COHERENTES · ALOJAMIENTOS (tipos de habitación por hotel)
-- Requisito: migraciones 2026-10-12 y 2026-10-13 ya aplicadas.
--
-- No borra nada. Para cada uno de los 13 alojamientos del catálogo:
--   1. Completa su tipo «estandar» con un nombre real de habitación, camas, m²,
--      régimen, política de cancelación, servicios e inventario creíble.
--      Su PRECIO NO CAMBIA y su cupo solo puede subir (nunca bajar).
--   2. Añade 2 tipos más propios de ese hotel (suite, vista al mar, dormitorio…).
--
-- Las reservas existentes siguen igual: conservan su tipo (el estándar) y su
-- tarifa contratada. Si un id no existe en tu base, simplemente se omite.
-- Idempotente: volver a ejecutarlo no duplica ni pisa cambios hechos en el panel
-- sobre los tipos nuevos.
-- ============================================================================


-- ============================================================================
-- PASO 0 · ESTADO ACTUAL (solo lectura)
-- ============================================================================
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

-- 1. Tipo estándar de cada hotel: nombre y ficha reales, mismo precio.
--    (alojamiento, nombre, descripción, camas, detalle camas, m², cupo mínimo,
--     régimen, horas de cancelación gratis, servicios, adultos, niños)
--    adultos/niños NULL = se mantiene la capacidad actual.
CREATE TEMP TABLE semilla_estandar (
  alojamiento_id VARCHAR(50), nombre VARCHAR(150), descripcion TEXT, camas SMALLINT, descripcion_camas VARCHAR(150),
  tamano_m2 NUMERIC(6,1), cantidad SMALLINT, regimen VARCHAR(20), horas SMALLINT, amenidades JSONB,
  adultos SMALLINT, ninos SMALLINT
) ON COMMIT DROP;

INSERT INTO semilla_estandar VALUES
('hotel-quito-03',     'Habitación Clásica', 'Habitación de estilo colonial restaurada, con techos altos y detalles de época.', 1, '1 cama king', 32, 6, 'DESAYUNO', 48, '["WiFi gratis","Desayuno incluido","Calefacción","Artículos de aseo de lujo"]', NULL, NULL),
('hotel-cancun-01',    'Habitación Deluxe vista a la laguna', 'Balcón con vista a la laguna Nichupté. Plan todo incluido.', 2, '2 camas dobles', 42, 8, 'TODO_INCLUIDO', 72, '["WiFi gratis","Todo incluido","Balcón","Aire acondicionado","Minibar"]', NULL, NULL),
('hotel-cartagena-02', 'Habitación Superior', 'En el antiguo convento de Santa Teresa, dentro de la ciudad amurallada.', 1, '1 cama queen', 30, 6, 'DESAYUNO', 48, '["WiFi gratis","Desayuno incluido","Aire acondicionado","Caja fuerte"]', NULL, NULL),
('hotel-medellin-04',  'Habitación Medium', 'Habitación de diseño en El Poblado, con ducha de lluvia.', 1, '1 cama queen', 22, 6, 'SOLO_ALOJAMIENTO', 48, '["WiFi gratis","Aire acondicionado","Smart TV","Ducha de lluvia"]', NULL, NULL),
('hotel-puntacana-05', 'Habitación Deluxe vista al jardín', 'Rodeada de jardines tropicales, a pocos pasos de la playa.', 2, '2 camas dobles', 45, 8, 'DESAYUNO', 72, '["WiFi gratis","Desayuno incluido","Terraza","Aire acondicionado","Cafetera"]', NULL, NULL),
('hotel-cusco-06',     'Habitación Deluxe', 'Frente al Qoricancha, con calefacción y decoración inspirada en el arte cusqueño.', 1, '1 cama king', 30, 6, 'DESAYUNO', 48, '["WiFi gratis","Desayuno incluido","Calefacción","Mate de coca de cortesía"]', NULL, NULL),
('quito-terraza-01',   'Habitación doble con baño compartido', 'Habitación sencilla con acceso a la terraza panorámica del hostal.', 1, '1 cama doble', 12, 3, 'SOLO_ALOJAMIENTO', 24, '["WiFi gratis","Terraza compartida","Cocina compartida"]', NULL, NULL),
('quito-epiq-02',      'Apartamento de 1 dormitorio', 'Apartamento completo en La Carolina, con cocina equipada.', 1, '1 cama queen + sofá cama', 55, 3, 'SOLO_ALOJAMIENTO', 48, '["WiFi gratis","Cocina equipada","Lavadora","Piscina climatizada","Gimnasio"]', NULL, NULL),
('quito-tobar-03',     'Habitación doble', 'Casona tradicional cerca del centro, con patio interior.', 1, '1 cama doble', 16, 4, 'DESAYUNO', 24, '["WiFi gratis","Desayuno incluido","Baño privado"]', NULL, NULL),
('quito-ejido-04',     'Habitación doble', 'Frente al parque El Ejido, a pocos minutos del centro histórico.', 1, '1 cama queen', 20, 5, 'DESAYUNO', 24, '["WiFi gratis","Desayuno incluido","TV por cable"]', NULL, NULL),
('quito-latitud-05',   'Cama en dormitorio mixto', 'Litera en dormitorio compartido de 8 camas, con taquilla individual.', 1, '1 cama en litera', 4, 8, 'SOLO_ALOJAMIENTO', 24, '["WiFi gratis","Taquilla","Cocina compartida","Ropa de cama incluida"]', 1, 0),
('quito-artplaza-06',  'Habitación doble estándar', 'Hotel boutique con obras de artistas ecuatorianos en cada habitación.', 1, '1 cama queen', 18, 4, 'DESAYUNO', 24, '["WiFi gratis","Desayuno incluido","Baño privado","Obras de arte originales"]', NULL, NULL),
('quito-rossamia-07',  'Habitación doble deluxe', 'Habitación amplia con decoración de estilo italiano.', 1, '1 cama king', 26, 4, 'DESAYUNO', 48, '["WiFi gratis","Desayuno incluido","Smart TV","Minibar"]', NULL, NULL);

UPDATE tipos_habitacion t
SET nombre                     = s.nombre,
    descripcion                = coalesce(t.descripcion, s.descripcion),
    camas                      = s.camas,
    descripcion_camas          = s.descripcion_camas,
    tamano_m2                  = s.tamano_m2,
    cantidad                   = greatest(t.cantidad, s.cantidad),
    regimen                    = s.regimen,
    cancelacion_gratuita_horas = s.horas,
    amenidades                 = s.amenidades,
    capacidad_adultos          = coalesce(s.adultos, t.capacidad_adultos),
    capacidad_ninos            = coalesce(s.ninos, t.capacidad_ninos),
    orden                      = 1
FROM semilla_estandar s
WHERE t.alojamiento_id = s.alojamiento_id AND t.codigo = 'estandar';

-- 2. Tipos adicionales de cada hotel. Precio por noche en la moneda del hotel.
--    (alojamiento, código, nombre, descripción, adultos, niños, camas, detalle
--     camas, m², precio, cupo, régimen, horas cancelación (NULL = no reembolsable),
--     servicios, orden)
INSERT INTO tipos_habitacion (alojamiento_id, codigo, nombre, descripcion, capacidad_adultos, capacidad_ninos, camas,
                              descripcion_camas, tamano_m2, precio_noche, cantidad, regimen, cancelacion_gratuita_horas,
                              amenidades, orden)
SELECT v.alojamiento_id, v.codigo, v.nombre, v.descripcion, v.adultos, v.ninos, v.camas, v.descripcion_camas, v.m2,
       v.precio, v.cantidad, v.regimen, v.horas, v.amenidades::jsonb, v.orden
FROM (VALUES
  ('hotel-quito-03', 'deluxe-plaza', 'Habitación Deluxe con vista a la plaza', 'Ventanales sobre la Plaza San Francisco.', 2, 1, 1, '1 cama king', 38.0, 360.00, 4, 'DESAYUNO', 48, '["WiFi gratis","Desayuno incluido","Vista a la plaza","Bañera"]', 2),
  ('hotel-quito-03', 'suite', 'Suite Gangotena', 'Suite con sala de estar, chimenea y terraza privada.', 3, 1, 2, '1 cama king + sofá cama', 70.0, 620.00, 1, 'DESAYUNO', NULL, '["WiFi gratis","Desayuno incluido","Terraza privada","Chimenea","Mayordomo"]', 3),

  ('hotel-cancun-01', 'deluxe-mar', 'Habitación Deluxe vista al mar', 'Balcón frente al mar Caribe. Plan todo incluido.', 3, 2, 2, '2 camas dobles', 42.0, 410.00, 6, 'TODO_INCLUIDO', 72, '["WiFi gratis","Todo incluido","Vista al mar","Balcón","Minibar"]', 2),
  ('hotel-cancun-01', 'junior-suite', 'Junior Suite frente al mar', 'Suite con jacuzzi en la terraza, a pie de playa.', 3, 2, 1, '1 cama king + sofá cama', 65.0, 560.00, 2, 'TODO_INCLUIDO', NULL, '["WiFi gratis","Todo incluido","Jacuzzi en terraza","Acceso directo a la playa"]', 3),

  ('hotel-cartagena-02', 'deluxe-ciudad', 'Habitación Deluxe vista a la ciudad amurallada', 'Vistas a los tejados coloniales y al mar.', 2, 1, 1, '1 cama king', 36.0, 310.00, 4, 'DESAYUNO', 48, '["WiFi gratis","Desayuno incluido","Vista a la ciudad","Aire acondicionado"]', 2),
  ('hotel-cartagena-02', 'suite-colonial', 'Suite colonial', 'Suite con balcón y salón en el claustro del antiguo convento.', 3, 1, 2, '1 cama king + sofá cama', 60.0, 520.00, 1, 'DESAYUNO', NULL, '["WiFi gratis","Desayuno incluido","Balcón","Salón privado"]', 3),

  ('hotel-medellin-04', 'small', 'Habitación Small', 'Compacta y luminosa, ideal para una persona o pareja.', 2, 0, 1, '1 cama doble', 16.0, 125.00, 4, 'SOLO_ALOJAMIENTO', 48, '["WiFi gratis","Aire acondicionado","Smart TV"]', 2),
  ('hotel-medellin-04', 'large-balcon', 'Habitación Large con balcón', 'Balcón con vista a El Poblado y zona de estar.', 3, 1, 2, '1 cama king + 1 individual', 32.0, 210.00, 3, 'DESAYUNO', 24, '["WiFi gratis","Desayuno incluido","Balcón","Smart TV"]', 3),

  ('hotel-puntacana-05', 'deluxe-mar', 'Habitación Deluxe vista al mar', 'Terraza con vista directa al océano Atlántico.', 3, 2, 2, '2 camas dobles', 45.0, 470.00, 6, 'DESAYUNO', 72, '["WiFi gratis","Desayuno incluido","Vista al mar","Terraza"]', 2),
  ('hotel-puntacana-05', 'suite-premium', 'Suite Premium frente al mar', 'Suite de dos ambientes con acceso a club de playa privado.', 4, 2, 2, '1 cama king + sofá cama', 85.0, 720.00, 2, 'TODO_INCLUIDO', NULL, '["WiFi gratis","Todo incluido","Frente al mar","Club de playa privado"]', 3),

  ('hotel-cusco-06', 'deluxe-oxigeno', 'Habitación Deluxe con oxígeno', 'Ambiente enriquecido con oxígeno para aclimatarse a la altura.', 2, 1, 1, '1 cama king', 32.0, 265.00, 4, 'DESAYUNO', 48, '["WiFi gratis","Desayuno incluido","Oxígeno en la habitación","Calefacción"]', 2),
  ('hotel-cusco-06', 'suite-inka', 'Suite Inka', 'Suite con vistas al Qoricancha y sala de estar.', 3, 1, 2, '1 cama king + sofá cama', 60.0, 480.00, 1, 'DESAYUNO', NULL, '["WiFi gratis","Desayuno incluido","Vista al Qoricancha","Oxígeno en la habitación"]', 3),

  ('quito-terraza-01', 'doble-privado', 'Habitación doble con baño privado', 'Habitación con baño propio y acceso a la terraza.', 2, 0, 1, '1 cama doble', 14.0, 36.00, 2, 'SOLO_ALOJAMIENTO', 24, '["WiFi gratis","Baño privado","Terraza compartida"]', 2),
  ('quito-terraza-01', 'dormitorio', 'Cama en dormitorio compartido', 'Litera en dormitorio de 6 camas con taquilla.', 1, 0, 1, '1 cama en litera', 4.0, 14.00, 6, 'SOLO_ALOJAMIENTO', 24, '["WiFi gratis","Taquilla","Cocina compartida"]', 3),

  ('quito-epiq-02', 'dos-dormitorios', 'Apartamento de 2 dormitorios', 'Ideal para familias, con sala y balcón.', 4, 2, 3, '1 cama queen + 2 individuales', 85.0, 135.00, 2, 'SOLO_ALOJAMIENTO', 48, '["WiFi gratis","Cocina equipada","Balcón","Piscina climatizada"]', 2),
  ('quito-epiq-02', 'penthouse', 'Penthouse con terraza', 'Último piso con terraza privada y vista a los volcanes.', 4, 2, 2, '2 camas queen', 120.0, 220.00, 1, 'SOLO_ALOJAMIENTO', NULL, '["WiFi gratis","Terraza privada","Vista a los volcanes","Cocina equipada"]', 3),

  ('quito-tobar-03', 'triple', 'Habitación triple', 'Tres camas individuales, cómoda para grupos pequeños.', 3, 0, 3, '3 camas individuales', 22.0, 55.00, 2, 'DESAYUNO', 24, '["WiFi gratis","Desayuno incluido","Baño privado"]', 2),
  ('quito-tobar-03', 'familiar', 'Habitación familiar', 'Amplia, con una cama doble y dos individuales.', 4, 2, 3, '1 cama doble + 2 individuales', 30.0, 70.00, 1, 'DESAYUNO', 24, '["WiFi gratis","Desayuno incluido","Baño privado"]', 3),

  ('quito-ejido-04', 'ejecutiva', 'Habitación ejecutiva', 'Con escritorio amplio y vista al parque.', 2, 1, 1, '1 cama king', 26.0, 62.00, 3, 'DESAYUNO', 24, '["WiFi gratis","Desayuno incluido","Escritorio","Vista al parque"]', 2),
  ('quito-ejido-04', 'suite-junior', 'Suite junior', 'Suite con zona de estar separada.', 3, 1, 2, '1 cama king + sofá cama', 34.0, 85.00, 1, 'DESAYUNO', NULL, '["WiFi gratis","Desayuno incluido","Zona de estar"]', 3),

  ('quito-latitud-05', 'doble-privada', 'Habitación doble privada', 'Habitación privada con baño compartido.', 2, 0, 1, '1 cama doble', 12.0, 28.00, 2, 'SOLO_ALOJAMIENTO', 24, '["WiFi gratis","Cocina compartida"]', 2),
  ('quito-latitud-05', 'triple-privada', 'Habitación triple privada', 'Habitación privada con baño propio para tres personas.', 3, 0, 2, '1 cama doble + 1 individual', 16.0, 38.00, 1, 'SOLO_ALOJAMIENTO', 24, '["WiFi gratis","Baño privado","Cocina compartida"]', 3),

  ('quito-artplaza-06', 'superior', 'Habitación doble superior', 'Más amplia, con balcón hacia la calle.', 2, 1, 1, '1 cama king', 24.0, 52.00, 3, 'DESAYUNO', 24, '["WiFi gratis","Desayuno incluido","Balcón","Obras de arte originales"]', 2),
  ('quito-artplaza-06', 'suite-familiar', 'Suite familiar', 'Dos ambientes para familias de hasta 4 adultos.', 4, 2, 3, '1 cama queen + 2 individuales', 40.0, 78.00, 1, 'DESAYUNO', NULL, '["WiFi gratis","Desayuno incluido","Dos ambientes"]', 3),

  ('quito-rossamia-07', 'suite-jacuzzi', 'Suite junior con jacuzzi', 'Suite con jacuzzi privado.', 2, 1, 1, '1 cama king', 35.0, 150.00, 2, 'DESAYUNO', 48, '["WiFi gratis","Desayuno incluido","Jacuzzi privado","Minibar"]', 2),
  ('quito-rossamia-07', 'suite-presidencial', 'Suite presidencial', 'Suite con sala, comedor y vista panorámica.', 4, 2, 2, '1 cama king + sofá cama', 60.0, 220.00, 1, 'DESAYUNO', NULL, '["WiFi gratis","Desayuno incluido","Sala y comedor","Vista panorámica"]', 3)
) AS v(alojamiento_id, codigo, nombre, descripcion, adultos, ninos, camas, descripcion_camas, m2, precio, cantidad, regimen, horas, amenidades, orden)
WHERE EXISTS (SELECT 1 FROM alojamientos a WHERE a.id = v.alojamiento_id)
ON CONFLICT (alojamiento_id, codigo) DO NOTHING;

COMMIT;


-- ============================================================================
-- PASO 2 · COMPROBACIÓN: vuelve a ejecutar la consulta del PASO 0.
-- Cada hotel debe tener 3 tipos. El precio «desde» se mantiene salvo en
-- Hostal La Terraza (14.00, la cama en dormitorio) y The Click Clack (125.00,
-- la habitación Small), que ahora tienen una opción más barata que la estándar.
-- ============================================================================


-- ============================================================================
-- REVERTIR los tipos añadidos (los que no tengan reservas). El estándar se queda.
-- ============================================================================
-- DELETE FROM tipos_habitacion t
-- WHERE t.codigo <> 'estandar'
--   AND t.codigo IN ('deluxe-plaza','suite','deluxe-mar','junior-suite','deluxe-ciudad','suite-colonial','small','large-balcon',
--                    'suite-premium','deluxe-oxigeno','suite-inka','doble-privado','dormitorio','dos-dormitorios','penthouse',
--                    'triple','familiar','ejecutiva','suite-junior','doble-privada','triple-privada','superior','suite-familiar',
--                    'suite-jacuzzi','suite-presidencial')
--   AND NOT EXISTS (SELECT 1 FROM reservas_alojamiento r WHERE r.tipo_habitacion_id = t.id);
