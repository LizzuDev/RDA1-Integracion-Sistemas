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

