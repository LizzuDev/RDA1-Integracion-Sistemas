-- ============================================================================
-- SCRIPT DE MIGRACIÓN: MÓDULO DE ATRACCIONES V2 (RETO 2 - RDA2)
-- Arquitectura: Database-per-Service (Esquema Aislado e Independiente)
-- Estándar: Categorías Recursivas, Turnos Horarios (Aforo Dinámico) y Check-in
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS atracciones_schema;
SET search_path TO atracciones_schema, public;

-- 1. TABLA JERÁRQUICA RECURSIVA DE CATEGORÍAS (ÁRBOL CON BANDERAS DE INCLUSIÓN)
CREATE TABLE IF NOT EXISTS atracciones_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(120) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    descripcion TEXT,
    categoria_padre_id UUID REFERENCES atracciones_categorias(id) ON DELETE SET NULL,
    incluye_comida BOOLEAN DEFAULT FALSE,
    incluye_transporte BOOLEAN DEFAULT FALSE,
    incluye_guia BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE CATÁLOGO DE ATRACCIONES Y EXPERIENCIAS
CREATE TABLE IF NOT EXISTS atracciones_items (
    id VARCHAR(50) PRIMARY KEY, -- Soporta IDs alfanuméricos tipo Booking ('PRhu4UBTWPBC') o UUID
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    descripcion_corta TEXT,
    descripcion_larga TEXT,
    duracion_estimada VARCHAR(50) DEFAULT 'PT3H', -- Formato ISO 8601 o texto
    categoria_id UUID REFERENCES atracciones_categorias(id) ON DELETE SET NULL,
    precio_base NUMERIC(10, 2) NOT NULL DEFAULT 55.00,
    moneda VARCHAR(3) DEFAULT 'USD',
    cancelacion_gratis BOOLEAN DEFAULT TRUE,
    adicion_animales_servicio BOOLEAN DEFAULT TRUE,
    accesible_silla_ruedas BOOLEAN DEFAULT FALSE,
    idiomas_soportados TEXT[] DEFAULT ARRAY['es', 'en'],
    punto_encuentro VARCHAR(255) DEFAULT 'Boulevard Naciones Unidas, Quito',
    latitud NUMERIC(10, 7) DEFAULT -0.220164,
    longitud NUMERIC(10, 7) DEFAULT -78.512327,
    fotos_urls TEXT[] DEFAULT ARRAY['https://picsum.photos/seed/quito/800/600'],
    rating_general NUMERIC(3, 1) DEFAULT 9.8,
    reviews_count INT DEFAULT 142,
    rating_limpieza NUMERIC(3, 1) DEFAULT 9.9,
    rating_servicio NUMERIC(3, 1) DEFAULT 9.8,
    rating_calidad NUMERIC(3, 1) DEFAULT 9.6,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE TURNOS HORARIOS Y AFORO DIARIO (TIME SLOTS)
CREATE TABLE IF NOT EXISTS atracciones_turnos_aforo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atraccion_id VARCHAR(50) REFERENCES atracciones_items(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME,
    capacidad_total INT NOT NULL DEFAULT 20,
    cupos_disponibles INT NOT NULL DEFAULT 20,
    estado VARCHAR(20) DEFAULT 'DISPONIBLE', -- 'DISPONIBLE', 'ULTIMOS_CUPOS', 'AGOTADO'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_atraccion_fecha_hora UNIQUE (atraccion_id, fecha, hora_inicio)
);

-- 4. TABLA DE RESERVAS DE ATRACCIONES CON DESGLOSE POR GRUPO DE EDAD
CREATE TABLE IF NOT EXISTS atracciones_reservas (
    id VARCHAR(64) PRIMARY KEY, -- Idempotency-Key UUID o Localizador
    atraccion_id VARCHAR(50) REFERENCES atracciones_items(id),
    turno_id UUID REFERENCES atracciones_turnos_aforo(id),
    fecha_uso DATE NOT NULL,
    hora_inicio VARCHAR(20) NOT NULL,
    adult_count INT NOT NULL DEFAULT 1,
    child_count INT NOT NULL DEFAULT 0,
    infant_count INT NOT NULL DEFAULT 0,
    ticket_count INT NOT NULL,
    precio_total NUMERIC(10, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'USD',
    estado VARCHAR(30) DEFAULT 'CONFIRMED', -- 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED'
    
    -- Datos del comprador
    cliente_nombre VARCHAR(150) NOT NULL,
    cliente_email VARCHAR(150) NOT NULL,
    cliente_telefono VARCHAR(50),
    cliente_documento VARCHAR(50) NOT NULL,
    requerimientos_especiales TEXT,
    
    -- Datos de Check-in y Voucher
    guia_asignado VARCHAR(150),
    voucher_qr_hash TEXT,
    checkin_completado_at TIMESTAMP WITH TIME ZONE,
    
    idempotency_key VARCHAR(64) UNIQUE,
    correlation_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SEED DATA INICIAL
-- ============================================================================

-- Categorías Padre
INSERT INTO atracciones_categorias (id, nombre, slug, descripcion, incluye_guia, incluye_transporte)
VALUES 
('c1000000-0000-0000-0000-000000000001', 'Tours y Experiencias', 'tours-experiencias', 'Visitas guiadas y recorridos temáticos', true, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO atracciones_categorias (id, nombre, slug, descripcion, incluye_guia, incluye_transporte)
VALUES 
('c2000000-0000-0000-0000-000000000002', 'Museos y Cultura', 'museos-cultura', 'Recintos históricos y monumentos coloniales', false, false)
ON CONFLICT (slug) DO NOTHING;

-- Subcategorías Hijas (Recursivas)
INSERT INTO atracciones_categorias (id, nombre, slug, descripcion, categoria_padre_id, incluye_comida, incluye_guia)
VALUES 
('c1100000-0000-0000-0000-000000000001', 'Tours Gastronómicos y Catas de Cacao', 'tours-gastronomicos', 'Catas de chocolate fino de aroma y gastronomía típica', 'c1000000-0000-0000-0000-000000000001', true, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO atracciones_categorias (id, nombre, slug, descripcion, categoria_padre_id, incluye_guia)
VALUES 
('c1200000-0000-0000-0000-000000000002', 'Tours Históricos a Pie (Casco Antiguo)', 'tours-historicos-pie', 'Caminatas guiadas por iglesias y plazas patrimoniales', 'c1000000-0000-0000-0000-000000000001', false, true)
ON CONFLICT (slug) DO NOTHING;

-- Atracción Principal
INSERT INTO atracciones_items (
    id, nombre, slug, descripcion_corta, descripcion_larga, duracion_estimada, categoria_id, precio_base, cancelacion_gratis
) VALUES (
    'PRhu4UBTWPBC',
    'Quito Old Town Tour con Degustación de Cacao Fino',
    'quito-old-town-tour-cacao',
    'Recorrido a pie por iglesias coloniales, cata de chocolates de origen y mirador El Panecillo.',
    'Descubre la magia del primer Patrimonio Cultural de la Humanidad con guías oficiales certificados. Incluye recorrido por iglesias coloniales, cata de chocolates finos de aroma y mirador panorámico.',
    'PT3H',
    'c1100000-0000-0000-0000-000000000001',
    55.00,
    true
) ON CONFLICT (id) DO NOTHING;
