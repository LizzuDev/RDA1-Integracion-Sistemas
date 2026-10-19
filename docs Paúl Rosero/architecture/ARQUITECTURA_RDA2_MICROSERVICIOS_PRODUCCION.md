# Arquitectura Distribuida de Microservicios — Booking Prototipo (RDA2)

> **Asignatura:** Integración de Sistemas — 6to Semestre  
> **Sistema:** Booking Prototipo (Plataforma Central Integradora)  
> **Documento:** Blueprint Maestro de Arquitectura y Persistencia por Esquemas  
> **Responsable:** Paúl Rosero (Líder Técnico)  
> **Estado:** Documento Maestro Completo y Cerrado — Capas 1 a 7 Formalizadas y Auditadas (Persistencia, Microservicios, ESB, Event Bus, Orquestación JWT, GraphQL BFF y Presentación)

---

## 1. Filosofía Arquitectónica y Principios Rectores

Este documento formaliza y preserva la arquitectura técnica del **Booking Prototipo** para el Reto 2 (RDA2), traduciendo fielmente el diseño de la pizarra docente (`teoria/Arquitectura a realizar RDA2.jpeg`), las directrices de clase (`teoria/Consideraciones RDA2.md`), la rúbrica de evaluación (`teoria/Rúbrica RDA2.md`) y el código existente de `plantilla inicial`.

### Principios Fundamentales Inviolables:
1. **Una Tabla = Un Microservicio = Una Base de Datos Independiente:**
   - Ninguna tabla comparte base de datos con otra de distinto dominio.
   - Se implementa el patrón **Database-per-Service** utilizando **esquemas herméticos independientes en Supabase** (`schema_clientes`, `schema_facturacion`, `schema_paquetes`, etc.).
   - **Cero Foreign Keys entre esquemas:** La integridad referencial entre dominios no la maneja el motor relacional mediante SQL `JOINs`.
2. **El ESB Sustituye las Uniones entre Tablas (Reemplazo de SQL JOINs):**
   - El **Enterprise Service Bus (ESB)** recibe los microservicios básicos y orquesta los datos en la capa de aplicación (ej. une una Factura cruda con su Cliente y los Ítems comprados).
   - El ESB posee **dos capas lógicas**:
     * **Capa Interna:** Gobierna los microservicios propietarios de Booking (Clientes, Facturación, Carritos, Paquetes, Finanzas y Simulación de Pagos).
     * **Capa de Integración Externa:** Recibe las conexiones de las tiendas de los compañeros (Atracciones, Autos, Alojamientos, Vuelos) por **gRPC Inbound** y **REST Outbound**.
3. **Event Bus (RabbitMQ) para Descongestión del ESB y Eventos Accionables:**
   - El ESB detecta si una operación es síncrona o si debe manejarse por eventos.
   - **Búsquedas masivas:** Absorbidas por el Event Bus para que miles de usuarios consultando destinos no congelen el ESB.
   - **Confirmación de Factura:** Emite el evento `orden.confirmada` a RabbitMQ, el cual dispara una llamada **REST hacia la tienda del compañero**.
   - **Contrato con respuesta obligatoria:** El compañero recibe la orden por REST, descuenta su stock en su propia base de datos y **retorna una respuesta formal obligatoria** (`201 Created` con su `order_id` o `409 Conflict`), cerrando la transacción o activando la compensación (Saga).
4. **Microservicios Orquestados con Seguridad JWT:**
   - Desde el ESB emergen los microservicios orquestados enriquecidos, protegidos con tokens **JWT**.
5. **GraphQL / BFF como Entrada Única hacia la UI (Sin API Gateway Redundante):**
   - La capa **GraphQL** se conecta directamente a los microservicios orquestados y expone un **único endpoint unificado (`/graphql`)** hacia el Frontend Web.
   - No se interpone un API Gateway adicional redundante entre GraphQL y la UI.
6. **Cada Microservicio Cuenta con su Interfaz de Administración:**
   - Panel administrativo para auditar, consultar métricas y activar *kill-switches* de cada servicio.
7. **Cero Logs en Base de Datos:**
   - La auditoría técnica y trazabilidad distribuida se escribe exclusivamente en archivos físicos planos rotativos bajo `logs/` mediante Winston.

---

## 2. Diagrama de la Arquitectura Completa (RDA2)

```mermaid
graph LR
    %% ---- 1. CAPA 1: PERSISTENCIA INDEPENDIENTE (SUPABASE) ----
    subgraph Capa 1: Persistencia Independiente Supabase
        BD_CLI[(schema_clientes)]
        BD_CAR[(schema_carritos)]
        BD_FAC[(schema_facturacion)]
        BD_PAG[(schema_pagos)]
        BD_PKG[(schema_paquetes)]
        BD_FIN[(schema_finanzas)]
        BD_PROV[(schema_proveedores)]
        
        BD_ATR[(schema_atracciones)]
        BD_AUT[(schema_autos)]
        BD_ALO[(schema_alojamientos)]
        BD_VUE[(schema_vuelos)]
    end

    %% ---- 2. CAPA 2: MICROSERVICIOS BÁSICOS (REST / gRPC) ----
    subgraph Capa 2: Microservicios Basicos
        MS_CLI[MS Clientes: REST]
        MS_CAR[MS Carrito: REST]
        MS_FAC[MS Facturas: REST]
        MS_PAG[MS Pagos: REST]
        MS_PKG[MS Paquetes: REST]
        MS_FIN[MS Finanzas: REST]
        MS_PROV[MS Proveedores: REST]

        MS_ATR[MS Atracciones: REST/Cache]
        MS_AUT[MS Autos: REST/Cache]
        MS_ALO[MS Alojamientos: REST/Cache]
        MS_VUE[MS Vuelos: REST/Cache]
        MS_STK[MS Stock: gRPC Inbound 50051]
    end

    BD_CLI -.-> MS_CLI
    BD_CAR -.-> MS_CAR
    BD_FAC -.-> MS_FAC
    BD_PAG -.-> MS_PAG
    BD_PKG -.-> MS_PKG
    BD_FIN -.-> MS_FIN
    BD_PROV -.-> MS_PROV

    BD_ATR -.-> MS_ATR
    BD_AUT -.-> MS_AUT
    BD_ALO -.-> MS_ALO
    BD_VUE -.-> MS_VUE

    %% ---- 3. CAPA 3: ESB CENTRALIZADO DE DOS CAPAS ----
    subgraph Capa 3: ESB Centralizado
        subgraph ESB Capa Interna
            ESB_INT[Servicios Propios de Booking]
        end
        subgraph ESB Capa Integracion
            ESB_EXT[Recepción e Integración de Socios]
        end
        ESB_ROUTER{Enrutador y Orquestador de Negocio: Sustituto de Joins}
    end

    MS_CLI <--> ESB_INT
    MS_CAR <--> ESB_INT
    MS_FAC <--> ESB_INT
    MS_PAG <--> ESB_INT
    MS_PKG <--> ESB_INT
    MS_FIN <--> ESB_INT
    MS_PROV <--> ESB_INT

    MS_ATR <--> ESB_EXT
    MS_AUT <--> ESB_EXT
    MS_ALO <--> ESB_EXT
    MS_VUE <--> ESB_EXT
    MS_STK -->|gRPC Inbound| ESB_EXT

    ESB_INT --> ESB_ROUTER
    ESB_EXT --> ESB_ROUTER

    %% Integraciones Externas Reales
    EXT_REST{APIs REST Compañeros} <--|Outbound Compra/Cancel| ESB_EXT
    EXT_GRPC{Push Stock Compañeros} -->|Inbound Puerto 50051| MS_STK

    %% ---- 4. CAPA 4: EVENT BUS (RABBITMQ) ----
    subgraph Capa 4: Event Bus RabbitMQ
        RABBIT[Event Bus: RabbitMQ]
        Q_SEARCH[Cola: eventos.busquedas]
        Q_BUY[Cola: ordenes.confirmadas]
        Q_SAGA[Cola: sagas.compensacion]
        Q_STOCK[Cola: stock.actualizado]
    end

    ESB_ROUTER <-->|Publica y Consume| RABBIT
    RABBIT --> Q_SEARCH
    RABBIT --> Q_BUY
    RABBIT --> Q_SAGA
    RABBIT --> Q_STOCK

    %% ---- 5. CAPA 5: MICROSERVICIOS ORQUESTADOS ----
    subgraph Capa 5: Microservicios Orquestados
        ORQ_FAC[MS Orquestado Factura: Factura + Cliente + Detalle]
        ORQ_STK[MS Orquestado Stock: Stock enriquecido vía Evento]
        ORQ_PKG[MS Orquestado Paquetes: Validación de Reglas Combo]
        SEC_JWT{{Seguridad Transversal JWT}}
    end

    ESB_ROUTER --> ORQ_FAC
    RABBIT --> ORQ_STK
    ESB_ROUTER --> ORQ_PKG

    ORQ_FAC --- SEC_JWT
    ORQ_STK --- SEC_JWT
    ORQ_PKG --- SEC_JWT

    %% ---- 6. CAPA 6: AGREGACIÓN GRAPHQL ----
    subgraph Capa 6: Agregacion GraphQL
        GQL[Capa GraphQL / BFF Aggregator: /graphql]
    end

    ORQ_FAC --> GQL
    ORQ_STK --> GQL
    ORQ_PKG --> GQL

    %% ---- 7. CAPA 7: PRESENTACIÓN UI ----
    subgraph Capa 7: Presentacion
        UI[Interfaz de Usuario: Marketplace Web]
        ADMIN[Paneles de Administración por Microservicio]
    end

    GQL -->|Single Endpoint /graphql| UI
    ADMIN -.->|Control y Monitoreo| ESB_ROUTER
```

---

## 3. Auditoría Exhaustiva de Tablas: Plantilla Inicial vs. Nueva Arquitectura

Se ha auditado minuciosamente cada tabla existente en el código fuente de `plantilla inicial` (`src/core/entities/`, `src/modules/*/entities/`) y en `teoria/Base datos actual.md`, asegurando que **ninguna funcionalidad ni tabla necesaria quede excluida**:

| Entidad / Tabla en Plantilla Inicial | Módulo Actual en Código | Diagnóstico y Decisión Arquitectónica | Esquema Destino en Supabase |
|---|---|---|---|
| `usuarios` | `src/core/entities/usuario.entity.ts` | **Consolidada:** Gestión de identidades, clientes y roles. | `schema_clientes.clientes` |
| `carritos` | `src/core/entities/carrito.entity.ts` | **Preservada:** Encabezado de la sesión de compra. | `schema_carritos.carritos` |
| `carrito_items` | `src/core/entities/carrito-item.entity.ts` | **Preservada:** Líneas de compra multivertical. | `schema_carritos.carrito_items` |
| `facturas` | `src/core/entities/factura.entity.ts` | **Preservada:** Encabezado del comprobante fiscal. | `schema_facturacion.facturas_encabezado` |
| `factura_items` | `src/core/entities/factura-item.entity.ts` | **Preservada:** Detalle de venta y referencia de orden externa. | `schema_facturacion.facturas_detalle` |
| `paquetes` | `src/modules/promotions-packages/entities/paquete.entity.ts` | **Adoptada:** Paquetes turísticos combinados. | `schema_paquetes.paquetes` |
| `paquete_items` | `src/modules/promotions-packages/entities/paquete-items.entity.ts` | **Adoptada:** Reglas de combinación de servicios en combo. | `schema_paquetes.paquete_items` |
| `contrato_promociones` | `src/modules/promotions-packages/entities/contrato-promociones.entity.ts` | **Adoptada:** Parámetros de descuento máximo de socios. | `schema_paquetes.contrato_promociones` |
| `atracciones` | `src/modules/atracciones/entities/atraccion.entity.ts` | **Evolucionada:** Caché local sincronizada con flags de paquete. | `schema_atracciones.atracciones_cache` |
| `reservas_atraccion` | `src/modules/atracciones/entities/reserva.entity.ts` | **Preservada:** Reservas locales, check-in QR y cancelaciones Saga. | `schema_atracciones.reservas_atraccion` |
| `resenas_atracciones` | `src/modules/atracciones/entities/resena.entity.ts` | **Preservada:** Reseñas y desgloses de calificación. | `schema_atracciones.resenas_atraccion` |
| `categoria_atraccion` | *(Nueva según Consideraciones RDA2)* | **Añadida:** Árbol jerárquico recursivo (comida, transporte, guía). | `schema_atracciones.categorias_recursivas` |
| `autos` | `src/modules/autos/entities/auto.entity.ts` | **Evolucionada:** Catálogo con máquina de estados y cooldown 2h. | `schema_autos.autos_cache` |
| `orders_autos` | `src/modules/autos/entities/order-auto.entity.ts` | **Preservada:** Órdenes locales de renta y check-in de salida. | `schema_autos.reservas_auto` |
| `mantenimiento_autos` | `src/modules/autos/entities/mantenimiento-auto.entity.ts` | **Preservada:** Inspección de patio, kilometraje y alertas. | `schema_autos.mantenimiento_autos` |
| `alojamientos` | `src/modules/alojamientos/entities/alojamiento.entity.ts` | **Evolucionada:** Catálogo local enriquecido con flags de paquete. | `schema_alojamientos.alojamientos_cache` |
| `tipos_habitacion` | `src/modules/alojamientos/entities/tipo-habitacion.entity.ts` | **Preservada:** Detalle de capacidad y régimen hotelero. | `schema_alojamientos.tipos_habitacion` |
| `reservas_alojamiento` | `src/modules/alojamientos/entities/reserva.entity.ts` | **Preservada:** Check-in 14:00 y clave digital de habitación. | `schema_alojamientos.reservas_alojamiento` |
| `huespedes_reserva` | `src/modules/alojamientos/entities/huesped-reserva.entity.ts` | **Preservada:** Registro de pasajeros y acompañantes. | `schema_alojamientos.huespedes_reserva` |
| `vuelo`, `asiento_vuelo`, `oferta`, `reserva`, `boleto`, `checkin` | `src/modules/vuelos/entities/*` | **Preservadas:** Gestión de itinerarios, reservas y pases de abordar. | `schema_vuelos.*` |
| `admin_liquidaciones`, `panel_liquidaciones` | `Base datos actual.md` (líneas 901 y 994) | **Adoptada:** Liquidación financiera y pago de comisiones a socios. | `schema_finanzas.liquidaciones_proveedores` |
| `estado_servicios`, `tiendas_integradas` | `src/core/entities/estado-servicio.entity.ts` | **Evolucionada:** Configuración de socios, semáforo y kill-switch. | `schema_proveedores.config_proveedor` |
| `pagos_transacciones` | *(Nuevo módulo SOA requerido)* | **Añadida:** Microservicio de simulación transaccional de pagos. | `schema_pagos.transacciones_pago` |
| `api_request_logs`, `admin_audit_logs` | `src/core/entities/api-request-log.entity.ts` | **Eliminadas de BD (Regla Docente):** Se migran al 100% a Winston File Logger (`logs/*.log`). | Sistema de Archivos Físicos |

---

## 4. Detalle Técnico de la CAPA 1: Bases de Datos por Esquema (Supabase)

### 📂 Esquema 1: `schema_clientes`
*Microservicio: Identity & Auth.*

#### Tabla: `clientes`
```sql
CREATE SCHEMA IF NOT EXISTS schema_clientes;

CREATE TABLE schema_clientes.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    cedula_ruc VARCHAR(20),
    telefono VARCHAR(20),
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin', 'mantenimiento')),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'SUSPENDIDO', 'BLOQUEADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 📂 Esquema 2: `schema_carritos`
*Microservicio: Carrito & Checkout.*

#### Tabla 1: `carritos`
```sql
CREATE SCHEMA IF NOT EXISTS schema_carritos;

CREATE TABLE schema_carritos.carritos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL, -- Clave lógica hacia schema_clientes.clientes
    paquete_id UUID,          -- Clave lógica hacia schema_paquetes.paquetes (si aplica combo)
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'PROCESADO', 'ABANDONADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Tabla 2: `carrito_items`
```sql
CREATE TABLE schema_carritos.carrito_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrito_id UUID NOT NULL REFERENCES schema_carritos.carritos(id) ON DELETE CASCADE,
    vertical VARCHAR(30) NOT NULL CHECK (vertical IN ('atracciones', 'autos', 'alojamientos', 'vuelos')),
    item_id_externo VARCHAR(100) NOT NULL,
    tienda_id VARCHAR(50) NOT NULL,
    nombre_item VARCHAR(150) NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    descuento_aplicado NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    cantidad INT4 NOT NULL CHECK (cantidad > 0),
    metadata_reserva JSONB, -- Fechas, asientos, franjas horarias
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 📂 Esquema 3: `schema_facturacion`
*Microservicio: Facturación y Comprobantes de Venta.*

#### Tabla 1: `facturas_encabezado`
```sql
CREATE SCHEMA IF NOT EXISTS schema_facturacion;

CREATE TABLE schema_facturacion.facturas_encabezado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_factura VARCHAR(30) NOT NULL UNIQUE,
    cliente_id UUID NOT NULL, -- Clave lógica
    carrito_id UUID,          -- Clave lógica
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    descuento_paquete NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    iva_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    iva_valor NUMERIC(10,2) NOT NULL CHECK (iva_valor >= 0),
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    estado_factura VARCHAR(20) NOT NULL DEFAULT 'EMITIDA' CHECK (estado_factura IN ('EMITIDA', 'PAGADA', 'ANULADA', 'REEMBOLSADA')),
    idempotency_key UUID NOT NULL UNIQUE,
    emitida_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Tabla 2: `facturas_detalle`
```sql
CREATE TABLE schema_facturacion.facturas_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id UUID NOT NULL REFERENCES schema_facturacion.facturas_encabezado(id) ON DELETE CASCADE,
    vertical VARCHAR(30) NOT NULL CHECK (vertical IN ('atracciones', 'autos', 'alojamientos', 'vuelos')),
    item_id_externo VARCHAR(100) NOT NULL,
    tienda_id VARCHAR(50) NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    cantidad INT4 NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    external_order_id VARCHAR(100), -- Confirmación retornada por la API REST del compañero
    estado_despacho VARCHAR(25) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_despacho IN ('PENDIENTE', 'CONFIRMADO_SOCIO', 'FALLO_SOCIO', 'REVERTIDO'))
);
```

---

### 📂 Esquema 4: `schema_pagos`
*Microservicio: Simulación de Pagos (Componente SOA).*

#### Tabla: `transacciones_pago`
```sql
CREATE SCHEMA IF NOT EXISTS schema_pagos;

CREATE TABLE schema_pagos.transacciones_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id UUID NOT NULL, -- Clave lógica
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    moneda VARCHAR(5) NOT NULL DEFAULT 'USD',
    metodo_pago VARCHAR(30) NOT NULL CHECK (metodo_pago IN ('TARJETA_SIMULADA', 'TRANSFERENCIA', 'PAYPAL_MOCK')),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('APROBADO', 'RECHAZADO', 'REEMBOLSADO')),
    codigo_autorizacion VARCHAR(50) NOT NULL,
    codigo_reembolso VARCHAR(50),
    error_motivo TEXT,
    procesado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 📂 Esquema 5: `schema_paquetes`
*Microservicio: Paquetes Dinámicos y Promociones Combinadas.*

#### Tabla 1: `paquetes`
```sql
CREATE SCHEMA IF NOT EXISTS schema_paquetes;

CREATE TABLE schema_paquetes.paquetes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_paquete VARCHAR(150) NOT NULL,
    descripcion TEXT,
    descuento_porcentaje NUMERIC(5,2) NOT NULL CHECK (descuento_porcentaje >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Tabla 2: `paquete_items` (Reglas de Combinación)
```sql
CREATE TABLE schema_paquetes.paquete_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paquete_id UUID NOT NULL REFERENCES schema_paquetes.paquetes(id) ON DELETE CASCADE,
    vertical_requerida VARCHAR(30) NOT NULL CHECK (vertical_requerida IN ('vuelos', 'alojamientos', 'atracciones', 'autos')),
    ciudad_coincidencia VARCHAR(100),
    es_obligatorio BOOLEAN NOT NULL DEFAULT TRUE
);
```

#### Tabla 3: `contrato_promociones`
```sql
CREATE TABLE schema_paquetes.contrato_promociones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tienda_id VARCHAR(50) NOT NULL,
    vertical VARCHAR(30) NOT NULL,
    permite_paquete BOOLEAN NOT NULL DEFAULT TRUE,
    descuento_maximo NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 📂 Esquema 6: `schema_finanzas`
*Microservicio: Finanzas y Liquidaciones a Proveedores.*

#### Tabla: `liquidaciones_proveedores`
```sql
CREATE SCHEMA IF NOT EXISTS schema_finanzas;

CREATE TABLE schema_finanzas.liquidaciones_proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor_id VARCHAR(50) NOT NULL, -- Clave lógica a schema_proveedores
    periodo VARCHAR(20) NOT NULL,      -- ej. '2026-10-Q1'
    total_recaudado NUMERIC(12,2) NOT NULL CHECK (total_recaudado >= 0),
    comision_booking NUMERIC(12,2) NOT NULL CHECK (comision_booking >= 0),
    monto_neto_proveedor NUMERIC(12,2) NOT NULL CHECK (monto_neto_proveedor >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PAGADO', 'CONCILIADO')),
    comprobante_url TEXT,
    liquidado_at TIMESTAMPTZ
);
```

---

### 📂 Esquema 7: `schema_proveedores`
*Microservicio: Configuración de Proveedores, Salud de Nodos y Kill-Switches.*

#### Tabla: `config_proveedor`
```sql
CREATE SCHEMA IF NOT EXISTS schema_proveedores;

CREATE TABLE schema_proveedores.config_proveedor (
    id VARCHAR(50) PRIMARY KEY, -- ej. 'atracciones-dilan', 'rentacar-flota'
    nombre_comercial VARCHAR(100) NOT NULL,
    vertical VARCHAR(30) NOT NULL CHECK (vertical IN ('atracciones', 'autos', 'alojamientos', 'vuelos', 'inventory')),
    url_base_rest TEXT NOT NULL,
    grpc_endpoint VARCHAR(100),  -- ej. 'localhost:50051'
    comision_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    habilitada BOOLEAN NOT NULL DEFAULT TRUE, -- Kill-switch
    circuit_breaker VARCHAR(20) NOT NULL DEFAULT 'CLOSED' CHECK (circuit_breaker IN ('CLOSED', 'OPEN', 'HALF_OPEN', 'MANUALLY_OPEN')),
    estado_salud VARCHAR(20) NOT NULL DEFAULT 'ONLINE' CHECK (estado_salud IN ('ONLINE', 'DEGRADED', 'OFFLINE', 'DISABLED')),
    latencia_ms INT4,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 📂 Esquemas 8, 9, 10 y 11: Esquemas de las Cuatro Verticales Turísticas

Cada vertical mantiene su catálogo sincronizado y sus **reservas locales propias** para soportar el módulo de *"Mis Reservas"*, los flujos de **Check-in** y las **cancelaciones con Saga**.

#### 8. `schema_atracciones`
*   `atracciones_cache`: Catálogo enriquecido recibido por gRPC/REST con `permite_paquete` y `descuento_maximo`.
*   `categorias_recursivas`: Árbol jerárquico padre-hijo (`parent_id`) con booleanos (`incluye_comida`, `incluye_transporte`, `incluye_guia`).
*   `reservas_atraccion`: Reservas locales con `idempotency_key`, `checkin_hora`, `guia_asignado`, `voucher_qr_url`, estado (`CONFIRMADA`, `CHECKED_IN`, `CANCELADA`), `refund_status` y `codigo_reembolso` (`REF-ATR-...`).
*   `resenas_atraccion`: Reseñas y desglose de calificaciones.

#### 9. `schema_autos`
*   `autos_cache`: Catálogo con máquina de estados de 6 fases (`DISPONIBLE`, `RESERVADO`, `LISTO_PARA_ENTREGAR`, `ENTREGADO`, `EN_LIMPIEZA`, `EN_MANTENIMIENTO`), `limpieza_inicio` (para el **cooldown cronometrado de 2 horas**) y `alerta_mantenimiento`.
*   `reservas_auto`: Órdenes locales con check-in de entrega (`conductor_licencia`, `km_salida`) y devolución (`km_llegada`).
*   `mantenimiento_autos`: Registros de inspección física de patio, kilometraje y reporte de rayones/combustible (Rol Mantenimiento).

#### 10. `schema_alojamientos`
*   `alojamientos_cache`: Catálogo enriquecido de hoteles/resorts con `permite_paquete`.
*   `tipos_habitacion`: Capacidad, amenidades y régimen.
*   `reservas_alojamiento`: Check-in digital a partir de las 14:00 con `habitacion_asignada` y `clave_acceso_digital`.
*   `huespedes_reserva`: Registro del titular y acompañantes.

#### 11. `schema_vuelos`
*   `vuelos_cache`: Itinerarios y vuelos disponibles con `permite_paquete`.
*   `reservas_vuelo`: Reservas con código `PNR`, selección de asiento en check-in (`asiento_asignado`), y generación de pase de abordar digital con código de barras.

---

## 5. CAPA 2: MICROSERVICIOS BÁSICOS (ORM, NESTJS, REST Y gRPC)

### 5.1. Fundamentación Técnica y Criterios de Selección Tecnológica

Siguiendo el mandato de la pizarra docente:
> *"A cada tabla hay que hacerle una base de datos independiente; luego, esos microservicios se conectan con la capa de aplicación donde están ORM, Nest.js y Api Rest... excepto el de stock, que no es un microservicio de REST sino de gRPC"*.

Para dar cumplimiento estricto a las directrices de la asignatura, el diseño de la Capa 2 responde a una arquitectura asimétrica pero homogénea en su núcleo:

#### 1. ¿Quién usa ORM (TypeORM) y por qué?
* **11 Microservicios Transaccionales usan TypeORM:**
  - `MS_CLI` (Clientes), `MS_CAR` (Carritos), `MS_FAC` (Facturas), `MS_PAG` (Pagos), `MS_PKG` (Paquetes), `MS_FIN` (Finanzas), `MS_PROV` (Proveedores), `MS_ATR` (Atracciones), `MS_AUT` (Autos), `MS_ALO` (Alojamientos), `MS_VUE` (Vuelos).
* **Justificación Arquitectónica:**
  * **Tipado Estricto TypeScript:** TypeORM permite mapear los esquemas DDL creados en la Capa 1 (`schema_*`) directamente a clases de entidad con decoradores de metadatos (`@Entity({ schema: 'schema_clientes' })`), garantizando chequeo estático de tipos en tiempo de compilación.
  * **Aislamiento Total entre Esquemas (Zero Cross-Schema JOINs):** Cada módulo NestJS encapsula su propio `TypeOrmModule.forFeature([EntidadLocal])`. Está terminantemente prohibido que una entidad de `schema_facturacion` incluya una relación `@ManyToOne` o `@JoinColumn` hacia `schema_clientes`. La integridad de datos se preserva mediante IDs lógicos (`UUID`), delegando la agregación y el ensamblado relacional al ESB.
  * **Migraciones y Transacciones ACID:** Provee soporte transaccional nativo (`QueryRunner`, `@Transaction()`) para garantizar que la emisión de una factura con sus detalles o la actualización de una reserva sea atómica dentro de su propio esquema.
  * **Soporte Jerárquico Especial:** Permite manejar la estructura en árbol de las categorías de atracciones mediante `@Tree('closure-table')` sin recurrir a consultas SQL nativas recursivas complejas.
* **¿Quién NO usa ORM Relacional y por qué?**
  * **`MS_STK` (Microservicio de Ingesta de Stock e Inventario gRPC):**
  * **Justificación Arquitectónica:** Opera en **Memoria Volátil / Redis** (`Map<string, InventoryRecord>`).
  * Al recibir miles de mensajes por segundo emitidos por las tiendas de los compañeros a través de streams gRPC, forzar la persistencia síncrona en PostgreSQL mediante un ORM generaría contención de bloqueos (*row/table locking*), agotamiento instantáneo del pool de conexiones de Postgres y degradación de la latencia a más de 500ms. Al procesar en memoria/Redis, `MS_STK` responde en menos de 2ms y emite inmediatamente un evento no bloqueante a RabbitMQ (`stock.actualizado`).

#### 2. ¿Quién usa NestJS y por qué?
* **LOS 12 MICROSERVICIOS usan NestJS 10.x de forma uniforme:**
* **Justificación Arquitectónica:**
  * **Inyección de Dependencias (IoC) y Modularidad:** Cada microservicio es un `@Module` autocontenido con sus propios controladores, servicios, repositorios y DTOs, permitiendo desacoplamiento absoluto y pruebas unitarias/integración aisladas.
  * **Framework Híbrido Nativo:** NestJS soporta en el mismo runtime tanto servidores HTTP/REST (vía `@nestjs/platform-express`) como servidores de Microservicios binarios gRPC (vía `@nestjs/microservices` y `@grpc/grpc-js`), eliminando la necesidad de mantener múltiples frameworks backend dispares.
  * **Tuberías de Validación Homogéneas:** Uso de `ValidationPipe` global con `class-validator` y `class-transformer` para sanitizar entradas, aplicar reglas de negocio y forzar el rechazo de peticiones malformadas antes de llegar a la lógica de negocio.
  * **Manejo Centralizado de Errores y Seguridad:** Integración del filtro global `ProblemDetailsExceptionsFilter` bajo el estándar RFC 7807 y del guard `UuidValidationGuard` para mitigar vulnerabilidades de inyección y parámetros corruptos (V-05).

#### 3. ¿Quién usa REST (HTTP/1.1 JSON) y por qué?
* **11 Microservicios Transaccionales usan REST:**
* **Justificación Arquitectónica:**
  * **Semántica de Recursos y Métodos:** Ideal para operaciones CRUD, consultas de estado y comandos transaccionales (`POST /api/v1/facturas`, `GET /api/v2/atracciones`, `PATCH /api/v1/finanzas/liquidaciones/:id/pagar`).
  * **Soporte de Cabeceras de Idempotencia:** Permite implementar cabeceras como `Idempotency-Key: <UUID>` en pagos y cancelaciones de reservas para evitar dobles cobros o dobles reembolsos ante reintentos de red.
  * **Trazabilidad y Observabilidad:** El formato JSON sobre HTTP/1.1 es inspeccionable directamente por el ESB y herramientas de depuración, permitiendo registrar códigos de estado semánticos (200, 201, 400, 404, 409, 422, 500) en los logs físicos Winston.

#### 4. ¿Quién usa gRPC (HTTP/2 Protobuf v3) y por qué?
* **Exclusivamente `MS_STK` (Microservicio de Ingesta de Stock e Inventario):**
* **Justificación Arquitectónica:**
  * **Exigencia Docente Específica:** La cátedra estipuló que el stock no viaja por REST sino por gRPC para simular la integración de telemetría de inventario en tiempo real.
  * **Transporte Multiplexado HTTP/2 sobre el Puerto TCP 50051:** Abre un único socket TCP persistente entre las tiendas externas y Booking Prototipo, eliminando el sobrecosto de *handshake* TCP y TLS por cada actualización de stock.
  * **Serialización Binaria Ultracompacta:** Utiliza Protocol Buffers v3 (`src/proto/inventory.proto`), reduciendo el tamaño del payload en hasta un 80% comparado con JSON.
  * **Streaming Bidireccional:** Habilita el método `rpc StreamInventoryChanges (stream StockChangeEvent) returns (StreamSummary)` para recibir ráfagas continuas de cambios de disponibilidad con latencia inferior a 5ms.

#### 5. Regla Inviolable de Auditoría: Cero Logs en Base de Datos
* Ningún microservicio posee tablas como `logs`, `auditoria` o `trazas` en su esquema.
* Toda actividad transaccional, latencia, errores y cambios de estado se canalizan hacia el servicio `WinstonPhysicalLoggerService`, escribiendo en archivos físicos planos rotativos bajo el directorio `logs/`:
  - `logs/combined.log`: Registro completo de transacciones e invocaciones.
  - `logs/error.log`: Excepciones no controladas, fallos de conexión y rechazos.
  - `logs/audit.log`: Trazabilidad fiscal, liquidaciones financieras y cambios de estado de reservas.

---

### 5.2. Gran Matriz de Asignación Tecnológica por Microservicio

| Microservicio | Clave Lógica | Esquema Supabase | ORM / Persistencia | Framework Backend | Protocolo / Transporte | Puerto / Ruta Base | Cabecera Idempotencia | Event Bus (RabbitMQ) | Interfaz de Administración |
|---|---|---|---|---|---|---|---|---|---|
| **1. Clientes & Autenticación** | `MS_CLI` | `schema_clientes` | TypeORM (`ClienteEntity`) | NestJS 10.x | **REST (HTTP/1.1 JSON)** | `/api/v1/clientes` | Opcional | Emite: `clientes.registrados` | Panel de usuarios, roles y bloqueo de cuentas |
| **2. Carrito de Compras** | `MS_CAR` | `schema_carritos` | TypeORM (`CarritoEntity`, `CarritoItemEntity`) | NestJS 10.x | **REST (HTTP/1.1 JSON)** | `/api/v1/carritos` | No requerida | Emite: `carritos.abandonados` | Monitor de carritos activos vs. abandonados |
| **3. Facturación** | `MS_FAC` | `schema_facturacion` | TypeORM (`FacturaEncabezadoEntity`, `FacturaDetalleEntity`) | NestJS 10.x | **REST (HTTP/1.1 JSON)** | `/api/v1/facturas` | **Obligatoria (`Idempotency-Key`)** | Emite: `ordenes.confirmadas` | Visor fiscal, desglose de IVA y auditoría secuencial |
| **4. Simulación Pagos (SOA)** | `MS_PAG` | `schema_pagos` | TypeORM (`TransaccionPagoEntity`) | NestJS 10.x | **REST (HTTP/1.1 JSON)** | `/api/v1/pagos` | **Obligatoria (`Idempotency-Key`)** | Emite: `pagos.aprobados`, `pagos.reembolsados` | Consola de inyección de fallos (Aprobado/Rechazo/Timeout) |
| **5. Paquetes Dinámicos** | `MS_PKG` | `schema_paquetes` | TypeORM (`PaqueteEntity`, `PaqueteItemEntity`, `ContratoPromocionesEntity`) | NestJS 10.x | **REST (HTTP/1.1 JSON)** | `/api/v1/paquetes` | No requerida | Consume: `ordenes.confirmadas` | Creador de combos y topes de descuento máximo |
| **6. Finanzas & Liquidaciones** | `MS_FIN` | `schema_finanzas` | TypeORM (`LiquidacionProveedorEntity`) | NestJS 10.x | **REST (HTTP/1.1 JSON)** | `/api/v1/finanzas` | No requerida | Consume: `ordenes.confirmadas` | Ledger de liquidaciones y comprobantes de transferencia |
| **7. Proveedores & Monitor Nodos** | `MS_PROV` | `schema_proveedores` | TypeORM (`ConfigProveedorEntity`) | NestJS 10.x | **REST (HTTP/1.1 JSON)** | `/api/v2/admin/nodes` | No requerida | Emite: `nodos.alerta_caida` | Semáforo LED (🟢/🟡/🔴), latencia y Kill-Switches en vivo |
| **8. Atracciones Turísticas** | `MS_ATR` | `schema_atracciones` | TypeORM (`AtraccionCacheEntity`, `CategoriaRecursivaEntity`, `ReservaAtraccionEntity`) | NestJS 10.x | **REST (HTTP/1.1 JSON)** | `/api/v2/atracciones` | **Obligatoria en cancelaciones** | Publica: `sagas.compensacion` | Árbol recursivo de categorías y visor de vouchers QR |
| **9. Autos & Flota Vehicular** | `MS_AUT` | `schema_autos` | TypeORM (`AutoCacheEntity`, `ReservaAutoEntity`, `MantenimientoAutoEntity`) | NestJS 10.x + Schedule Cron | **REST (HTTP/1.1 JSON)** | `/api/v2/autos` | No requerida | Emite: `autos.mantenimiento_alerta` | Monitor de patio con cooldown 2h y órdenes de taller |
| **10. Alojamientos** | `MS_ALO` | `schema_alojamientos` | TypeORM (`AlojamientoCacheEntity`, `TipoHabitacionEntity`, `ReservaAlojamientoEntity`) | NestJS 10.x | **REST (HTTP/1.1 JSON)** | `/api/v2/alojamientos` | No requerida | Consume: `ordenes.confirmadas` | Control de ocupación, check-in 14:00 y llaves digitales |
| **11. Vuelos** | `MS_VUE` | `schema_vuelos` | TypeORM (`VueloCacheEntity`, `ReservaVueloEntity`, `PaseAbordarEntity`) | NestJS 10.x | **REST (HTTP/1.1 JSON)** | `/api/v2/vuelos` | No requerida | Consume: `ordenes.confirmadas` | Manifiesto de pasajeros, asientos asignados y PNRs |
| **12. Ingesta de Stock e Inventario**| `MS_STK` | En Memoria / Redis (`Map<string, InventoryRecord>`) | **Sin ORM Relacional** (Buffer RAM/Redis) | NestJS Microservices (`@grpc/grpc-js`) | **gRPC (HTTP/2 / Protobuf v3)** | **Puerto TCP 50051** (`inventory.proto`) | Intrínseca por Timestamp y Hash | Emite: `stock.actualizado` | Métricas de throughput gRPC (msg/seg) y hashes de sync |

---

### 5.3. Arquitectura Interna del Microservicio Estándar en NestJS

Cada microservicio básico implementa un pipeline estricto de procesamiento modular:

```mermaid
graph TD
    REQ[Petición Entrante: HTTP/REST o gRPC] --> FILTRO[ProblemDetailsExceptionsFilter: RFC 7807]
    FILTRO --> GUARD_UUID[UuidValidationGuard: Protección Sintaxis V-05]
    GUARD_UUID --> PIPE[ValidationPipe: DTOs + class-validator]
    PIPE --> CTRL[NestJS Controller: @Controller o @GrpcMethod]
    CTRL --> SERV[NestJS Service: Lógica Pura de Dominio]
    
    SERV --> CB{Circuit Breaker: Opossum}
    CB -->|Fallo / Timeout| FB[Fallback Controlado]
    CB -->|Operación Normal| PERSISTENCIA
    
    subgraph Persistencia y Trazabilidad
        PERSISTENCIA{Tipo de Persistencia}
        PERSISTENCIA -->|Transaccional| REPO[TypeORM Repository: @Entity schema_*]
        PERSISTENCIA -->|Alta Frecuencia| RAM[Buffer RAM / Redis: In-Memory Map]
        REPO --> DB[(Supabase Postgres)]
    end
    
    SERV -.->|Eventos Asíncronos| BUS[Event Bus: RabbitMQ]
    SERV -.->|Telemetría Física| WINSTON[WinstonPhysicalLogger: logs/*.log]
```

#### Estándar de Configuración TypeORM por Esquema Hermético:
Para impedir contaminación entre esquemas, cada módulo declara explícitamente el esquema de base de datos en sus entidades y en la importación de TypeORM:

```typescript
// Ejemplo: Definición de Entidad en schema_facturacion
@Entity({ name: 'facturas_encabezado', schema: 'schema_facturacion' })
export class FacturaEncabezadoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'numero_factura', unique: true })
  numeroFactura: string;

  // CERO @ManyToOne hacia ClienteEntity. Se almacena el ID lógico como UUID simple
  @Column({ name: 'cliente_id', type: 'uuid' })
  clienteId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  total: number;

  @Column({ default: 'EMITIDA' })
  estado: string;

  @OneToMany(() => FacturaDetalleEntity, detalle => detalle.factura, { cascade: true })
  detalles: FacturaDetalleEntity[];
}
```

---

### 5.4. Fichas Técnicas Exhaustivas de los 12 Microservicios Básicos

#### 👤 1. Microservicio: Clientes & Autenticación (`MS_CLI`)
* **Código / Identificador:** `MS_CLI`
* **Esquema de Persistencia:** `schema_clientes`
* **Capa ORM:** TypeORM con `ClienteEntity` mapeada a `schema_clientes.clientes`.
* **Framework Backend:** NestJS 10.x (`ClientesModule`, `clientes.controller.ts`, `clientes.service.ts`).
* **Protocolo de Comunicación:** REST (HTTP/1.1 JSON).
* **Ruta Base:** `/api/v1/clientes`
* **Contratos y Endpoints:**
  * `POST /api/v1/clientes/registro`:
    - *Request Body:* `{ email: string, password_hash: string, nombre: string, apellido: string, identificacion: string, telefono?: string }`.
    - *Response (201 Created):* `{ id: string, email: string, nombre_completo: string, rol: string, created_at: string }`.
    - *Regla de Negocio:* Hash de contraseña con `bcrypt`/`argon2` con factor de coste 12. No retorna el hash en la respuesta.
  * `POST /api/v1/clientes/login`:
    - *Request Body:* `{ email: string, password: string }`.
    - *Response (200 OK):* `{ access_token: string, expires_in: 3600, user: { id: string, email: string, rol: string } }`.
    - *Regla de Negocio:* Valida credenciales y emite claims de usuario para que el ESB o el Orchestrator autorice la transacción.
  * `GET /api/v1/clientes/:id`:
    - *Response (200 OK):* Perfil del cliente requerido por el ESB para orquestar la factura con nombre, cédula y correo.
  * `PATCH /api/v1/clientes/:id/rol`:
    - *Acción Administrativa:* Modifica el rol a `CLIENTE`, `ADMIN` o `MANTENIMIENTO`.
* **Event Bus (RabbitMQ):** Emite a la cola `clientes.registrados` para auditoría y bienvenida.
* **Interfaz de Administración:** Consola para búsqueda de clientes por identificación, visualización de estado de cuenta y botón para suspender/reactivar usuarios.

---

#### 🛒 2. Microservicio: Carrito de Compras (`MS_CAR`)
* **Código / Identificador:** `MS_CAR`
* **Esquema de Persistencia:** `schema_carritos`
* **Capa ORM:** TypeORM con `CarritoEntity` (`schema_carritos.carritos`) y `CarritoItemEntity` (`schema_carritos.carrito_items`).
* **Framework Backend:** NestJS 10.x (`CarritosModule`, `carritos.controller.ts`, `carritos.service.ts`).
* **Protocolo de Comunicación:** REST (HTTP/1.1 JSON).
* **Ruta Base:** `/api/v1/carritos`
* **Contratos y Endpoints:**
  * `POST /api/v1/carritos`:
    - *Request Body:* `{ cliente_id: string }`.
    - *Response (201 Created):* Objeto carrito con `id` y estado `ACTIVO`.
  * `GET /api/v1/carritos/activo/:clienteId`:
    - *Response (200 OK):* Retorna el carrito activo con su lista de ítems e importe total precalculado.
  * `POST /api/v1/carritos/:id/items`:
    - *Request Body:* `{ tipo_servicio: 'ATRACCION' | 'AUTO' | 'ALOJAMIENTO' | 'VUELO', external_item_id: string, proveedor_id: string, titulo: string, cantidad: number, precio_unitario: number, metadata_reserva: object }`.
    - *Regla de Negocio (Snapshotting Inmutable):* Se guarda el `precio_unitario` y `titulo` al momento de la adición. Si la tienda externa sube o baja el precio después, el ítem en el carrito preserva el precio convenido hasta la expiración del carrito (`expires_at = NOW() + INTERVAL '24 hours'`).
  * `DELETE /api/v1/carritos/:id/items/:itemId`:
    - *Response (200 OK):* Eliminación física del ítem y recálculo del total.
  * `POST /api/v1/carritos/:id/vaciar`:
    - *Acción Post-Checkout:* Marca el carrito como `ABANDONADO` o `PROCESADO`, purgando sus ítems.
* **Interfaz de Administración:** Métricas de carritos abandonados (tasa de conversión, valor promedio en cola y antigüedad de carritos no comprados).

---

#### 🧾 3. Microservicio: Facturación (`MS_FAC`)
* **Código / Identificador:** `MS_FAC`
* **Esquema de Persistencia:** `schema_facturacion`
* **Capa ORM:** TypeORM con `FacturaEncabezadoEntity` y `FacturaDetalleEntity`.
* **Framework Backend:** NestJS 10.x (`FacturasModule`, `facturas.controller.ts`, `facturas.service.ts`).
* **Protocolo de Comunicación:** REST (HTTP/1.1 JSON).
* **Ruta Base:** `/api/v1/facturas`
* **Contratos y Endpoints:**
  * `POST /api/v1/facturas`:
    - *Header Obligatorio:* `Idempotency-Key: <UUID>` (Evita duplicación de facturas ante reintentos de red).
    - *Request Body:* `{ cliente_id: string, subtotal: number, iva: number, total: number, items: [{ tipo_servicio: string, external_item_id: string, proveedor_id: string, titulo: string, cantidad: number, precio_unitario: number, subtotal: number, metadata_reserva: object }] }`.
    - *Response (201 Created):* Factura emitida con `numero_factura` secuencial (`FAC-2026-00001`), `estado: 'EMITIDA'`, fecha de emisión y listado de líneas.
    - *Lógica Crítica:* Transacción ACID completa: inserta encabezado y detalles en un único commit. Si la cabecera `Idempotency-Key` ya existe, retorna inmediatamente la factura previamente generada con código `200 OK` en vez de reinsertar.
  * `GET /api/v1/facturas/:id`:
    - *Response (200 OK):* Retorna la factura y sus líneas. Nótese que NO incluye los datos del cliente ni el nombre del proveedor; el ESB es quien inyecta esos datos.
  * `PATCH /api/v1/facturas/:id/estado`:
    - *Request Body:* `{ estado: 'PAGADA' | 'REEMBOLSADA' | 'ANULADA' }`.
  * `PUT /api/v1/facturas/detalle/:detalleId/despacho`:
    - *Request Body:* `{ external_order_id: string, estado_despacho: 'CONFIRMADO' | 'FALLIDO' }`.
    - *Regla de Negocio:* Almacena el ID de orden que la tienda del compañero retornó en su contrato obligatorio.
* **Event Bus (RabbitMQ):** Emite a la cola `ordenes.confirmadas` al pasar a `PAGADA`.
* **Interfaz de Administración:** Visor fiscal de facturación con desglose de IVA (15%), totales recaudados, buscador de comprobantes por rango de fechas y auditoría de secuencialidad fiscal.

---

#### 💳 4. Microservicio: Simulación de Pagos SOA (`MS_PAG`)
* **Código / Identificador:** `MS_PAG`
* **Esquema de Persistencia:** `schema_pagos`
* **Capa ORM:** TypeORM con `TransaccionPagoEntity` mapeada a `schema_pagos.transacciones_pago`.
* **Framework Backend:** NestJS 10.x (`PagosModule`, `pagos.controller.ts`, `pagos.service.ts`).
* **Protocolo de Comunicación:** REST (HTTP/1.1 JSON).
* **Ruta Base:** `/api/v1/pagos`
* **Contratos y Endpoints:**
  * `POST /api/v1/pagos/procesar`:
    - *Header Obligatorio:* `Idempotency-Key: <UUID>`
    - *Request Body:* `{ factura_id: string, monto: number, metodo_pago: 'TARJETA_CREDITO' | 'TRANSFERENCIA' | 'SIMULADO', payload_tarjeta?: { numero_enmascarado: string, titular: string } }`.
    - *Response (200 OK):* `{ transaccion_id: string, estado: 'APROBADA', codigo_autorizacion: 'AUTH-VISA-982341', fecha_procesamiento: string }`.
    - *Lógica SOA Simulada:* Aplica un retardo artificial configurable (300ms) para emular la conexión con la red interbancaria o pasarela externa. Si el monto excede $10,000, simula rechazo controlado `FONDOS_INSUFICIENTES` con HTTP `402 Payment Required`.
  * `POST /api/v1/pagos/reembolsar`:
    - *Request Body:* `{ transaccion_id: string, motivo: string }`.
    - *Response (200 OK):* `{ transaccion_id: string, estado: 'REEMBOLSADA', codigo_reembolso: 'REF-BANCO-481920', monto_revertido: number }`.
    - *Regla Saga:* Invocado durante la compensación de Saga si alguna tienda externa falló en confirmar su reserva.
* **Interfaz de Administración:** Panel docente con conmutador de modo de pasarela (`APROBACIÓN_FORZADA`, `RECHAZO_SIMULADO`, `TIMEOUT_SIMULADO_504`) para demostrar la resiliencia y el rollback ante fallos en vivo.

---

#### 🎁 5. Microservicio: Paquetes Dinámicos (`MS_PKG`)
* **Código / Identificador:** `MS_PKG`
* **Esquema de Persistencia:** `schema_paquetes`
* **Capa ORM:** TypeORM con `PaqueteEntity`, `PaqueteItemEntity` y `ContratoPromocionesEntity`.
* **Framework Backend:** NestJS 10.x (`PaquetesModule`, `promotions-packages.controller.ts`, `promotions-packages.service.ts`).
* **Protocolo de Comunicación:** REST (HTTP/1.1 JSON).
* **Ruta Base:** `/api/v1/paquetes`
* **Contratos y Endpoints:**
  * `GET /api/v1/paquetes`:
    - *Response (200 OK):* Catálogo de paquetes turísticos preconfigurados con porcentaje de descuento combo.
  * `POST /api/v1/paquetes/validar-combo`:
    - *Request Body:* `{ items: [{ tipo_servicio: string, external_item_id: string, proveedor_id: string, destino: string, fecha_inicio: string, fecha_fin: string, precio: number }] }`.
    - *Response (200 OK):* `{ es_combo_valido: boolean, porcentaje_descuento: number, monto_descuento: number, precio_final: number, regla_aplicada: string }`.
    - *Lógica de Negocio:*
      1. Verifica que los servicios pertenezcan a 2 o más verticales distintas (ej. Vuelo + Hotel o Hotel + Tour).
      2. Valida que el destino geográfico coincida (ej. ambos en "Galápagos" o "Quito").
      3. Verifica que en `contrato_promociones` los proveedores tengan `permite_paquete = true`.
      4. Aplica el descuento combo sin sobrepasar `descuento_maximo` (ej. 20%).
* **Interfaz de Administración:** Interfaz gráfica para armado de combos, definición de destinos compatibles y configuración de techos de descuento comercial.

---

#### 💰 6. Microservicio: Finanzas y Liquidaciones (`MS_FIN`)
* **Código / Identificador:** `MS_FIN`
* **Esquema de Persistencia:** `schema_finanzas`
* **Capa ORM:** TypeORM con `LiquidacionProveedorEntity` mapeada a `schema_finanzas.liquidaciones_proveedor`.
* **Framework Backend:** NestJS 10.x (`FinanzasModule`, `finanzas.controller.ts`, `finanzas.service.ts`).
* **Protocolo de Comunicación:** REST (HTTP/1.1 JSON).
* **Ruta Base:** `/api/v1/finanzas`
* **Contratos y Endpoints:**
  * `POST /api/v1/finanzas/calcular-corte`:
    - *Request Body:* `{ proveedor_id: string, periodo_inicio: string, periodo_fin: string }`.
    - *Response (201 Created):* Genera el registro de corte. Suma el total vendido en el periodo por ese proveedor, retiene la comisión contractual de Booking (10%), y calcula el `monto_neto_pagar` al compañero.
  * `GET /api/v1/finanzas/liquidaciones`:
    - *Response (200 OK):* Listado de liquidaciones filtrables por estado (`PENDIENTE`, `PAGADO`, `EN_DISPUTA`).
  * `PATCH /api/v1/finanzas/liquidaciones/:id/pagar`:
    - *Request Body:* `{ comprobante_transferencia_url: string, fecha_pago: string }`.
    - *Response (200 OK):* Transición a `PAGADO` con registro inmutable de la transferencia bancaria hacia el compañero.
* **Interfaz de Administración:** Panel contable para visualizar balances por tienda socia (Dilan Atracciones, Rent-a-car, Aerolínea), exportación a PDF/Excel y carga de comprobantes de transferencia.

---

#### 📡 7. Microservicio: Proveedores y Monitor de Nodos (`MS_PROV`)
* **Código / Identificador:** `MS_PROV`
* **Esquema de Persistencia:** `schema_proveedores`
* **Capa ORM:** TypeORM con `ConfigProveedorEntity` mapeada a `schema_proveedores.config_proveedores`.
* **Framework Backend:** NestJS 10.x (`ProveedoresModule`, `connector-health.service.ts`, `nodes.controller.ts`).
* **Protocolo de Comunicación:** REST (HTTP/1.1 JSON).
* **Ruta Base:** `/api/v2/admin/nodes`
* **Contratos y Endpoints:**
  * `GET /api/v2/admin/nodes/health`:
    - *Response (200 OK):* Inspecciona los 5 nodos del sistema (4 tiendas externas + Booking Core). Retorna latencia en ms, estado semafórico (`HEALTHY 🟢` < 200ms, `DEGRADED 🟡` 200-800ms, `DOWN 🔴` > 800ms o error) y estado del Circuit Breaker (`CLOSED`, `OPEN`, `MANUALLY_OPEN`).
  * `POST /api/v2/admin/nodes/:id/toggle`:
    - *Request Body:* `{ kill_switch: boolean, motivo?: string }`.
    - *Response (200 OK):* **Kill-Switch Dinámico.** Fuerza la desconexión inmediata en caliente de un proveedor sin necesidad de reiniciar el servidor. Si está apagado, el ESB no enruta peticiones hacia esa tienda y activa el fallback de catálogo en caché.
  * `POST /api/v2/admin/nodes/:id/ping`:
    - *Response (200 OK):* Ejecuta un ping síncrono al endpoint `/health` del proveedor para medir latencia de red al instante.
* **Interfaz de Administración:** Dashboard con tarjetas visuales por nodo, indicadores LED de estado en tiempo real, velocímetro de latencia y switches de aislamiento de emergencia.

---

#### 🏛️ 8. Microservicio: Atracciones Turísticas (`MS_ATR`)
* **Código / Identificador:** `MS_ATR`
* **Esquema de Persistencia:** `schema_atracciones`
* **Capa ORM:** TypeORM con:
  - `AtraccionCacheEntity` (`schema_atracciones.atracciones_cache`)
  - `CategoriaRecursivaEntity` con decorador `@Tree('closure-table')` (`schema_atracciones.categorias_recursivas`)
  - `ReservaAtraccionEntity` (`schema_atracciones.reservas_atraccion`)
* **Framework Backend:** NestJS 10.x (`AtraccionesModule`, `atracciones.controller.ts`, `atracciones.service.ts`, `dilan-adapter.service.ts`).
* **Protocolo de Comunicación:** REST (HTTP/1.1 JSON).
* **Ruta Base:** `/api/v2/atracciones`
* **Contratos y Endpoints:**
  * `GET /api/v2/atracciones`:
    - *Query Params:* `search`, `categoria_id`, `min_precio`, `max_precio`, `ciudad`, `page`, `limit`.
    - *Response (200 OK):* Catálogo paginado de tours y atracciones sincronizado con la tienda de Dilan.
  * `GET /api/v2/atracciones/categorias/arbol`:
    - *Response (200 OK):* Retorna la jerarquía completa de categorías en formato de árbol anidado (ej. `Turismo Cultural -> Transporte Incluido -> Guía Bilingüe`).
  * `POST /api/v2/atracciones/reservas/:id/checkin`:
    - *Request Body:* `{ codigo_reserva: string, hora_presentacion: string }`.
    - *Response (200 OK):* Asigna guía turístico asignado, genera el enlace del `voucher_qr_url` para escaneo físico en la puerta del tour y marca el estado en `CHECKED_IN`.
  * `POST /api/v2/atracciones/reservas/:id/cancel`:
    - *Header Obligatorio:* `Idempotency-Key: <UUID>`
    - *Response (200 OK):* Orquestador Saga de Cancelación: revierte el cupo en la tienda de Dilan vía llamada REST outbound obligatoria, emite el comprobante de reembolso `REF-ATR-XXXXX` y transiciona el estado a `CANCELADA` con reembolso al 100%.
* **Interfaz de Administración:** Administrador del árbol de categorías recursivas (creación y reordenamiento de nodos padre-hijo) y visor de reservas con estado de check-in y vouchers QR.

---

#### 🚗 9. Microservicio: Autos y Flota Vehicular (`MS_AUT`)
* **Código / Identificador:** `MS_AUT`
* **Esquema de Persistencia:** `schema_autos`
* **Capa ORM:** TypeORM con:
  - `AutoCacheEntity` (`schema_autos.autos_cache`)
  - `ReservaAutoEntity` (`schema_autos.reservas_auto`)
  - `MantenimientoAutoEntity` (`schema_autos.mantenimiento_autos`)
* **Framework Backend:** NestJS 10.x (`AutosModule`, `autos.controller.ts`, `autos.service.ts`) con módulo de tareas cronometradas (`@nestjs/schedule`).
* **Protocolo de Comunicación:** REST (HTTP/1.1 JSON).
* **Ruta Base:** `/api/v2/autos`
* **Lógica Especial de Dominio (Máquina de 6 Estados y Cooldown de 2 Horas):**
  * Estados del Vehículo: `DISPONIBLE` ➔ `RESERVADO` ➔ `LISTO_PARA_ENTREGAR` ➔ `ENTREGADO` ➔ `EN_LIMPIEZA` ➔ `EN_MANTENIMIENTO`.
  * **Cooldown Cronometrado de 2 Horas:**
    - Al ejecutarse la devolución del auto, el estado cambia a `EN_LIMPIEZA` y se graba `limpieza_inicio = NOW()`.
    - El microservicio ejecuta una tarea cron `@Cron('*/1 * * * *')` cada 60 segundos que evalúa:
      `WHERE estado = 'EN_LIMPIEZA' AND NOW() >= limpieza_inicio + INTERVAL '2 hours'`.
    - Una vez cumplidas las 2 horas exactas, el vehículo transiciona automáticamente a `DISPONIBLE`, garantizando que ningún usuario pueda alquilar un vehículo sin el protocolo estricto de desinfección y limpieza.
* **Contratos y Endpoints:**
  * `GET /api/v2/autos`: Flota filtrable por gama, transmisión y disponibilidad real.
  * `POST /api/v2/autos/orders/:id/checkin`:
    - *Request Body:* `{ conductor_nombre: string, conductor_licencia: string, km_salida: number, deposito_garantia: number }`.
    - *Response (200 OK):* Pasa a `ENTREGADO`.
  * `POST /api/v2/autos/:id/devolucion`:
    - *Request Body:* `{ km_llegada: number, combustible_nivel: string, danos_reportados?: string }`.
    - *Response (200 OK):* Pasa a `EN_LIMPIEZA` e inicia el temporizador de 2 horas.
  * `POST /api/v2/autos/:id/mantenimiento`:
    - *Acción Exclusiva (Rol Mantenimiento):* Registro de revisión física (frenos, aceite, llantas). Si `km_actual >= umbral_mantenimiento_km`, activa `alerta_mantenimiento = true` y bloquea el auto en `EN_MANTENIMIENTO`.
* **Interfaz de Administración:** Monitor de patio con cronómetros regresivos visuales para los vehículos en limpieza de 2 horas y panel de control de flota para el personal de taller.

---

#### 🏨 10. Microservicio: Alojamientos (`MS_ALO`)
* **Código / Identificador:** `MS_ALO`
* **Esquema de Persistencia:** `schema_alojamientos`
* **Capa ORM:** TypeORM con `AlojamientoCacheEntity`, `TipoHabitacionEntity`, `ReservaAlojamientoEntity` y `HuespedReservaEntity`.
* **Framework Backend:** NestJS 10.x (`AlojamientosModule`, `alojamientos.controller.ts`, `alojamientos.service.ts`).
* **Protocolo de Comunicación:** REST (HTTP/1.1 JSON).
* **Ruta Base:** `/api/v2/alojamientos`
* **Lógica Especial de Dominio (Check-in Digital a partir de las 14:00):**
  * El check-in digital sólo se desbloquea a partir de las 14:00 del día de entrada (`checkin_fecha`). Si el huésped intenta el check-in antes, el servicio retorna error de regla de negocio `422 Unprocessable Entity ("El check-in digital se habilita a las 14:00 horas")` a menos que tenga activado el flag `early_checkin_autorizado`.
* **Contratos y Endpoints:**
  * `GET /api/v2/alojamientos`: Catálogo de hoteles, departamentos y hostales con filtros por ciudad, estrellas y precio.
  * `GET /api/v2/alojamientos/:id/habitaciones`: Tipos de habitación disponibles para la propiedad.
  * `POST /api/v2/alojamientos/reservations/:id/checkin`:
    - *Request Body:* `{ huesped_titular_dni: string, huespedes_adicionales?: Array<{ nombre: string, identificacion: string }> }`.
    - *Response (200 OK):* `{ reserva_id: string, estado: 'CHECKED_IN', habitacion_asignada: 'Habitación Suite 402', clave_acceso_digital: 'PIN-9812#', checkin_hora: string }`.
  * `POST /api/v2/alojamientos/reservations/:id/checkout`:
    - *Response (200 OK):* Cierre de estancia, cálculo de consumos adicionales y liberación de la habitación.
* **Interfaz de Administración:** Vista de recepción con matriz de habitaciones ocupadas, pendientes de limpieza y registro de check-ins digitales completados.

---

#### ✈️ 11. Microservicio: Vuelos (`MS_VUE`)
* **Código / Identificador:** `MS_VUE`
* **Esquema de Persistencia:** `schema_vuelos`
* **Capa ORM:** TypeORM con `VueloCacheEntity`, `ReservaVueloEntity`, `AsientoVueloEntity` y `PaseAbordarEntity`.
* **Framework Backend:** NestJS 10.x (`VuelosModule`, `vuelos.controller.ts`, `vuelos.service.ts`).
* **Protocolo de Comunicación:** REST (HTTP/1.1 JSON).
* **Ruta Base:** `/api/v2/vuelos`
* **Lógica Especial de Dominio (PNR, Asiento Interactivo y Pase de Abordar Digital):**
  * Al confirmarse una reserva aérea, se genera un código PNR alfanumérico único de 6 caracteres bajo normativa IATA (ej. `PNR-7K2X9M`).
  * En el check-in, el pasajero escoge su asiento físico en el mapa de cabina (`asiento_asignado`), bloqueándolo de forma concurrente con exclusión mutua para evitar doble asignación.
  * Tras el check-in se genera el pase de abordar digital con código de barras en formato imprimible o descargable.
* **Contratos y Endpoints:**
  * `GET /api/v2/vuelos`: Búsqueda de rutas por origen, destino, fechas y clase (`ECONOMY`, `BUSINESS`).
  * `GET /api/v2/vuelos/:id/asientos`: Mapa de asientos del avión indicando ocupados y disponibles (ventana, pasillo).
  * `POST /api/v2/vuelos/bookings/:id/check-in`:
    - *Request Body:* `{ pasajero_identificacion: string, asiento_deseado: string }`.
    - *Response (200 OK):* `{ pnr: '7K2X9M', pasajero: string, vuelo_numero: 'EQ-312', asiento_asignado: '14A', puerta_embarque: 'Puerta B4', pase_abordar_url: 'https://storage.../boarding-passes/7K2X9M.pdf', codigo_barras: 'BC-7K2X9M-14A' }`.
* **Interfaz de Administración:** Manifiesto de vuelo con listado de pasajeros registrados, control de puertas de embarque y estado de asignación de cabina.

---

#### ⚡ 12. Microservicio: Ingesta de Stock e Inventario gRPC (`MS_STK`)
* **Código / Identificador:** `MS_STK`
* **Esquema de Persistencia / Almacén:** **Memoria RAM / Redis (`Map<string, InventoryRecord>`)**.
  - *No utiliza ORM relacional:* Evita saturar PostgreSQL con miles de transacciones por segundo provenientes de las tiendas de los compañeros.
* **Framework Backend:** NestJS 10.x (`InventoryModule`, `inventory-grpc.controller.ts`, `inventory.service.ts`).
* **Protocolo de Red:** **gRPC sobre HTTP/2 multiplexado en el puerto TCP 50051**.
* **Contrato Protobuf:** `src/proto/inventory.proto` (paquete `inventory`).

##### Contrato Protobuf Completo (`src/proto/inventory.proto`):
```protobuf
syntax = "proto3";

package inventory;

// Servicio gRPC Inbound para recepción de actualizaciones de inventario en tiempo real
// Las tiendas individuales envían su stock hacia Booking Prototipo mediante HTTP/2 multiplexado
service InventoryStockService {
  // Envío puntual de actualización de cupos
  rpc PushStockUpdate (StockUpdateMessage) returns (StockUpdateAck);

  // Streaming continuo de eventos de cambio de inventario
  rpc StreamInventoryChanges (stream StockChangeEvent) returns (StreamSummary);
}

message StockUpdateMessage {
  string service_id = 1;      // Identificador de la tienda (ej. "atracciones-dilan")
  string item_id = 2;         // ID de la atracción o tour
  string date = 3;            // Fecha en formato YYYY-MM-DD
  string time_slot = 4;       // Franja horaria (ej. "10:30 a.m.")
  int32 available_units = 5;  // Cupos remanentes disponibles
  int64 timestamp = 6;        // Epoch timestamp
}

message StockUpdateAck {
  bool success = 1;
  string message = 2;
  int64 processed_at = 3;
}

message StockChangeEvent {
  string event_id = 1;
  string service_id = 2;
  string item_id = 3;
  string date = 4;
  string time_slot = 5;
  int32 delta = 6;            // Cambio neto (+1, -2)
  int64 timestamp = 7;
}

message StreamSummary {
  int32 total_events_processed = 1;
  bool is_synchronized = 2;
  string last_sync_hash = 3;
}
```

##### Implementación del Controlador gRPC en NestJS:
```typescript
@Controller()
export class InventoryGrpcController {
  constructor(private readonly inventoryService: InventoryService) {}

  @GrpcMethod('InventoryStockService', 'PushStockUpdate')
  pushStockUpdate(data: StockUpdateMessage): StockUpdateAck {
    return this.inventoryService.processPushStockUpdate(data);
  }

  @GrpcStreamMethod('InventoryStockService', 'StreamInventoryChanges')
  streamInventoryChanges(messages$: Observable<StockChangeEvent>): Observable<StreamSummary> {
    return new Observable<StreamSummary>((observer) => {
      let count = 0;
      messages$.subscribe({
        next: (event) => {
          count++;
          this.inventoryService.applyStockDelta(event);
        },
        error: (err) => observer.error(err),
        complete: () => {
          const hash = `hash-sync-${Date.now().toString(36).toUpperCase()}`;
          observer.next({
            total_events_processed: count,
            is_synchronized: true,
            last_sync_hash: hash,
          });
          observer.complete();
        },
      });
    });
  }
}
```

* **Flujo Operativo e Integración con RabbitMQ:**
  1. La tienda socia envía el mensaje gRPC por el puerto 50051 sobre HTTP/2.
  2. `InventoryService` actualiza el registro en el `Map<string, InventoryRecord>` en memoria RAM (< 2ms).
  3. `InventoryService` publica inmediatamente el evento `stock.actualizado` a RabbitMQ.
  4. Los microservicios orquestados y GraphQL consumen ese evento para reflejar la disponibilidad real al usuario final sin realizar ninguna consulta SQL pesada a PostgreSQL.
* **Interfaz de Administración:** Monitor de telemetría gRPC con velocímetro de throughput (mensajes recibidos por segundo), latencia de red, gráfica de eventos en streaming y estado de sincronización por proveedor.

---

### 5.5. Conectividad y Mapeo hacia la Capa 3 (ESB)

Los 12 microservicios básicos expuestos en esta Capa 2 se acoplan directamente a las dos subdivisiones del **Enterprise Service Bus (ESB)**:

```mermaid
graph LR
    subgraph Capa 2: Microservicios Basicos
        MS_1[MS Clientes]
        MS_2[MS Carrito]
        MS_3[MS Facturación]
        MS_4[MS Pagos SOA]
        MS_5[MS Paquetes]
        MS_6[MS Finanzas]
        MS_7[MS Proveedores]
        
        MS_8[MS Atracciones]
        MS_9[MS Autos]
        MS_10[MS Alojamientos]
        MS_11[MS Vuelos]
        MS_12[MS Stock gRPC]
    end

    subgraph Capa 3: Enterprise Service Bus
        subgraph ESB Capa Interna
            ESB_INT[Gestor de Servicios Propios Booking]
        end
        subgraph ESB Capa Integracion Externa
            ESB_EXT[Gestor de Conexiones Socios Externos]
        end
        ESB_CORE[Enrutador y Orquestador de Negocio: Sustituto de SQL JOINs]
    end

    MS_1 & MS_2 & MS_3 & MS_4 & MS_5 & MS_6 & MS_7 -->|REST Interno| ESB_INT
    MS_8 & MS_9 & MS_10 & MS_11 -->|REST Adaptado| ESB_EXT
    MS_12 -->|Streams gRPC Puerto 50051| ESB_EXT

    ESB_INT --> ESB_CORE
    ESB_EXT --> ESB_CORE
```

* **Capa Interna del ESB:** Consume exclusivamente los microservicios propietarios de Booking (1 al 7), garantizando que las reglas fiscales, cálculo de carritos, validación de clientes y liquidaciones se procesen con alta cohesión y baja latencia.
* **Capa de Integración Externa del ESB:** Recibe las conexiones y adapta los contratos heterogéneos de los 4 proveedores externos (Atracciones Dilan, Rent-a-car, Hoteles, Aerolíneas) mediante adaptadores REST outbound y el receptor gRPC inbound en el puerto 50051.
* **Sustitución de SQL JOINs en la Capa de Aplicación:** Cuando se solicita una factura detallada, el ESB invoca en paralelo a `MS_FAC` (`GET /api/v1/facturas/:id`), a `MS_CLI` (`GET /api/v1/clientes/:id`) y a los microservicios de catálogo o reserva correspondientes. El ESB fusiona los objetos en memoria y genera el DTO orquestado unificado, demostrando en la práctica la eliminación de uniones SQL a nivel de base de datos.

---

## 6. CAPA 3: ESB CENTRALIZADO DE DOS CAPAS Y REGLAS DE ORQUESTACIÓN

### 6.1. Filosofía, Misión y Dualidad Arquitectónica del ESB

Siguiendo las directrices docentes de la pizarra arquitectónica:
> *"Luego, esto se conecta como microservicio al ESB; luego, nuevamente se generan los microservicios ya orquestados, es decir, que la factura ya sabe a qué cliente y productos pertenece... Debemos añadir un Event Bus que está conectado al ESB ya que este último es quien tiene la lógica de saber si un servicio es de eventos o no"*.

El **Enterprise Service Bus (ESB)** no es un pasamanos pasivo ni un proxy inverso convencional; es el **motor central de mediación, enrutamiento semántico, transformación canónica de datos y el sustituto formal de los SQL `JOINs` entre esquemas aislados**.

```mermaid
graph TB
    %% ---- ENTRADA DE MICROSERVICIOS BÁSICOS ----
    subgraph Capa 2: Microservicios Basicos Entrantes
        MS_INT[MS Propietarios Booking: Clientes, Carrito, Facturas, Pagos, Paquetes, Finanzas, Proveedores]
        MS_EXT[MS Adaptados / Socios: Atracciones, Autos, Alojamientos, Vuelos, Stock gRPC 50051]
    end

    %% ---- ESB CENTRALIZADO ----
    subgraph Capa 3: Enterprise Service Bus Centralizado
        direction TB

        subgraph ESB Capa Interna: Negocio Booking
            ROUTER_INT[Enrutador de Negocio Interno]
            JOIN_ENGINE[Motor de Agregacion en Memoria: Sustituto de SQL JOINs]
            CHECKOUT_ORQ[Orquestador del Checkout Transaccional]
        end

        subgraph ESB Capa Integracion Externa: Socios Heterogeneos
            ACL_MGR[Gestor de Adaptadores Anti-Corruption Layer - ACL]
            DISPATCH_OUT[Despachador Outbound REST: Contrato Obligatorio]
            GRPC_INGEST[Receptor Inbound gRPC: Ingesta de Stock 50051]
            CB_MGR[Gestor de Resiliencia: Circuit Breakers Opossum y Kill-Switches]
        end

        subgraph Modulo Central de Decision y Coreografia
            DECISION_GATE{Bifurcacion de Trafico: Sincrono vs Reactivo}
            SAGA_COORD[Coordinador de Sagas y Compensaciones Atómicas]
        end

        ROUTER_INT <--> JOIN_ENGINE
        JOIN_ENGINE <--> CHECKOUT_ORQ
        
        ACL_MGR <--> DISPATCH_OUT
        GRPC_INGEST <--> CB_MGR
        
        CHECKOUT_ORQ <--> SAGA_COORD
        SAGA_COORD <--> DISPATCH_OUT
        
        ROUTER_INT <--> DECISION_GATE
        ACL_MGR <--> DECISION_GATE
    end

    %% ---- INTERACCIONES EXTERNAS E INTERNAS ----
    MS_INT <-->|REST Interno / mTLS| ROUTER_INT
    MS_EXT <-->|REST Canónico| ACL_MGR
    MS_EXT -->|gRPC Inbound| GRPC_INGEST

    %% ---- SALIDAS ----
    DECISION_GATE -->|Trafico Asincrono / Masivo| EV_BUS[Capa 4: Event Bus RabbitMQ]
    EV_BUS -->|Eventos de Retorno / Sagas| SAGA_COORD

    CHECKOUT_ORQ --> ORQ_SERVICES[Capa 5: Microservicios Orquestados Enriquecidos]
    JOIN_ENGINE --> ORQ_SERVICES
```

#### Dualidad Estructural: Las Dos Capas del ESB
1. **Capa Interna (Negocio Propietario de Booking):**
   * Encapsula los microservicios que gobiernan la plataforma de Booking.
   * Conecta de forma confiable los 7 microservicios internos: `MS_CLI`, `MS_CAR`, `MS_FAC`, `MS_PAG`, `MS_PKG`, `MS_FIN` y `MS_PROV`.
   * Ejecuta la **composición en memoria** para reemplazar los `JOINs` que la base de datos ya no puede realizar debido a la separación estricta de esquemas.
   * Dirige el flujo secuencial y atómico del checkout de compra.
2. **Capa de Integración Externa (Gestión de Socios Heterogéneos):**
   * Encapsula el puente hacia las tiendas externas de los compañeros (Dilan Atracciones, Rent-a-car, Alojamientos, Vuelos).
   * Contiene la **Capa Anti-Corrupción (ACL)** para homogeneizar los modelos de datos dispares hacia interfaces canónicas.
   * Controla el **despacho outbound por REST con contrato de respuesta obligatoria** (`201 Created` con `external_order_id` o `409 Conflict`).
   * Gobierna la tolerancia a fallos mediante **Circuit Breakers (`opossum`)** y la desconexión selectiva de nodos mediante **Kill-Switches dinámicos**.

---

### 6.2. Capa Interna del ESB (Orquestación del Negocio Propietario)

#### 1. Mecanismo de Sustitución de SQL JOINs (Composición en Memoria)
Debido a que la Capa 1 prohíbe terminantemente las relaciones foráneas cruzadas (`FOREIGN KEY`) entre esquemas (`schema_facturacion`, `schema_clientes`, etc.), el ESB asume la responsabilidad de ensamblar las vistas integrales de negocio mediante **paralelismo asíncrono en memoria RAM**:

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Capa GraphQL (BFF)
    participant ESB as ESB: Motor de Agregación
    participant MS_FAC as MS Facturas (schema_facturacion)
    participant MS_CLI as MS Clientes (schema_clientes)
    participant MS_PKG as MS Paquetes (schema_paquetes)
    participant MS_PAG as MS Pagos (schema_pagos)

    Cliente->>ESB: GET /orchestrated/facturas/:id
    ESB->>MS_FAC: GET /api/v1/facturas/:id (Obtiene Encabezado y Líneas crudas)
    MS_FAC-->>ESB: { id, cliente_id, total, items: [{ external_item_id, tipo_servicio, ... }] }
    
    Note over ESB: Agregación en Memoria (Reemplazo de SQL JOIN)
    par Consulta de Datos de Usuario
        ESB->>MS_CLI: GET /api/v1/clientes/:clienteId
        MS_CLI-->>ESB: { nombre: "Paúl Rosero", cedula: "1723456789", email: "paul@epn.edu.ec" }
    and Consulta de Estado de Pago
        ESB->>MS_PAG: GET /api/v1/pagos/factura/:id
        MS_PAG-->>ESB: { codigo_autorizacion: "AUTH-VISA-982341", metodo: "TARJETA_CREDITO" }
    and Verificación de Combo / Descuentos
        ESB->>MS_PKG: POST /api/v1/paquetes/validar-combo (Items de la Factura)
        MS_PKG-->>ESB: { es_combo_valido: true, descuento: 15%, nombre_combo: "Pack Galápagos Aventura" }
    end

    Note over ESB: Fusiona DTOs en memoria sin JOINs relacionales
    ESB-->>Cliente: FacturaOrquestadaDto (JSON Completo y Enriquecido)
```

##### Implementación Canónica del Servicio de Agregación (`InvoiceAggregationService`):
```typescript
@Injectable()
export class InvoiceAggregationService {
  constructor(
    private readonly httpService: HttpService,
    private readonly winstonLogger: WinstonPhysicalLoggerService,
  ) {}

  /**
   * Reemplazo formal de SQL JOIN en la capa de aplicación.
   * Invoca concurrentemente los microservicios básicos y fusiona los objetos en memoria.
   */
  async buildOrchestratedInvoice(facturaId: string): Promise<FacturaOrquestadaDto> {
    const startTime = Date.now();

    // 1. Obtener la factura cruda desde MS_FAC
    const facturaRaw = await this.fetchFromService<FacturaRawDto>(
      `http://ms-facturacion:3003/api/v1/facturas/${facturaId}`,
    );

    // 2. Ejecutar consultas concurrentes en paralelo (Evita latencia en cascada)
    const [cliente, transaccionPago, comboInfo] = await Promise.all([
      this.fetchFromService<ClienteDto>(
        `http://ms-clientes:3001/api/v1/clientes/${facturaRaw.clienteId}`,
      ),
      this.fetchFromService<PagoDto>(
        `http://ms-pagos:3004/api/v1/pagos/factura/${facturaId}`,
      ).catch(() => null), // Resiliencia si el pago aún no se asocia
      this.fetchFromService<ComboValidationDto>(
        `http://ms-paquetes:3005/api/v1/paquetes/validar-combo`,
        'POST',
        { items: facturaRaw.detalles },
      ).catch(() => ({ es_combo_valido: false, porcentaje_descuento: 0 })),
    ]);

    // 3. Ensamblar el DTO Orquestado Unificado
    const facturaOrquestada: FacturaOrquestadaDto = {
      facturaId: facturaRaw.id,
      numeroFactura: facturaRaw.numeroFactura,
      fechaEmision: facturaRaw.createdAt,
      estado: facturaRaw.estado,
      totales: {
        subtotal: facturaRaw.subtotal,
        iva: facturaRaw.iva,
        descuentoCombo: comboInfo.porcentaje_descuento,
        totalPagar: facturaRaw.total,
      },
      cliente: {
        id: cliente.id,
        nombreCompleto: `${cliente.nombre} ${cliente.apellido}`,
        identificacion: cliente.identificacion,
        email: cliente.email,
        telefono: cliente.telefono,
      },
      pago: transaccionPago ? {
        transaccionId: transaccionPago.id,
        codigoAutorizacion: transaccionPago.codigoAutorizacion,
        metodoPago: transaccionPago.metodoPago,
        estadoPago: transaccionPago.estado,
      } : null,
      lineas: facturaRaw.detalles.map(detalle => ({
        detalleId: detalle.id,
        tipoServicio: detalle.tipoServicio,
        externalItemId: detalle.externalItemId,
        titulo: detalle.titulo,
        cantidad: detalle.cantidad,
        precioUnitario: detalle.precioUnitario,
        subtotalLinea: detalle.subtotal,
        despachoExterno: {
          externalOrderId: detalle.externalOrderId,
          estadoDespacho: detalle.estadoDespacho,
        },
      })),
    };

    const duration = Date.now() - startTime;
    this.winstonLogger.logAudit(
      `[ESB-INVOICE-AGGREGATOR] Factura ${facturaRaw.numeroFactura} orquestada en memoria en ${duration}ms sin SQL JOINs`,
      'InvoiceAggregationService',
    );

    return facturaOrquestada;
  }

  private async fetchFromService<T>(url: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.request<T>({ url, method, data: body, timeout: 2500 }),
    );
    return response.data;
  }
}
```

#### 2. Orquestador del Checkout Transaccional (Happy Path Paso a Paso)
Cuando el usuario presiona "Confirmar Compra", la Capa Interna del ESB coordina la transacción distribuida paso a paso:
1. **Validación de Carrito:** Consulta `MS_CAR` para confirmar que los ítems siguen activos y no han expirado.
2. **Evaluación de Descuentos por Paquetes:** Consulta `MS_PKG` para verificar si aplica regla de combinación combo.
3. **Emisión de Factura Preliminar:** Invoca `MS_FAC` con cabecera `Idempotency-Key` en estado `EMITIDA`.
4. **Cobro Bancario SOA:** Invoca `MS_PAG` para procesar el pago y emitir el código `AUTH-VISA-XXXXX`.
5. **Transición Fiscal:** Actualiza la factura a `PAGADA` en `MS_FAC`.
6. **Disparo de Despacho Asíncrono:** Emite el evento `ordenes.confirmadas` a RabbitMQ para que la Capa de Integración Externa reserve en las tiendas de los compañeros con contrato obligatorio.
7. **Cálculo de Liquidación Financiera:** Registra en `MS_FIN` la retención del 10% de comisión de Booking.
8. **Limpieza:** Ordena a `MS_CAR` vaciar los ítems del carrito.

---

### 6.3. Capa de Integración Externa del ESB (Socios y Nodos Heterogéneos)

#### 1. Arquitectura de Adaptadores Anti-Corruption Layer (ACL)
Cada tienda externa posee modelos de dominio divergentes. La Capa de Integración Externa interpone un adaptador ACL por cada vertical para transformar las estructuras externas en modelos canónicos uniformes para Booking:

```
[Tienda Compañero Dilan: Atracciones]  ---> [DilanAtraccionesAdapter (ACL)]  ---> CanonicalAtraccionDto
[Tienda Compañero Autos: Rent-a-car]   ---> [RentACarAdapter (ACL)]          ---> CanonicalAutoDto
[Tienda Compañero Hoteles: Alojamientos] -> [AlojamientosAdapter (ACL)]      ---> CanonicalAlojamientoDto
[Tienda Compañero Vuelos: Aerolíneas]  ---> [VuelosAdapter (ACL)]            ---> CanonicalVueloDto
```

##### Ejemplo de Mapeo ACL (`DilanAtraccionesAdapter`):
```typescript
@Injectable()
export class DilanAtraccionesAdapter {
  /**
   * Adapta el JSON propietario de Dilan hacia la interfaz canónica de Booking
   */
  adaptTourToCanonical(dilanRaw: any): CanonicalAtraccionDto {
    return {
      id: dilanRaw._id || dilanRaw.id,
      titulo: dilanRaw.nombre_tour || dilanRaw.titulo,
      descripcion: dilanRaw.descripcion_detallada,
      ciudad: dilanRaw.ubicacion?.ciudad || 'Quito',
      precio: Number(dilanRaw.tarifa_adulto || dilanRaw.precio),
      cuposDisponibles: Number(dilanRaw.cupos_remanentes || 0),
      categoria: {
        id: dilanRaw.categoria_codigo,
        nombre: dilanRaw.categoria_nombre,
        incluyeComida: Boolean(dilanRaw.incluye_alimentacion),
        incluyeTransporte: Boolean(dilanRaw.incluye_transporte),
        incluyeGuia: Boolean(dilanRaw.guia_certificado),
      },
      imagenUrl: dilanRaw.galeria_fotos?.[0] || 'https://images.unsplash.com/photo-tour.jpg',
      permitePaquete: Boolean(dilanRaw.aplica_descuento_combo ?? true),
      proveedor: {
        id: 'proveedor-atracciones-dilan',
        nombre: 'Atracciones Dilan & Tours',
      },
    };
  }
}
```

#### 2. Despacho Outbound REST con Contrato de Respuesta Obligatoria
Al confirmarse una compra, el ESB despacha la orden hacia la tienda del compañero mediante una llamada REST Outbound (`POST /api/v1/orders` o `/bookings`).

> [!IMPORTANT]
> **Regla Inviolable del Contrato de Integración:**  
> La llamada hacia la tienda del compañero **NO es un evento de disparo ciego (*fire-and-forget*)**.  
> El contrato de integración exige que la tienda externa procese la reserva en su base de datos y retorne una **respuesta formal HTTP síncrona obligatoria**:

| Código HTTP Retornado | Significado de Negocio | Acción del ESB |
|---|---|---|
| **`201 Created`** | **Reserva Exitosa en la Tienda del Compañero:** Retorna `{ external_order_id: "ORD-DILAN-8721", status: "CONFIRMADO", remaining_stock: 4 }`. | Registra el `external_order_id` en el detalle de la factura en `MS_FAC` y confirma la línea de compra. |
| **`409 Conflict`** | **Sin Stock / Conflicto de Cupos:** Retorna `{ error: "OUT_OF_STOCK", message: "Los cupos se agotaron antes de completar la orden" }`. | **Dispara de inmediato la Saga de Compensación:** revierte los demás servicios comprados y reembolsa el 100% de fondos al cliente. |
| **`500 / 504 Timeout`** | **Caída de Nodo o Timeout de Red (>3000ms):** La tienda del compañero no responde a tiempo. | El Circuit Breaker registra el fallo y transfiere el evento al coordinador de Saga para ejecución de reversa automática. |

#### 3. Receptor Inbound gRPC de Stock (Puerto TCP 50051)
* La Capa de Integración Externa expone el microservicio gRPC `MS_STK` operando sobre HTTP/2 multiplexado en el puerto TCP 50051.
* Las tiendas externas envían deltas de disponibilidad mediante el contrato [inventory.proto](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/src/proto/inventory.proto).
* Al recibir el stream, la Capa de Integración actualiza el mapa en memoria RAM/Redis en menos de 2ms y emite el evento `stock.actualizado` a RabbitMQ, desacoplando completamente el aluvión de telemetría de la base de datos relacional.

#### 4. Resiliencia: Circuit Breakers (Opossum) y Kill-Switch Dinámico
Cada conector hacia un proveedor externo está protegido por una instancia de Circuit Breaker (`opossum`) configurada en `ProveedoresModule`:
* **Timeout de petición externa:** 3,000 milisegundos.
* **Umbral de fallo (*Error Threshold Percentage*):** 50% de errores en una ventana de 10 segundos.
* **Tiempo de enfriamiento (*Reset Timeout*):** 30 segundos en estado `OPEN`.
* **Fallback Silencioso (*Graceful Degradation*):** Si el circuito está abierto, el ESB no arroja un error 500 al usuario; sirve el catálogo local en caché (`schema_atracciones.atracciones_cache`, `schema_autos.autos_cache`, etc.) marcando visualmente la bandera `datos_en_cache: true`.
* **Kill-Switch Manual en Caliente:** Si el administrador detecta anomalías en una tienda externa, presiona el botón de desconexión en el panel administrativo (`POST /api/v2/admin/nodes/:id/toggle`). El ESB conmuta el estado del nodo a `MANUALLY_OPEN`, aislando de inmediato el tráfico hacia ese compañero sin requerir reinicio del servidor.

---

### 6.4. Patrón Saga Orquestado en el ESB (Transacciones Distribuidas y Compensaciones)

Siguiendo las directrices de la Consideración RDA2 §8 ("Sagas y compensaciones"):
> *"Hay que tener en cuenta las compensaciones... por ejemplo: en el último paso del pago falla, pero ya se descontó el stock, ya se hizo todo; entonces hay que hacer un reverso o compensación"*.

En una compra multidominio (ej. Vuelo Quito-Galápagos + Hotel Resort + Tour de Buceo), Booking enfrenta una transacción distribuida entre 3 bases de datos externas y la base interna de Booking. El ESB actúa como el **Orquestador de Saga Centralizado (*Saga Execution Coordinator - SEC*)**:

```mermaid
stateDiagram-v2
    [*] --> IniciarSaga: Checkout Confirmado
    
    IniciarSaga --> CobroSOA: Paso 1: MS_PAG.procesar()
    CobroSOA --> DespachoVuelo: Cobro Exitoso (AUTH-VISA-982)
    CobroSOA --> FallaPago: Cobro Rechazado
    
    DespachoVuelo --> DespachoHotel: Vuelo Confirmado (201 Created: ORD-AIR-10)
    DespachoVuelo --> CompensarCobro: Vuelo Falla (409 Conflict)
    
    DespachoHotel --> DespachoAtraccion: Hotel Confirmado (201 Created: ORD-HTL-55)
    DespachoHotel --> CompensarVuelo: Hotel Falla (409 Conflict)
    
    DespachoAtraccion --> SagaCompletada: Tour Confirmado (201 Created: ORD-ATR-88)
    DespachoAtraccion --> CompensarHotel: Tour Falla (409 Conflict)
    
    state "Flujo de Compensación Automática (Rollback Distribuido)" as Rollback {
        CompensarHotel --> CancelarHotel: POST /external-orders/ORD-HTL-55/cancel
        CancelarHotel --> CompensarVuelo
        CompensarVuelo --> CancelarVuelo: POST /external-orders/ORD-AIR-10/cancel
        CancelarVuelo --> CompensarCobro
        CompensarCobro --> ReembolsarSOA: POST /api/v1/pagos/reembolsar (REF-BANCO-771)
        ReembolsarSOA --> FacturaReembolsada: PATCH /api/v1/facturas/:id/estado -> REEMBOLSADA
    }
    
    FacturaReembolsada --> NotificarFalloRFC7807: Respuesta RFC 7807 al Usuario
    FallaPago --> NotificarFalloRFC7807
    
    SagaCompletada --> [*]: 200 OK Factura Emitida y Despachada
    NotificarFalloRFC7807 --> [*]: 409 Conflict Reembolso Garantizado
```

#### Matriz de Transacciones y Acciones Compensatorias del ESB:

| Paso de la Saga | Servicio Invocado | Operación Hacia Adelante (*Forward*) | Acción Compensatoria (*Rollback*) | Estado de Compensación |
|---|---|---|---|---|
| **Paso 1** | `MS_PAG` (Pagos SOA) | `POST /api/v1/pagos/procesar` (Reserva fondos) | `POST /api/v1/pagos/reembolsar` (`REF-PAG-...`) | Emite comprobante de reverso monetario al 100%. |
| **Paso 2** | Tienda Compañero Vuelos | `POST /vuelos/orders` (Emite boleto) | `POST /vuelos/orders/:id/cancel` (Libera asiento) | Restaura cupo de asiento en el avión. |
| **Paso 3** | Tienda Compañero Hoteles | `POST /hoteles/orders` (Bloquea habitación) | `POST /hoteles/orders/:id/cancel` (Libera suite) | Devuelve habitación a estado disponible. |
| **Paso 4** | Tienda Compañero Dilan | `POST /atracciones/orders` (Reserva tour) | `POST /atracciones/orders/:id/cancel` (Devuelve cupos) | Restaura cupos de tour en la base de Dilan. |
| **Cierre** | `MS_FAC` (Facturación) | Transición a `PAGADA` | Transición a `REEMBOLSADA` | Invalida fiscalmente el cobro. |

##### Implementación del Coordinador de Saga (`SagaOrchestratorService`):
```typescript
@Injectable()
export class SagaOrchestratorService {
  constructor(
    private readonly pagosClient: PagosServiceClient,
    private readonly facturasClient: FacturasServiceClient,
    private readonly externalPartnerClient: ExternalPartnerClient,
    private readonly winstonLogger: WinstonPhysicalLoggerService,
  ) {}

  async executeCheckoutSaga(payload: CheckoutSagaPayload): Promise<SagaResult> {
    const compensations: Array<() => Promise<void>> = [];
    const sagaId = `SAGA-${Date.now().toString(36).toUpperCase()}`;

    try {
      this.winstonLogger.logAudit(`[SAGA ${sagaId}] Iniciando checkout transaccional multivertical`, 'SagaOrchestrator');

      // 1. Cobro en Pasarela SOA
      const pago = await this.pagosClient.procesarPago({
        facturaId: payload.facturaId,
        monto: payload.total,
        idempotencyKey: payload.idempotencyKey,
      });

      // Registrar compensación de pago
      compensations.push(async () => {
        this.winstonLogger.logAudit(`[SAGA ${sagaId}] Compensando pago ${pago.transaccionId}`, 'SagaOrchestrator');
        await this.pagosClient.reembolsarPago(pago.transaccionId, 'Fallo en reserva de socio externo');
      });

      // 2. Despachar a cada tienda socia por contrato obligatorio
      for (const item of payload.items) {
        const orderResponse = await this.externalPartnerClient.dispatchOrderWithContract({
          proveedorId: item.proveedorId,
          tipoServicio: item.tipoServicio,
          externalItemId: item.externalItemId,
          cantidad: item.cantidad,
          sagaId,
        });

        if (!orderResponse.success) {
          throw new Error(`Proveedor ${item.proveedorId} rechazó orden: ${orderResponse.errorMessage}`);
        }

        // Registrar compensación individual por socio
        compensations.push(async () => {
          this.winstonLogger.logAudit(
            `[SAGA ${sagaId}] Cancelando orden externa ${orderResponse.externalOrderId} en socio ${item.proveedorId}`,
            'SagaOrchestrator',
          );
          await this.externalPartnerClient.cancelOrder(item.proveedorId, orderResponse.externalOrderId);
        });

        // Grabar despacho en la línea de la factura
        await this.facturasClient.registrarDespacho(item.detalleId, orderResponse.externalOrderId);
      }

      // 3. Cierre exitoso de la Saga
      await this.facturasClient.actualizarEstado(payload.facturaId, 'PAGADA');
      this.winstonLogger.logAudit(`[SAGA ${sagaId}] Transacción completada con éxito`, 'SagaOrchestrator');

      return { success: true, sagaId, status: 'COMPLETED' };

    } catch (error: any) {
      this.winstonLogger.logError(`[SAGA ${sagaId}] ERROR CRÍTICO: ${error.message}. Iniciando compensaciones...`, error.stack);

      // Ejecutar compensaciones en orden inverso (LIFO)
      for (const rollbackAction of compensations.reverse()) {
        try {
          await rollbackAction();
        } catch (compensationError: any) {
          this.winstonLogger.logError(
            `[SAGA ${sagaId}] FALLO EN ACCIÓN COMPENSATORIA: ${compensationError.message}`,
            compensationError.stack,
          );
        }
      }

      // Marcar factura como REEMBOLSADA
      await this.facturasClient.actualizarEstado(payload.facturaId, 'REEMBOLSADA');

      return {
        success: false,
        sagaId,
        status: 'COMPENSATED',
        error: error.message,
      };
    }
  }
}
```

---

### 6.5. Reglas de Enrutamiento Inteligente: Decisión Síncrona vs. Event Bus (RabbitMQ)

El ESB contiene la lógica de decisión para clasificar el tráfico entrante, protegiendo al sistema de saturación:

```mermaid
graph TD
    INCOMMING[Petición Entrante al ESB] --> CHECK_TYPE{¿Tipo de Operación?}

    CHECK_TYPE -->|Transaccional Crítica: Requiere Consistencia Inmediata| SYNC_PATH[Canal Síncrono Directo: ESB Core]
    CHECK_TYPE -->|Volumétrica / Streaming / No Bloqueante| ASYNC_PATH[Desvío al Event Bus: RabbitMQ]

    subgraph Procesamiento Síncrono Directo
        SYNC_PATH --> OP_CHECKOUT[Checkout y Pagos SOA]
        SYNC_PATH --> OP_JOIN[Agregación de Facturas y Clientes]
        SYNC_PATH --> OP_CHECKIN[Check-in Vuelos / Autos / Alojamientos / Tours]
        SYNC_PATH --> OP_HEALTH[Monitor de Latencia y Kill-Switch de Nodos]
    end

    subgraph Absorción Asíncrona por RabbitMQ
        ASYNC_PATH --> EV_SEARCH[Búsquedas Masivas de Catálogo: Cola eventos.busquedas]
        ASYNC_PATH --> EV_CONFIRM[Notificaciones de Orden Confirmada: Cola ordenes.confirmadas]
        ASYNC_PATH --> EV_STOCK[Propagación de Deltas de Stock: Cola stock.actualizado]
        ASYNC_PATH --> EV_SAGA[Compensaciones Asíncronas Complejas: Cola sagas.compensacion]
    end
```

#### Criterios de Selección Síncrona vs. Eventos:
1. **¿Por qué las Búsquedas Masivas van al Event Bus?**
   * Cuando cientos o miles de usuarios navegan buscando vuelos, hoteles o tours simultáneamente, si cada búsqueda ejecutara llamadas HTTP síncronas al ESB hacia las tiendas de los compañeros, el ESB se congelaría por agotamiento de sockets.
   * El ESB desvía las consultas a la cola `eventos.busquedas` en RabbitMQ, donde un grupo de *workers* concurrentes consulta las cachés locales (`*_cache`) con limitación de tasa (*rate leveling*), devolviendo resultados fluidos sin degradar el núcleo transaccional.
2. **¿Por qué las Compras pasan por el ESB con contrato síncrono obligatorio?**
   * El dinero del usuario y los cupos de los socios no pueden gestionarse con eventualidad ciega. El usuario en el navegador necesita saber al instante si su tarjeta fue debitada y si su asiento de avión o tour fue asignado, requiriendo orquestación síncrona obligatoria bajo Saga.

---

### 6.6. Salida del ESB: Generación de los Microservicios Orquestados

La culminación de la Capa 3 es la emisión de los **Microservicios Orquestados** enriquecidos, los cuales constituyen la entrada directa para la **Capa 5 (Seguridad JWT)** y la **Capa 6 (GraphQL)**:

| Microservicio Orquestado | Código | Composición Realizada por el ESB | Propósito hacia el Usuario Final |
|---|---|---|---|
| **Factura Orquestada** | `ORQ_FAC` | `MS_FAC` (Encabezado/Líneas) + `MS_CLI` (Datos Fiscales) + `MS_PAG` (Autorización Bancaria) + Socios Externos (Códigos de Despacho). | Provee al frontend el comprobante fiscal completo sin que la base de datos haya ejecutado un solo `JOIN`. |
| **Paquetes Dinámicos Orquestados** | `ORQ_PKG` | `MS_PKG` (Motor de Reglas) + `MS_CAR` (Ítems de Múltiples Verticales) + Socios Externos (`permite_paquete`). | Valida combinaciones turísticas en tiempo real y computa el porcentaje de ahorro comercial del combo. |
| **Stock Orquestado en Tiempo Real** | `ORQ_STK` | `MS_STK` (gRPC Puerto 50051 en RAM) + Event Bus (`stock.actualizado`) + Cachés Locales. | Provee a la interfaz de usuario la disponibilidad exacta de cupos en milisegundos sin consultar PostgreSQL. |

---

## 7. CAPA 4: EVENT BUS CON RABBITMQ (ARQUITECTURA DIRIGIDA POR EVENTOS - EDA)

### 7.1. Justificación y Rol del Event Bus en la Arquitectura RDA2

Siguiendo las directrices técnicas del proyecto y las observaciones de clase:
> *"El event bus tiene como objetivo evitar que el ESB se sature; entonces, el event bus puede tener en nuestro caso las búsquedas que hacen los usuarios porque hay muchos que juegan a buscar miles de vuelos, alojamientos, atracciones o autos para rentar. Además, podríamos hacer que al confirmar una factura se pueda hacer un evento para que se actualice el stock por medio de una API rest, pero en el contrato se debe indicar que nuestros compañeros reciben ese evento y hacen algo; no sirve tener el evento sin respuesta"*.

En una arquitectura de integración distribuida, someter al **Enterprise Service Bus (ESB)** a la totalidad del tráfico transaccional y de consulta provoca el colapso por saturación de conexiones HTTP y agotamiento de memoria. El **Event Bus (RabbitMQ)** se introduce como la columna vertebral reactiva encargada de:

1. **Descongestión y Nivelación de Carga del ESB (*Load Leveling & Traffic Dampening*):**
   * Miles de usuarios interactúan simultáneamente en la plataforma buscando combinaciones de fechas, destinos, hoteles y atracciones.
   * Si cada búsqueda ejecutara peticiones HTTP síncronas a través del ESB hacia los 4 sistemas externos, los sockets TCP del ESB se agotarían en segundos.
   * El Event Bus absorbe las ráfagas masivas de búsquedas en colas elásticas, permitiendo que un grupo de trabajadores (*workers*) concurrentes atienda las consultas a un ritmo óptimo contra las cachés locales (`*_cache`) sin comprometer el bus transaccional.
2. **Despacho Asíncrono de Órdenes con Contrato de Respuesta Obligatoria:**
   * Al confirmarse el pago de una factura, el ESB no retiene la conexión web del cliente mientras espera que los 4 sistemas externos procesen físicamente sus reservas.
   * Publica el evento `orden.factura.confirmada` en RabbitMQ. Los consumidores toman la orden y ejecutan las llamadas REST Outbound hacia las tiendas de los compañeros.
   * **Principio de Contrato Activo:** El suscriptor no considera terminada la entrega hasta recibir la respuesta síncrona formal del compañero (`201 Created` con su `external_order_id` o `409 Conflict`), confirmando el mensaje con `channel.ack()` o derivándolo a la cola de compensaciones `sagas.compensacion`.
3. **Propagación Instantánea de Stock sin Bloqueos de Base de Datos:**
   * Cuando `MS_STK` recibe un stream gRPC por el puerto 50051, actualiza la memoria RAM y emite un evento ultraligero a RabbitMQ (`stock.delta.notificacion`).
   * Este evento es consumido en milisegundos por el microservicio orquestado `ORQ_STK` y propagado a la capa GraphQL para actualizar la interfaz del usuario en tiempo real sin ejecutar consultas SQL a PostgreSQL.
4. **Resiliencia, Persistencia en Disco y Manejo de Fallos (DLQ):**
   * Todos los mensajes transaccionales se configuran como persistentes (`delivery_mode: 2`). Si un microservicio consumidor cae, RabbitMQ retiene los mensajes hasta que el servicio se restablezca, garantizando **cero pérdida de datos**.

---

### 7.2. Topología de AMQP 0-9-1 en RabbitMQ (Exchanges, Colas y Bindings)

```mermaid
graph TD
    %% ---- PRODUCTORES ----
    subgraph Productores de Eventos
        PROD_ESB[ESB Core: Router Transaccional]
        PROD_GRPC[MS Stock: Ingesta gRPC 50051]
        PROD_UI[Frontend / GraphQL: Búsquedas de Usuario]
    end

    %% ---- EXCHANGES ----
    subgraph Topologia RabbitMQ Broker: Puerto 5672
        EX_TOPIC{Exchange Principal: booking.events.topic - Topic}
        EX_DLX{Exchange de Fallos: booking.dlx - Direct}
        
        %% ---- COLAS ESTRATÉGICAS ----
        Q_SEARCH[(Cola: eventos.busquedas - TTL 10s)]
        Q_BUY[(Cola: ordenes.confirmadas - Durable/Persistente)]
        Q_STOCK[(Cola: stock.actualizado - Alta Prioridad)]
        Q_SAGA[(Cola: sagas.compensacion - Durable/Rollback)]
        
        %% ---- DEAD LETTER QUEUES ----
        Q_DLQ_ORD[(DLQ: booking.ordenes.dead_letter)]
        Q_DLQ_GEN[(DLQ: booking.general.dead_letter)]
    end

    %% ---- CONSUMIDORES ----
    subgraph Consumidores Especializados
        WORKER_SEARCH[Pool de Workers de Búsqueda: Rate-Leveling Cache]
        WORKER_DISPATCH[Despachador Outbound REST hacia Tiendas Socias]
        WORKER_STOCK[MS Orquestado Stock: ORQ_STK y GraphQL Sync]
        WORKER_SAGA[Coordinador Saga: Rollback y Reembolsos SOA]
        WORKER_AUDIT[Auditor Forense: Winston Physical Logger]
    end

    PROD_UI -->|busqueda.catalogo.*| EX_TOPIC
    PROD_ESB -->|orden.factura.confirmada| EX_TOPIC
    PROD_GRPC -->|stock.delta.notificacion| EX_TOPIC
    PROD_ESB -->|saga.compensacion.trigger| EX_TOPIC

    EX_TOPIC -->|Routing: busqueda.catalogo.*| Q_SEARCH
    EX_TOPIC -->|Routing: orden.factura.confirmada| Q_BUY
    EX_TOPIC -->|Routing: stock.delta.notificacion| Q_STOCK
    EX_TOPIC -->|Routing: saga.compensacion.trigger| Q_SAGA

    Q_BUY -.->|Rechazo tras 3 Reintentos| EX_DLX
    Q_SAGA -.->|Fallo Irrecuperable| EX_DLX
    EX_DLX -->|dlq.ordenes| Q_DLQ_ORD
    EX_DLX -->|dlq.general| Q_DLQ_GEN

    Q_SEARCH --> WORKER_SEARCH
    Q_BUY --> WORKER_DISPATCH
    Q_STOCK --> WORKER_STOCK
    Q_SAGA --> WORKER_SAGA
    Q_DLQ_ORD & Q_DLQ_GEN --> WORKER_AUDIT
```

#### Matriz de Configuración de Colas y Exchanges:

| Nombre de Cola | Exchange Vinculado | Routing Key | Tipo de Entrega | TTL / Reintentos | Dead Letter Exchange | Propósito Operativo |
|---|---|---|---|---|---|---|
| **`eventos.busquedas`** | `booking.events.topic` | `busqueda.catalogo.*` | Volátil en RAM (Memoria) | `x-message-ttl: 10000` (10s) | `booking.dlx` | Absorbe búsquedas masivas; si una búsqueda expira en cola por más de 10s se descarta para no entregar datos obsoletos. |
| **`ordenes.confirmadas`** | `booking.events.topic` | `orden.factura.confirmada` | Persistente (`delivery_mode: 2`) | 3 Reintentos con Backoff (1s, 2s, 4s) | `booking.dlx` | Dispara el despacho de reservas hacia las tiendas de los compañeros con contrato obligatorio. |
| **`stock.actualizado`** | `booking.events.topic` | `stock.delta.notificacion` | Volátil de Alta Prioridad | Sin TTL (Procesamiento Inmediato) | `booking.dlx` | Distribuye cambios de cupos generados por el receptor gRPC 50051 hacia la capa de presentación. |
| **`sagas.compensacion`** | `booking.events.topic` | `saga.compensacion.trigger` | Persistente (`delivery_mode: 2`) | 3 Reintentos estricto | `booking.dlx` | Ejecuta la coreografía de reversas (cancelación de tours/vuelos y reembolso bancario SOA). |

---

### 7.3. Esquemas JSON Canónicos de los Eventos

Cada evento que transita por RabbitMQ respeta una estructura canónica estandarizada:

#### 1. Evento de Búsqueda Masiva (`busqueda.catalogo.vuelos`, `busqueda.catalogo.atracciones`, etc.)
```json
{
  "trace_id": "TRC-8912-4412-ABC",
  "vertical": "ATRACCIONES",
  "routing_key": "busqueda.catalogo.atracciones",
  "filtros": {
    "ciudad": "Quito",
    "fecha": "2026-10-25",
    "personas": 2,
    "categoria_id": "CAT-AVENTURA-01",
    "max_precio": 150.00
  },
  "reply_to": "amq.gen-reply-queue-9912",
  "correlation_id": "CORR-5512-XYZ",
  "timestamp": 1792015000000
}
```

#### 2. Evento de Orden Confirmada (`orden.factura.confirmada`)
```json
{
  "event_id": "EVT-ORD-2026-0001",
  "saga_id": "SAGA-7K2X9M",
  "factura_id": "b1a1c2d3-e4f5-6789-0123-456789abcdef",
  "numero_factura": "FAC-2026-00001",
  "cliente": {
    "id": "c1a2b3c4-d5e6-7890-1234-567890abcdef",
    "nombre_completo": "Paúl Rosero",
    "email": "paul.rosero@epn.edu.ec"
  },
  "transaccion_pago": {
    "codigo_autorizacion": "AUTH-VISA-982341",
    "monto": 450.00,
    "metodo_pago": "TARJETA_CREDITO"
  },
  "items": [
    {
      "detalle_id": "d1a2b3c4-d5e6-7890-1234-567890abcdef",
      "tipo_servicio": "ATRACCION",
      "proveedor_id": "proveedor-atracciones-dilan",
      "external_item_id": "PRhu4UBTWPBC",
      "titulo": "Tour Baños Aventura Extrema",
      "cantidad": 2,
      "precio_unitario": 80.00,
      "metadata_reserva": {
        "fecha": "2026-10-25",
        "hora": "10:00"
      }
    }
  ],
  "idempotency_key": "IDEMP-9923-4412-BB12",
  "timestamp": 1792015000000
}
```

#### 3. Evento de Actualización de Stock en Tiempo Real (`stock.delta.notificacion`)
```json
{
  "event_id": "STK-EVT-9812",
  "service_id": "atracciones-dilan",
  "item_id": "PRhu4UBTWPBC",
  "date": "2026-10-25",
  "time_slot": "10:00",
  "available_units": 10,
  "delta": -2,
  "sync_hash": "hash-sync-1792015000",
  "timestamp": 1792015000000
}
```

#### 4. Evento de Compensación Saga (`saga.compensacion.trigger`)
```json
{
  "saga_id": "SAGA-7K2X9M",
  "factura_id": "b1a1c2d3-e4f5-6789-0123-456789abcdef",
  "motivo": "OUT_OF_STOCK_PARTNER",
  "proveedor_fallido": "proveedor-hoteles-partner",
  "paso_fallido": "RESERVA_HOTEL",
  "acciones_compensatorias": [
    {
      "tipo": "CANCELAR_ORDEN_EXTERNA",
      "proveedor_id": "proveedor-atracciones-dilan",
      "external_order_id": "ORD-DILAN-8721"
    },
    {
      "tipo": "REEMBOLSAR_PAGO_SOA",
      "transaccion_id": "tx-pago-88123",
      "monto": 450.00
    }
  ],
  "timestamp": 1792015000000
}
```

---

### 7.4. Mecanismo de Absorción de Búsquedas Masivas (Dampening de Carga)

Para evitar que el ESB colapse ante el comportamiento común de los usuarios que realizan decenas de búsquedas por minuto, se implementa el patrón **Request-Reply Asíncrono con Buffer Nivelador (*Rate-Leveling*)**:

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Navegador Web (React UI)
    participant GQL as GraphQL / BFF (Single Endpoint)
    participant RMQ as RabbitMQ (eventos.busquedas)
    participant Worker as Pool de Workers de Búsqueda
    participant Cache as Caché Local Supabase (*_cache)

    Usuario->>GQL: query { searchTours(ciudad: "Quito", fecha: "2026-10-25") }
    Note over GQL: No satura el ESB ni hace llamadas HTTP a socios
    GQL->>RMQ: Publica evento "busqueda.catalogo.atracciones" con correlationId y replyTo temporal
    RMQ-->>Worker: Entrega mensaje con limitación de concurrencia (prefetch: 50)
    Worker->>Cache: Consulta optimizada indexada a schema_atracciones.atracciones_cache
    Cache-->>Worker: Resultados en caché (< 15ms)
    Worker->>RMQ: Publica respuesta en la cola temporal replyTo
    RMQ-->>GQL: Consume respuesta correlacionada por correlationId
    GQL-->>Usuario: JSON con listado de tours disponibles y stock verificado
```

* **Beneficio de Resiliencia:** Si ingresan 5,000 peticiones de búsqueda en 2 segundos, RabbitMQ las apila en la cola `eventos.busquedas`. Los workers procesan a una velocidad segura de 500 consultas por segundo contra la caché local de Supabase. El tiempo de respuesta sube de 20ms a 80ms, pero **el sistema no se cae, no agota sockets TCP y el ESB permanece 100% disponible para compras reales**.

---

### 7.5. Implementación en NestJS: Productores y Consumidores

#### 1. Servicio Publicador de Eventos (`EventBusPublisherService`):
```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';

@Injectable()
export class EventBusPublisherService implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(EventBusPublisherService.name);

  constructor(private readonly winstonLogger: WinstonPhysicalLoggerService) {}

  onModuleInit() {
    const connection = amqp.connect(['amqp://guest:guest@localhost:5672']);
    this.channelWrapper = connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        // Declarar exchange principal Topic
        await channel.assertExchange('booking.events.topic', 'topic', { durable: true });
        // Declarar exchange de fallos DLX
        await channel.assertExchange('booking.dlx', 'direct', { durable: true });

        // Declarar cola de órdenes confirmadas con DLQ
        await channel.assertQueue('ordenes.confirmadas', {
          durable: true,
          deadLetterExchange: 'booking.dlx',
          deadLetterRoutingKey: 'dlq.ordenes',
        });
        await channel.bindQueue('ordenes.confirmadas', 'booking.events.topic', 'orden.factura.confirmada');

        // Declarar cola de búsquedas con TTL
        await channel.assertQueue('eventos.busquedas', {
          durable: true,
          messageTtl: 10000, // 10 segundos TTL
          deadLetterExchange: 'booking.dlx',
          deadLetterRoutingKey: 'dlq.busquedas',
        });
        await channel.bindQueue('eventos.busquedas', 'booking.events.topic', 'busqueda.catalogo.*');

        // Declarar cola de stock actualizado
        await channel.assertQueue('stock.actualizado', { durable: true });
        await channel.bindQueue('stock.actualizado', 'booking.events.topic', 'stock.delta.notificacion');

        // Declarar cola de compensaciones Saga
        await channel.assertQueue('sagas.compensacion', { durable: true });
        await channel.bindQueue('sagas.compensacion', 'booking.events.topic', 'saga.compensacion.trigger');
      },
    });
  }

  async publishEvent(routingKey: string, message: any): Promise<void> {
    try {
      await this.channelWrapper.publish('booking.events.topic', routingKey, message, {
        persistent: true,
        contentType: 'application/json',
      });
      this.winstonLogger.logAudit(
        `[EVENT-BUS] Publicado evento en [${routingKey}] | CorrelationId: ${message.correlation_id || message.saga_id || 'N/A'}`,
        'EventBusPublisherService',
      );
    } catch (error: any) {
      this.winstonLogger.logError(
        `[EVENT-BUS-ERROR] Fallo al publicar en [${routingKey}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
```

#### 2. Consumidor de Órdenes con Contrato Obligatorio (`ConfirmedOrderConsumerService`):
```typescript
@Injectable()
export class ConfirmedOrderConsumerService implements OnModuleInit {
  private readonly logger = new Logger(ConfirmedOrderConsumerService.name);

  constructor(
    private readonly partnerHttpClient: HttpService,
    private readonly eventBusPublisher: EventBusPublisherService,
    private readonly winstonLogger: WinstonPhysicalLoggerService,
  ) {}

  async processConfirmedOrder(msg: amqp.ConsumeMessage, channel: ConfirmChannel) {
    const orderEvent = JSON.parse(msg.content.toString());
    const retryCount = (msg.properties.headers?.['x-retry-count'] || 0);

    try {
      this.winstonLogger.logAudit(
        `[ORDER-CONSUMER] Procesando orden factura: ${orderEvent.numero_factura} | Saga: ${orderEvent.saga_id}`,
        'ConfirmedOrderConsumerService',
      );

      // Despachar a cada socio externo por REST Outbound
      for (const item of orderEvent.items) {
        const response = await this.dispatchToPartner(item, orderEvent.saga_id);

        // EVALUACIÓN DEL CONTRATO OBLIGATORIO:
        // El socio DEBE responder 201 Created con su external_order_id
        if (response.status === 201 && response.data?.external_order_id) {
          this.winstonLogger.logAudit(
            `[PARTNER-CONTRACT-OK] Socio ${item.proveedor_id} confirmó orden con ID: ${response.data.external_order_id}`,
            'ConfirmedOrderConsumerService',
          );
        } else if (response.status === 409 || response.data?.error === 'OUT_OF_STOCK') {
          // CONTRATO VIOLADO / SIN STOCK: Disparar compensación inmediata
          this.winstonLogger.logError(
            `[PARTNER-CONTRACT-REJECTED] Socio ${item.proveedor_id} rechazó por falta de stock. Iniciando Saga de compensación.`,
          );
          await this.eventBusPublisher.publishEvent('saga.compensacion.trigger', {
            saga_id: orderEvent.saga_id,
            factura_id: orderEvent.factura_id,
            motivo: 'OUT_OF_STOCK_PARTNER',
            proveedor_fallido: item.proveedor_id,
          });
          // Confirmar el mensaje para sacarlo de la cola de compras ya que pasó a la cola de Sagas
          channel.ack(msg);
          return;
        }
      }

      // Todas las líneas despachadas exitosamente por contrato
      channel.ack(msg);

    } catch (error: any) {
      this.winstonLogger.logError(
        `[ORDER-CONSUMER-FAIL] Error de red o timeout al despachar a socios: ${error.message}`,
        error.stack,
      );

      // Política de Reintentos: Máximo 3 intentos antes de enviar a Dead Letter Queue
      if (retryCount < 3) {
        channel.nack(msg, false, false); // Rechaza sin requeue directo, permitiendo que el DLX lo gestione
      } else {
        this.winstonLogger.logError(
          `[ORDER-EXHAUSTED] Mensaje excedió reintentos máximos (3). Enviando a DLQ forense.`,
        );
        channel.reject(msg, false); // Pasa a booking.ordenes.dead_letter
      }
    }
  }

  private async dispatchToPartner(item: any, sagaId: string): Promise<any> {
    return firstValueFrom(
      this.partnerHttpClient.post(
        `http://partner-service/api/v1/orders`,
        {
          item_id: item.external_item_id,
          cantidad: item.cantidad,
          saga_id: sagaId,
        },
        { timeout: 3000 },
      ),
    );
  }
}
```

---

### 7.6. Manejo de Errores, Reintentos y Dead-Letter Queue (DLQ)

Para evitar la pérdida de eventos transaccionales ante caídas prolongadas de la red de un compañero, el Event Bus implementa una estrategia de **Dead Letter Exchange (DLX)** y reintentos escalonados:

```mermaid
graph LR
    MSG[Mensaje: orden.factura.confirmada] --> Q_ORIGIN[(Cola: ordenes.confirmadas)]
    Q_ORIGIN --> WORKER{Intento de Despacho}
    
    WORKER -->|Éxito: 201 Created| ACK[channel.ack: Mensaje Procesado]
    WORKER -->|Fallo 1 o 2: Timeout| RETRY[Reintento con Backoff Exponencial]
    RETRY --> Q_ORIGIN
    
    WORKER -->|Fallo 3: Reintentos Agotados| NACK[channel.reject: requeue=false]
    NACK --> DLX{Exchange: booking.dlx}
    DLX --> Q_DLQ[(DLQ: booking.ordenes.dead_letter)]
    Q_DLQ --> ALERT[Alerta en logs/error.log + Notificación Admin]
```

1. **Backoff Exponencial:** Los reintentos se ejecutan a los 1s, 2s y 4s.
2. **Cuarentena en DLQ:** Si tras 3 intentos el socio sigue inaccesible, el mensaje ingresa a `booking.ordenes.dead_letter`.
3. **Auditoría Física Estricta:** Ninguna traza se escribe en base de datos. Cada descarte o transición a DLQ se asienta en el archivo físico rotativo `logs/error.log` mediante `WinstonPhysicalLoggerService` con la traza de pila completa, el payload del mensaje y el motivo de rechazo.

---

### 7.7. Panel y Métricas de Administración de RabbitMQ

Cada microservicio y el administrador general cuentan con visibilidad del estado de salud del Event Bus mediante la consola de RabbitMQ Management UI (`http://localhost:15672`):

* **KPIs Clave Monitoreados:**
  * **Tasa de Publicación y Consumo (*Publish/Consume Rate*):** Monitorea cuántos mensajes por segundo entran y salen de `eventos.busquedas` y `stock.actualizado`.
  * **Profundidad de Colas (*Queue Depth*):** Si `ordenes.confirmadas` supera los 100 mensajes acumulados, se dispara una alerta semafórica amarilla en el panel de `MS_PROV` indicando ralentización en las tiendas de los compañeros.
  * **Mensajes no Reconocidos (*Unacked Count*):** Detecta workers congelados o llamadas REST bloqueadas hacia proveedores.
  * **Tasa de DLQ (*Dead Letter Rate*):** Cantidad de mensajes derivados a la cola de fallos para inspección forense.

---

### 7.8. Conexión hacia la Capa 5: Microservicios Orquestados

La Capa 4 interactúa simbióticamente con la siguiente capa del sistema (**Capa 5: Microservicios Orquestados con Seguridad JWT**):

* El evento `stock.delta.notificacion` alimenta en tiempo real al microservicio orquestado **`ORQ_STK`**, permitiendo que la disponibilidad de los tours de Dilan o las habitaciones de hotel se reflejen en la UI con latencias inferiores a 50ms sin tocar la base de datos relacional.
* El evento `orden.factura.confirmada` actualiza el microservicio orquestado **`ORQ_FAC`**, incrustando el `external_order_id` retornado por el socio en el comprobante fiscal unificado.
* Si ocurre un conflicto de cupos, el evento `saga.compensacion.trigger` instruye al microservicio orquestado **`ORQ_PKG`** a invalidar el combo y generar la reversa monetaria hacia el usuario final.

---

## 8. CAPA 5: MICROSERVICIOS ORQUESTADOS CON SEGURIDAD JWT Y CONTROL DE ACCESO BASADO EN ROLES (RBAC)

### 8.1. Filosofía y Definición de los Microservicios Orquestados

Siguiendo el mandato de la pizarra arquitectónica:
> *"Luego, nuevamente se generan los microservicios ya orquestados, es decir, que la factura ya sabe a qué cliente y productos pertenece. Luego estos microservicios orquestados ya se pueden conectar a GraphQL para que al usuario final le llegue un solo endpoint"*.

Un **Microservicio Orquestado** no es un microservicio CRUD simple ni posee una tabla relacional directa en la base de datos. Es un **servicio de dominio compuesto, reactivo y enriquecido**, que surge de la colaboración simbiótica entre:
1. **El ESB (Capa 3):** Que ejecuta la composición y el enriquecimiento de datos en memoria RAM, resolviendo la sustitución de SQL `JOINs` entre esquemas herméticos.
2. **El Event Bus RabbitMQ (Capa 4):** Que inyecta en tiempo real eventos de despacho externo, confirmaciones de contratos obligatorios y telemetría de stock.
3. **La Barrera de Seguridad Transversal JWT (Capa 5):** Que intercepta cada invocación para validar criptográficamente la identidad del usuario y verificar sus permisos granulares mediante **Control de Acceso Basado en Roles (RBAC)**.

```mermaid
graph TB
    %% ---- ENTRADA DESDE CAPAS INFERIORES ----
    subgraph Fuentes de Orquestacion
        ESB_CORE[ESB: Motor de Agregacion en Memoria]
        EV_BUS[RabbitMQ: stock.actualizado & ordenes.confirmadas]
    end

    %% ---- CAPA 5: MICROSERVICIOS ORQUESTADOS ----
    subgraph Capa 5: Microservicios Orquestados con Seguridad JWT
        direction TB

        subgraph Barrera Transversal de Seguridad
            SEC_GUARD[JwtAuthGuard: Validacion Criptografica de Token]
            RBAC_GUARD[RolesGuard: RBAC - CLIENTE / ADMIN / MANTENIMIENTO]
            UUID_GUARD[UuidValidationGuard: Proteccion V-05]
        end

        subgraph Servicios Compuestos de Dominio
            ORQ_FAC[ORQ_FAC: Microservicio Factura Enriquecida]
            ORQ_PKG[ORQ_PKG: Microservicio Paquetes y Combos Validados]
            ORQ_STK[ORQ_STK: Microservicio Stock en Tiempo Real]
            ORQ_RES[ORQ_RES: Microservicio Reservas y Check-in Unificado]
        end

        SEC_GUARD --> RBAC_GUARD --> UUID_GUARD
        UUID_GUARD --> ORQ_FAC
        UUID_GUARD --> ORQ_PKG
        UUID_GUARD --> ORQ_STK
        UUID_GUARD --> ORQ_RES
    end

    ESB_CORE --> ORQ_FAC
    ESB_CORE --> ORQ_PKG
    ESB_CORE --> ORQ_RES
    EV_BUS --> ORQ_STK
    EV_BUS --> ORQ_FAC

    %% ---- SALIDA HACIA GRAPHQL ----
    ORQ_FAC & ORQ_PKG & ORQ_STK & ORQ_RES --> GQL_GATEWAY[Capa 6: GraphQL / BFF Single Endpoint]
```

---

### 8.2. Fichas Técnicas de los 4 Microservicios Orquestados

#### 🧾 1. Microservicio Orquestado de Facturación Enriquecida (`ORQ_FAC`)
* **Identificador Canónico:** `ORQ_FAC`
* **Naturaleza:** Servicio compuesto de agregación fiscal y contractual.
* **Componentes Fusionados por el ESB:**
  * `MS_FAC`: Encabezado fiscal, numeración secuencial (`FAC-2026-XXXXX`), subtotales e IVA (15%).
  * `MS_CLI`: Identificación fiscal del cliente, razón social/nombre completo, correo electrónico y dirección.
  * `MS_PAG`: Código de autorización bancaria (`AUTH-VISA-XXXXX`), pasarela SOA y método de pago.
  * Capa de Integración Externa del ESB: Códigos de reserva externa retornados por los compañeros (`external_order_id`).
* **Regla de Autorización (RBAC):**
  * Rol `CLIENTE`: Puede consultar exclusivamente sus propias facturas (`WHERE factura.cliente_id == jwt.sub`).
  * Rol `ADMIN`: Puede consultar cualquier factura del sistema para auditoría tributaria y conciliación contable.
* **DTO Orquestado Resultante (`FacturaOrquestadaDto`):**
  ```typescript
  export interface FacturaOrquestadaDto {
    facturaId: string;
    numeroFactura: string;
    fechaEmision: string;
    estado: 'EMITIDA' | 'PAGADA' | 'REEMBOLSADA' | 'ANULADA';
    totales: {
      subtotal: number;
      iva: number;
      descuentoCombo: number;
      totalPagar: number;
    };
    cliente: {
      id: string;
      nombreCompleto: string;
      identificacion: string;
      email: string;
    };
    pago: {
      codigoAutorizacion: string;
      metodoPago: string;
      estadoTransaccion: string;
    };
    lineasDespachadas: Array<{
      detalleId: string;
      tipoServicio: string;
      titulo: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      despachoExterno: {
        externalOrderId: string;
        socioComercial: string;
        estadoDespacho: 'CONFIRMADO' | 'COMPENSADO';
      };
    }>;
  }
  ```

---

#### 🎁 2. Microservicio Orquestado de Paquetes y Combos Validados (`ORQ_PKG`)
* **Identificador Canónico:** `ORQ_PKG`
* **Naturaleza:** Motor de tarificación dinámica y validación de reglas comerciales multiproveedor.
* **Componentes Fusionados por el ESB:**
  * `MS_PKG`: Motor de reglas de combinación turística y acuerdos en `contrato_promociones`.
  * `MS_CAR`: Ítems presentes en el carrito de compras del usuario.
  * Catálogos de Socios: Banderas `permite_paquete = true` provenientes de las cachés de proveedores.
* **Lógica de Validación en Tiempo Real:**
  1. Detecta si el carrito contiene servicios de al menos 2 verticales diferentes (ej. Tour + Hotel o Vuelo + Auto).
  2. Valida la coincidencia geográfica del destino (ej. ambos servicios localizados en "Quito" o "Galápagos").
  3. Comprueba que las fechas de reserva sean coherentes (la estancia de hotel debe coincidir con las fechas del vuelo).
  4. Calcula el descuento porcentual garantizando que nunca supere el `descuento_maximo` fijado contractualmente.
* **Regla de Autorización (RBAC):**
  * Consulta: Pública para todos los usuarios autenticados o anónimos.
  * Modificación de reglas de combo: Exclusiva para Rol `ADMIN`.

---

#### ⚡ 3. Microservicio Orquestado de Stock en Tiempo Real (`ORQ_STK`)
* **Identificador Canónico:** `ORQ_STK`
* **Naturaleza:** Servicio reactivo de disponibilidad continua en memoria volátil de alta velocidad.
* **Componentes Fusionados por el ESB y Event Bus:**
  * `MS_STK`: Ingesta gRPC sobre HTTP/2 en el puerto 50051 en memoria RAM/Redis (`Map<string, InventoryRecord>`).
  * RabbitMQ: Eventos de la cola `stock.actualizado`.
  * Cachés Locales Supabase: Enlace con metadatos del catálogo (`*_cache`).
* **Mecanismo Operativo:**
  * No ejecuta ninguna consulta `SELECT` a PostgreSQL para verificar disponibilidad.
  * Cuando la UI solicita cupos, `ORQ_STK` lee directamente del buffer en memoria RAM respondiendo en **< 2 milisegundos**.
  * Emite notificaciones push instantáneas a través de suscripciones de GraphQL cuando RabbitMQ anuncia un cambio de disponibilidad (`stock.delta.notificacion`).
* **Regla de Autorización (RBAC):**
  * Consulta de stock: Pública.
  * Ingesta de stock: Exclusiva para las tiendas de los compañeros mediante autenticación mTLS/gRPC en el puerto 50051.

---

#### 🎫 4. Microservicio Orquestado de Reservas y Check-in Unificado (`ORQ_RES`)
* **Identificador Canónico:** `ORQ_RES`
* **Naturaleza:** Orquestador del ciclo de vida post-venta y ejecución de check-in digital omnicanal.
* **Componentes Fusionados por el ESB:**
  * `schema_atracciones.reservas_atraccion`: Tours con guía asignado y generación de Voucher QR.
  * `schema_autos.reservas_auto`: Vehículos con máquina de 6 estados, registro de conductor, kilometraje y cooldown de 2 horas.
  * `schema_alojamientos.reservas_alojamiento`: Hoteles con validación de check-in estricto a partir de las 14:00 y clave digital.
  * `schema_vuelos.reservas_vuelo`: Itinerarios con código PNR, selección interactiva de asiento y pase de abordar digital.
* **Mecanismos Especiales por Vertical:**
  * **Tours:** Valida la fecha del evento y emite la URL del código QR para escaneo físico en la puerta del atractivo.
  * **Autos:** Controla la transición de estados `RESERVADO` ➔ `LISTO_PARA_ENTREGAR` ➔ `ENTREGADO`. Al ser devuelto, activa el **cooldown cronometrado de 2 horas** en `EN_LIMPIEZA`.
  * **Hoteles:** Bloquea el check-in digital antes de las 14:00 horas (`422 Unprocessable Entity`), salvo autorización de *early check-in*.
  * **Vuelos:** Ejecuta asignación concurrente y mutuamente excluyente de asientos (ventana/pasillo) y genera el pase de abordar con código de barras en formato imprimible.
* **Regla de Autorización (RBAC):**
  * Rol `CLIENTE`: Puede ejecutar el check-in de sus propias reservas y descargar pases/vouchers.
  * Rol `MANTENIMIENTO`: Acceso exclusivo a la inspección de patio automotriz (`POST /api/v2/autos/:id/mantenimiento`) para ingresar kilometraje de llegada, combustible y activar alertas mecánicas preventivas.
  * Rol `ADMIN`: Puede visualizar el manifiesto global de pasajeros, huéspedes y órdenes de alquiler de autos.

---

### 8.3. Arquitectura de Seguridad Transversal JWT (JSON Web Tokens)

Para blindar la plataforma distribuida y cumplir con las mejores prácticas de microservicios, la seguridad se implementa de manera desacoplada mediante **tokens criptográficos JWT**:

#### 1. Estándar Criptográfico
* **Algoritmo de Firma:** `HS256` (HMAC con SHA-256) utilizando una clave secreta segura rotativa (`JWT_SECRET`) compartida entre el servicio de autenticación y los microservicios orquestados, o `RS256` (Asimétrico con par de claves privada/pública).
* **Vigencia:**
  * **Access Token:** Corta duración (15 a 60 minutos) para minimizar el impacto ante una eventual interceptación.
  * **Refresh Token:** Duración prolongada (7 días), almacenado exclusivamente en una cookie HTTP segura (`HttpOnly`, `SameSite=Strict`, `Secure`) para mitigar ataques XSS y CSRF.

#### 2. Payload Canónico del Token JWT
```json
{
  "sub": "c1a2b3c4-d5e6-7890-1234-567890abcdef",
  "email": "paul.rosero@epn.edu.ec",
  "nombre": "Paúl Rosero",
  "roles": [
    "CLIENTE",
    "ADMIN"
  ],
  "permissions": [
    "facturas:read_own",
    "checkout:execute",
    "checkin:execute",
    "nodes:manage",
    "nodes:toggle_killswitch",
    "finanzas:liquidate"
  ],
  "iss": "booking-auth-core",
  "aud": "booking-platform",
  "iat": 1792015000,
  "exp": 1792018600
}
```

---

### 8.4. Control de Acceso Basado en Roles (RBAC)

La plataforma formaliza tres roles de usuario claramente diferenciados para cumplir con los requerimientos funcionales y las pruebas de evaluación:

```mermaid
graph LR
    subgraph Roles de Usuario
        ROL_CLI[Rol: CLIENTE]
        ROL_ADM[Rol: ADMIN]
        ROL_MAN[Rol: MANTENIMIENTO]
    end

    subgraph Recursos y Permisos en Microservicios Orquestados
        RES_USER[Mi Carrito / Checkout / Mis Facturas / Check-in Personal]
        RES_ADMIN[Kill-Switches Nodos / Liquidaciones Proveedores / Auditoria General]
        RES_MAINT[Inspeccion de Patio Vehicular / Registro Km / Alerta Taller]
    end

    ROL_CLI -->|Autorizado| RES_USER
    ROL_CLI -.->|403 Forbidden| RES_ADMIN
    ROL_CLI -.->|403 Forbidden| RES_MAINT

    ROL_ADM -->|Autorizado Superusuario| RES_USER
    ROL_ADM -->|Autorizado Total| RES_ADMIN
    ROL_ADM -->|Autorizado Supervisión| RES_MAINT

    ROL_MAN -->|Autorizado Exclusivo| RES_MAINT
    ROL_MAN -.->|403 Forbidden| RES_ADMIN
```

#### Matriz Exhaustiva de Permisos RBAC:

| Rol | Propósito en el Sistema | Acciones Autorizadas | Endpoints Protegidos | Restricciones de Seguridad |
|---|---|---|---|---|
| **`CLIENTE`** | Usuario final turista o comprador de la plataforma. | - Armar carritos de compras.<br>- Ejecutar checkout transaccional.<br>- Consultar sus propias facturas.<br>- Ejecutar check-in digital de sus tours, vuelos, autos y hoteles. | - `POST /api/v1/carritos`<br>- `POST /api/v1/checkout`<br>- `GET /orchestrated/facturas/mis-facturas`<br>- `POST /orchestrated/checkin/:id` | No puede ver facturas de otros clientes ni acceder a paneles administrativos o switches de nodos (`403 Forbidden`). |
| **`ADMIN`** | Administrador del sistema y líder técnico de integración. | - Monitorear salud de los 5 nodos.<br>- **Activar Kill-Switches en caliente** de tiendas externas.<br>- Calcular y pagar liquidaciones a proveedores (`MS_FIN`).<br>- Auditoría secuencial de facturas.<br>- Gestión de roles de usuario. | - `GET /api/v2/admin/nodes/health`<br>- `POST /api/v2/admin/nodes/:id/toggle`<br>- `POST /api/v1/finanzas/calcular-corte`<br>- `PATCH /api/v1/finanzas/liquidaciones/:id/pagar`<br>- `PATCH /api/v1/clientes/:id/rol` | Acceso irrestricto mediante claims de superusuario. |
| **`MANTENIMIENTO`** | Personal operativo del patio de alquiler de autos. | - Inspeccionar autos devueltos.<br>- Registrar kilometraje de entrada.<br>- Registrar nivel de combustible y averías físicas.<br>- Bloquear vehículos para servicio de taller (`alerta_mantenimiento`). | - `GET /api/v2/autos/patio/inspeccion`<br>- `POST /api/v2/autos/:id/mantenimiento`<br>- `PATCH /api/v2/autos/:id/estado-taller` | Denegado en compras, checkout, facturas, finanzas y administración de nodos de red (`403 Forbidden`). |

---

### 8.5. Implementación de Guards y Decoradores en NestJS

La seguridad transversal se implementa mediante tuberías de interceptación nativas en NestJS:

#### 1. Decorador Personalizado de Roles (`@Roles`):
```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

#### 2. Guard de Autenticación JWT (`JwtAuthGuard`):
```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        type: 'https://booking.epn.edu.ec/errors/unauthorized',
        title: 'No Autorizado',
        status: 401,
        detail: 'Cabecera Authorization Bearer requerida o ausente.',
      });
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token);
      request.user = payload; // Inyecta el usuario con roles y claims en el request
      return true;
    } catch (err: any) {
      throw new UnauthorizedException({
        type: 'https://booking.epn.edu.ec/errors/token-invalido',
        title: 'Token Inválido o Expirado',
        status: 401,
        detail: err.message,
      });
    }
  }
}
```

#### 3. Guard de Control de Acceso por Roles (`RolesGuard`):
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // Endpoint no restringido por roles específicos
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.roles) {
      throw new ForbiddenException({
        type: 'https://booking.epn.edu.ec/errors/forbidden',
        title: 'Acceso Prohibido',
        status: 403,
        detail: 'El usuario no posee roles asignados para este recurso.',
      });
    }

    const hasRole = requiredRoles.some(role => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException({
        type: 'https://booking.epn.edu.ec/errors/permisos-insuficientes',
        title: 'Permisos Insuficientes',
        status: 403,
        detail: `Se requiere uno de los siguientes roles: [${requiredRoles.join(', ')}].`,
      });
    }

    return true;
  }
}
```

#### 4. Ejemplo de Controlador Orquestado Protegido:
```typescript
@ApiTags('Microservicios Orquestados')
@Controller('orchestrated')
@UseGuards(JwtAuthGuard, RolesGuard, UuidValidationGuard)
export class OrchestratedOperationsController {
  constructor(
    private readonly invoiceAggregator: InvoiceAggregationService,
    private readonly autoPatioService: AutoPatioService,
  ) {}

  // Consulta de Factura Orquestada: Solo Cliente dueño o Admin
  @Get('facturas/:id')
  @Roles('CLIENTE', 'ADMIN')
  async getOrchestratedInvoice(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<FacturaOrquestadaDto> {
    const invoice = await this.invoiceAggregator.buildOrchestratedInvoice(id);

    // Si es cliente, verificar que sea el dueño de la factura
    if (req.user.roles.includes('CLIENTE') && !req.user.roles.includes('ADMIN')) {
      if (invoice.cliente.id !== req.user.sub) {
        throw new ForbiddenException('No tiene autorización para visualizar facturas de otros clientes');
      }
    }

    return invoice;
  }

  // Inspección de Patio Vehicular: Exclusivo para Rol Mantenimiento
  @Post('autos/:id/mantenimiento')
  @Roles('MANTENIMIENTO', 'ADMIN')
  async registerPatioInspection(
    @Param('id') id: string,
    @Body() dto: RegistroMantenimientoDto,
    @Req() req: any,
  ) {
    return this.autoPatioService.registrarInspeccionPatio(id, dto, req.user.sub);
  }
}
```

---

### 8.6. Conexión hacia la Capa 6: GraphQL / BFF (Single Endpoint)

Los microservicios orquestados de la Capa 5 proveen los bloques fundamentales que alimentan directamente a la **Capa 6: Capa de Agregación GraphQL (BFF)**:

* En lugar de que el frontend tenga que hacer múltiples peticiones HTTP a diferentes endpoints, la capa GraphQL consume internamente estos microservicios orquestados a través de **Resolvers** tipados y **DataLoaders** (con caché de ciclo de petición).
* El contexto de GraphQL hereda el token JWT verificado en la Capa 5, garantizando que el `context.user` contenga los roles y claims RBAC listos para ser evaluados en cada consulta (`Query`) o mutación (`Mutation`).
* **Supresión del API Gateway Redundante:** Dado que los microservicios orquestados ya integran seguridad, agregación y resiliencia, GraphQL actúa directamente como el **Single Endpoint (`/graphql`)** hacia la UI, optimizando la latencia y eliminando capas intermedias innecesarias.

---

## 9. CAPA 6: CAPA DE AGREGACIÓN GRAPHQL (BACKEND FOR FRONTEND - BFF)

### 9.1. Filosofía y Justificación de GraphQL como Entrada Única (Single Endpoint)

Siguiendo el principio rector de la pizarra docente:
> *"Luego estos microservicios orquestados ya se pueden conectar a GraphQL para que al usuario final le llegue un solo endpoint"*.

En las arquitecturas tradicionales de microservicios, el Frontend suele verse obligado a invocar decenas de endpoints REST dispares para renderizar una sola pantalla, incurriendo en los problemas clásicos de **Over-fetching** (descargar campos innecesarios) y **Under-fetching** (realizar múltiples viajes de red en cascada).

La **Capa 6 implementa GraphQL como el Backend-for-Frontend (BFF) unificado de Booking**, exponiendo un **Único Endpoint Canónico (`POST /graphql`)** para toda la aplicación cliente.

```mermaid
graph TB
    %% ---- CLIENTE ----
    subgraph Capa 7: Frontend Web React 18
        UI_MARKET[Marketplace Web: Búsqueda, Carrito, Checkout]
        UI_ADMIN[Dashboards Admin: Monitor Nodos, Liquidaciones, Patio Autos]
    end

    %% ---- ENTRADA GRAPHQL ----
    UI_MARKET & UI_ADMIN -->|Single Endpoint: POST /graphql| GQL_ENTRY[Capa 6: Apollo Server / GraphQL Module NestJS]

    %% ---- SUBSISTEMAS GRAPHQL ----
    subgraph Capa 6: Capa de Agregacion GraphQL BFF
        direction TB

        GQL_ENTRY --> GQL_SEC[GqlAuthGuard: Inyección Contexto JWT & Roles]
        GQL_SEC --> GQL_ROUTER{Enrutador de Operaciones GraphQL}

        subgraph Operaciones
            QUERY_EXEC[Queries: Consultas Declarativas Optimizadas]
            MUT_EXEC[Mutations: Transacciones e Idempotencia]
            SUB_EXEC[Subscriptions: Push en Tiempo Real por WebSockets]
        end

        GQL_ROUTER --> QUERY_EXEC
        GQL_ROUTER --> MUT_EXEC
        GQL_ROUTER --> SUB_EXEC

        subgraph Optimizacion y Cache
            DATALOADERS[DataLoaders: Batching en Memoria - Anti N+1]
            DEPTH_GUARD[Query Depth & Complexity Limiting]
        end

        QUERY_EXEC <--> DATALOADERS
        GQL_SEC --> DEPTH_GUARD
    end

    %% ---- CONSUMO DE CAPA 5 ----
    subgraph Capa 5: Microservicios Orquestados
        ORQ_FAC[ORQ_FAC: Factura Enriquecida]
        ORQ_PKG[ORQ_PKG: Paquetes y Combos]
        ORQ_STK[ORQ_STK: Stock en Tiempo Real]
        ORQ_RES[ORQ_RES: Reservas y Check-in]
    end

    QUERY_EXEC --> ORQ_FAC & ORQ_PKG & ORQ_STK & ORQ_RES
    MUT_EXEC --> ORQ_FAC & ORQ_PKG & ORQ_RES
    
    %% ---- CONEXION SUBSCRIPCIONES CON RABBITMQ ----
    RABBIT[(RabbitMQ: stock.actualizado)] -->|WebSocket PubSub| SUB_EXEC
```

#### Supresión Justificada del API Gateway Redundante
* **Decisión de Diseño Inviolable:** No se interpone un API Gateway adicional (como Kong, Ocelot o Nginx reverse-proxy de aplicación) entre GraphQL y el Marketplace.
* **Justificación Técnica:**
  1. **Reducción de Latencia (*Hop-count Minimization*):** Cada intermediario introduce entre 5ms y 25ms de latencia por serialización/deserialización HTTP.
  2. **GraphQL ya es un Gateway Inteligente:** El módulo GraphQL en NestJS encapsula de forma nativa la autenticación JWT (`GqlAuthGuard`), el control de acceso por roles (`RolesGuard`), la limitación de tasa (*rate limiting*), la compresión Gzip y la validación estricta de esquemas. Interponer otro Gateway en frente crearía redundancia de funciones sin aportar valor funcional.

---

### 9.2. Esquema SDL Canónico (Schema Definition Language)

El esquema tipado unifica las cuatro verticales turísticas, las operaciones transaccionales y el monitoreo administrativo en un solo contrato fuertemente tipado:

```graphql
# ==============================================================================
# ESQUEMA GRAPHQL CANÓNICO — BOOKING PROTOTIPO (RDA2)
# Single Endpoint: /graphql
# ==============================================================================

# ---- TIPOS BASE DE DOMINIO ----

enum VerticalServicio {
  ATRACCION
  AUTO
  ALOJAMIENTO
  VUELO
}

enum EstadoFactura {
  EMITIDA
  PAGADA
  REEMBOLSADA
  ANULADA
}

enum EstadoVehiculo {
  DISPONIBLE
  RESERVADO
  LISTO_PARA_ENTREGAR
  ENTREGADO
  EN_LIMPIEZA
  EN_MANTENIMIENTO
}

type Cliente {
  id: ID!
  nombreCompleto: String!
  identificacion: String!
  email: String!
  telefono: String
  rol: String!
}

type DespachoSocio {
  externalOrderId: String
  socioComercial: String!
  estadoDespacho: String!
}

type FacturaLinea {
  detalleId: ID!
  tipoServicio: VerticalServicio!
  externalItemId: String!
  titulo: String!
  cantidad: Int!
  precioUnitario: Float!
  subtotal: Float!
  despacho: DespachoSocio
}

type FacturaOrquestada {
  facturaId: ID!
  numeroFactura: String!
  fechaEmision: String!
  estado: EstadoFactura!
  subtotal: Float!
  iva: Float!
  descuentoCombo: Float!
  totalPagar: Float!
  cliente: Cliente!
  codigoAutorizacionPago: String
  metodoPago: String
  lineas: [FacturaLinea!]!
}

type CategoriaRecursiva {
  id: ID!
  nombre: String!
  descripcion: String
  incluyeComida: Boolean!
  incluyeTransporte: Boolean!
  incluyeGuia: Boolean!
  hijos: [CategoriaRecursiva!]
}

type Atraccion {
  id: ID!
  titulo: String!
  descripcion: String!
  ciudad: String!
  precio: Float!
  cuposDisponibles: Int!
  permitePaquete: Boolean!
  categoria: CategoriaRecursiva
  imagenUrl: String!
  proveedorId: String!
}

type Auto {
  id: ID!
  marcaModelo: String!
  categoria: String!
  precioPorDia: Float!
  estado: EstadoVehiculo!
  limpiezaInicio: String
  alertaMantenimiento: Boolean!
  kilometrajeActual: Int!
}

type Alojamiento {
  id: ID!
  nombre: String!
  ciudad: String!
  estrellas: Int!
  precioPorNoche: Float!
  permitePaquete: Boolean!
  checkInPermitidoDesde: String! # "14:00"
}

type Vuelo {
  id: ID!
  numeroVuelo: String!
  origen: String!
  destino: String!
  horaSalida: String!
  horaLlegada: String!
  precio: Float!
  asientosDisponibles: Int!
}

type PaqueteCombo {
  paqueteId: ID!
  titulo: String!
  porcentajeDescuento: Float!
  destinoComun: String!
  esValido: Boolean!
}

type CheckInResult {
  reservaId: ID!
  tipoServicio: VerticalServicio!
  estado: String!
  voucherQrUrl: String        # Para tours
  claveAccesoDigital: String  # Para hoteles (a partir de las 14:00)
  pnr: String                 # Para vuelos
  asientoAsignado: String     # Para vuelos
  paseAbordarUrl: String      # Para vuelos
  odometroSalida: Int         # Para autos
}

type NodoSalud {
  id: ID!
  nombre: String!
  latenciaMs: Int!
  estadoSemaforo: String! # HEALTHY 🟢, DEGRADED 🟡, DOWN 🔴
  circuitBreakerStatus: String! # CLOSED, OPEN, MANUALLY_OPEN
  killSwitchActive: Boolean!
}

# ---- QUERIES (CONSULTAS DECLARATIVAS) ----

type Query {
  # Consultas de Cliente y Facturación
  misFacturas: [FacturaOrquestada!]!
  facturaDetallada(id: ID!): FacturaOrquestada

  # Catálogos de las 4 Verticales
  buscarAtracciones(ciudad: String, categoriaId: ID, search: String): [Atraccion!]!
  arbolCategoriasAtracciones: [CategoriaRecursiva!]!
  buscarAutos(categoria: String, soloDisponibles: Boolean): [Auto!]!
  buscarAlojamientos(ciudad: String): [Alojamiento!]!
  buscarVuelos(origen: String!, destino: String!, fecha: String): [Vuelo!]!

  # Paquetes y Combos
  paquetesActivos: [PaqueteCombo!]!

  # Monitoreo de Nodos (Exclusivo ADMIN)
  monitoreoNodos: [NodoSalud!]!
}

# ---- MUTATIONS (OPERACIONES TRANSACCIONALES) ----

input ItemCarritoInput {
  tipoServicio: VerticalServicio!
  externalItemId: String!
  proveedorId: String!
  titulo: String!
  cantidad: Int!
  precioUnitario: Float!
}

input CheckoutInput {
  metodoPago: String!
  payloadPago: String # Datos bancarios o token de tarjeta
  idempotencyKey: String!
}

input CheckInInput {
  reservaId: ID!
  tipoServicio: VerticalServicio!
  dniPasajero: String!
  asientoDeseado: String     # Para vuelos
  odometroActual: Int        # Para autos
}

input MantenimientoAutoInput {
  autoId: ID!
  kilometrajeLlegada: Int!
  nivelCombustible: String!
  averiasReportadas: String
}

type Mutation {
  # Carrito y Checkout
  agregarAlCarrito(input: ItemCarritoInput!): Boolean!
  vaciarCarrito: Boolean!
  ejecutarCheckout(input: CheckoutInput!): FacturaOrquestada!

  # Check-in Omnicanal
  realizarCheckIn(input: CheckInInput!): CheckInResult!

  # Operaciones de Mantenimiento (Exclusivo MANTENIMIENTO)
  registrarInspeccionPatio(input: MantenimientoAutoInput!): Boolean!

  # Operaciones de Emergencia (Exclusivo ADMIN)
  toggleKillSwitch(nodoId: ID!, killSwitch: Boolean!, motivo: String): NodoSalud!
}

# ---- SUBSCRIPTIONS (EVENTOS PUSH EN TIEMPO REAL) ----

type StockLiveNotification {
  serviceId: String!
  itemId: String!
  availableUnits: Int!
  syncHash: String!
  timestamp: String!
}

type Subscription {
  # Notificaciones en tiempo real conectadas a RabbitMQ vía WebSockets
  stockActualizado(serviceId: String, itemId: String): StockLiveNotification!
}
```

---

### 9.3. Resolvers de NestJS y Solución al Problema N+1 (DataLoaders)

En GraphQL, una consulta anidada como `{ misFacturas { lineas { cliente { nombre } } } }` puede provocar la ejecución de decenas de consultas secundarias idénticas (**Problema N+1**). Para resolver esto, la Capa 6 implementa el patrón **DataLoader con agrupación por lotes (*batching*) y caché de petición en memoria RAM**:

```mermaid
graph LR
    subgraph Petición GraphQL Anidada
        REQ[1 Peticion de Factura con 10 Lineas]
    end

    subgraph Sin DataLoader: Problema N+1
        REQ -.->|1 llamada factura + 10 llamadas cliente| DB_SLOW[(Saturación HTTP: 11 Requests)]
    end

    subgraph Con DataLoader: Optimizacion Batch
        REQ --> DL[DataLoader en Memoria RAM]
        DL -->|Agrupa los 10 IDs en 1 solo lote| CALL_BATCH[GET /api/v1/clientes?ids=id1,id2...]
        CALL_BATCH --> CACHE_FAST[(1 Sola Request Agrupada)]
    end
```

#### Implementación del Resolver Principal en NestJS (`FacturasResolver`):
```typescript
import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../core/guards/gql-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { InvoiceAggregationService } from '../esb/invoice-aggregation.service';
import { SagaOrchestratorService } from '../esb/saga-orchestrator.service';

@Resolver('FacturaOrquestada')
@UseGuards(GqlAuthGuard, RolesGuard)
export class FacturasResolver {
  constructor(
    private readonly invoiceAggregator: InvoiceAggregationService,
    private readonly sagaOrchestrator: SagaOrchestratorService,
  ) {}

  @Query('facturaDetallada')
  @Roles('CLIENTE', 'ADMIN')
  async getFacturaDetallada(
    @Args('id', { type: () => ID }) id: string,
    @Context('user') user: any,
  ) {
    const factura = await this.invoiceAggregator.buildOrchestratedInvoice(id);

    // Regla de Seguridad RBAC a nivel de Resolver
    if (user.roles.includes('CLIENTE') && !user.roles.includes('ADMIN')) {
      if (factura.cliente.id !== user.sub) {
        throw new Error('403 Forbidden: No tiene autorización para consultar esta factura.');
      }
    }

    return factura;
  }

  @Mutation('ejecutarCheckout')
  @Roles('CLIENTE')
  async ejecutarCheckout(
    @Args('input') input: CheckoutInput,
    @Context('user') user: any,
  ) {
    // Invoca al Coordinador de Sagas del ESB
    const resultado = await this.sagaOrchestrator.executeCheckoutSaga({
      clienteId: user.sub,
      metodoPago: input.metodoPago,
      idempotencyKey: input.idempotencyKey,
    });

    if (!resultado.success) {
      throw new Error(`Checkout fallido: ${resultado.error}. Se ejecutaron compensaciones automáticas.`);
    }

    return this.invoiceAggregator.buildOrchestratedInvoice(resultado.facturaId);
  }
}
```

#### Resolver de Suscripciones en Tiempo Real (`StockSubscriptionResolver`):
```typescript
import { Resolver, Subscription, Args } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';

const pubSub = new PubSub();

@Resolver()
export class StockSubscriptionResolver {
  // Conectado al consumidor de RabbitMQ (stock.actualizado)
  static emitStockUpdate(payload: any) {
    pubSub.publish('STOCK_UPDATED_EVENT', { stockActualizado: payload });
  }

  @Subscription('stockActualizado', {
    filter: (payload, variables) => {
      if (!variables.itemId) return true;
      return payload.stockActualizado.itemId === variables.itemId;
    },
  })
  stockActualizado(@Args('serviceId', { nullable: true }) serviceId: string, @Args('itemId', { nullable: true }) itemId: string) {
    return pubSub.asyncIterator('STOCK_UPDATED_EVENT');
  }
}
```

---

### 9.4. Propagación del Contexto de Seguridad JWT hacia GraphQL

Para asegurar que los Resolvers conozcan al usuario que realiza la operación, el módulo de GraphQL extrae la cabecera `Authorization` de la petición HTTP y genera el `context`:

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  path: '/graphql',
  subscriptions: {
    'graphql-ws': true, // Protocolo moderno de WebSockets
  },
  context: ({ req, extra }) => {
    // Si es una petición HTTP regular
    if (req) {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const user = token ? decodeJwt(token) : null;
      return { req, user };
    }
    // Si es una conexión WebSocket para Suscripciones
    if (extra) {
      return { user: extra.user };
    }
  },
});
```

---

### 9.5. Medidas de Hardening y Seguridad en GraphQL

Para impedir que atacantes degraden el servidor mediante consultas recursivas o abusivas, la Capa 6 implementa cuatro protecciones críticas:

1. **Limitación de Profundidad de Consulta (*Query Depth Limiting*):**
   * Configurada a un máximo de **6 niveles de anidación**.
   * Impide ataques de denegación de servicio (*DoS*) basados en consultas cíclicas infinitas como `factura { lineas { factura { lineas { factura ... } } } }`.
2. **Análisis de Complejidad de Consulta (*Max Query Complexity*):**
   * A cada campo del esquema se le asigna un coste numérico (escalares = 1, relaciones = 5, listas = 10).
   * Si la consulta calculada supera un coste de 200 puntos, es rechazada antes de su ejecución con código `400 Bad Request`.
3. **Desactivación de Introspección en Producción:**
   * En entorno de producción (`NODE_ENV=production`), la introspección de esquema (`__schema`) se bloquea para evitar la enumeración y descubrimiento de entidades internas por actores no autorizados.
4. **Formato de Errores RFC 7807 Estandarizado:**
   * Las excepciones arrojadas por GraphQL se mapean al formato estándar de la asignatura:
     ```json
     {
       "errors": [
         {
           "message": "Permisos Insuficientes",
           "extensions": {
             "code": "FORBIDDEN",
             "status": 403,
             "type": "https://booking.epn.edu.ec/errors/permisos-insuficientes",
             "timestamp": "2026-10-19T11:51:00Z"
           }
         }
       ]
     }
     ```

---

### 9.6. Conexión hacia la Capa 7: Marketplace Web y Paneles Administrativos

La Capa 6 se acopla directamente con la **Capa 7: Presentación (React 18 / Vite)**:

* El cliente web utiliza **Apollo Client 3.x** configurado apuntando exclusivamente a `http://localhost:3000/graphql`.
* **Caché Normalizada en Cliente (`InMemoryCache`):** Al consultar un tour o una factura, Apollo Client almacena las entidades por su `id` unívoco (`Atraccion:PRhu4UBTWPBC`), actualizando la interfaz de usuario al instante sin requerir nuevas peticiones a la red.
* **Suscripciones de Stock:** La pantalla de checkout mantiene un WebSocket abierto hacia `ws://localhost:3000/graphql`. Si la tienda externa actualiza el inventario vía gRPC, la UI refleja el remanente en tiempo real sin recargar la página.

---

## 10. CAPA 7: CAPA DE PRESENTACIÓN, CONSUMO GRAPHQL Y PANELES ADMINISTRATIVOS POR MICROSERVICIO

### 10.1. Misión, Tecnologías y Arquitectura de la Capa de Presentación

Siguiendo las directrices de la rúbrica y la pizarra de clase:
> *"No es solo el UI de la tienda; cada microservicio debe contar con su interfaz de administración para auditar métricas, activar kill-switches y operar contingencias... Además, la UI se conecta directamente al single endpoint de GraphQL"*.

La **Capa 7** constituye el estrato superior del sistema. En lugar de ser un simple maquetado estático, es la **plataforma de interacción, orquestación visual y control operativo de Booking Prototipo**, desarrollada bajo los siguientes estándares tecnológicos:

* **Framework Base:** **React 18** montado sobre **Vite** con **TypeScript** estricto.
* **Cliente de Conectividad GraphQL:** **Apollo Client 3.x** configurado con:
  * **Caché Normalizada en Memoria (`InMemoryCache`):** Almacena las entidades indexadas por su clave canónica `__typename:id`, permitiendo actualizaciones atómicas instantáneas sin redibujados innecesarios.
  * **Transporte Híbrido HTTP/WebSocket:**
    * Peticiones síncronas (`Query` y `Mutation`): `http://localhost:3000/graphql` con cabecera `Authorization: Bearer <JWT>`.
    * Suscripciones en tiempo real (`Subscription`): `ws://localhost:3000/graphql` implementando el protocolo `graphql-ws`.
* **Seguridad Transversal en Frontend:**
  * Los tokens JWT se almacenan en memoria volátil de la aplicación React.
  * Los Refresh Tokens se gestionan automáticamente a través de cookies HTTP seguras (`HttpOnly`, `SameSite=Strict`, `Secure`).
  * Un interceptor (`setContext` de Apollo) adjunta el token en cada llamada. Si el token expira (error 401), el cliente dispara la renovación transparente antes de reintentar la operación.
* **Renderizado Condicional por Rol (RBAC):** La interfaz conmuta sus módulos dinámicamente según el claim `roles` del token JWT (`CLIENTE`, `ADMIN`, `MANTENIMIENTO`).

```mermaid
graph TB
    %% ---- CLIENTE REACT ----
    subgraph Capa 7: Frontend Web React 18 + Apollo Client 3
        AUTH_ROUTER{Enrutador de Roles RBAC}

        subgraph Vistas del Rol CLIENTE
            VIEW_MARKET[Marketplace Multidominio: 4 Verticales]
            VIEW_CART[Carrito Dinámico con Combos de Paquetes]
            VIEW_CHECKOUT[Pasarela Checkout Transaccional con Saga]
            VIEW_RESERVAS[Mis Reservas y Check-in Omnicanal]
        end

        subgraph Paneles de Administracion por Microservicio
            DASH_NODES[Panel 1: Monitor de Nodos y Kill-Switches - MS_PROV]
            DASH_PATIO[Panel 2: Monitor de Patio y Cooldown 2h - MS_AUT]
            DASH_FIN[Panel 3: Finanzas y Liquidaciones 10% - MS_FIN]
            DASH_SOA[Panel 4: Simulador Pagos SOA y Fallos - MS_PAG]
            DASH_FAC[Panel 5: Visor Fiscal y Trazabilidad - MS_FAC]
            DASH_TREE[Panel 6: Gestor de Árbol de Categorías - MS_ATR]
            DASH_TELEMETRY[Panel 7: Métricas gRPC y RabbitMQ - MS_STK]
        end

        AUTH_ROUTER -->|Rol CLIENTE| VIEW_MARKET & VIEW_CART & VIEW_CHECKOUT & VIEW_RESERVAS
        AUTH_ROUTER -->|Rol ADMIN| DASH_NODES & DASH_FIN & DASH_SOA & DASH_FAC & DASH_TREE & DASH_TELEMETRY
        AUTH_ROUTER -->|Rol MANTENIMIENTO| DASH_PATIO
    end

    %% ---- CONEXIÓN A CAPA 6 ----
    VIEW_MARKET & VIEW_CART & VIEW_CHECKOUT & VIEW_RESERVAS -->|Single Endpoint: POST /graphql| GQL_BFF[Capa 6: GraphQL BFF]
    DASH_NODES & DASH_PATIO & DASH_FIN & DASH_SOA & DASH_FAC & DASH_TREE & DASH_TELEMETRY -->|POST /graphql| GQL_BFF
    GQL_BFF -->|WebSockets ws://.../graphql| VIEW_CHECKOUT & DASH_NODES & DASH_TELEMETRY
```

---

### 10.2. Marketplace Turístico Web (Experiencia del Rol CLIENTE)

El Marketplace unifica el catálogo heterogéneo de los proveedores en una sola experiencia fluida para el viajero:

#### 1. Exploración y Búsqueda Multidominio
* **Tours y Atracciones:** Muestra los tours de Dilan con filtros por precio, ciudad y navegación por el **árbol recursivo de categorías** (ej. Tours ➔ Aventura ➔ Con Transporte y Comida).
* **Autos de Renta:** Catálogo que solo muestra vehículos en estado `DISPONIBLE`, ocultando aquellos en reserva, mantenimiento o en el **cooldown cronometrado de 2 horas**.
* **Alojamientos:** Búsqueda de hoteles, departamentos y resorts con desglose de amenidades y regla visible de **check-in habilitado a las 14:00 horas**.
* **Vuelos:** Búsqueda de itinerarios de aerolínea con selección de clase de cabina (`ECONOMY`, `BUSINESS`).

#### 2. Carrito de Compras Dinámico y Detección de Combos
* Al agregar un ítem, el microservicio orquestado toma un **snapshot inmutable de precio y título**.
* Si el usuario combina servicios de distintas verticales en el mismo destino geográfico (ej. Vuelo a Galápagos + Hotel Resort + Tour de Buceo), el banner de **Paquetes Dinámicos (`ORQ_PKG`)** se ilumina en tiempo real, calculando el descuento combo (ej. 15% de ahorro) sin sobrepasar el `descuento_maximo`.

#### 3. Checkout Transaccional con Resiliencia Saga
* El usuario selecciona su método de pago y presiona "Pagar y Confirmar".
* El cliente web envía la mutación `ejecutarCheckout(input: { idempotencyKey: "UUID", metodoPago: "TARJETA_CREDITO" })`.
* Si un socio externo rechaza la compra por falta de cupos (`409 Conflict`), la interfaz no crashea: muestra una alerta descriptiva bajo estándar RFC 7807 indicando:  
  * *"No fue posible reservar el Tour de Buceo por falta de cupos en la tienda socia. Se cancelaron sus otras reservas y se ha emitido el reembolso total de $450.00 a su tarjeta (Código: REF-BANCO-9921)"*.

#### 4. Módulo "Mis Reservas" y Check-in Omnicanal
Cada categoría dispone de su propia experiencia post-venta personalizada:
* **Tours:** El cliente abre su reserva y visualiza el **Voucher con Código QR dinámico** generado para que el guía turístico lo escanee en la puerta del atractivo.
* **Autos:** Visualiza el contrato de alquiler con el conductor registrado, el depósito en garantía y el **odómetro de salida**.
* **Hoteles:** La interfaz muestra un candado digital cerrado hasta las 14:00 horas del día de llegada. A partir de las 14:00 exactas, el botón de check-in se desbloquea automáticamente, revelando la **habitación física asignada (ej. Suite 402)** y la **clave de acceso digital (PIN-9812#)**.
* **Vuelos:** El pasajero interactúa con el **mapa interactivo de asientos de la cabina**, escoge su ubicación (ventana o pasillo) y obtiene su **Pase de Abordar Digital con código PNR y código de barras** listo para imprimir o descargar en PDF.

---

### 10.3. Dashboards y Paneles Administrativos por Microservicio

Para cumplir formalmente con la exigencia docente de que **cada microservicio posea su propia interfaz administrativa**, la Capa 7 implementa consolas dedicadas:

#### 🟢 Panel 1: Monitor de Nodos y Kill-Switches en Caliente (`MS_PROV` / ADMIN)
* **Objetivo:** Auditar la salud de los 5 nodos de la red y operar contingencias en vivo frente al docente.
* **Componentes Visuales:**
  * **Semáforo LED en Tiempo Real:** Cada tienda socia (Dilan Atracciones, Rent-a-car, Hoteles, Aerolíneas y Booking Core) cuenta con un indicador visual:
    * 🟢 **Verde (`HEALTHY`):** Latencia < 200ms.
    * 🟡 **Amarillo (`DEGRADED`):** Latencia entre 200ms y 800ms.
    * 🔴 **Rojo (`DOWN`):** Latencia > 800ms o error de conexión.
  * **Velocímetro de Latencia:** Muestra los milisegundos de respuesta obtenidos mediante ping síncrono.
  * **Botón de Kill-Switch Dinámico:** Un switch interactivo que permite al administrador **apagar en caliente la conexión con la tienda de un compañero**. Al accionarlo:
    * Conmuta el Circuit Breaker a `MANUALLY_OPEN`.
    * El ESB desvía el tráfico hacia la caché local sin intentar conexiones de red.
    * Permite demostrar en vivo la resiliencia del sistema desconectando a un compañero sin tumbar Booking.

---

#### 🚗 Panel 2: Monitor de Patio y Flota Vehicular (`MS_AUT` / MANTENIMIENTO y ADMIN)
* **Objetivo:** Gestionar el ciclo de vida de los vehículos, inspecciones técnicas y el cooldown obligatorio de desinfección.
* **Componentes Visuales:**
  * **Tablero Kanban de Flota:** Visualiza los vehículos distribuidos en sus 6 fases (`DISPONIBLE`, `RESERVADO`, `LISTO_PARA_ENTREGAR`, `ENTREGADO`, `EN_LIMPIEZA`, `EN_MANTENIMIENTO`).
  * **Cronómetro Regresivo Visual del Cooldown de 2 Horas:**
    * Para los vehículos en estado `EN_LIMPIEZA`, la tarjeta muestra una **barra de progreso animada con una cuenta regresiva regresiva en vivo (`01:59:59` ➔ `00:00:00`)**.
    * Hasta que el cronómetro llegue a cero, el botón de "Habilitar para Alquiler" permanece deshabilitado. Una vez cumplidas las 2 horas exactas, el cronómetro cronometrado transiciona el auto automáticamente a `DISPONIBLE`.
  * **Formulario de Inspección de Patio (Exclusivo Rol `MANTENIMIENTO`):**
    * Al devolver un auto, el personal de mantenimiento ingresa:
      * Odómetro de llegada (km).
      * Nivel de combustible (gráfico en octavos).
      * Checklist de averías físicas o rayones.
    * Si el kilometraje registrado supera el `umbral_mantenimiento_km`, la interfaz dispara una **alerta preventiva de taller en rojo**, bloqueando el auto en `EN_MANTENIMIENTO`.

---

#### 💰 Panel 3: Consola Financiera y Liquidaciones de Proveedores (`MS_FIN` / ADMIN)
* **Objetivo:** Transparentar las comisiones comerciales de Booking y liquidar a los compañeros.
* **Componentes Visuales:**
  * **Ledger Contable por Socio:** Tabla financiera que agrupa las órdenes completadas por cada tienda (Atracciones Dilan, Rent-a-car, Hoteles, Aerolíneas).
  * **Desglose Automático de Comisión (10%):**
    * *Total Bruto Vendido:* $1,200.00
    * *Comisión Retenida por Booking (10%):* $120.00
    * *Monto Neto a Liquidar al Compañero:* $1,080.00
  * **Módulo de Pago de Liquidaciones:** Permite al administrador cargar el comprobante bancario de transferencia (archivo PDF o URL de transacción) y conmutar el estado de la liquidación a `PAGADO`.

---

#### 💳 Panel 4: Consola de Simulación de Pagos SOA y Fallos Controlados (`MS_PAG` / ADMIN)
* **Objetivo:** Inyectar fallos controlados para demostraciones académicas y pruebas de resiliencia ante el docente.
* **Componentes Visuales:**
  * **Selector de Modo de Pasarela:**
    * 🔹 **Modo Normal:** Aprueba transacciones dentro del límite y genera códigos `AUTH-VISA-XXXXX`.
    * 🟢 **Modo Aprobación Forzada:** Aprueba cualquier monto sin importar límites.
    * 🔴 **Modo Rechazo Controlado (Simulación de Fondos Insuficientes):** Fuerza a la pasarela a retornar código `402 Payment Required`, permitiendo demostrar en vivo cómo la aplicación rechaza la compra antes de reservar con los compañeros.
    * 🟡 **Modo Timeout Simulado (504 Gateway Timeout):** Aplica una demora artificial de 5 segundos para forzar la apertura del Circuit Breaker por timeout de red.

---

#### 🧾 Panel 5: Visor Fiscal y Auditoría de Facturación (`MS_FAC` / ADMIN)
* **Objetivo:** Auditoría tributaria y trazabilidad de comprobantes emitidos.
* **Componentes Visuales:**
  * **Auditoría de Secuencialidad:** Verifica que la numeración correlativa (`FAC-2026-00001`, `FAC-2026-00002`) no presente saltos ni duplicados.
  * **Desglose de IVA (15%):** Visualización de base imponible y recaudación tributaria.
  * **Trazabilidad de Despacho Externo:** Muestra qué código de reserva externa (`external_order_id`) retornó cada compañero para cada línea de la factura.

---

#### 🏛️ Panel 6: Gestor de Catálogo Recursivo y Vouchers (`MS_ATR` / ADMIN)
* **Objetivo:** Administrar la jerarquía de categorías y auditar tours vendidos.
* **Componentes Visuales:**
  * **Editor Visual del Árbol de Categorías:** Permite visualizar y modificar la estructura padre-hijo (comida, transporte, guía) implementada bajo `@Tree('closure-table')`.
  * **Visor de Vouchers Emitidos:** Muestra el listado de códigos QR generados y permite validarlos manualmente si el escáner del guía presenta problemas.

---

#### ⚡ Panel 7: Consola de Telemetría gRPC y RabbitMQ (`MS_STK` / ADMIN)
* **Objetivo:** Monitorear el rendimiento de la ingesta binaria y la salud del bus de eventos.
* **Componentes Visuales:**
  * **Velocímetro de Throughput gRPC:** Gráfico en tiempo real de mensajes por segundo procesados en el puerto TCP 50051 sobre HTTP/2.
  * **Monitor de Colas RabbitMQ:** Muestra la profundidad de las 4 colas (`eventos.busquedas`, `ordenes.confirmadas`, `stock.actualizado`, `sagas.compensacion`).
  * **Buzón de Mensajes Muertos (Dead Letter Queue):** Lista los mensajes que agotaron sus 3 reintentos en `booking.ordenes.dead_letter`, permitiendo inspeccionar el error forense registrado en `logs/error.log`.

---

### 10.4. Flujo de Suscripciones en Tiempo Real (Telemetría Push WebSockets)

La Capa 7 demuestra la reactividad total del sistema conectando el evento de hardware/red con la pantalla del usuario final:

```mermaid
sequenceDiagram
    autonumber
    participant Partner as Tienda Compañero (Atracciones/Autos)
    participant MS_STK as MS Stock gRPC (Puerto 50051)
    participant RMQ as RabbitMQ (stock.actualizado)
    participant GQL as GraphQL BFF (Subscription Resolver)
    participant UI as React UI (Apollo WebSocket Link)

    Partner->>MS_STK: RPC PushStockUpdate(item: "PRhu4UBTWPBC", delta: -2) sobre HTTP/2
    Note over MS_STK: Actualiza Map en RAM en < 2ms (Sin tocar PostgreSQL)
    MS_STK->>RMQ: Publica evento "stock.delta.notificacion"
    RMQ-->>GQL: Consume evento reactivo y lo inyecta en PubSub
    GQL-->>UI: Push por WebSocket (graphql-ws) con nuevo cupo
    Note over UI: React actualiza la etiqueta de cupos de 12 a 10 al instante sin F5
```

---

## 11. Conclusión y Checklist Maestro de Cumplimiento RDA2

Con la formalización de las **7 Capas de la Arquitectura**, el proyecto **Booking Prototipo** se encuentra completamente blindado, estandarizado y alineado con los requerimientos de la cátedra de Integración de Sistemas:

| Directriz de la Cátedra / Pizarra Docente | Estrategia de Implementación RDA2 | Capa Responsable | Estado |
|---|---|---|:---:|
| **Una tabla = Una base de datos independiente** | Patrón Database-per-Service implementado mediante 11 esquemas herméticos en Supabase PostgreSQL (`schema_*`). Cero Foreign Keys entre esquemas. | **Capa 1: Persistencia** | ✅ Cumplido |
| **Microservicios conectados con ORM y NestJS** | 11 Microservicios transaccionales en NestJS 10.x con TypeORM mapeados a sus esquemas propios. Cero dependencias cruzadas. | **Capa 2: Microservicios Básicos** | ✅ Cumplido |
| **gRPC para Ingesta de Stock e Inventario** | Microservicio `MS_STK` en puerto TCP 50051 sobre HTTP/2 con Protocol Buffers v3 (`inventory.proto`). Opera en RAM/Redis sin saturar base de datos. | **Capa 2: Microservicios Básicos** | ✅ Cumplido |
| **El ESB sustituye las uniones entre tablas** | ESB Centralizado con Capa Interna (ensamblado en memoria de Factura + Cliente + Pagos sin SQL JOINs) y Capa de Integración Externa (Adaptadores ACL). | **Capa 3: ESB Centralizado** | ✅ Cumplido |
| **Event Bus para evitar saturación del ESB** | RabbitMQ broker con cola `eventos.busquedas` (TTL 10s y rate-leveling) para absorber miles de búsquedas sin congelar el ESB. | **Capa 4: Event Bus RabbitMQ** | ✅ Cumplido |
| **Compras con contrato obligatorio de respuesta** | Al confirmar la orden, el worker despacha por REST hacia el compañero y exige respuesta síncrona formal: `201 Created` o `409 Conflict`. | **Capa 4: Event Bus RabbitMQ** | ✅ Cumplido |
| **Sagas y Compensaciones automáticas** | Orquestador Saga en el ESB que ejecuta rollback distribuido en orden inverso (LIFO) y reembolso del 100% bancario SOA ante fallos de stock de socios. | **Capa 3 y 4: ESB / RabbitMQ** | ✅ Cumplido |
| **Microservicios Orquestados con Seguridad JWT** | Servicios compuestos `ORQ_FAC`, `ORQ_PKG`, `ORQ_STK`, `ORQ_RES` protegidos por tokens JWT y roles RBAC (`CLIENTE`, `ADMIN`, `MANTENIMIENTO`). | **Capa 5: Microservicios Orquestados** | ✅ Cumplido |
| **Single Endpoint GraphQL (Sin API Gateway redundante)** | GraphQL como BFF unificado (`POST /graphql`) con Schema SDL, Resolvers, DataLoaders anti N+1 y suscripciones WebSockets. Se suprime el Gateway intermedio. | **Capa 6: GraphQL BFF** | ✅ Cumplido |
| **Paneles Administrativos por Microservicio** | 7 Paneles dedicados: Monitor de Nodos con Kill-Switch dinámico, Patio de Autos con cronómetro de cooldown 2h, Liquidaciones 10%, Simulador SOA, etc. | **Capa 7: Presentación** | ✅ Cumplido |
| **Check-in Omnicanal de las 4 Verticales** | Check-in digital para Tours (Voucher QR), Autos (Odómetro salida), Hoteles (A partir de las 14:00 con clave digital) y Vuelos (PNR y pase de abordar). | **Capa 5 y 7: Orquestación / UI** | ✅ Cumplido |
| **Máquina de 6 estados y Cooldown de 2h en Autos** | Estados finitos con cooldown cronometrado de 2 horas en `EN_LIMPIEZA` evaluado por `@Cron` antes de restaurar a disponible. | **Capa 2 y 7: Autos / UI** | ✅ Cumplido |
| **Árbol Recursivo de Categorías en Atracciones** | Implementación de `@Tree('closure-table')` para jerarquías padre-hijo (comida, transporte, guía). | **Capa 2 y 7: Atracciones / UI** | ✅ Cumplido |
| **Cero Logs en Base de Datos** | Registro exclusivo en archivos físicos rotativos bajo `logs/` (`combined.log`, `error.log`, `audit.log`) mediante `WinstonPhysicalLoggerService`. | **Transversal (Capas 2 a 7)** | ✅ Cumplido |

---

> **Certificación Técnica del Blueprint:**  
> Este documento representa la especificación arquitectónica definitiva y completa del **Booking Prototipo (RDA2)**. Ha sido formalizado y auditado para servir como la guía maestra de codificación, integración y defensa evaluativa del proyecto.

