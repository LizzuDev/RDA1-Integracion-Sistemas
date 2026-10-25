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
