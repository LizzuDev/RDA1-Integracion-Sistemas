-- =====================================================
-- RDA2 - Esquema de Datos (DDL) - Implementación Completa
-- Prohibido compartir tablas entre microservicios (BD independiente)
-- Auditoría en archivos logs (NO en BD)
-- =====================================================

-- NODOS SISTEMA
CREATE TABLE IF NOT EXISTS nodos_sistema (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_code VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  url_base VARCHAR(500) NOT NULL UNIQUE,
  tipo_origen VARCHAR(20) NOT NULL CHECK (tipo_origen IN ('interno','partner','tercero')),
  estado_conexion VARCHAR(20) NOT NULL DEFAULT 'desconocido' CHECK (estado_conexion IN ('conectado','desconectado','mantenimiento','error','desconocido')),
  estado_operativo VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado_operativo IN ('activo','inactivo','bloqueado')),
  grpc_endpoint VARCHAR(500),
  health_check_url VARCHAR(500),
  ultimo_heartbeat TIMESTAMPTZ,
  heartbeat_interval_ms INT NOT NULL DEFAULT 30000,
  timeout_ms INT NOT NULL DEFAULT 5000,
  latencia_ms INT,
  intentos_fallidos INT NOT NULL DEFAULT 0,
  umbral_fallos INT NOT NULL DEFAULT 3,
  version_conector VARCHAR(20),
  capabilities JSONB,
  config JSONB,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- CHECKIN UNIFICADO
CREATE TABLE IF NOT EXISTS checkins (
  checkin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_checkin VARCHAR(20) NOT NULL CHECK (tipo_checkin IN ('alojamiento','atraccion','vuelo','auto')),
  reserva_id UUID NOT NULL,
  recurso_id UUID NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_proceso','completado','cancelado','rechazado')),
  fecha_hora_prevista TIMESTAMPTZ,
  fecha_hora_checkin TIMESTAMPTZ,
  ubicacion VARCHAR(150),
  responsable_id UUID,
  documentacion_validada BOOLEAN NOT NULL DEFAULT FALSE,
  observaciones TEXT,
  evidencias JSONB,
  node_id UUID REFERENCES nodos_sistema(node_id),
  correlation_id UUID,
  trace_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FLOTA AUTOS
CREATE TABLE IF NOT EXISTS flota_autos (
  auto_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa VARCHAR(20) NOT NULL UNIQUE,
  marca VARCHAR(80) NOT NULL,
  modelo VARCHAR(80) NOT NULL,
  anio INT NOT NULL,
  km_actual DECIMAL(12,1) NOT NULL DEFAULT 0,
  km_ultima_revision DECIMAL(12,1),
  tipo_servicio VARCHAR(20) NOT NULL DEFAULT 'renta' CHECK (tipo_servicio IN ('renta','turismo','utilitario')),
  estado_fisico VARCHAR(20) NOT NULL DEFAULT 'disponible' CHECK (estado_fisico IN ('disponible','en_renta','en_mant','fuera_servicio','robado','desguace')),
  proximo_mantenimiento_km DECIMAL(12,1),
  alerta_km_config DECIMAL(12,1),
  margen_alerta_km DECIMAL(12,1) DEFAULT 500,
  requiere_mantenimiento BOOLEAN NOT NULL DEFAULT FALSE,
  ultima_orden_mto_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID
);

-- AUTO PREPARACION (2 HORAS)
CREATE TABLE IF NOT EXISTS auto_preparacion (
  prep_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_id UUID NOT NULL,
  reserva_devolucion_id UUID,
  estado_prep VARCHAR(20) NOT NULL DEFAULT 'en_limpieza' CHECK (estado_prep IN ('en_limpieza','esperando_2h','listo','omitido')),
  fecha_hora_devolucion TIMESTAMPTZ,
  fecha_hora_inicio_limpieza TIMESTAMPTZ,
  fecha_hora_fin_limpieza TIMESTAMPTZ,
  fecha_hora_inicio_espera2h TIMESTAMPTZ,
  fecha_hora_disponible_min TIMESTAMPTZ,
  fecha_hora_liberado TIMESTAMPTZ,
  forzado_antes_tiempo BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_forzado TEXT,
  autorizado_por_id UUID,
  checklist_limpieza JSONB,
  checklist_inspeccion JSONB,
  correlation_id UUID,
  trace_id UUID,
  node_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INGRESO MANTENIMIENTO
CREATE TABLE IF NOT EXISTS ingreso_mantenimiento (
  ingreso_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_id UUID NOT NULL,
  orden_mto_id UUID,
  fecha_hora_ingreso TIMESTAMPTZ NOT NULL,
  ingresado_por_id UUID NOT NULL,
  km_ingreso DECIMAL(12,1) NOT NULL,
  nivel_combustible VARCHAR(20) CHECK (nivel_combustible IN ('vacio','1/4','1/2','3/4','lleno')),
  caracteristicas_llegada TEXT NOT NULL,
  danios_reportados JSONB,
  partes_afectadas JSONB,
  observaciones_tecnico TEXT,
  evidencias JSONB,
  tiene_averia BOOLEAN NOT NULL DEFAULT FALSE,
  prioridad VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja','media','alta','critica')),
  node_id UUID,
  correlation_id UUID,
  trace_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- HISTORIAL KILOMETRAJE
CREATE TABLE IF NOT EXISTS historial_kilometraje (
  hist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_id UUID NOT NULL,
  km_anterior DECIMAL(12,1) NOT NULL,
  km_nuevo DECIMAL(12,1) NOT NULL,
  motivo VARCHAR(30) NOT NULL CHECK (motivo IN ('salida','ingreso_mto','devolucion','lectura_tecnica','ajuste_autorizado')),
  origen VARCHAR(20) NOT NULL DEFAULT 'sistema' CHECK (origen IN ('sistema','operador','tecnico')),
  registrado_por_id UUID NOT NULL,
  justificacion TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  correlation_id UUID,
  trace_id UUID,
  node_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ALERTAS MANTENIMIENTO
CREATE TABLE IF NOT EXISTS alertas_mantenimiento (
  alerta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_id UUID NOT NULL,
  tipo_alerta VARCHAR(30) NOT NULL CHECK (tipo_alerta IN ('km_umbral','tiempo','vencimiento','revision_critica','averia')),
  severidad VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (severidad IN ('info','warning','critical')),
  km_actual DECIMAL(12,1),
  km_umbral_config DECIMAL(12,1),
  mensaje TEXT NOT NULL,
  estado_alerta VARCHAR(20) NOT NULL DEFAULT 'activa' CHECK (estado_alerta IN ('activa','leida','atendida','cerrada')),
  fecha_generacion TIMESTAMPTZ NOT NULL,
  atendida_por_id UUID,
  fecha_atencion TIMESTAMPTZ,
  correlation_id UUID,
  trace_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CATEGORIA ATRACCION (RECURSIVA)
CREATE TABLE IF NOT EXISTS categoria_atraccion (
  categoria_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  padre_id UUID REFERENCES categoria_atraccion(categoria_id) ON DELETE CASCADE,
  nivel INT NOT NULL DEFAULT 0,
  ruta_categoria VARCHAR(500),
  incluye_comida BOOLEAN NOT NULL DEFAULT FALSE,
  incluye_transporte BOOLEAN NOT NULL DEFAULT FALSE,
  incluye_guia BOOLEAN NOT NULL DEFAULT FALSE,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  orden INT NOT NULL DEFAULT 0,
  metadatos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- PROMOCIONES/PAQUETES
CREATE TABLE IF NOT EXISTS contrato_promociones (
  contrato_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  acepta_promociones BOOLEAN NOT NULL DEFAULT FALSE,
  pct_max_descuento DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (pct_max_descuento >= 0 AND pct_max_descuento <= 100),
  fecha_aceptacion TIMESTAMPTZ NOT NULL,
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  usuario_acepta_id UUID NOT NULL,
  observaciones TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS paquete (
  paquete_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_paquete VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  tipo_paquete VARCHAR(20) NOT NULL DEFAULT 'predefinido' CHECK (tipo_paquete IN ('flexible','predefinido','personalizado')),
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','activo','inactivo','expirado','anulado')),
  partner_id UUID,
  precio_base_total DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (precio_base_total >= 0),
  precio_paquete DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (precio_paquete >= 0),
  pct_descuento_aplicado DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (pct_descuento_aplicado >= 0 AND pct_descuento_aplicado <= 100),
  ahorro_total DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (ahorro_total >= 0),
  moneda CHAR(3) NOT NULL DEFAULT 'USD',
  valido_desde TIMESTAMPTZ,
  valido_hasta TIMESTAMPTZ,
  requiere_contrato_vigente BOOLEAN NOT NULL DEFAULT TRUE,
  search_criteria JSONB,
  configuracion JSONB,
  node_id UUID,
  correlation_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS paquete_items (
  paquete_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paquete_id UUID NOT NULL REFERENCES paquete(paquete_id) ON DELETE CASCADE,
  tipo_recurso VARCHAR(20) NOT NULL CHECK (tipo_recurso IN ('auto','vuelo','atraccion','alojamiento')),
  recurso_id UUID NOT NULL,
  codigo_recurso VARCHAR(50),
  nombre_recurso VARCHAR(150) NOT NULL,
  cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad >= 1),
  precio_unitario_base DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (precio_unitario_base >= 0),
  precio_unitario_pkg DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (precio_unitario_pkg >= 0),
  es_obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
  orden INT NOT NULL DEFAULT 0,
  detalles JSONB,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paquete_versiones (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paquete_id UUID NOT NULL,
  numero_version INT NOT NULL,
  payload_paquete JSONB NOT NULL,
  motivo_cambio VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  correlation_id UUID
);

-- SAGAS
CREATE TABLE IF NOT EXISTS saga_instance (
  saga_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_type VARCHAR(30) NOT NULL CHECK (saga_type IN ('checkout_pago','armado_paquete','reserva_completa','cancelacion')),
  estado VARCHAR(20) NOT NULL DEFAULT 'iniciada' CHECK (estado IN ('iniciada','en_progreso','completada','compensando','compensada','fallida','abortada')),
  correlation_id UUID NOT NULL,
  paso_actual INT NOT NULL DEFAULT 0,
  payload JSONB,
  error JSONB,
  timeout_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  node_id UUID
);

CREATE TABLE IF NOT EXISTS saga_step (
  step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_id UUID NOT NULL,
  orden INT NOT NULL,
  accion VARCHAR(100) NOT NULL,
  accion_tipo VARCHAR(20) NOT NULL DEFAULT 'forward' CHECK (accion_tipo IN ('forward','compensate')),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','ejecutando','exitoso','fallido','omitido')),
  resultado JSONB,
  error JSONB,
  intentos INT NOT NULL DEFAULT 0,
  executed_at TIMESTAMPTZ,
  correlation_id UUID,
  trace_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EMERGENCIA/VIDEOVIGILANCIA
CREATE TABLE IF NOT EXISTS alerta_auxilio_bus (
  alerta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL,
  placa VARCHAR(20) NOT NULL,
  linea VARCHAR(50),
  ruta VARCHAR(150),
  latitud DECIMAL(9,6) NOT NULL,
  longitud DECIMAL(9,6) NOT NULL,
  velocidad_kmh DECIMAL(5,2),
  timestamp_activacion TIMESTAMPTZ NOT NULL,
  camaras_vinculadas JSONB,
  video_clip_id UUID,
  estado_alerta VARCHAR(30) NOT NULL DEFAULT 'abierta' CHECK (estado_alerta IN ('abierta','asignada','en_desplazamiento','atendida','cerrada','falsa_alarma')),
  autoridades_notificadas JSONB,
  revisor_humano_id UUID,
  clasificacion VARCHAR(30) CHECK (clasificacion IN ('verdadera','falsa_alarma','prueba','requiere_investigacion')),
  justificacion_clasificacion TEXT,
  risk_score INT,
  correlation_id UUID,
  trace_id UUID,
  node_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ÍNDICES (Optimización)
CREATE INDEX IF NOT EXISTS idx_nodos_estado ON nodos_sistema(estado_conexion, estado_operativo, activo);
CREATE INDEX IF NOT EXISTS idx_nodos_heartbeat ON nodos_sistema(ultimo_heartbeat);
CREATE INDEX IF NOT EXISTS idx_checkin_tipo_estado ON checkins(tipo_checkin, estado);
CREATE INDEX IF NOT EXISTS idx_flota_estado ON flota_autos(estado_fisico, requiere_mantenimiento);
CREATE INDEX IF NOT EXISTS idx_prep_estado_fecha ON auto_preparacion(estado_prep, fecha_hora_disponible_min);
CREATE INDEX IF NOT EXISTS idx_km_auto ON historial_kilometraje(auto_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_categoria_padre ON categoria_atraccion(padre_id, activa);
CREATE INDEX IF NOT EXISTS idx_paquete_estado ON paquete(estado, valido_desde, valido_hasta);
CREATE INDEX IF NOT EXISTS idx_saga_estado ON saga_instance(estado, started_at);
CREATE INDEX IF NOT EXISTS idx_alerta_estado ON alerta_auxilio_bus(estado_alerta, timestamp_activacion);
EOF
echo "ok"