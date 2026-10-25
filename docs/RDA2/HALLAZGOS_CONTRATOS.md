# Hallazgos de contratos — Booking Prototipo (RDA2)

> Este archivo se actualiza con cada tarea. Las discrepancias entre el código real
> y lo documentado se registran aquí para revisión de Claude al final del ciclo.

---

## P00 — Componentes comunes

| ID | Severidad | Hallazgo | Evidencia | Sugerencia |
|---|---|---|---|---|
| H-P00-01 | Baja | El interceptor `HateoasInterceptor` usa `baseUrl` con `/api/v1` hardcodeado en lugar de `/api/v2`, aunque el contrato documenta v2 | `src/core/interceptors/hateoas.interceptor.ts` línea 9 | Actualizar el interceptor para detectar la versión de la ruta o usar una constante configurable; por ahora los `_links` de respuesta apuntan a v1 |
| H-P00-02 | Baja | El filtro RFC 7807 no incluye `correlation_id` ni `timestamp` en el cuerpo del error (solo los campos base de RFC 7807: `type`, `title`, `status`, `detail`, `instance`, `code`, `invalidParams`) | `src/core/filters/rfc7807-exception.filter.ts` líneas 101-114 | Añadir `correlation_id` (de `req.headers['x-correlation-id']`) y `timestamp` al objeto `problemDetails`; por ahora el esquema `ProblemDetails` marca ambos como opcionales |
| H-P00-03 | Baja | No hay parámetros de paginación `limit`/`cursor` en el middleware global; se verificará en cada módulo | `src/main.ts` — ausentes en nivel global | Verificar en módulos que usen paginación (atracciones, vuelos) si usan `limit`/`cursor` y documentarlo en los contratos respectivos |

---

## P01 — ESB y Sagas

| ID | Severidad | Hallazgo | Evidencia | Sugerencia |
|---|---|---|---|---|
| H-P01-01 | Alta | `EsbController` no declara ningún Guard de autenticación (`@UseGuards(SupabaseAuthGuard)` ausente tanto a nivel de clase como en los 5 métodos). Cualquier cliente anónimo puede disparar compras compuestas multivertical (`POST /esb/checkout-saga`), consultar detalles de cualquier Saga (`GET /esb/sagas/{correlationId}`), listar transacciones (`GET /esb/sagas`), consultar reservas de cualquier usuario (`GET /esb/aggregate/mis-reservas/{cliente}`) y extraer facturas fiscales con datos de contribuyentes (`GET /esb/aggregate/facturas/{facturaId}`). | `src/modules/esb/esb.controller.ts` líneas 6-54 | Añadir `@UseGuards(SupabaseAuthGuard)` con verificación de roles (`CLIENTE`, `ADMIN`) para proteger datos sensibles y mutaciones financieras. En el contrato se documenta `security: []` reflejando fielmente el código actual. |
| H-P01-02 | Media | La cabecera `Idempotency-Key` es opcional en la mutación crítica `POST /esb/checkout-saga`. Si el cliente no la envía, el controlador autogenera una clave arbitraria `idem-saga-${Date.now()}`. Esto contradice la directriz de la cátedra de idempotencia estricta obligatoria para mutaciones transaccionales y de pago. | `src/modules/esb/esb.controller.ts` líneas 17 y 24 | Configurar `@Headers('idempotency-key')` como requerida y responder con HTTP 400 (`VALIDATION_FAILED`) si falta, garantizando protección real contra reintentos de red del cliente. |
| H-P01-03 | Media | `GET /esb/sagas/{correlationId}` devuelve una lista plana de registros relacionales (`saga_pasos_journal`), pero los requisitos de observabilidad de la cátedra (§6.5 y Semana 8) exigen un **Dashboard de Monitoreo Tipo Grafo** con semáforos por nodo (🟢/🟡/🔴) y árbol de spans W3C Trace Context (OpenTelemetry). | `src/modules/esb/interna/saga-orchestrator.service.ts` líneas 330-345 | Se documenta `GET /esb/sagas/{correlationId}/traza` con `x-status: planned` para transformar la bitácora relacional en estructura de nodos, aristas y spans jerárquicos consumibles por el dashboard React. |
| H-P01-04 | Media | Los eventos de ciclo de vida de la Saga (`SAGA_CHECKOUT_COMPLETED`, `SAGA_CHECKOUT_ROLLBACK_COMPENSADO`) solo se guardan en la base de datos relacional (`schema_auditoria`) y en logs físicos de Winston (`winstonLogger.logAudit`), pero **NO se publican al bus transaccional RabbitMQ** (`booking.events` / `q.sagas.compensacion`) ni se replican a Kafka. | `src/modules/esb/interna/saga-orchestrator.service.ts` líneas 252-258 y 308-314 | Integrar `ClientProxy` de RabbitMQ / Outbox Pattern para emitir formalmente eventos CloudEvents v1.0 al broker transaccional y sincronizar con Kafka mediante el bridge. |
| H-P01-05 | Baja | `GET /esb/sagas` solo acepta un parámetro numérico `limit` (default 20) sin validación de límite superior ni paginación formal por cursor/offset, ni metadatos de respuesta (`total`, `has_more`, `next_cursor`). | `src/modules/esb/esb.controller.ts` línea 37 y `saga-orchestrator.service.ts` línea 347 | Implementar paginación estandarizada por cursor o `limit`/`offset` con límite máximo de seguridad (ej. 100). |

---

## P02 — Pagos

| ID | Severidad | Hallazgo | Evidencia | Sugerencia |
|---|---|---|---|---|
| H-P02-01 | Alta | `PagosController` no declara Guards de autenticación (`@UseGuards(SupabaseAuthGuard)` ausente en la clase y métodos). Cualquier cliente anónimo en internet puede ejecutar cargos a tarjetas (`POST /pagos/procesar`), emitir reembolsos financieros (`POST /pagos/reembolsos`), listar transacciones (`GET /pagos/transacciones`) y **alterar en caliente la configuración del simulador de pagos (`POST /pagos/simulador/config`)**, pudiendo provocar denegaciones de servicio masivas inyectando `TIMEOUT_RED` o `RECHAZO_FONDOS`. | `src/modules/pagos/pagos.controller.ts` líneas 5-59 | Proteger el controlador con `SupabaseAuthGuard`. Requerir rol `ADMIN` para configurar el simulador, roles autenticados para transacciones y documentar `security: []` en el contrato reflejando el código real. |
| H-P02-02 | Media | Los DTOs de entrada en `PagosController` carecen de tipado y validación (`@Body() dto: any` en `procesarPago` y `procesarReembolso`). No se aplican validaciones de `class-validator` para montos positivos, formato UUID ni campos obligatorios. | `src/modules/pagos/pagos.controller.ts` líneas 18 y 31 | Crear clases DTO formales (`ProcesarPagoDto`, `ProcesarReembolsoDto`) con decoradores `@IsNumber`, `@IsPositive`, `@IsUUID`, etc. y activar `ValidationPipe`. |
| H-P02-03 | Media | El frontend genera referencias de pago sintéticas aleatorias en el navegador (`pay_${uuid.slice(0,18)}`) sin consultar a `POST /pagos/procesar`. Por ende, los `paymentReference` enviados a las tiendas satélites (como vuelos) no existen en `schema_pagos.transacciones_pago`, impidiendo la validación B2B. | `frontend/src/components/FormularioReserva.jsx` línea 335, `ModalPostventa.jsx` línea 135, `ModalCambioFecha.jsx` línea 144 | Conectar el frontend con `POST /pagos/procesar` antes de llamar a las APIs satélites y utilizar el `transaccion_id` devuelto como `paymentReference`. |
| H-P02-04 | Media | `MS_PAG` no emite eventos asíncronos a RabbitMQ (`booking.events`) ni a Kafka ante pagos confirmados (`payment.confirmed`), fallidos (`payment.failed`) o reembolsados (`payment.refunded`); únicamente escribe logs físicos con Winston (`winstonLogger.logAudit`). | `src/modules/pagos/pagos.service.ts` líneas 120-126, 85-89 y 175-181 | Publicar eventos CloudEvents v1.0 a RabbitMQ (`booking.events` / `q.pagos.procesados`) y replicar a Kafka para telemetría y auditoría forense. |
| H-P02-05 | Media | Ausencia de endpoint para consultar y validar un pago por su referencia (`paymentReference`). Las aerolíneas y socios externos no disponen de una API síncrona para verificar que el cobro fue capturado antes de emitir boletos. | `src/modules/pagos/pagos.controller.ts` (ausente) | Se diseñó la ruta planificada `GET /pagos/{paymentReference}` (`x-status: planned`) en el contrato OpenAPI para habilitar la verificación externa. |

---

## P03 — Paquetes y Promociones

| ID | Severidad | Hallazgo | Evidencia | Sugerencia |
|---|---|---|---|---|
| H-P03-01 | Alta | `PaquetesController` no declara Guards de autenticación (`@UseGuards(SupabaseAuthGuard)` ausente en la clase y métodos). Cualquier cliente anónimo en internet puede crear paquetes dinámicos arbitrarios (`POST /paquetes/dinamico`) o consultar condiciones comerciales privadas y acuerdos de descuento de los socios (`GET /paquetes/contratos`). | `src/modules/paquetes/paquetes.controller.ts` líneas 5-40 | Proteger el controlador con `SupabaseAuthGuard`. Requerir autenticación para creación de paquetes dinámicos y restringir la consulta detallada de contratos comerciales B2B a roles administrativos. |
| H-P03-02 | Media | El cuerpo de `POST /paquetes/dinamico` no está tipado ni validado (`@Body() dto: any`), careciendo de validaciones de `class-validator` para número mínimo de ítems, precios positivos, tipos de vertical, etc. | `src/modules/paquetes/paquetes.controller.ts` línea 37 | Crear la clase DTO formal `CrearPaqueteDinamicoDto` con decoradores `@IsArray`, `@ArrayMinSize(2)`, `@ValidateNested`, etc. y activar `ValidationPipe`. |
| H-P03-03 | Media | Inexistencia de endpoint para actualizar o sincronizar los contratos de promociones en Booking (`PUT /paquetes/contratos/{proveedorCodigo}`). Actualmente solo existe `GET /paquetes/contratos`; los acuerdos comerciales deben ser insertados por seed SQL o directamente en base de datos, impidiendo la sincronización automática cuando las tiendas socias actualizan sus condiciones en `PUT /{vertical}/promociones/contrato`. | `src/modules/paquetes/paquetes.controller.ts` (ausente) | Se diseñó la ruta planificada `PUT /paquetes/contratos/{proveedorCodigo}` (`x-status: planned`) en el contrato OpenAPI para habilitar la sincronización B2B. |
| H-P03-04 | Baja | Discrepancia con el modelo objetivo de `Faltantes RDA2`: El diseño objetivo contemplaba la tabla `schema_paquetes.paquete_versiones` (`PaqueteVersion`) para versionado histórico y auditoría de cambios. El código actual no implementa esta entidad; la inmutabilidad se preserva fijando directamente los importes calculados en las columnas `precio_base_total`, `descuento_combo_pct` y `precio_final_paquete` de `schema_paquetes.paquetes`. | `src/modules/paquetes/entities/` vs `Faltantes RDA2/src/modules/promotions-packages/entities/paquete-versiones.entity.ts` | Si en el futuro se requiere auditoría de modificaciones a combos existentes, incorporar la entidad `PaqueteVersion`; para el flujo actual de paquetes creados una sola vez, la persistencia inmutable directa es suficiente. |



