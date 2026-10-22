# Contratos de Diseño Arquitectónico y Reglas de Capas — Booking Prototipo

> **Objetivo:** Definir formalmente las reglas de dependencia entre capas, el flujo unidireccional de control y los límites de aislamiento entre componentes del sistema.

---

## 1. Reglas de Dependencia por Capas (Layering Rules)

```text
[Capa 1: Cliente Web / Frontend React]
        │ (consume vía HTTP REST / JSON)
        ▼
[Capa 2: API Gateway / BFF Controllers & Interceptors]
        │ (invoca)
        ▼
[Capa 3: Application Services / Dominio]
        │ (invoca)
        ├─────────────────────────────┬─────────────────────────────┐
        ▼                             ▼                             ▼
[Capa 4a: Persistencia Local] [Capa 4b: Clientes Externos]  [Capa 4c: Logging Físico]
(TypeORM / Supabase)          (Axios REST con Timeout 5s)    (Winston File Logger)
```

### Reglas Estrictas:
1. **Capa 1 (Frontend React):**
   - Consume **únicamente** los endpoints expuestos por el API Gateway (`/api/v1` y `/api/v2`).
   - Tiene **estrictamente prohibido** invocar directamente las IPs, puertos o URLs privadas de los microservicios de los compañeros de clase.
2. **Capa 2 (Controladores e Interceptores del Gateway):**
   - Puede invocar los servicios de aplicación (`AtraccionesService`, `AutosService`, `AdminService`).
   - Aplica validación de DTOs, filtros globales de excepciones (RFC 7807), autenticación JWT y rate limiting.
   - Tiene prohibido acceder directamente a repositorios TypeORM o realizar llamadas HTTP salientes directas.
3. **Capa 3 (Servicios de Aplicación y Dominio):**
   - Implementa las reglas de negocio (máquinas de estado, validación de inventario, cálculo de totales, jerarquías recursivas).
   - Puede invocar sus propios repositorios de persistencia (Capa 4a), clientes HTTP externos (Capa 4b) y el servicio de logging en archivos (Capa 4c).
   - Tiene prohibido acceder a repositorios o tablas pertenecientes a otros módulos de dominio.
4. **Capa 4 (Infraestructura y Persistencia):**
   - Las entidades TypeORM nunca deben exportarse fuera del módulo que las posee.
   - Toda llamada saliente a microservicios externos debe utilizar el interceptor de Correlation-ID y respetar el timeout de 5 segundos.

---

## 2. Reglas de Determinismo y Composición

1. **Centralización de Composición:** La configuración y orquestación de dependencias del sistema reside centralizada en `src/app.module.ts` y en los módulos de cada vertical (`src/modules/*/*.module.ts`).
2. **Códigos de Estado Explícitos:** Todo controlador debe retornar códigos de estado HTTP semánticos y predecibles:
   - `200 OK`: Consultas exitosas de catálogo, detalles o estados.
   - `201 Created`: Recursos creados exitosamente (órdenes, reservas, registros de mantenimiento).
   - `400 Bad Request`: Datos de entrada inválidos o transiciones ilegales en máquinas de estado (formato RFC 7807).
   - `401 Unauthorized`: Token JWT ausente, expirado o con firma inválida.
   - `403 Forbidden`: Token válido pero sin los permisos o rol requeridos para la operación.
   - `404 Not Found`: Recurso no encontrado en catálogo o microservicio.
   - `409 Conflict`: Conflicto de concurrencia o recurso previamente tomado.
   - `429 Too Many Requests`: Violación de la política de Rate Limiting.
   - `502 Bad Gateway`: Microservicio externo no disponible, error 5xx o timeout > 5s.
3. **Efectos Secundarios Explícitos:** Las funciones de servicio que ejecuten operaciones con efectos secundarios (descuento de cupos, cobro simulado, cambio de estado de flota) deben exigir la cabecera `Idempotency-Key` y registrar la traza en el archivo físico `logs/integration-*.log`.
