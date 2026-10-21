# Plan Maestro de Auditoría Exhaustiva y Hoja de Ruta de Implementación Técnica RDA2

**Proyecto:** Booking Prototipo — Plataforma Central de Integración Multi-Sistemas  
**Asignatura:** Integración de Sistemas — 6to Semestre  
**Ubicación del Documento:** `docs Paúl Rosero/architecture/PLAN_MAESTRO_AUDITORIA_E_IMPLEMENTACION_RDA2.md`  
**Referencia Arquitectónica:** [ARQUITECTURA_RDA2_MICROSERVICIOS_PRODUCCION.md](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/docs%20Pa%C3%BAl%20Rosero/architecture/ARQUITECTURA_RDA2_MICROSERVICIOS_PRODUCCION.md)  
**Calificación Objetivo:** 11 / 11 Puntos (Cumplimiento Total de Rúbrica y Criterio Excluyente)  
**Estado:** Documento Maestro de Auditoría y Planificación Cerrado — Listo para Implementación

---

## 1. Justificación y Propósito del Plan Maestro

El presente documento constituye la **auditoría técnica integral y el plan maestro paso a paso** para la ejecución del **Reto 2 (RDA2)** de la asignatura *Integración de Sistemas*.

Este plan se fundamenta rigurosamente en la contrastación de tres fuentes primarias de verdad académica:
1. **[Proyecto de la asignatura.pdf](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/teoria/Proyecto%20de%20la%20asignatura.pdf)**: Bases conceptuales, propósito formativo, alcance del Booking Prototipo, migración obligatoria a microservicios e interoperabilidad síncrona/asíncrona.
2. **[Rúbrica RDA2.md](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/teoria/R%C3%BAbrica%20RDA2.md)**: Criterio Excluyente obligatorio (CE01) y los 10 criterios de evaluación formal (11/11 puntos).
3. **[Consideraciones RDA2.md](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/teoria/Consideraciones%20RDA2.md)**: Directrices operativas emitidas por el docente de la cátedra (gRPC vs REST, persistencia independiente, cero logs en base de datos, cooldown de 2 horas en autos, árbol recursivo en atracciones, check-in multivertical, ESB de dos capas, Event Bus RabbitMQ, transacciones Saga, paquetes y contratos comerciales).
4. **Inspección File-by-File del Código Fuente Actual en `plantilla inicial`**: Análisis exhaustivo de cada archivo, entidad, servicio, controlador, contrato y componente en frontend/backend.

---

## 2. Matriz de Cumplimiento Normativo (Rúbrica RDA2 vs Cátedra)

| ID Criterio | Criterio de Evaluación RDA2 | Tipo | Exigencia de Cátedra (Consideraciones RDA2) | Estado Actual en `plantilla inicial` | Fase del Plan |
|---|---|---|---|---|---|
| **CE01** | Todas las tiendas del curso integradas con Booking Prototipo | **Excluyente (Obligatorio - 0 o 1)** | Consumo de inventario continuo vía gRPC y envío de órdenes de compra vía REST con compañeros. | 🟡 Parcial (Simuladores locales activos; URLs de compañeros pendientes de orquestar en producción). | Fase 5 y 8 |
| **CE02** | Migración a arquitectura de microservicios | Evaluativo (1 pto) | Persistencia independiente: **1 microservicio = 1 base de datos/esquema propio**. Prohibido compartir tablas o hacer `JOIN` SQL entre servicios. | 🔴 No cumple (Base de datos monolítica única en esquema `public` con llaves foráneas cruzadas). | Fase 1 |
| **CE03** | Consumo correcto de APIs y/o eventos | Evaluativo (1 pto) | **gRPC HTTP/2 Inbound (50051)** para sincronización de stock y **REST** para compras. Event Bus RabbitMQ para búsquedas y eventos masivos. | 🟡 Parcial (gRPC implementado en memoria; Event Bus RabbitMQ ausente en código). | Fase 4 y 6 |
| **CE04** | Marketplace web integrado en entorno distribuido | Evaluativo (1 pto) | Marketplace React 18 funcional que consulte catálogo agregado mediante **BFF GraphQL** sin congelarse ante fallas de socios. | 🟡 Parcial (UI React existe pero llama a REST ad-hoc; bloques v2 comentados; sin GraphQL). | Fase 7 y 8 |
| **CE05** | Sistema de administración operativo distribuido | Evaluativo (1 pto) | **Cada microservicio cuenta con su interfaz administrativa**. Monitor con **semáforo LED** (🟢/🟡/🔴) y **Kill-Switches** en tiempo real. | 🟡 Parcial (`AdminDashboard.jsx` monolítico de 172 KB; faltan paneles específicos desacoplados). | Fase 8 |
| **CE06** | API Gateway / BFF funcional y configurado | Evaluativo (1 pto) | Single Endpoint `/graphql` para el frontend y Gateway ESB de 2 capas que enruta y sustituye SQL JOINs. | 🔴 No cumple (No existe `/graphql` ni ESB centralizado formal; controladores REST directos). | Fase 5 y 7 |
| **CE07** | Contratos entre servicios documentados y versionados | Evaluativo (1 pto) | OpenAPI 3.1 para REST, Protocol Buffers (`.proto`) v3 para gRPC y CloudEvents v1.0 para eventos. | 🟢 Cumple (`contracts/*.yaml` v1 y v2, `inventory.proto` formalizados). | Fase 1 |
| **CE08** | Pruebas de integración funcionales (Contract Testing) | Evaluativo (1 pto) | Pruebas automatizadas ejecutables (Jest/Supertest) contra esquemas OpenAPI y simulación de fallos/Sagas. | 🔴 No cumple (Solo existe script emulado de consola `runner-pruebas.js`). | Fase 8 |
| **CE09** | Mecanismos de seguridad (JWT, roles, rate-limiting) | Evaluativo (1 pto) | JWT Guard, RBAC (`CLIENTE`, `ADMIN`, `MANTENIMIENTO`), Throttling estricto y protección de endpoints críticos. | 🟡 Parcial (SupabaseAuth básico implementado; faltan scopes finos, rol mantenimiento y throttler). | Fase 4 y 5 |
| **CE10** | Sistemas desplegados y accesibles en Internet | Evaluativo (1 pto) | Backend desplegado (Render/Railway), Frontend en Vercel, Supabase en la nube con HTTPS operativo. | 🟡 Parcial (Configs de Vercel y Render listas; requiere despliegue de los 11 esquemas y microservicios). | Fase 8 |
| **CE11** | Dominio técnico del código, arquitectura y defensa | Evaluativo (1 pto) | Justificación técnica de las 7 capas, diagramas Mermaid, trazabilidad física en disco y defensa oral impecable. | 🟢 Documentado ([ARQUITECTURA_RDA2_MICROSERVICIOS_PRODUCCION.md](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/docs%20Pa%C3%BAl%20Rosero/architecture/ARQUITECTURA_RDA2_MICROSERVICIOS_PRODUCCION.md)). | Fase 8 |

---

## 3. Auditoría Exhaustiva File-by-File del Código Actual (`plantilla inicial`)

A continuación se presenta el diagnóstico técnico componente por componente del código preexistente:

### 3.1. Núcleo y Persistencia (`src/core/`)

| Archivo / Componente | Diagnóstico Técnico Actual | Dictamen | Acciones Requeridas para RDA2 |
|---|---|---|---|
| `src/core/entities/usuario.entity.ts` | Entidad mapeada al esquema `public`. Mezcla datos de autenticación con perfil del cliente. | 🟡 Requiere Refactor | Migrar a `schema_clientes.clientes`. Añadir soporte formal de rol `mantenimiento` según §5 de Consideraciones. |
| `src/core/entities/carrito.entity.ts` y `carrito-item.entity.ts` | Ubicadas en `public` con relaciones `@ManyToOne` directas hacia `UsuarioEntity`. | 🔴 Violación Aislamiento | Mover a `schema_carritos`. Desacoplar llaves foráneas físicas cruzadas; usar `cliente_id` como UUID lógico. |
| `src/core/entities/factura.entity.ts` y `factura-item.entity.ts` | Entidades en `public` con claves foráneas directas. No registran `idempotency_key` ni estado de compensación Saga. | 🔴 Violación Aislamiento | Mover a `schema_facturacion.facturas_encabezado` y `facturas_detalle`. Añadir `idempotency_key` y control fiscal IVA 15%. |
| `src/core/entities/api-request-log.entity.ts` | Entidad TypeORM que persiste peticiones HTTP en la base de datos PostgreSQL. | 🚫 **VIOLACIÓN CRÍTICA DE CÁTEDRA** | **ELIMINAR ESTA TABLA Y ENTIDAD**. Consideraciones RDA2 §2 prohíbe terminantemente guardar logs en base de datos. |
| `src/core/logger/winston-logger.service.ts` | Implementa escritura física en disco en formato JSON Lines bajo `logs/audit-*.log`. | 🟢 Conforme con Cátedra | Expandir para unificar toda la trazabilidad distribuida (`trace_id`, `span_id`, `correlation_id`, `node_id`). |
| `src/core/filters/rfc7807-exception.filter.ts` | Filtro global de excepciones que formatea errores según estándar RFC 7807. | 🟢 Excelente | Mantener y propagar a todos los microservicios. |
| `src/core/interceptors/hateoas.interceptor.ts` | Inyecta hipervínculos navegables en respuestas REST (Richardson Nivel 3). | 🟢 Excelente | Mantener para microservicios REST básicos. |

---

### 3.2. Módulos de Verticales Turísticas (`src/modules/`)

#### 🎡 Módulo de Atracciones (`src/modules/atracciones/` y `frontend/`)
* **Estado Actual:** Posee `atraccion.entity.ts`, `resena.entity.ts` y `reserva.entity.ts` en backend. En frontend dispone de `services/atraccionesApi.js`, `AtraccionDetail.jsx`, `AtraccionesPage.jsx`, `AtraccionesSearchPage.jsx`, `VoucherModal.jsx` y `MisReservasPage.jsx`.
* **Brechas Críticas Detectadas (Backend & Frontend vs. Contrato OpenAPI v2):**
  1. **Falta el Árbol Jerárquico Recursivo de Categorías en Backend y Frontend:** En backend falta la entidad autorreferencial `@Tree('closure-table')`. En frontend, `AtraccionesSearchPage.jsx` tiene checkboxes planos en código duro y no consume `getCategoriasArbol()` ni los filtros de `incluye_comida`, `incluye_transporte`, `incluye_guia`.
  2. **Desglose Incompleto de Boletos por Edad en Frontend:** `AtraccionDetail.jsx` solo implementa Adulto y Niño. Carece de selectores para **Adulto Mayor (Senior)** e **Infantes/Bebés ($0 con cupo de aforo legal)**, incumpliendo el contrato `TicketCategoryBreakdown`.
  3. **Desconexión del Check-in Presencial en `MisReservasPage.jsx`:** `VoucherModal.jsx` implementa la vista de QR y check-in presencial, pero `MisReservasPage.jsx` no lo importa ni expone el botón de acción para reservas de atracciones.
  4. **Falta de Descarga de Calendario (.ics) y Código QR Dinámico:** El frontend no mapea `voucher_qr_payload` ni `ics_calendar_url` devueltos por el contrato 201 Created.
  5. **Falta de Widget de Paquetes / Combos B2B:** No existe en la UI de atracciones el indicador de descuentos acordados mediante `GET /atracciones/promociones/contrato`.
  6. **Persistencia Monolítica:** Entidades backend mapeadas a `public` en lugar de `schema_atracciones`. (Ver Sección 8 para el plan de remediación UI exhaustivo).

#### 🚗 Módulo de Autos y Flota (`src/modules/autos/`)
* **Estado Actual:** Posee `auto.entity.ts`, `order-auto.entity.ts` y `mantenimiento-auto.entity.ts`.
* **Brechas Críticas Detectadas:**
  1. **Falta la Máquina de Estados de 6 Fases y Cooldown de 2 Horas:** Consideraciones RDA2 §5 exige: `DISPONIBLE` → `RESERVADO` → `LISTO_PARA_ENTREGAR` → `ENTREGADO` → `EN_LIMPIEZA` → **Temporizador cronometrado de 2 horas** → `DISPONIBLE`. Actualmente el auto pasa directamente a disponible sin temporizador.
  2. **Falta el Sistema de Alertas por Umbral de Kilometraje:** Consideraciones RDA2 §5 exige registrar kilometraje, características de cómo llega el auto, y disparar alertas auditables cuando el odómetro supere un umbral configurable.
  3. **Falta el Check-in de Entrega y Devolución:** Registro de `km_salida`, `km_llegada` y verificación de licencia.
  4. **Persistencia Monolítica:** Mapeadas a `public` en lugar de `schema_autos`.

#### 🏨 Módulo de Alojamientos (`src/modules/alojamientos/`)
* **Estado Actual:** Posee 6 entidades para catálogo, tipos de habitación, reservas y huéspedes.
* **Brechas Críticas Detectadas:**
  1. **Falta el Check-in Digital a las 14:00:** Consideraciones RDA2 §4 exige check-in digital que libere la clave de acceso a la habitación a partir de las 14:00 del día de ingreso.
  2. **Persistencia Monolítica:** Mapeadas a `public` en lugar de `schema_alojamientos`.

#### ✈️ Módulo de Vuelos (`src/modules/vuelos/`)
* **Estado Actual:** Arquitectura muy completa con 38 entidades, máquina de estados de reservas, emisión de boletos y check-in con pase de abordar.
* **Brechas Críticas Detectadas:**
  1. **Contaminación de Logs en BD:** Contiene `log_auditoria_vuelos.entity.ts` que escribe en base de datos. Debe ser purgado y reemplazado por Winston File Logger.
  2. **Persistencia Monolítica:** Debe aislarse herméticamente en `schema_vuelos`.

---

### 3.3. Módulos Core Faltantes o Huérfanos

| Módulo / Capa | Exigencia de Cátedra y Rúbrica | Estado en Código Actual | Diagnóstico |
|---|---|---|---|
| **Paquetes Dinámicos (`schema_paquetes`)** | Consideraciones §9: Crear base de datos dedicada a paquetes (`paquetes`, `paquete_items`, `contrato_promociones`) con topes de descuento de socios y snapshot comercial. | 🔴 Inexistente | Debe construirse como microservicio básico + orquestador `ORQ_PKG`. |
| **Simulación de Pagos SOA (`schema_pagos`)** | Consideraciones §7 y Sílabo Semana 5: Microservicio transaccional de pagos con verificación previa, inyección de fallos y emisión de código de autorización. | 🔴 Inexistente | Debe construirse como microservicio básico `MS_PAG` con tabla `transacciones_pago`. |
| **Finanzas y Liquidaciones (`schema_finanzas`)** | Base de datos actual (líneas 901 y 994) y Rúbrica CE05: Liquidación quincenal/mensual del 10% a proveedores con comprobante de pago. | 🟡 Parcialmente en `AdminFinanzasService` | Debe desacoplarse a `schema_finanzas.liquidaciones_proveedores` y `MS_FIN`. |
| **Proveedores y Salud de Nodos (`schema_proveedores`)** | Consideraciones §2 y Rúbrica CE05: Monitor de nodos con semáforo LED (🟢/🟡/🔴), latencias y Kill-Switches en vivo. | 🟡 Parcial en `ConnectorHealthService` | El directorio `src/modules/nodes` está completamente vacío. Debe consolidarse en `schema_proveedores` y `MS_PROV`. |
| **ESB Centralizado de Dos Capas** | Consideraciones §7 y Sílabo Semana 13: Capa Interna (sustituto de SQL JOINs y Sagas) + Capa Externa (ACL, Circuit Breakers Opossum y Kill-Switches). | 🔴 Inexistente como módulo formal | La lógica está dispersa en controladores. Debe crearse el módulo central `esb/`. |
| **Event Bus RabbitMQ** | Consideraciones §7 y Rúbrica CE03: Topic Exchange `booking.events` con dampening de búsquedas masivas, órdenes y eventos de stock. | 🔴 Inexistente | No está instalado `amqplib` ni configurado el broker. |
| **Capa de Agregación GraphQL (BFF)** | Rúbrica CE06 y Sílabo Semana 4: Single Endpoint `/graphql` con Apollo Server, DataLoaders y suscripciones WebSockets (`ws://`). | 🔴 Inexistente | No está instalado `@nestjs/graphql` ni `@apollo/server`. |

---

### 3.4. Auditoría del Frontend (`frontend/`)

1. **Monolito de Administración (`AdminDashboard.jsx` - 172 KB):**
   - Posee pestañas embebidas en un único archivo gigantesco de 2,859 líneas.
   - Si bien cuenta con un prototipo de kill-switch en `MicroserviciosTab`, **no implementa los 7 paneles administrativos independientes exigidos por el docente**:
     - *Falta panel de flota de autos con temporizador cooldown cronometrado de 2 horas*.
     - *Falta panel de gestión del árbol de categorías de atracciones*.
     - *Falta consola de simulación de pagos SOA (inyección de aprobados/rechazos/timeouts)*.
     - *Falta monitor de rendimiento de streams gRPC*.
2. **Bloques Visuales Comentados en el Marketplace:**
   - `AtraccionDetail.jsx`: Reseñas desglosadas (limpieza, servicio, calidad) e itinerario están comentados.
   - `AutoDetail.jsx`: Instrucciones de recogida y devolución están comentadas.
   - Deben descomentarse y conectarse con los endpoints v2 y GraphQL.
3. **Flujos de Check-in en el Cliente:**
   - En `MisReservasPage.jsx`, solo existe visualización básica; faltan los modales interactivos de check-in digital (código QR para atracciones, odómetro para autos, clave digital a las 14:00 para alojamientos, y selección de asiento para vuelos).

---

## 4. Matriz de Brechas Arquitectónicas (Gap Analysis Maestro)

```mermaid
graph TD
    subgraph Estado Actual: Monolito Inicial
        A1[Persistencia Unica: public] --> A2[Controladores REST Directos]
        A2 --> A3[Logs en Base de Datos: api_request_logs]
        A2 --> A4[AdminDashboard Monolitico: 172 KB]
    end

    subgraph Brechas Tecnicas a Cerrar
        B1[B-01: Separacion 11 Esquemas Supabase]
        B2[B-02: Microservicios Paquetes y Pagos]
        B3[B-03: ESB Centralizado de Dos Capas]
        B4[B-04: Event Bus RabbitMQ]
        B5[B-05: Purga Total de Logs en BD a Winston File]
        B6[B-06: Capa Agregacion GraphQL /graphql]
        B7[B-07: Negocio: Cooldown 2h + Arbol Recursivo + Checkin]
        B8[B-08: 7 Paneles de Administracion Desacoplados]
    end

    subgraph Estado Objetivo: RDA2 11/11 Puntos
        C1[7 Capas Arquitectonicas Robustas]
        C2[Marketplace + Admin Distribuido]
        C3[Cero Logs en BD + Archivos Planos]
        C4[Integracion Real con Companeros]
    end

    Estado Actual --> Brechas Tecnicas a Cerrar
    Brechas Tecnicas a Cerrar --> Estado Objetivo
```

A continuación se categorizan las **14 brechas técnicas obligatorias** que guían el plan de implementación:

* **Brecha B-01 (Persistencia):** Aislamiento de 11 esquemas herméticos en Supabase (`schema_*`) y eliminación de foreign keys cruzadas.
* **Brecha B-02 (Cero Logs en BD):** Eliminación de tablas `api_request_logs`, `panel_audit_logs`, `log_auditoria_vuelos` y migración total a `logs/*.log` vía Winston.
* **Brecha B-03 (Microservicio Paquetes):** Implementación de `MS_PKG` con validación de contratos comerciales (`descuento_maximo`) y combos multivertical.
* **Brecha B-04 (Microservicio Pagos SOA):** Implementación de `MS_PAG` con simulación de transacciones, estados (`APROBADO`, `RECHAZADO`, `REEMBOLSADO`) y `idempotency_key`.
* **Brecha B-05 (Microservicio Finanzas):** Implementación de `MS_FIN` con retención del 10% de comisión del Booking y emisión de comprobantes.
* **Brecha B-06 (Lógica Autos):** Máquina de estados con 6 fases, cooldown cronometrado de 2 horas tras limpieza y alertas por umbral de kilometraje.
* **Brecha B-07 (Lógica Atracciones):** Árbol jerárquico recursivo (`categorias_recursivas`) con flags de comida, guía y transporte.
* **Brecha B-08 (Check-in Multivertical):** Flujos de Check-in específicos para Alojamientos (14:00), Atracciones (QR), Autos (km) y Vuelos (asiento).
* **Brecha B-09 (ESB Centralizado):** Implementación del ESB de doble capa (Interna para orquestación de negocio y sustitución de JOINs; Externa con ACL y Circuit Breakers).
* **Brecha B-10 (Event Bus RabbitMQ):** Configuración de broker AMQP, Topic Exchange `booking.events` y colas con dampening para búsquedas masivas.
* **Brecha B-11 (Patrón Saga):** Transacciones distribuidas orquestadas para compras compuestas y compensaciones automáticas con códigos `REF-...`.
* **Brecha B-12 (Capa GraphQL BFF):** Apollo Server con endpoint `/graphql`, DataLoaders anti-N+1 y suscripciones WebSockets en tiempo real.
* **Brecha B-13 (Frontend y 7 Paneles Admin):** Desacoplamiento del AdminDashboard en 7 paneles especializados con semáforo LED y Kill-Switches.
* **Brecha B-14 (Testing Automatizado):** Suite de Contract Testing con Jest y Supertest para validación estricta de esquemas y resiliencia.

---

## 5. Plan Maestro de Implementación Paso a Paso (8 Fases)

Cada fase está diseñada para ejecutarse de manera secuencial, modular y verificable, garantizando que el sistema compile y opere sin regresiones en cada hito.

---

### 🟢 FASE 1: Aislamiento de Persistencia Supabase (Capa 1) y Contratos OpenAPI v2

* **Objetivo:** Cumplir el principio docente *"A cada microservicio una base de datos independiente sin compartir tablas"*, creando los 11 esquemas en PostgreSQL/Supabase y tipando entidades sin claves foráneas físicas cruzadas.
* **Criterios de Rúbrica Asociados:** **CE02** (Microservicios), **CE07** (Contratos versionados).

#### Tareas Concretas:
1. **Creación del Script DDL Maestro de Migración:**
   - Crear `database/01_master_migration_11_schemas.sql` con la definición formal de los 11 esquemas:
     * `schema_clientes`: `clientes`
     * `schema_carritos`: `carritos`, `carrito_items`
     * `schema_facturacion`: `facturas_encabezado`, `facturas_detalle`
     * `schema_pagos`: `transacciones_pago`
     * `schema_paquetes`: `paquetes`, `paquete_items`, `contrato_promociones`
     * `schema_finanzas`: `liquidaciones_proveedores`
     * `schema_proveedores`: `config_proveedor`
     * `schema_atracciones`: `atracciones_cache`, `categorias_recursivas`, `reservas_atraccion`, `resenas_atraccion`
     * `schema_autos`: `autos_cache`, `reservas_auto`, `mantenimiento_autos`
     * `schema_alojamientos`: `alojamientos_cache`, `tipos_habitacion`, `reservas_alojamiento`, `huespedes_reserva`
     * `schema_vuelos`: `vuelos_cache`, `reservas_vuelo`, `asientos_vuelo`, `pases_abordar`
2. **Ejecución y Verificación en Supabase:**
   - Ejecutar el script contra la base de datos de producción/desarrollo Supabase.
   - Validar que cada tabla resida en su esquema correspondiente.
3. **Refactorización de Entidades TypeORM en el Backend:**
   - Configurar decoradores explícitos: `@Entity({ name: 'tabla', schema: 'schema_*' })`.
   - Reemplazar toda relación `@ManyToOne` cross-schema por identificadores lógicos (`@Column({ type: 'uuid' }) clienteId: string`).
4. **Verificación OpenAPI v2:**
   - Comprobar que `contracts/atracciones-openapi-v2.yaml` y `contracts/autos-openapi-v2.yaml` reflejen los nuevos campos.

---

### 🟢 FASE 2: Purga Absoluta de Logs en BD y Consolidación de Telemetría Física Winston

* **Objetivo:** Cumplir la **Política de Oro de Cátedra** (*"Cero logs en base de datos; la auditoría va exclusivamente a archivos físicos planos rotativos bajo `logs/`"*).
* **Criterios de Rúbrica Asociados:** **CE05** (Admin distribuido), **CE11** (Dominio técnico y auditoría).

#### Tareas Concretas:
1. **Eliminación de Entidades y Tablas de Logs en BD:**
   - Eliminar `src/core/entities/api-request-log.entity.ts`.
   - Eliminar `src/modules/vuelos/entities/log_auditoria_vuelos.entity.ts`.
   - Ejecutar `DROP TABLE IF EXISTS api_request_logs, panel_audit_logs, log_auditoria_vuelos CASCADE;` en Supabase.
2. **Refactorización de `AdminAuditService`:**
   - Modificar `src/modules/admin/admin-audit.service.ts` para que deje de inyectar `DataSource` relacional.
   - Canalizar todas las llamadas hacia `WinstonPhysicalLoggerService.logAudit()`.
   - Modificar el endpoint `GET /api/v1/admin/audit` para leer y parsear en streaming las últimas líneas de `logs/audit-YYYY-MM-DD.log`.
3. **Estandarización del Formato de Logs JSON Lines:**
   - Asegurar que cada línea en `logs/*.log` contenga: `timestamp`, `correlation_id`, `trace_id`, `span_id`, `node_id`, `node_code`, `action`, `resource_type`, `transport`, `status`, `duration_ms`.
4. **Middleware Global de Trazabilidad:**
   - Registrar la duración exacta de cada petición y volcarla automáticamente a `logs/integration-YYYY-MM-DD.log`.

---

### 🟢 FASE 3: Lógica Específica de Negocio de las 4 Verticales

* **Objetivo:** Implementar los flujos de dominio requeridos por las consideraciones del docente: árbol recursivo, máquina de estados con cooldown de 2 horas y check-in cuádruple.
* **Criterios de Rúbrica Asociados:** **CE03** (Consumo de APIs), **CE04** (Marketplace funcional).

#### Tareas Concretas:
1. **Vertical Atracciones — Controlador, Árbol Recursivo y Alineación Estricta con OpenAPI v2 (§6):**
   - Crear entidad `CategoriaRecursivaEntity` en `schema_atracciones`:
     - Campos: `id`, `nombre`, `parent_id` (auto-referencia con decorador `@Tree('closure-table')`), `incluye_comida` (boolean), `incluye_transporte` (boolean), `incluye_guia` (boolean).
   - Implementar endpoints en `AtraccionesController` y `AtraccionesService` conforme a `contracts/atracciones-openapi-v2.yaml`:
     - `GET /api/v2/atracciones`: Catálogo paginado con filtros (`search`, `destination`, `incluye_comida`, etc.).
     - `GET /api/v2/atracciones/:id`: Ficha técnica enriquecida (itinerario paso a paso, pilares de calificación, geolocalización GPS).
     - `GET /api/v2/atracciones/:id/availability`: Turnos horarios dinámicos y aforo en tiempo real.
     - `GET /api/v2/atracciones/categorias/arbol`: Retorna el árbol anidado multicapa con los 3 flags de inclusión de cátedra.
     - `POST /api/v2/atracciones/reservas`: Contrato obligatorio de compra con desglose etario de 4 edades (Adulto, Niño, Senior, Infante), retorno 201 con `external_order_id` o 409 `OUT_OF_STOCK` (RFC 7807) para activación de Sagas.
     - `POST /api/v2/atracciones/reservas/:id/checkin`: Validación presencial del titular por el guía turístico oficial con código QR.
     - `POST /api/v2/atracciones/reservas/:id/cancel`: Cancelación con idempotencia y compensación Saga.
     - `GET /api/v2/atracciones/promociones/contrato` y `PUT /api/v2/atracciones/promociones/contrato`: Consulta y respuesta al cuestionario B2B de promociones y combos.
     - `GET /api/v2/atracciones/eventos`: Feed Transactional Outbox para streaming hacia RabbitMQ y Apache Kafka.
     - `GET /api/v2/atracciones/health`: Ping de salud para el Monitor de Nodos EDA (Panel 1).
2. **Vertical Autos — Cooldown de 2 Horas y Alertas de Kilometraje (§5):**
   - En `auto.entity.ts`, implementar la máquina de estados estricta:
     - `DISPONIBLE`, `RESERVADO`, `LISTO_PARA_ENTREGAR`, `ENTREGADO`, `EN_LIMPIEZA`, `EN_MANTENIMIENTO`.
   - Implementar el cronómetro de cooldown:
     - Campo `limpieza_inicio_at`.
     - Tarea programada (`@Cron(CronExpression.EVERY_MINUTE)`) o cálculo dinámico: el auto solo pasa a `DISPONIBLE` si `NOW() >= limpieza_inicio_at + INTERVAL '2 HOURS'`.
   - Implementar módulo de mantenimiento de flota:
     - Registrar kilometraje de entrega y recepción.
     - Campo `umbral_mantenimiento_km`. Si `kilometraje_actual >= umbral_mantenimiento_km`, emitir alerta auditable inmediata y bloquear para renta.
3. **Flujos de Check-in para las 4 Verticales (§4):**
   - **Alojamientos:** Endpoint `POST /api/v2/alojamientos/reservas/:id/checkin`. Valida que la hora local sea >= 14:00 del día de ingreso; emite `habitacion_asignada` y `clave_acceso_digital`.
   - **Atracciones:** Endpoint `POST /api/v2/atracciones/reservas/:id/checkin`. Valida código de reserva y emite voucher con código QR en base64 y hora de acceso.
   - **Autos:** Endpoint `POST /api/v2/autos/orders/:id/checkin-entrega` (licencia del conductor y `km_salida`) y `checkin-devolucion` (`km_llegada`, disparando el estado `EN_LIMPIEZA`).
   - **Vuelos:** Endpoint `POST /api/v2/vuelos/checkin`. Asigna asiento de cabina y emite pase de abordar digital con código de barras y PNR.

---

### 🟢 FASE 4: Implementación de Microservicios Core Faltantes (`MS_PKG`, `MS_PAG`, `MS_FIN`, `MS_PROV`)

* **Objetivo:** Construir los microservicios básicos que operarán sobre sus esquemas independientes en la Capa 2.
* **Criterios de Rúbrica Asociados:** **CE02** (Microservicios), **CE05** (Admin operativo).

#### Tareas Concretas:
1. **Microservicio de Paquetes Dinámicos (`src/modules/paquetes/`):**
   - Crear entidades: `PaqueteEntity`, `PaqueteItemEntity`, `ContratoPromocionesEntity` mapeadas a `schema_paquetes`.
   - Lógica de negocio: Validar que los ítems del combo pertenezcan a la misma ciudad/destino y que el descuento aplicado no exceda el `descuento_maximo` fijado en el contrato del socio.
   - Guardar snapshot inmutable de precios al momento de la confirmación.
2. **Microservicio de Simulación de Pagos SOA (`src/modules/pagos/`):**
   - Crear entidad `TransaccionPagoEntity` mapeada a `schema_pagos`.
   - Implementar `PagosController` con soporte obligatorio de cabecera `Idempotency-Key`.
   - Simular procesamiento de pasarela con inyección configurable de escenarios: `APROBADO` (genera `codigo_autorizacion`), `RECHAZADO_FONDOS_INSUFICIENTES`, `TIMEOUT_PASARELA`.
   - Endpoint de reembolso para compensación Saga: `POST /api/v1/pagos/reembolsos` (genera `codigo_reembolso` `REF-PAG-...`).
3. **Microservicio de Finanzas y Liquidaciones (`src/modules/finanzas/`):**
   - Crear entidad `LiquidacionProveedorEntity` mapeada a `schema_finanzas`.
   - Lógica de cálculo: Cada vez que una orden es confirmada, liquidar el **10% de comisión para Booking Prototipo** y el 90% restante para el proveedor externo.
   - Endpoints para consultar ledger, marcar liquidaciones como `PAGADO` y adjuntar URL del comprobante.
4. **Consolidación del Módulo de Proveedores y Nodos (`src/modules/nodes/`):**
   - Crear entidad `ConfigProveedorEntity` mapeada a `schema_proveedores`.
   - Exponer endpoints de control para consultar salud y alternar el kill-switch: `POST /api/v2/admin/nodes/:id/toggle`.

---

### 🟢 FASE 5: Implementación del ESB Centralizado de Dos Capas (Capa 3)

* **Objetivo:** Cumplir el requisito de Cátedra de centralizar la integración interna y externa mediante un Enterprise Service Bus que sustituya los SQL JOINs y orqueste Sagas transaccionales.
* **Criterios de Rúbrica Asociados:** **CE01** (Integración socios), **CE06** (Gateway/Orquestador).

#### Tareas Concretas:
1. **Creación del Módulo ESB (`src/modules/esb/`):**
   - Estructurar en dos subcapas:
     * `src/modules/esb/interna/`: Enrutador de servicios internos y orquestador transaccional.
     * `src/modules/esb/integracion/`: Adaptadores ACL para socios externos y Circuit Breakers.
2. **ESB Capa Interna (Sustituto de SQL Joins):**
   - Implementar `EsbInternalRouterService`:
     - Consulta paralelamente a `MS_CLI`, `MS_CAR`, `MS_FAC` y las verticales turísticas mediante REST HTTP local.
     - Ensambla las vistas agregadas en memoria (`AggregateViewDTO`) sin realizar consultas relacionales entre esquemas de base de datos.
3. **ESB Capa de Integración Externa (ACL y Resiliencia):**
   - Implementar adaptadores ACL (`AtraccionesPartnerAdapter`, `AutosPartnerAdapter`, `AlojamientosPartnerAdapter`, `VuelosPartnerAdapter`).
   - Normalizar los DTOs heterogéneos de los compañeros a los contratos unificados v2.
   - Proteger cada cliente HTTP con Circuit Breaker (`Opossum`):
     - Umbral de fallo: 50%.
     - Timeout: 5000 ms.
     - Reset timeout: 10000 ms.
     - Fallback controlado que retorne catálogo en caché o mensaje semántico de socio no disponible.
4. **Orquestador de Transacciones Saga y Compensaciones (§8):**
   - Implementar `SagaOrchestratorService` para el Checkout Compuesto:
     1. *Paso 1 (Hold):* Bloqueo de cupos en servicios turísticos seleccionados.
     2. *Paso 2 (Pago):* Cobro síncrono en `MS_PAG`.
     3. *Paso 3 (Emisión):* Confirmación de compra en APIs de socios y emisión de factura fiscal en `MS_FAC`.
     4. *Paso 4 (Compensación ante fallo):* Si el paso 2 o 3 falla, ejecutar acciones compensatorias automáticas: liberar reservas de cupo (`POST .../liberar`), reembolsar pago (`POST .../reembolsos`) y anular factura emitida.

---

### 🟢 FASE 6: Implementación del Event Bus RabbitMQ (Capa 4)

* **Objetivo:** Desacoplar eventos asíncronos de alto volumen (búsquedas masivas de usuarios y notificaciones de stock) para impedir la saturación del ESB, cumpliendo las Consideraciones §7.
* **Criterios de Rúbrica Asociados:** **CE03** (Consumo de eventos), **CE06** (Arquitectura distribuida).

#### Tareas Concretas:
1. **Instalación y Configuración del Cliente RabbitMQ:**
   - Instalar dependencias: `npm install amqplib @types/amqplib amqp-connection-manager`.
   - Configurar variables de entorno: `RABBITMQ_URL=amqp://guest:guest@localhost:5672`.
2. **Creación del Módulo Event Bus (`src/modules/event-bus/`):**
   - Declarar Topic Exchange: `booking.events`.
   - Configurar colas con enlace por routing key:
     * `q.busquedas.masivas` (`routingKey: search.*`): Para dampening de consultas de alta frecuencia.
     * `q.ordenes.confirmadas` (`routingKey: order.confirmed`): Dispara facturación, liquidación financiera y correos.
     * `q.sagas.compensacion` (`routingKey: saga.compensate`): Dispara reembolsos y cancelaciones.
     * `q.stock.actualizado` (`routingKey: stock.updated`): Telemetría emitida por el microservicio gRPC.
     * `q.dead_letter` (`x-dead-letter-exchange`): Reenvío de mensajes fallidos tras 3 reintentos con backoff exponencial.
3. **Consumo y Publicación Semántica de Eventos:**
   - En `MS_STK` (`InventoryService`), al recibir un mensaje por gRPC, publicar inmediatamente en `booking.events` con clave `stock.updated`.
   - En `MS_FIN`, escuchar `q.ordenes.confirmadas` para calcular comisiones en segundo plano sin bloquear la respuesta HTTP al usuario.

---

### 🟢 FASE 7: Implementación de la Capa de Agregación GraphQL BFF (Capa 6)

* **Objetivo:** Exponer un Single Endpoint `/graphql` para la aplicación cliente React, implementando el patrón BFF (Backend For Frontend) con resolución batch y suscripciones en tiempo real.
* **Criterios de Rúbrica Asociados:** **CE04** (Marketplace integrado), **CE06** (BFF Aggregator).

#### Tareas Concretas:
1. **Instalación de Dependencias GraphQL:**
   - Instalar: `npm install @nestjs/graphql @nestjs/apollo @apollo/server graphql graphql-subscriptions dataloader`.
2. **Configuración del Módulo GraphQL (`src/modules/graphql/`):**
   - Configurar `GraphQLModule.forRoot<ApolloDriverConfig>` con:
     * `autoSchemaFile: 'src/schema.gql'` (enfoque code-first).
     * `path: '/graphql'`.
     * `subscriptions: { 'graphql-ws': true }`.
     * Contexto enriquecido con `req.user` para seguridad JWT.
3. **Implementación de Resolvers y DataLoaders:**
   - Resolvers de Consultas (`Queries`):
     * `catalogoUnificado(destino, fechas)`: Agrega atracciones, autos, alojamientos y vuelos.
     * `misReservas(clienteId)`: Resuelve reservas multivertical con DataLoaders para evitar el problema de consultas N+1.
     * `obtenerFacturaCompleta(numeroFactura)`: Retorna encabezado, detalle y datos del cliente.
     * `obtenerPaquetesDisponibles()`: Consulta combos turísticos activos.
   - Resolvers de Mutaciones (`Mutations`):
     * `checkoutOrquestado(input)`: Invoca la Saga del ESB.
     * `cancelarReservaConSaga(input)`: Ejecuta la compensación.
     * `realizarCheckInDigital(vertical, reservaId, datos)`: Ejecuta el check-in correspondiente.
   - Resolvers de Suscripciones (`Subscriptions`):
     * `stockActualizado(serviceId)`: Emite cambios de inventario hacia clientes conectados por WebSocket.

---

### 🟢 FASE 8: Frontend Marketplace React 18, 7 Paneles de Administración, Testing y Despliegue

* **Objetivo:** Desplegar el marketplace web integrado, los 7 paneles de administración especializados por microservicio, ejecutar las pruebas de integración automatizadas y publicar en Internet.
* **Criterios de Rúbrica Asociados:** **CE01** (Excluyente), **CE04** (Marketplace), **CE05** (Admin operativo), **CE08** (Contract Testing), **CE09** (Seguridad), **CE10** (Despliegue en Internet).

#### Tareas Concretas:
1. **Actualización del Marketplace Web React 18:**
   - Instalar `@apollo/client` en `frontend/package.json`.
   - Conectar `ApolloProvider` apuntando a `/graphql`.
   - Descomentar y renderizar reseñas, calificaciones desglosadas e itinerario en `AtraccionDetail.jsx`.
   - Descomentar instrucciones de recogida/devolución y beneficios en `AutoDetail.jsx`.
   - En `MisReservasPage.jsx`, añadir modales interactivos para los 4 flujos de Check-in (código QR, firma de odómetro, clave digital y pase de abordar).
2. **Construcción de los 7 Paneles de Administración Desacoplados:**
   - Crear componentes bajo `frontend/src/components/admin/`:
     * `Panel1_NodosProveedores.jsx`: Semáforo LED (🟢/🟡/🔴), latencia en milisegundos y switches interactivos para activar/desactivar kill-switches en vivo.
     * `Panel2_GestionFlotaAutos.jsx`: Visualizador de máquina de estados con cronómetro en reversa del **cooldown de 2 horas** y alertas de kilometraje.
     * `Panel3_ArbolCategoriasAtracciones.jsx`: Visualizador y editor del árbol jerárquico recursivo (comida, guía, transporte).
     * `Panel4_LiquidacionesFinanzas.jsx`: Tabla de pagos quincenales, cálculo automático de la comisión del 10% y subida de comprobantes.
     * `Panel5_ConsolaFiscalFacturas.jsx`: Monitor de comprobantes emitidos correlativamente con cálculo de IVA al 15% y trazabilidad de idempotencia.
     * `Panel6_SimuladorPagosSOA.jsx`: Inyector interactivo de fallos transaccionales (aprobado, fondos insuficientes, timeout de red).
     * `Panel7_MonitorStockGrpc.jsx`: Gráfica de throughput en tiempo real (mensajes por segundo recibidos por el puerto TCP 50051) y hashes de sincronización.
3. **Automatización de Pruebas de Integración (Contract Testing):**
   - Crear suite de pruebas ejecutables bajo `test/integration/`:
     * `atracciones.contract.spec.ts`: Valida que las respuestas de atracciones cumplan el esquema OpenAPI v2.
     * `autos.contract.spec.ts`: Valida el esquema OpenAPI v2 y la respuesta ante cooldown.
     * `saga.resilience.spec.ts`: Simula caída de pasarela de pago o socio externo y verifica que la compensación restaure el stock y retorne código semántico.
     * `grpc.stock.spec.ts`: Envía un payload Protocol Buffers al puerto 50051 y verifica actualización de stock en memoria y log Winston en disco.
   - Configurar script en `package.json`: `"test:integration": "jest --config ./test/jest-integration.json"`.
4. **Despliegue en la Nube y Validación de Integración:**
   - Desplegar Backend en Render/Railway con puerto gRPC 50051 expuesto y variables de producción.
   - Desplegar Frontend en Vercel conectado al dominio HTTPS del backend.
   - Probar interoperabilidad en vivo con las tiendas de los compañeros de clase antes de la evaluación para garantizar el cumplimiento del **Criterio Excluyente CE01**.

---

## 6. Matriz de Fases vs. Archivos Afectados

La siguiente tabla resume con precisión quirúrgica qué archivos se crean, modifican o eliminan a lo largo de las 8 fases:

| Fase | Archivos Nuevos a Crear | Archivos a Modificar | Archivos a Eliminar |
|---|---|---|---|
| **Fase 1: Persistencia** | `database/01_master_migration_11_schemas.sql`<br>`src/core/entities/scoped/*.ts` | `src/app.module.ts`<br>`src/modules/*/entities/*.entity.ts` | Ninguno |
| **Fase 2: Logs Winston** | Ninguno (usa `winston-logger.service.ts`) | `src/modules/admin/admin-audit.service.ts`<br>`src/modules/admin/admin.controller.ts`<br>`src/main.ts` | `src/core/entities/api-request-log.entity.ts`<br>`src/modules/vuelos/entities/log_auditoria_vuelos.entity.ts` |
| **Fase 3: Negocio Verticales** | `src/modules/atracciones/entities/categoria-recursiva.entity.ts`<br>`src/modules/atracciones/services/categorias-arbol.service.ts` | `src/modules/atracciones/atracciones.controller.ts`<br>`src/modules/autos/entities/auto.entity.ts`<br>`src/modules/autos/autos.service.ts`<br>`src/modules/alojamientos/alojamientos.service.ts` | Ninguno |
| **Fase 4: Microservicios Core** | `src/modules/paquetes/*`<br>`src/modules/pagos/*`<br>`src/modules/finanzas/*`<br>`src/modules/nodes/*` | `src/app.module.ts` | Ninguno |
| **Fase 5: ESB Dos Capas** | `src/modules/esb/esb.module.ts`<br>`src/modules/esb/interna/esb-internal-router.service.ts`<br>`src/modules/esb/interna/saga-orchestrator.service.ts`<br>`src/modules/esb/integracion/partner-acl.adapter.ts` | Controladores de Checkout y Facturación | Ninguno |
| **Fase 6: Event Bus** | `src/modules/event-bus/event-bus.module.ts`<br>`src/modules/event-bus/event-bus.service.ts` | `src/modules/inventory/inventory.service.ts`<br>`src/modules/finanzas/finanzas.service.ts` | Ninguno |
| **Fase 7: GraphQL BFF** | `src/modules/graphql/graphql-app.module.ts`<br>`src/modules/graphql/resolvers/*.resolver.ts`<br>`src/modules/graphql/dataloaders/*.loader.ts` | `src/app.module.ts`<br>`src/main.ts` | Ninguno |
| **Fase 8: Frontend y Tests** | `frontend/src/components/admin/Panel*.jsx`<br>`test/integration/*.spec.ts`<br>`test/jest-integration.json` | `frontend/src/pages/AdminDashboard.jsx`<br>`frontend/src/pages/AtraccionDetail.jsx`<br>`frontend/src/pages/AtraccionesSearchPage.jsx`<br>`frontend/src/pages/AutoDetail.jsx`<br>`frontend/src/pages/MisReservasPage.jsx`<br>`frontend/src/components/VoucherModal.jsx`<br>`package.json` | `runner-pruebas.js` (reemplazado por suite Jest real) |

---

## 7. Protocolo de Verificación Empírica para la Defensa de Cátedra

Para asegurar la obtención de los **11 / 11 puntos**, se aplicará el siguiente protocolo de validación antes de la entrega final:

1. **Prueba CE01 (Integración Excluyente con Compañeros):**
   - Ejecutar una compra real desde el Marketplace web que incluya un ítem de cada tienda externa.
   - Comprobar la respuesta HTTP 201 en REST y que la orden quede asentada en el sistema del compañero.
2. **Prueba de Aislamiento de Persistencia (CE02):**
   - Consultar `pg_tables` en PostgreSQL y demostrar la existencia de los 11 esquemas independientes (`schema_*`).
   - Demostrar la ausencia de sentencias `JOIN` relacionales entre esquemas diferentes en el código fuente de TypeORM.
3. **Prueba de Ingesta gRPC y Eventos (CE03):**
   - Disparar una ráfaga de 100 mensajes Protocol Buffers mediante un cliente gRPC simulado al puerto TCP 50051.
   - Verificar que el microservicio actualice el inventario en memoria en < 5 ms y emita el evento a RabbitMQ.
4. **Prueba de Resiliencia y Fallback (CE04 y CE06):**
   - Simular la caída intencional de una tienda socia (timeout o 500).
   - Comprobar que el Circuit Breaker de Opossum se abra (`OPEN`), ejecute el fallback y el Marketplace muestre el catálogo de contingencia sin romperse.
5. **Prueba de Semáforo y Kill-Switches (CE05):**
   - En el Panel de Administración 1, presionar el switch para apagar un conector.
   - Verificar que el semáforo cambie instantáneamente de 🟢 a 🔴 y que la acción quede grabada en `logs/audit.log`.
6. **Prueba de Cooldown de 2 Horas en Autos:**
   - Marcar un auto como devuelto.
   - Comprobar que entre en estado `EN_LIMPIEZA` con temporizador de 2 horas y que el sistema rechace cualquier intento de reservarlo antes de que expire dicho plazo.
7. **Prueba de Compensación Saga:**
   - Iniciar checkout multivertical e inyectar un rechazo en el microservicio de pagos.
   - Verificar la ejecución en reversa de la Saga: liberación de cupos en socios, anulación de comprobante fiscal y registro del código de compensación `REF-...`.
8. **Prueba de Cero Logs en Base de Datos:**
   - Ejecutar `SELECT COUNT(*) FROM api_request_logs;` y demostrar que la tabla no existe en PostgreSQL.
   - Mostrar el contenido estructurado en disco en `logs/audit-YYYY-MM-DD.log` y `logs/integration-YYYY-MM-DD.log`.
9. **Prueba de Ejecución Automatizada de Pruebas (CE08):**
   - Correr en terminal: `npm run test:integration`.
   - Constatar que el 100% de las pruebas pasen en verde con reporte formal generado.

---

## 8. Auditoría Exhaustiva de Brechas: Frontend de Atracciones vs. Contrato OpenAPI v2 y Plan de Implementación UI

Con el propósito de garantizar que el agregado central **Booking Prototipo** esté 100% preparado para recibir, consumir y renderizar toda la información formalizada en el contrato oficial `contracts/atracciones-openapi-v2.yaml` de la tienda externa de Atracciones Turísticas (**Descubre EC — Dilan Mendoza**), se realizó una auditoría minuciosa del código fuente del frontend (`frontend/src/`).

### 8.1. Resumen Ejecutivo del Diagnóstico Frontend
El frontend actual cuenta con una base estética de alta fidelidad y llamadas iniciales en `services/atraccionesApi.js`. Sin embargo, existen **6 brechas funcionales críticas** entre lo que el contrato OpenAPI v2 exige y lo que la interfaz de usuario React 18 renderiza y envía actualmente. Si no se subsanan, el usuario final no podrá acceder a tarifas para adultos mayores/bebés, no verá el árbol taxonómico de categorías, ni podrá realizar el check-in presencial en el punto de encuentro desde "Mis Viajes".

---

### 8.2. Matriz Exhaustiva de Brechas Detectadas (GAP-FRONT-01 a GAP-FRONT-06)

| ID Brecha | Exigencia del Contrato OpenAPI v2 (`atracciones-openapi-v2.yaml`) | Estado Actual en Frontend (`frontend/src/`) | Severidad | Archivo Objetivo | Tarea Técnica Concreta |
|---|---|---|---|---|---|
| **GAP-FRONT-01** | **Desglose Tarifario Completo por Edades:** `TicketCategoryBreakdown` exige 4 categorías: Adulto (100%), Niño (50%), Senior (tarifa 3ra edad con 30% desc.) e Infante/Bebé ($0 USD pero **reserva obligatoria de aforo legal** en bus/embarcación). | `AtraccionDetail.jsx` (líneas 48-51 y 607-650) solo tiene inputs para `adult_count` y `child_count`. Carece por completo de selectores para Senior e Infante. | 🔴 Alta (Incumplimiento de catálogo familiar y aforo) | `frontend/src/pages/AtraccionDetail.jsx` | Añadir estados `senior_count` e `infant_count`, controles `+ / -`, tarificación con 30% desc. en Senior, $0 en Infante, y sumar ambos a `totalTickets` para validar contra `cuposDisponibles`. |
| **GAP-FRONT-02** | **Taxonomía Jerárquica Recursiva y Filtros de Inclusiones:** `GET /atracciones/categorias/arbol` expone árbol padre-hijo con flags obligatorias: `incluye_comida` (🍽️), `incluye_transporte` (🚌) e `incluye_guia` (🗣️). | `services/atraccionesApi.js` tiene `getCategoriasArbol()`, pero `AtraccionesSearchPage.jsx` (líneas 113-120) tiene 4 checkboxes planos en código duro (`Tours`, `Museos`, etc.) sin jerarquía ni filtros de inclusión. | 🔴 Alta (Criterio explícito de cátedra §6) | `frontend/src/pages/AtraccionesSearchPage.jsx` | Consumir dinámicamente `getCategoriasArbol()` en `useEffect`, renderizar árbol colapsable y filtros checkbox para comida, transporte y guía turística. |
| **GAP-FRONT-03** | **Check-in Presencial en Punto de Encuentro:** `POST /atracciones/reservas/{id}/checkin` valida la presencia física del turista y asigna credencial oficial del guía turístico. | `VoucherModal.jsx` implementa la vista de QR y botón de Check-in, pero `MisReservasPage.jsx` **NUNCA importa `VoucherModal`** ni expone ningún botón para hacer check-in en atracciones. | 🔴 Crítica (Flujo postventa roto en Mis Viajes) | `frontend/src/pages/MisReservasPage.jsx` | Importar `VoucherModal`, añadir botón `"🎟️ Ver Voucher & Check-in Presencial"` en las tarjetas de atracción de Mis Viajes y enlazarlo con `checkinReservaAtraccion()`. |
| **GAP-FRONT-04** | **Voucher QR Dinámico y Sincronización de Calendario (.ICS):** `ConfirmacionReservaResponse` devuelve `voucher_qr_payload`, `voucher_qr_url` e `ics_calendar_url`. | `VoucherModal.jsx` genera un QR genérico por API externa (`api.qrserver.com`) y no cuenta con botón para descargar el evento `.ics` en Google/Apple Calendar. | 🟡 Media (Experiencia de usuario y estándar de contrato) | `frontend/src/components/VoucherModal.jsx` | Priorizar el renderizado del `voucher_qr_url` / `voucher_qr_payload` del contrato y añadir botón interactivo `"📅 Agregar a mi Calendario (.ics)"`. |
| **GAP-FRONT-05** | **Widget de Alianza B2B para Promociones y Combos:** `GET /atracciones/promociones/contrato` norma la autorización de paquetes multidominio y el descuento pactado (hasta 15-20%). | En `AtraccionDetail.jsx` y `AlojamientosPage.jsx` no existe ningún widget informativo que promueva armar paquetes combinados con descuento comercial. | 🟡 Media (Mandato de paquetes RDA2 §9) | `frontend/src/pages/AtraccionDetail.jsx` | Insertar widget destacado: *"🔥 Combo Turístico Multidominio: Combina esta atracción con Hotel o Vuelo en Quito y ahorra hasta 15% acordado con Descubre EC"*. |
| **GAP-FRONT-06** | **Panel de Configuración y Respuesta al Cuestionario B2B:** `PUT /atracciones/promociones/contrato` permite responder las preguntas sobre aceptación de promociones y porcentaje de descuento. | No existe una interfaz administrativa en Booking para que el operador visualice o responda el cuestionario de acuerdo comercial de atracciones. | 🟡 Media (Operabilidad administrativa CE05) | `frontend/src/components/admin/Panel1_NodosProveedores.jsx` | Añadir tarjeta de "Acuerdo Comercial B2B Descubre EC" que consuma `GET` y permita editar `permite_promociones` y `porcentaje_descuento_maximo` vía `PUT`. |

---

### 8.3. Especificación Técnica de Implementación Paso a Paso

#### 📌 Implementación de GAP-FRONT-01: Desglose Tarifario Completo en `AtraccionDetail.jsx`
1. **Ampliación del Estado del Formulario:**
   ```javascript
   const [form, setForm] = useState({
     date: '2026-10-25',
     time: '10:30 a.m.',
     adult_count: 1,
     child_count: 0,
     senior_count: 0,   // NUEVO: Adulto mayor (65+ años)
     infant_count: 0,   // NUEVO: Bebé/Infante (0 a 4 años, tarifa $0 con aforo legal)
     special_requirements: ''
   });
   ```
2. **Cálculo de Precios y Cupos Totales:**
   ```javascript
   const precioAdulto = parseFloat(atraccion?.precio_unitario || atraccion?.price?.total || 55);
   const precioNino = parseFloat((precioAdulto * 0.5).toFixed(2));        // 50% de descuento
   const precioSenior = parseFloat((precioAdulto * 0.7).toFixed(2));      // 30% descuento de ley
   const precioInfante = 0.00;                                             // Gratuito legal

   // TOTAL DE BOLETOS: Todos suman para el control estricto de aforo físico en el bus/lancha
   const totalTickets = (form.adult_count || 0) + (form.child_count || 0) + (form.senior_count || 0) + (form.infant_count || 0);

   const totalCalculado = parseFloat((
     (form.adult_count * precioAdulto) +
     (form.child_count * precioNino) +
     (form.senior_count * precioSenior) +
     (form.infant_count * precioInfante)
   ).toFixed(2));
   ```
3. **Payload Enviado a `reservarAtraccion()`:**
   ```javascript
   const payload = {
     atraccionId: id,
     date: form.date,
     time: form.time,
     adult_count: form.adult_count,
     child_count: form.child_count,
     senior_count: form.senior_count,
     infant_count: form.infant_count,
     ticket_count: totalTickets,
     customer_name: user.user_metadata?.full_name || user.email.split('@')[0],
     customer_email: user.email,
     customer_phone: user.user_metadata?.telefono || '+593987654321',
     document_id: user.user_metadata?.cedula || '1720000000',
     special_requirements: form.special_requirements
   };
   ```

---

#### 📌 Implementación de GAP-FRONT-02: Taxonomía Recursiva en `AtraccionesSearchPage.jsx`
1. **Carga Asíncrona en `useEffect`:**
   ```javascript
   const [categoriasTree, setCategoriasTree] = useState([]);
   const [filtrosInclusiones, setFiltrosInclusiones] = useState({
     comida: false,
     transporte: false,
     guia: false
   });

   useEffect(() => {
     getCategoriasArbol().then(tree => {
       if (Array.isArray(tree)) setCategoriasTree(tree);
     });
   }, []);
   ```
2. **Renderizado de Filtros de Inclusiones de Cátedra:**
   ```jsx
   <div className="filter-group">
     <h4>Servicios Incluidos (Mandato Cátedra)</h4>
     <label>
       <input 
         type="checkbox" 
         checked={filtrosInclusiones.comida} 
         onChange={e => setFiltrosInclusiones({...filtrosInclusiones, comida: e.target.checked})} 
       /> 🍽️ Incluye Comida / Degustación
     </label>
     <label>
       <input 
         type="checkbox" 
         checked={filtrosInclusiones.transporte} 
         onChange={e => setFiltrosInclusiones({...filtrosInclusiones, transporte: e.target.checked})} 
       /> 🚌 Incluye Transporte Turístico
     </label>
     <label>
       <input 
         type="checkbox" 
         checked={filtrosInclusiones.guia} 
         onChange={e => setFiltrosInclusiones({...filtrosInclusiones, guia: e.target.checked})} 
       /> 🗣️ Guía Oficial Acreditado
     </label>
   </div>
   ```

---

#### 📌 Implementación de GAP-FRONT-03 y GAP-FRONT-04: Conexión de Voucher y Check-in en `MisReservasPage.jsx`
1. **Importación del Componente:**
   ```javascript
   import { VoucherModal } from '../components/VoucherModal';
   ```
2. **Estados en `MisReservasPage.jsx`:**
   ```javascript
   const [reservaVoucherActiva, setReservaVoucherActiva] = useState(null);
   const [showVoucherModal, setShowVoucherModal] = useState(false);
   ```
3. **Botón en Tarjeta de Atracción y Modal de Detalle:**
   ```jsx
   {selectedReserva.tipo === 'atraccion' && selectedReserva.status !== 'CANCELLED' && (
     <button
       type="button"
       onClick={() => {
         setReservaVoucherActiva(selectedReserva);
         setShowVoucherModal(true);
       }}
       style={{
         width: '100%',
         marginTop: '10px',
         padding: '12px',
         background: '#003580',
         color: '#ffffff',
         border: 'none',
         borderRadius: '6px',
         cursor: 'pointer',
         fontWeight: 700,
         fontSize: '0.95rem',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         gap: '8px'
       }}
     >
       🎟️ Ver Voucher & Realizar Check-in Presencial
     </button>
   )}
   ```
4. **Renderizado del Modal:**
   ```jsx
   <VoucherModal
     isOpen={showVoucherModal}
     onClose={() => setShowVoucherModal(false)}
     reserva={reservaVoucherActiva}
     atraccion={{ nombre: reservaVoucherActiva?.titulo }}
     user={user}
     convertPrice={convertPrice}
   />
   ```

---

#### 📌 Implementación de GAP-FRONT-05: Widget Visual de Combo B2B en `AtraccionDetail.jsx`
```jsx
<div className="promo-combo-banner" style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '16px', margin: '20px 0' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
    <span style={{ fontSize: '1.4rem' }}>🎁</span>
    <strong style={{ color: '#166534', fontSize: '1.05rem' }}>
      ¡Ahorra hasta un 15% combinando este tour!
    </strong>
  </div>
  <p style={{ margin: 0, fontSize: '0.88rem', color: '#15803d' }}>
    Acuerdo oficial con <strong>Descubre EC</strong>: Añade un hotel o vuelo en la misma ciudad y recibe descuento inmediato en el paquete consolidado.
  </p>
</div>
```

---

### 8.4. Checklist de Validación y Criterios de Aceptación para la Entrega RDA2
- [ ] Los selectores de Adulto Mayor e Infante actualizan reactivamente el precio total y validan los cupos del turno horario.
- [ ] Un usuario con 1 Adulto y 1 Infante en un turno con 1 solo cupo disponible recibe la alerta de aforo excedido (el infante ocupa cupo físico obligatorio).
- [ ] En la página de búsqueda, el árbol de categorías se renderiza desde la API y permite filtrar por `incluye_comida`, `incluye_transporte` e `incluye_guia`.
- [ ] Al acceder a "Mis Viajes" (`MisReservasPage.jsx`), cualquier reserva de atracción muestra el botón `"🎟️ Ver Voucher & Check-in Presencial"`.
- [ ] Al presionar el botón de check-in, se ejecuta `POST /atracciones/reservas/{id}/checkin`, actualizando el estado de la reserva a `CHECKED_IN` con el nombre del guía turístico asignado.
- [ ] El código QR se renderiza correctamente con el localizador y se ofrece el enlace de descarga del archivo `.ics`.

---

> [!IMPORTANT]
> **Conclusión del Diagnóstico:**
> La arquitectura requerida para el RDA2 está 100% conceptualizada, auditada y formalizada. Con este plan maestro y la auditoría exhaustiva de brechas del frontend, el equipo cuenta con la guía paso a paso libre de ambigüedades técnicas para proceder a la implementación directa y ordenada de cada fase sin omitir ningún requerimiento de la cátedra ni del contrato oficial OpenAPI v2.

