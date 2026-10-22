-- ============================================================================
-- SCRIPT DE MIGRACIÓN: MÓDULO DE RENTA DE AUTOS V2 (RETO 2 - RDA2)
-- Arquitectura: Database-per-Service (Esquema Aislado e Independiente)
-- Reglas de Cátedra: Máquina de Estados (Cooldown 2 Horas) y Rol de Mantenimiento
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS autos_schema;
SET search_path TO autos_schema, public;

-- 1. TABLA DE FLOTA DE VEHÍCULOS
CREATE TABLE IF NOT EXISTS autos_vehiculos (
    id VARCHAR(50) PRIMARY KEY, -- Soporta UUID o identificador de flota (ej. 'auto-spark-01')
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL, -- 'ECONOMICO', 'COMPACTO', 'FAMILIAR', 'SUV', 'PREMIUM'
    tipo_carroceria VARCHAR(50) DEFAULT 'SEDAN',
    transmision VARCHAR(20) NOT NULL DEFAULT 'MANUAL', -- 'MANUAL', 'AUTOMATICO'
    combustible VARCHAR(30) DEFAULT 'GASOLINA', -- 'GASOLINA', 'DIESEL', 'HIBRIDO', 'ELECTRICO'
    politica_combustible VARCHAR(50) DEFAULT 'LLENO_A_LLENO',
    kilometraje_ilimitado BOOLEAN DEFAULT TRUE,
    aire_acondicionado BOOLEAN DEFAULT TRUE,
    puertas INT DEFAULT 4,
    asientos INT DEFAULT 5,
    capacidad_maletas_grandes INT DEFAULT 1,
    capacidad_maletas_pequenas INT DEFAULT 1,
    precio_diario NUMERIC(10, 2) NOT NULL DEFAULT 35.50,
    moneda VARCHAR(3) DEFAULT 'USD',
    proveedor_id INT DEFAULT 1,
    proveedor_nombre VARCHAR(100) DEFAULT 'Europcar',
    ubicacion_mostrador VARCHAR(255) DEFAULT 'Aeropuerto Internacional Mariscal Sucre (Terminal Llegadas)',
    foto_url TEXT DEFAULT 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600',
    
    -- MÁQUINA DE ESTADOS Y COOLDOWN DE 2 HORAS (Consideraciones RDA2 §5)
    estado VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE', -- 'DISPONIBLE', 'RESERVADO', 'ENTREGADO', 'EN_LIMPIEZA'
    disponible_desde TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- GESTIÓN DE MANTENIMIENTO PREVENTIVO (Consideraciones RDA2 §5)
    kilometraje_actual INT NOT NULL DEFAULT 5200,
    proximo_mantenimiento_km INT NOT NULL DEFAULT 10000,
    mantenimiento_requerido BOOLEAN DEFAULT FALSE,
    nivel_combustible_actual INT DEFAULT 100, -- porcentaje 0 a 100
    
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE ÓRDENES Y RESERVAS DE AUTOS
CREATE TABLE IF NOT EXISTS autos_reservas (
    id VARCHAR(64) PRIMARY KEY, -- Idempotency-Key UUID o Localizador PNR
    auto_id VARCHAR(50) REFERENCES autos_vehiculos(id),
    fecha_recogida DATE NOT NULL,
    hora_recogida TIME NOT NULL,
    fecha_devolucion DATE NOT NULL,
    hora_devolucion TIME NOT NULL,
    lugar_recogida VARCHAR(255) NOT NULL,
    lugar_devolucion VARCHAR(255) NOT NULL,
    dias_renta INT NOT NULL DEFAULT 3,
    
    -- Coberturas
    tipo_cobertura VARCHAR(50) NOT NULL DEFAULT 'BASICA', -- 'BASICA' (con franquicia) o 'TOTAL' (sin franquicia)
    precio_diario NUMERIC(10, 2) NOT NULL,
    costo_cobertura_diaria NUMERIC(10, 2) DEFAULT 0.00,
    deposito_garantia NUMERIC(10, 2) DEFAULT 1200.00,
    precio_total NUMERIC(10, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'USD',
    estado VARCHAR(30) DEFAULT 'CONFIRMED', -- 'PENDING', 'CONFIRMED', 'DELIVERED', 'COMPLETED', 'CANCELLED'
    
    -- Conductor
    conductor_nombre VARCHAR(150) NOT NULL,
    conductor_email VARCHAR(150) NOT NULL,
    conductor_telefono VARCHAR(50) NOT NULL,
    conductor_licencia VARCHAR(50) NOT NULL,
    conductor_pais_licencia VARCHAR(50) DEFAULT 'Ecuador',
    conductor_edad INT DEFAULT 30,
    numero_vuelo VARCHAR(20),
    
    idempotency_key VARCHAR(64) UNIQUE,
    correlation_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. BITÁCORA DE MANTENIMIENTO TÉCNICO (ROL TÉCNICO)
CREATE TABLE IF NOT EXISTS autos_mantenimiento_bitacora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auto_id VARCHAR(50) REFERENCES autos_vehiculos(id) ON DELETE CASCADE,
    tecnico_id VARCHAR(100) NOT NULL,
    kilometraje_registrado INT NOT NULL,
    nivel_combustible INT NOT NULL, -- 0-100%
    condiciones_carroceria TEXT,
    estado_neumaticos VARCHAR(50) DEFAULT 'BUENO',
    observaciones TEXT,
    mantenimiento_realizado BOOLEAN DEFAULT FALSE,
    proximo_mantenimiento_km INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SEED DATA DE FLOTA INICIAL
-- ============================================================================
INSERT INTO autos_vehiculos (
    id, marca, modelo, categoria, transmision, precio_diario, proveedor_nombre, estado, kilometraje_actual, proximo_mantenimiento_km
) VALUES 
('auto-spark-01', 'Chevrolet', 'Spark GT', 'ECONOMICO', 'MANUAL', 35.50, 'Europcar', 'DISPONIBLE', 4500, 10000),
('auto-rio-02', 'Kia', 'Rio Sedán', 'COMPACTO', 'AUTOMATICO', 42.00, 'Alamo', 'DISPONIBLE', 8900, 10000),
('auto-tracker-03', 'Chevrolet', 'Tracker Turbo', 'SUV', 'AUTOMATICO', 58.00, 'Enterprise', 'DISPONIBLE', 3200, 10000),
('auto-rav4-04', 'Toyota', 'RAV4 4x4', 'SUV', 'AUTOMATICO', 68.00, 'Hertz', 'DISPONIBLE', 9800, 10000),
('auto-corolla-05', 'Toyota', 'Corolla Híbrido', 'FAMILIAR', 'AUTOMATICO', 52.00, 'Avis', 'DISPONIBLE', 6100, 10000)
ON CONFLICT (id) DO NOTHING;
