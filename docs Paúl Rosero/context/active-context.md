# Contexto Activo — Booking Prototipo (Plataforma Central Integradora)

> **Asignatura:** Integración de Sistemas — 6to Semestre  
> **Estado:** ✅ RDA1 Completado al 100% | ✅ RDA2 Implementado, Blindado y Verificado al 100%  
> **Fecha de Actualización:** 19 de Octubre, 2026  
> **Líder Técnico / Responsable:** Paúl Rosero

---

## 1. Estado Actual del Proyecto

### ✅ Reto 1 (RDA1) — COMPLETADO Y ESTABILIZADO (100%)
La base API-First monolítica y la interfaz gráfica del Booking Prototipo se encuentran completamente blindadas:
- **Backend NestJS (API REST):** `http://localhost:3000/api/v1` | Swagger: `http://localhost:3000/api/docs`.
- **Frontend React (Vite):** `http://localhost:5173` con diseño fiel a Booking.com (Hero azul, buscador integrado, tarjetas con imágenes estables de Wikimedia Commons y flujo de "Mis Reservas" unificado).
- **Base de Datos (Supabase Cloud):** PostgreSQL operativo con las 8 tablas core migradas con TypeORM.
- **Matriz de Pruebas Automatizadas:** 8 de 8 pruebas aprobadas (100% de éxito en `runner-pruebas.js`).

---

### ✅ Reto 2 (RDA2) — IMPLEMENTADO, BLINDADO Y VERIFICADO (100%)
El proyecto completó con éxito su transición hacia una **arquitectura distribuida de microservicios e integración web real**, integrando las 4 tiendas de la clase (Atracciones, Autos, Alojamientos y Vuelos) y superando las 5 fases de desarrollo y blindaje:

1. **Fase 1: Sagas y Cancelaciones Compensatorias:**
   - Orquestador en `AtraccionesService.cancelarReserva()` con reverso automático de cupos (`cupos += tickets`).
   - Emisión formal de reembolso monetario del 100% con código `REF-ATR-...` y status `PROCESADO`.
   - Notificación compensatoria saliente al microservicio del socio externo mediante `DilanAdapterService`.
   - Control de idempotencia ante doble clic (`ALREADY_REFUNDED`).
   - Botón interactivo "Cancelar reserva y solicitar reembolso" con diálogo modal de confirmación en `MisReservasPage.jsx`.

2. **Fase 2: Servidor gRPC Inbound Híbrido:**
   - Aplicación híbrida montada en `src/main.ts` escuchando en el puerto TCP `50051`.
   - Implementación de `InventoryStockService` gobernado por `src/proto/inventory.proto` con métodos `PushStockUpdate` y `StreamInventoryChanges`.
   - Endpoints REST auxiliares de inspección y estado en `/api/v2/inventory` y `/api/inventory/status`.

3. **Fase 3: Monitor de 5 Nodos y Kill-Switches:**
   - `ConnectorHealthService` gestiona la salud y latencia de 5 nodos: `atracciones`, `autos`, `alojamientos`, `vuelos`, `grpc_inventory`.
   - Circuit Breakers de 4 estados: `CLOSED`, `OPEN`, `HALF_OPEN`, `MANUALLY_OPEN`.
   - Endpoints administrativos: `GET /api/v2/admin/nodes/health`, `POST /api/v2/admin/nodes/:serviceId/toggle`, `POST /api/v2/admin/nodes/:serviceId/ping`.
   - Panel visual en `AdminDashboard.jsx` con semáforos LED (🟢/🟡/🔴), switches para desconectar tiendas en caliente y botones de ping manual.

4. **Fase 4: Sanitización Rigurosa y Blindaje RFC 7807:**
   - Límites `maxLength` en todos los formularios para impedir desbordes de memoria o inyecciones de cadenas infinitas.
   - Colapso de espacios en blanco repetitivos (`\s+`) en cliente y servidor.
   - Validación dinámica con mensajes de error contextuales en tiempo real.
   - Filtro global `rfc7807-exception.filter.ts` estandarizando todas las respuestas de error en `application/problem+json`.
   - Protección previa de sintaxis UUID (V-05) que elimina errores 500 en PostgreSQL (`QueryFailedError`).

5. **Fase 5: Auditoría UX/UI y Blindaje de Vulnerabilidades V-01 a V-13:**
   - Cumplimiento de las 10 Heurísticas de Nielsen (prevención de errores, feedback visual, consistencia, confirmación en dos pasos).
   - Resiliencia offline y PWA con `OfflineBanner.jsx` y almacenamiento en caché para navegación sin conexión a internet.
   - Auditoría exhaustiva en navegador documentada en `Pendientes/VULNERABILIDADES_ATRACCIONES_UX.md`.

---

## 2. Asignación de Responsabilidades en el Equipo

- **Paúl Rosero (Líder Técnico & Módulo de Atracciones, Flota y Gateway):**
  - Arquitectura del API Gateway / BFF híbrido y servidor gRPC en puerto 50051.
  - Orquestador del Patrón Saga para cancelaciones y reembolsos.
  - Máquina de estados de Autos (2 horas de cooldown) y módulo de mantenimiento.
  - Módulo de Atracciones con categorías recursivas (Closure Table / CTE) y check-in.
  - Monitor de 5 nodos con semáforo LED y switches dinámicos.
  - Logger Winston en archivos físicos (`logs/`) con cero escrituras en PostgreSQL.
- **Alejo:** Integración del microservicio de Vuelos (API externa y check-in de pases de abordar).
- **Lizz:** Integración del microservicio de Alojamientos (API externa, check-in a las 14:00 y check-out).

---

## 3. Estado de los Contratos y Protocolos

- **Atracciones (`atracciones-openapi-v2.yaml`):** Actualizado con calificaciones desglosadas, reviews, itinerarios, categorías recursivas, check-in y cancelación Saga.
- **Autos (`autos-openapi-v2.yaml`):** Actualizado con transmisión, fotos, instrucciones, máquina de estados, rol de mantenimiento y check-in.
- **Protocolo gRPC (`src/proto/inventory.proto`):** `InventoryStockService` con `PushStockUpdate` y `StreamInventoryChanges` en puerto 50051.
- **Retrocompatibilidad:** Endpoints `/api/v1` emiten cabeceras `X-API-Deprecation-Date: 2027-12-31`.

---

## 4. Próximos Pasos Técnicos

1. **Revisión y Commit Manual:** El usuario revisará localmente los cambios y ejecutará el commit y push manual a `origin/main` (cumpliendo con la restricción de Cero Git Push automático).
2. **Despliegue a Producción:** Una vez que el usuario suba a main, verificar el webhook automático en Render (Backend) y Vercel (Frontend).
3. **Simulacro de Sustentación:** Realizar pruebas de demostración en vivo con el docente de los 5 nodos, el cooldown de 2 horas de autos y la cancelación con reverso de stock y reembolso.
