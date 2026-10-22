# Requerimientos de Producto — Booking Prototipo (Plataforma Central Integradora)

> **Asignatura:** Integración de Sistemas — 6to Semestre  
> **Producto:** Booking Prototipo (Marketplace Agregador y Panel Administrativo Distribuido)  
> **Alcance Evaluativo:** Reto 1 (RDA1) y Reto 2 (RDA2 — Arquitectura Distribuida, Microservicios y Blindaje de Integración)  
> **Estado de Entrega:** 100% Completado, Blindado frente a Vulnerabilidades y Verificado con Pruebas Automatizadas

---

## 1. Definición del Producto

El **Booking Prototipo** es la plataforma central e integradora del ecosistema digital de turismo de la asignatura. Actúa como un **Marketplace Agregador (BFF / API Gateway)** que centraliza la oferta de servicios turísticos provistos por los sistemas de información independientes desarrollados por los equipos de estudiantes:
1. **Tienda de Atracciones Turísticas** (Tours patrimoniales, museos, experiencias gastronómicas y de aventura).
2. **Tienda de Alquiler de Vehículos** (Flota, gamas, cotizaciones, entrega e inspección).
3. **Tienda de Alojamientos** (Hoteles, departamentos, resorts, check-in digital).
4. **Tienda de Vuelos** (Rutas, aerolíneas, itinerarios, pases de abordar con PNR).

El Booking Prototipo **no es el dueño primario de los inventarios**; su valor radica en agregar la información en tiempo real, brindar una experiencia unificada de compra al usuario final (estilo Booking.com), gestionar transacciones seguras e idempotentes, coordinar flujos operativos post-venta (check-in y cancelaciones compensatorias bajo el patrón Saga), y ofrecer herramientas de auditoría y monitoreo semafórico para la administración de la red de servicios.

---

## 2. Personas y Actores del Sistema

### 👤 1. Cliente Final (Turista / Shopper)
- **Objetivo:** Explorar y reservar atracciones, autos, alojamientos y vuelos en una única interfaz moderna, accesible y blindada frente a fallos.
- **Necesidades:** Búsqueda avanzada por filtros, ver calificaciones detalladas y opiniones reales, pagar con un carrito unificado, revisar el historial en "Mis Reservas", realizar el check-in digital antes de disfrutar el servicio, y cancelar reservas confirmadas con reverso automático de cupos y emisión de reembolso monetario 100% garantizado.

### 🛡️ 2. Administrador del Sistema
- **Objetivo:** Supervisar la operatividad del ecosistema distribuido, controlar el estado de los nodos integrados y auditar usuarios y transacciones.
- **Necesidades:** Un panel de administración con vista de "Semáforo de Nodos" (🟢 Online / 🟡 Lento / 🔴 Offline / ⚪ Deshabilitado) que le permita supervisar 5 nodos (`atracciones`, `autos`, `alojamientos`, `vuelos`, `grpc_inventory`), medir su latencia en milisegundos, activar kill-switches dinámicos para aislar tiendas caídas en caliente sin reiniciar el Gateway, y auditar logs del sistema almacenados en archivos físicos rotativos.

### 🔧 3. Operador de Patio / Rol Mantenimiento (Módulo de Flota de Autos)
- **Objetivo:** Controlar el estado operativo y físico de los vehículos devueltos tras un alquiler.
- **Necesidades:** Registrar kilometraje de llegada, anotar observaciones del estado del vehículo (rayones, combustible, limpieza), supervisar que se cumplan las 2 horas reglamentarias de limpieza antes de volver a liberar el auto, y gestionar alertas preventivas de kilometraje para enviar el auto a taller mecánico.

### 🌐 4. Tienda Externa / Socio de Integración (Microservicios de Compañeros)
- **Objetivo:** Mantener sincronizada su disponibilidad con el Booking Prototipo y recibir las confirmaciones de compra o cancelaciones.
- **Mecanismo:** Envía eventos periódicos o por streaming de stock hacia el Booking mediante **gRPC** (puerto `50051`, servicio `InventoryStockService`), y recibe llamadas síncronas **REST** del Booking con `Idempotency-Key` y timeout de 5s únicamente cuando un usuario final compra o cancela su producto.

### 🎓 5. Docente Evaluador (Auditor Académico)
- **Objetivo:** Verificar el cumplimiento estricto de la rúbrica RDA2 (criterios CE01 a CE11) y directrices técnicas.
- **Necesidades:** Inspeccionar que las bases de datos estén aisladas por microservicio, evidenciar el tráfico gRPC vs REST, constatar que los logs residen en archivos físicos (cero persistencia en PostgreSQL), comprobar la retrocompatibilidad de contratos (v1 vs v2), evidenciar el semáforo y switches de desconexión, y auditar el blindaje de formularios y UX (10 Heurísticas de Nielsen y resiliencia offline).

---

## 3. Capacidades Principales del Producto (RDA1 + RDA2)

### 3.1. Catálogo Distribuido y Búsquedas Enriquecidas
- **Agregación en Tiempo Real:** El catálogo se construye dinámicamente a partir de los datos recibidos por gRPC y almacenados en caché rápida en el Gateway.
- **Filtros Jerárquicos en Atracciones:** Sistema de categorías recursivas (árbol padre-hijo) con filtros por inclusión de comida, transporte y guía turístico.
- **Detalle Enriquecido (Contratos v2):** Visualización de desglose de ratings (limpieza, servicio, calidad), comentarios individuales de usuarios, políticas de mascotas, instrucciones de recogida/devolución de autos y beneficios incluidos en la tarifa.

### 3.2. Asimetría de Comunicación (gRPC Inbound / REST Outbound)
- **Sincronización gRPC (Tiendas → Booking):** Recepción eficiente y continua de actualizaciones de stock mediante mensajes Protobuf (`inventory.proto`, puerto `50051`) con endpoints de soporte HTTP en `/api/v2/inventory`.
- **Compra REST (Booking → Tiendas):** Disparo de peticiones HTTP POST con payload validado e `Idempotency-Key` en el momento del checkout.

### 3.3. Carrito Unificado y Checkout Transaccional
- Capacidad de agregar ítems de diferentes verticales en una sola orden de compra.
- Emisión de facturas consolidadas y desglose de impuestos/subtotales.
- Simulación de pago seguro garantizando que si una tienda externa rechaza la confirmación, la transacción se cancele de forma atómica.

### 3.4. Patrón Saga y Cancelación Compensatoria (Reverso y Reembolso)
- **Cancelación Unificada en "Mis Reservas":** Permite al usuario cancelar reservas confirmadas mediante el botón "Cancelar reserva y solicitar reembolso" con modal de confirmación seguro.
- **Compensación Transaccional:**
  1. Reverso de stock: Los cupos liberados se devuelven automáticamente al inventario local (`cupos += tickets`).
  2. Reembolso financiero: Emisión de recibo formal de reembolso del 100% del valor pagado (`REF-ATR-...`).
  3. Compensación externa: Notificación síncrona al microservicio del socio mediante el Adapter de Integración.
  4. Auditoría en disco: Registro de la operación compensatoria en archivos físicos Winston sin alterar la base de datos.
  5. Idempotencia: Intentos repetidos de cancelación son interceptados devolviendo `ALREADY_REFUNDED` bajo formato RFC 7807.

### 3.5. Flujo Operativo de Check-in en las 4 Verticales
- **Atracciones:** Check-in de entrada el día del tour, asignación de guía y generación de voucher con código QR.
- **Autos:** Validación de estado `LISTO_PARA_ENTREGAR`, registro del conductor, km de partida y cambio a estado `ENTREGADO`.
- **Alojamientos:** Check-in a partir de las 14:00 con asignación de habitación física y pase de huésped.
- **Vuelos:** Check-in digital con selección de asiento y emisión de tarjeta de embarque con PNR.

### 3.6. Ciclo de Vida Avanzado de la Flota de Autos
- **Máquina de Estados Finita:** `DISPONIBLE` → `RESERVADO` → `LISTO_PARA_ENTREGAR` → `ENTREGADO` → `EN_LIMPIEZA` → (`DISPONIBLE` | `EN_MANTENIMIENTO`).
- **Tiempo de Enfriamiento de 2 Horas:** Tras la entrega, el vehículo permanece en limpieza/inspección durante 2 horas cronometradas antes de poder reincorporarse a la disponibilidad pública.
- **Inspección de Patio y Alertas:** Control de kilometraje acumulado con disparo automático de bandera de mantenimiento preventivo si se supera el umbral configurado.

### 3.7. Panel de Administración y Monitoreo de Nodos (Semáforo de 5 Nodos)
- **Monitoreo en Vivo de 5 Nodos:** `atracciones`, `autos`, `alojamientos`, `vuelos` y `grpc_inventory`.
- **Semáforo Visual y Circuit Breakers:** Indicador semafórico por nodo (🟢 <500ms, 🟡 500ms-2s, 🔴 >2s o inalcanzable, ⚪ Deshabilitado) con estados de Circuit Breaker (`CLOSED`, `OPEN`, `HALF_OPEN`, `MANUALLY_OPEN`).
- **Kill-Switches Dinámicos:** Capacidad del administrador de desconectar o reconectar en caliente cualquier tienda externa desde la UI sin reiniciar el Gateway.
- **Ping Manual y Métricas:** Medición de latencia en milisegundos bajo demanda.

### 3.8. Blindaje de Formularios, UX/UI y Resiliencia Offline
- **Sanitización y Validación Rigurosa:** Control de longitud máxima (`maxLength`), colapso de espacios en blanco repetitivos, prevención de inyecciones de caracteres infinitos, y mensajes de error dinámicos e intuitivos acordes a RFC 7807.
- **Inmunidad a Fallos de Persistencia (PostgreSQL UUID Protection):** Validación previa de sintaxis UUID para impedir excepciones internas 500 (`QueryFailedError: invalid input syntax for type uuid`).
- **10 Heurísticas de Nielsen:** Diálogos modales con confirmación de dos pasos, feedback visual instantáneo, prevención de errores involuntarios, coherencia de diseño Booking.com.
- **Resiliencia Offline y PWA:** Detección en tiempo real de pérdida de conexión de red con banner de alerta no intrusivo y caché de catálogos para navegación sin conexión.

---

## 4. Fronteras del Alcance (Scope Boundaries)

### ✅ Dentro del Alcance (In Scope — RDA1 + RDA2 COMPLETADOS)
1. Integración de las 4 tiendas externas (Atracciones, Autos, Alojamientos, Vuelos) cumpliendo con el Criterio Excluyente CE01.
2. Servidor gRPC híbrido en NestJS (puerto `50051`) para ingesta de inventarios y cliente REST para emisión de órdenes de compra.
3. Despliegue de contratos OpenAPI v2 con retrocompatibilidad hacia v1 (`X-API-Deprecation-Date`).
4. Flujo funcional de check-in para las 4 categorías en frontend y backend.
5. Patrón Saga con cancelaciones y reversos transaccionales de stock y reembolsos en atracciones.
6. Base de datos aislada por microservicio con agregación en la capa de aplicación.
7. Almacenamiento de auditoría en archivos físicos rotativos (`logs/`) con cero escrituras en PostgreSQL.
8. Máquina de estados de autos con regla de 2 horas de limpieza y rol de mantenimiento.
9. Árbol de categorías recursivas para atracciones (Closure Table / CTE).
10. Panel de administración con semáforo de salud de 5 nodos y kill-switches dinámicos.
11. Blindaje completo frente a las 13 vulnerabilidades de UX/UI identificadas (V-01 a V-13).
12. Suite de pruebas de integración automatizadas (`npm run test:integration`, scripts de prueba gRPC, saga y sanitización).
13. Despliegue accesible en Internet con HTTPS (Vercel para Frontend y Render para Backend).

### ❌ Fuera del Alcance (Out of Scope)
1. Cobro bancario real mediante tarjetas de crédito reales (se utilizan pasarelas y validaciones simuladas con respuestas estándar).
2. Modificación de las bases de datos internas o repositorios privados de los compañeros (el Booking solo interactúa a través de sus contratos públicos gRPC y REST).
3. Aplicación móvil nativa en Flutter/React Native (prevista para el Reto 3 — RDA3).
