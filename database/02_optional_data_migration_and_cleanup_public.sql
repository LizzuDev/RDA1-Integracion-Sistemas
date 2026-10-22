-- ============================================================================
-- SCRIPT DE MIGRACIÓN DE DATOS EXISTENTES Y LIMPIEZA DE TABLAS EN PUBLIC (OPCIONAL)
-- Proyecto: Booking Prototipo — Reto 2: Integración de Sistemas
-- Propósito: Copiar los datos útiles que ya existían en 'public' hacia los 
-- nuevos 12 esquemas independientes, y posteriormente limpiar el esquema 'public'
-- para dejar la base de datos de Supabase 100% limpia y sin tablas monolíticas.
-- ============================================================================

-- ============================================================================
-- PASO 1: MIGRAR USUARIOS EXISTENTES DE public.usuarios -> schema_clientes.clientes
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usuarios') THEN
        INSERT INTO schema_clientes.clientes (id, nombre, email, password_hash, cedula_ruc, telefono, direccion, rol, estado, created_at, updated_at)
        SELECT 
            id,
            COALESCE(nombre, split_part(email, '@', 1)),
            email,
            password_hash,
            cedula_ruc,
            telefono,
            direccion,
            CASE 
                WHEN UPPER(COALESCE(rol, '')) IN ('ADMIN', 'ADMINISTRADOR') THEN 'ADMIN'
                WHEN UPPER(COALESCE(rol, '')) IN ('MANTENIMIENTO', 'MAINTENANCE') THEN 'MANTENIMIENTO'
                ELSE 'CLIENTE'
            END,
            CASE 
                WHEN UPPER(COALESCE(estado, '')) IN ('ACTIVO', 'ACTIVE', 'ENABLED') THEN 'ACTIVO'
                WHEN UPPER(COALESCE(estado, '')) IN ('SUSPENDIDO', 'SUSPENDED') THEN 'SUSPENDIDO'
                WHEN UPPER(COALESCE(estado, '')) IN ('INACTIVO', 'INACTIVE', 'DISABLED') THEN 'INACTIVO'
                ELSE 'ACTIVO'
            END,
            created_at,
            updated_at
        FROM public.usuarios
        ON CONFLICT (email) DO NOTHING;
        
        RAISE NOTICE '✅ Usuarios migrados con éxito a schema_clientes.clientes';
    END IF;
END $$;

-- ============================================================================
-- PASO 2: MIGRAR ALOJAMIENTOS DE public.alojamientos -> schema_alojamientos.alojamientos_catalogo
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alojamientos') THEN
        INSERT INTO schema_alojamientos.alojamientos_catalogo (
            id, nombre, descripcion, tipo_propiedad, ciudad, pais, precio_noche_base, moneda, amenidades, rating_general, activo, created_at
        )
        SELECT 
            id,
            nombre,
            descripcion,
            COALESCE(tipo_propiedad, 'Hotel'),
            COALESCE(destino, 'Quito'),
            'Ecuador',
            COALESCE(precio_noche, 85.00),
            COALESCE(moneda, 'USD'),
            amenidades,
            CASE 
                WHEN ratings->>'general' ~ '^[0-9]+(\.[0-9]+)?$' THEN (ratings->>'general')::numeric 
                ELSE 9.2 
            END,
            CASE WHEN LOWER(COALESCE(estado, '')) IN ('activo', 'active') THEN true ELSE false END,
            COALESCE(creado_en, NOW())
        FROM public.alojamientos
        ON CONFLICT (id) DO NOTHING;

        RAISE NOTICE '✅ Alojamientos migrados con éxito a schema_alojamientos.alojamientos_catalogo';
    END IF;
END $$;

-- ============================================================================
-- PASO 3: POBLAR CATEGORÍAS RECURSIVAS INICIALES DE ATRACCIONES (MANDATO CÁTEDRA §6)
-- Con banderas de inclusión: incluye_comida, incluye_transporte, incluye_guia
-- ============================================================================
INSERT INTO schema_atracciones.atracciones_categorias_recursivas 
(id, nombre, slug, descripcion, parent_id, nivel_profundidad, incluye_comida, incluye_transporte, incluye_guia)
VALUES 
    ('a0000001-0000-0000-0000-000000000001', 'Tours y Experiencias', 'tours-experiencias', 'Recorridos turísticos y actividades guiadas', NULL, 0, false, true, true),
    ('a0000001-0000-0000-0000-000000000002', 'Museos y Cultura', 'museos-cultura', 'Visitas patrimoniales, galerías y sitios históricos', NULL, 0, false, false, true),
    ('a0000001-0000-0000-0000-000000000003', 'Naturaleza y Aire Libre', 'naturaleza-aire-libre', 'Excursiones a volcanes, reservas naturales y senderismo', NULL, 0, true, true, true),
    -- Subcategorías hijas (recursividad)
    ('a0000002-0000-0000-0000-000000000001', 'Tours Gastronómicos', 'tours-gastronomicos', 'Rutas de comida típica, mercados y degustación de chocolate fino de aroma', 'a0000001-0000-0000-0000-000000000001', 1, true, true, true),
    ('a0000002-0000-0000-0000-000000000002', 'Tours Históricos a Pie', 'tours-historicos-pie', 'Centro Histórico de Quito y leyendas coloniales', 'a0000001-0000-0000-0000-000000000001', 1, false, false, true),
    ('a0000002-0000-0000-0000-000000000003', 'Excursiones a Volcanes', 'excursiones-volcanes', 'Cotopaxi, Quilotoa y Pichincha con transporte 4x4', 'a0000001-0000-0000-0000-000000000003', 1, true, true, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- PASO 4: POBLAR ATRACCIÓN OFICIAL DE MUESTRA (DESCOBRE EC - DILAN MENDOZA)
-- Alineada 100% con contracts/atracciones-openapi-v2.yaml
-- ============================================================================
INSERT INTO schema_atracciones.atracciones_items (
    id, nombre, slug, ciudad, pais, descripcion_corta, descripcion_larga, duracion_estimada,
    categoria_id, precio_unitario_adulto, moneda, cancelacion_gratis, adicion_animales_servicio,
    accesible_silla_ruedas, idiomas_soportados, punto_encuentro, latitud, longitud,
    fotos_urls, itinerario_cronologico, rating_general, reviews_count, rating_limpieza, rating_servicio, rating_calidad
) VALUES (
    'PRhu4UBTWPBC',
    'Tour Panorámico por Quito Colonial y Mirador del Panecillo',
    'tour-panoramico-quito-colonial-mirador-panecillo',
    'Quito',
    'Ecuador',
    'Descubre las joyas del Centro Histórico más grande de Sudamérica con guía certificado y transporte panorámico.',
    'Embárcate en una experiencia inolvidable recorriendo la Basílica del Voto Nacional, la Plaza Grande, la Iglesia de la Compañía y culminando en la majestuosa Virgen del Panecillo con vista 360 de los Andes.',
    'PT3H30M',
    'a0000002-0000-0000-0000-000000000002',
    55.00,
    'USD',
    true,
    true,
    false,
    ARRAY['es', 'en'],
    'Boulevard Naciones Unidas y Av. Shyris (Frente al Parque La Carolina)',
    -0.180653,
    -78.485123,
    ARRAY[
        'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=800',
        'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=800'
    ],
    '[
        {"time": "09:00 a.m.", "title": "Punto de Encuentro", "description": "Recepción y asignación de audioguías", "duration_minutes": 15},
        {"time": "09:40 a.m.", "title": "Basílica del Voto Nacional", "description": "Visita exterior de las gárgolas de fauna andina", "duration_minutes": 30},
        {"time": "10:30 a.m.", "title": "Plaza de San Francisco y La Compañía", "description": "Recorrido por templos barrocos coloniales", "duration_minutes": 60},
        {"time": "11:45 a.m.", "title": "Mirador de El Panecillo", "description": "Vista panorámica y degustación de chocolate caliente", "duration_minutes": 45}
    ]'::jsonb,
    9.8,
    142,
    9.9,
    9.8,
    9.6
) ON CONFLICT (id) DO NOTHING;

-- Turnos horarios iniciales (Time Slots con aforo)
INSERT INTO schema_atracciones.atracciones_turnos_aforo 
(id, atraccion_id, fecha, hora_inicio, hora_fin, capacidad_total, cupos_disponibles, estado)
VALUES
    ('b0000001-0000-0000-0000-000000000001', 'PRhu4UBTWPBC', CURRENT_DATE, '09:00 a.m.', '12:30 p.m.', 20, 18, 'DISPONIBLE'),
    ('b0000001-0000-0000-0000-000000000002', 'PRhu4UBTWPBC', CURRENT_DATE, '02:00 p.m.', '05:30 p.m.', 20, 14, 'DISPONIBLE'),
    ('b0000001-0000-0000-0000-000000000003', 'PRhu4UBTWPBC', CURRENT_DATE + 1, '10:30 a.m.', '02:00 p.m.', 20, 20, 'DISPONIBLE')
ON CONFLICT (atraccion_id, fecha, hora_inicio) DO NOTHING;

-- Contrato inicial de promociones B2B de atracciones (§9 Consideraciones)
INSERT INTO schema_paquetes.contrato_promociones (
    proveedor_codigo, proveedor_vertical, permite_promociones, descuento_maximo_permitido, cuestionario_respuestas
) VALUES (
    'DESCUBRE_EC',
    'ATRACCIONES',
    true,
    15.00,
    '{"acuerdo_firmado": true, "permite_combos_hoteles": true, "permite_combos_vuelos": true, "tope_descuento_temporada_alta": 10.00}'::jsonb
) ON CONFLICT (proveedor_codigo) DO NOTHING;

-- Proveedor oficial registrado en el monitor de nodos
INSERT INTO schema_proveedores.config_proveedor (
    codigo_nodo, nombre_proveedor, vertical, base_url_rest, endpoint_grpc, health_status, latencia_ms, kill_switch_activo
) VALUES (
    'NODE_ATR_DILAN',
    'Descubre EC — Dilan Mendoza',
    'ATRACCIONES',
    'http://localhost:3000/api/v2/atracciones',
    'localhost:50051',
    'HEALTHY',
    12,
    false
) ON CONFLICT (codigo_nodo) DO NOTHING;

-- ============================================================================
-- PASO 5: DEPURACIÓN FINAL DEL ESQUEMA PUBLIC (EJECUTAR DESPUÉS DE VALIDAR)
-- Una vez que el backend esté apuntando a los 12 esquemas, se recomienda 
-- eliminar las tablas huérfanas de 'public' para evitar confusión y cumplir
-- al 100% el Aislamiento de Persistencia exigido en la Rúbrica RDA2 (CE02).
-- ============================================================================

/*
-- Descomenta este bloque cuando desees purgar definitivamente el esquema public:

DROP TABLE IF EXISTS public.carrito_items CASCADE;
DROP TABLE IF EXISTS public.carritos CASCADE;
DROP TABLE IF EXISTS public.factura_items CASCADE;
DROP TABLE IF EXISTS public.facturas CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.api_request_logs CASCADE;
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.panel_audit_logs CASCADE;
DROP TABLE IF EXISTS public.estado_servicios CASCADE;
DROP TABLE IF EXISTS public.configuraciones CASCADE;
DROP TABLE IF EXISTS public.admin_config CASCADE;
DROP TABLE IF EXISTS public.panel_config CASCADE;
DROP TABLE IF EXISTS public.admin_liquidaciones CASCADE;
DROP TABLE IF EXISTS public.liquidaciones CASCADE;
DROP TABLE IF EXISTS public.panel_liquidaciones CASCADE;
DROP TABLE IF EXISTS public.panel_solicitudes_proveedor CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.atracciones CASCADE;
DROP TABLE IF EXISTS public.reservas_atraccion CASCADE;
DROP TABLE IF EXISTS public.alojamientos CASCADE;
DROP TABLE IF EXISTS public.reservas_alojamiento CASCADE;
DROP TABLE IF EXISTS public.resenas_alojamiento CASCADE;
DROP TABLE IF EXISTS public.tipos_habitacion CASCADE;
DROP TABLE IF EXISTS public.huespedes_reserva CASCADE;
DROP TABLE IF EXISTS public.proveedores_alojamiento CASCADE;
DROP TABLE IF EXISTS public.aerolinea CASCADE;
DROP TABLE IF EXISTS public.vuelo CASCADE;
DROP TABLE IF EXISTS public.asiento_vuelo CASCADE;
DROP TABLE IF EXISTS public.oferta CASCADE;
DROP TABLE IF EXISTS public.oferta_itinerario CASCADE;
DROP TABLE IF EXISTS public.oferta_segmento CASCADE;
DROP TABLE IF EXISTS public.tarifa_cabina CASCADE;
DROP TABLE IF EXISTS public.tarifa_equipaje CASCADE;
DROP TABLE IF EXISTS public.tarifa_precio_pasajero CASCADE;
DROP TABLE IF EXISTS public.bloqueo_cupo CASCADE;
DROP TABLE IF EXISTS public.bloqueo_itinerario CASCADE;
*/
