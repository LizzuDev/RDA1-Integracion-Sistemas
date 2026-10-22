# Sesión de Diseño Técnico — RDA2: Ecosistema Distribuido y Microservicios

> **Fecha:** 12 de Octubre, 2026 (Actualizado: 19 de Octubre, 2026)  
> **Líder Técnico:** Paúl Rosero  
> **Asignatura:** Integración de Sistemas — 6to Semestre  
> **Estado:** ✅ IMPLEMENTADO, BLINDADO Y VERIFICADO AL 100%

---

## 1. Resumen Ejecutivo de la Sesión

En esta sesión se abordó la evolución del **Booking Prototipo** desde la arquitectura monolítica modular validada en el Reto 1 (RDA1) hacia el **Ecosistema Distribuido de Microservicios** exigido para el Reto 2 (RDA2), conforme a la rúbrica de evaluación (Criterios CE01 a CE11) y a las directrices técnicas emitidas por el docente evaluador.

Se definieron e implementaron las decisiones arquitectónicas para la ingesta de inventario vía gRPC en puerto 50051, la separación física de bases de datos, el almacenamiento de auditoría en archivos planos, el flujo de check-in en las 4 verticales, la máquina de estados con 2 horas de limpieza en autos, el panel de semáforo de 5 nodos, el patrón Saga para cancelaciones compensatorias, y el blindaje exhaustivo de UX/UI y PostgreSQL.

---

## 2. Requerimientos Analizados y Solución Técnica Adoptada

### Requerimiento 1: Panel de Nodos con Semáforo y Control Dinámico (5 Nodos)
- **Directriz:** *"Usar nodos para tener una auditoría de los servicios para ver con un foco rojo o verde las páginas web conectadas y ver en rojo las que están desconectadas, poder desconectar o conectar páginas web."*
- **Solución Adoptada (ADR-006):**
  - Implementación de `ConnectorHealthService` gestionando 5 nodos (`atracciones`, `autos`, `alojamientos`, `vuelos`, `grpc_inventory`).
  - Endpoint `GET /api/v2/admin/nodes/health` clasificando la latencia en milisegundos: 🟢 (<500ms), 🟡 (500ms-2s), 🔴 (>2s o inalcanzable), ⚪ (deshabilitado).
  - Circuit Breakers: `CLOSED`, `OPEN`, `HALF_OPEN`, `MANUALLY_OPEN`.
  - Endpoint `POST /api/v2/admin/nodes/:serviceId/toggle` para conectar/desconectar en caliente desde `AdminDashboard.jsx`.
  - Endpoint `POST /api/v2/admin/nodes/:serviceId/ping` para auditoría síncrona manual.

### Requerimiento 2: Comunicación Asimétrica (gRPC Inbound / REST Outbound)
- **Directriz:** *"Usar gRPC desde las páginas web a nuestro booking, mientras que nosotros solo usar un API REST para enviar cuando se hace una compra... las páginas web individuales deben tener su inventario actualizado siempre y enviarnos ese stock."*
- **Solución Adoptada (ADR-001):**
  - Servidor gRPC híbrido en NestJS (`src/main.ts`) escuchando en el puerto TCP `50051` con el servicio `InventoryStockService` (`src/proto/inventory.proto`).
  - Métodos RPC: `PushStockUpdate` y `StreamInventoryChanges`.
  - Almacenamiento en caché en memoria ultrarrápida en el Gateway para servir búsquedas sin latencia externa.
  - Endpoints REST de soporte en `/api/v2/inventory` y `/api/inventory/status`.
  - Cliente REST con `@nestjs/axios` reservado exclusivamente para la compra en el checkout (`POST /orders`).

### Requerimiento 3: Auditoría en Archivos Físicos (NO en Base de Datos)
- **Directriz:** *"Usar archivos logs para la parte de auditoría de logs, no guardarlo en la base de datos."*
- **Solución Adoptada (ADR-003):**
  - Desacoplar la auditoría de PostgreSQL para evitar saturar el disco y el pool de conexiones.
  - Configuración de Winston con `winston-daily-rotate-file` escribiendo en `logs/audit-*.log` e `logs/integration-*.log` con formato JSON estructurado y retención de 14 días. Cero escrituras en BD.

### Requerimiento 4: Aislamiento Estricto de Base de Datos (Database-per-Service)
- **Directriz:** *"Al usar microservicios la base de datos se separa... no se puede compartir tablas entre microservicios; en la capa de aplicación es donde se usa un middleware para conectar las tablas."*
- **Solución Adoptada (ADR-002):**
  - Cada microservicio posee tablas aisladas. Prohibición de joins SQL o entidades TypeORM compartidas.
  - La composición y combinación de datos se realiza en los servicios de aplicación del BFF inyectando dependencias.

### Requerimiento 5: Flujo de Check-in para las 4 Verticales
- **Directriz:** *"Realizar un check-in para alojamientos, atracciones, vuelos y autos."*
- **Solución Adoptada:**
  - Creación de endpoints `/checkin` específicos por vertical:
    - Autos: Entrega física, km inicial y conductor.
    - Atracciones: Llegada al tour, asignación de guía y voucher QR.
    - Alojamientos: Llegada después de las 14:00 y entrega de habitación.
    - Vuelos: Asignación de asiento y pase de abordar digital con PNR.
  - Visualización del botón de check-in en `MisReservasPage.jsx` tras la confirmación.

### Requerimiento 6: Máquina de Estados de Flota y 2 Horas de Limpieza
- **Directriz:** *"Manejar estados (listo, reservado, limpieza)... tiempo de 2 horas para poner nuevamente al auto... control de mantenimiento (kilometraje, características, alerta de mantenimiento)."*
- **Solución Adoptada (ADR-004):**
  - Ciclo de vida estricto: `DISPONIBLE` → `RESERVADO` → `LISTO_PARA_ENTREGAR` → `ENTREGADO` → `EN_LIMPIEZA` → (`DISPONIBLE` o `EN_MANTENIMIENTO`).
  - Cooldown forzado de 2 horas en `EN_LIMPIEZA` evaluado por temporizador antes de liberar el auto.
  - Rol de mantenimiento con entidad `MaintenanceLog` y cálculo automático de alertas si el kilometraje supera el límite de inspección.

### Requerimiento 7: Categorías Jerárquicas Recursivas en Atracciones
- **Directriz:** *"Controlar las categorías de atracciones (comida, transporte, guía) usando una tabla padre e hija recursiva."*
- **Solución Adoptada (ADR-005):**
  - Entidad `CategoriaAtraccion` con `parent_id` autorreferencial y flags booleanos (`incluye_comida`, `incluye_transporte`, `incluye_guia`).
  - Consultas jerárquicas con decorador `@Tree('closure-table')` de TypeORM para exponer el endpoint `GET /api/v2/atracciones/categorias/arbol`.

### Requerimiento 8: Patrón Saga y Cancelación Compensatoria (Stock y Reembolso)
- **Directriz:** Blindar el flujo de cancelaciones de reservas permitiendo devolver cupos y emitir reembolsos de manera consistente e idempotente.
- **Solución Adoptada (ADR-007):**
  - Orquestador en `AtraccionesService.cancelarReserva()`.
  - Reverso automático de cupos (`cupos += tickets`).
  - Emisión de comprobante de reembolso formal 100% (`REF-ATR-...`) y estado `PROCESADO`.
  - Notificación saliente al microservicio del socio mediante `DilanAdapterService`.
  - Idempotencia estricta ante doble clic (`ALREADY_REFUNDED`).
  - Botón "Cancelar reserva y solicitar reembolso" con diálogo modal en `MisReservasPage.jsx`.

### Requerimiento 9: Blindaje UX/UI, Heurísticas de Nielsen y Resiliencia Offline
- **Directriz:** Blindar todos los formularios y páginas frente a ingresos inválidos, inputs infinitos, fallas de red y errores de base de datos.
- **Solución Adoptada:**
  - Guaras de sintaxis UUID en PostgreSQL eliminando excepciones internas `QueryFailedError` (HTTP 500).
  - Límites `maxLength` físicos en todos los inputs y colapso de espacios en blanco (`\s+`).
  - Filtro global `rfc7807-exception.filter.ts` con respuestas dinámicas.
  - `OfflineBanner.jsx` y almacenamiento en caché para resiliencia offline PWA.

---

## 3. Matriz de Entregables de la Fase RDA2

| Fase | Entregable Técnico | Estado |
|---|---|---|
| **Fase 1** | Contratos OpenAPI v2 (`contracts/*-openapi-v2.yaml`) y Protobuf (`src/proto/inventory.proto`) | ✅ 100% Implementado y documentado |
| **Fase 2** | API Gateway con enrutamiento de versiones (`/api/v1` y `/api/v2`) y Circuit Breakers | ✅ 100% Implementado y verificado |
| **Fase 3** | Servidor gRPC Inbound (Puerto 50051) e In-Memory Inventory Cache | ✅ 100% Implementado y verificado |
| **Fase 4** | Aislamiento estricto de base de datos (Database-per-Service) y seguridad (Helmet/Throttler) | ✅ 100% Implementado y verificado |
| **Fase 5** | Endpoints y vistas de Check-in en las 4 verticales turísticas | ✅ 100% Implementado y verificado |
| **Fase 6** | Máquina de estados de autos con temporizador de 2 horas de cooldown | ✅ 100% Implementado y verificado |
| **Fase 7** | Módulo de mantenimiento de flota vehicular y registro de kilometraje | ✅ 100% Implementado y verificado |
| **Fase 8** | Árbol de categorías recursivas de atracciones (Closure Table / CTE) | ✅ 100% Implementado y verificado |
| **Fase 9** | Panel de Nodos con semáforo 5 vías 🟢🟡🔴 y kill-switches dinámicos en Admin | ✅ 100% Implementado y verificado |
| **Fase 10** | Logger Winston en archivos físicos (`logs/`), suite Jest y despliegue cloud | ✅ 100% Implementado y verificado |
| **Fase 11** | Patrón Saga con cancelaciones, reverso de stock y cálculo de reembolso 100% | ✅ 100% Implementado y verificado |
| **Fase 12** | Blindaje UX/UI (10 Heurísticas de Nielsen, PWA Offline y protección UUID PostgreSQL) | ✅ 100% Implementado y verificado |
