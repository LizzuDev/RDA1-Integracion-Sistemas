# Gestión de Contratos y Versionamiento Semántico — Reto 2 (RDA2)

**Asignatura:** Integración de Sistemas  
**Proyecto:** Booking Prototipo (Marketplace Agregador Central)  
**Documento:** `contracts/CAMBIOS_CONTRATOS_RDA2.md`  
**Fecha:** Octubre 2026  
**Estándar de Versionamiento:** Semantic Versioning (SemVer 2.0.0)  

---

## 1. Resumen Ejecutivo del Salto de Versión (v1.2.0 → v2.0.0)

La evolución de la versión 1 a la versión 2 de los contratos OpenAPI responde a la transición formal desde el prototipo monolítico API-First hacia un **ecosistema distribuido basado en microservicios, resiliencia y agregación multimodal**.

Se formalizan dos contratos enriquecidos para ser entregados a los equipos de desarrollo externos:
1. `contracts/atracciones-openapi-v2.yaml` (Vertical de Atracciones Turísticas).
2. `contracts/autos-openapi-v2.yaml` (Vertical de Renta de Autos).

---

## 2. Vertical de Atracciones Turísticas: Matriz Comparativa v1 vs v2

| Característica / Dominio | Contrato v1 (`contracts/atracciones-openapi.yaml`) | Contrato v2 (`contracts/atracciones-openapi-v2.yaml`) | Justificación Técnica & Normativa |
|---|---|---|---|
| **Ruta Base Gateway** | `/api/v1/atracciones` | `/api/v2/atracciones` | Versionamiento por URI para desacoplar evoluciones sin romper clientes legacy. |
| **Taxonomía de Categorías** | Arreglo plano de cadenas (`["food_drinks"]`) | **Árbol Jerárquico Recursivo** (`/categorias/arbol`) con inclusiones booleanas (`incluye_comida`, `incluye_guia`, `incluye_transporte`) | Cumple Consideraciones RDA2 §6. Permite filtros multinivel y badges Booking.com. |
| **Ficha Técnica Detallada** | Datos planos parciales | **Endpoint `GET /atracciones/{id}`** con desglose de opiniones por pilares (Limpieza, Servicio, Calidad-Precio), itinerario y políticas de cancelación | Fidelidad absoluta con el diseño original de Booking.com. |
| **Disponibilidad y Aforo** | Horarios estáticos simulados | **Franjas Horarias Dinámicas (Time Slots)** con aforo remanente y estados (`DISPONIBLE`, `ULTIMOS_CUPOS`, `AGOTADO`) | Evita sobreventa y alimenta el selector horario interactivo con feedback en vivo. |
| **Desglose de Boletos** | Contador único genérico (`ticket_count`) | **Desglose por Grupo de Edad** (`adult_count`, `child_count`, `infant_count`) con tarifas dinámicas | Cumple modelo transaccional y cálculo transparente de subtotales. |
| **Validación Presencial** | No contemplada | **Check-in Presencial Digital** (`POST /reservas/:id/checkin`) | Cumple Consideraciones RDA2 §4. Emite voucher QR con guía asignado y punto de encuentro. |
| **Resiliencia & ACL** | Llamadas directas sin timeout estricto | Timeout de **5000 ms**, Circuit Breaker (`CLOSED`, `OPEN`, `HALF_OPEN`), `Idempotency-Key` y `X-Correlation-Id` | Protege el Gateway ante caídas de proveedores (ej. SistemaAtracciones de Dilan). |
| **Sincronización de Stock** | Síncrona únicamente por REST | **Híbrida:** REST Outbound para compras + **gRPC Inbound HTTP/2** (`src/proto/inventory.proto`) para stock | Cumple Consideraciones RDA2 §1 y §3 (multiplexación de streams HTTP/2). |

---

## 3. Vertical de Renta de Autos: Matriz Comparativa v1 vs v2

| Característica / Dominio | Contrato v1 (`contracts/autos-openapi.yaml`) | Contrato v2 (`contracts/autos-openapi-v2.yaml`) | Justificación Técnica & Normativa |
|---|---|---|---|
| **Ruta Base Gateway** | `/api/v1/autos` | `/api/v2/autos` | Aislamiento de versión bajo `/api/v2/autos`. |
| **Búsqueda Avanzada** | Localidad genérica y fechas planas | **Búsqueda con tramos de 30 minutos**, validación de conductor (<25 años), categoría y transmisión | Alineado a la UX y lógica de Booking.com Cars. |
| **Catálogo General y Ficha** | Arreglo mock estático | **`GET /autos`** (catálogo filtrable) y **`GET /autos/{id}`** con especificaciones técnicas, política de combustible ("Lleno a lleno"), kilometraje y fotos | Detalle técnico completo para exploración y pantalla de reserva. |
| **Panel de Flota en Vivo** | Inexistente | **`GET /autos/flota`**: telemetría en tiempo real de vehículos, cronómetro regresivo de cooldown de 2 horas (`segundos_restantes_cooldown`), fin estimado de limpieza y alertas de kilometraje | Alimenta el Panel 2 de Gestión de Flota (Cátedra RDA2 §5). |
| **Coberturas Diferenciadas** | Tarifa plana sin opciones | **`GET /autos/{id}/coberturas`**: Protección Básica (con franquicia) vs Cobertura Total (sin franquicia) | Transparencia financiera de depósitos y franquicias al estilo Booking. |
| **Máquina de Estados de 6 Fases** | Estados no controlados | **Máquina formal**: `DISPONIBLE` ➔ `RESERVADO` ➔ `LISTO_PARA_ENTREGAR` ➔ `ENTREGADO` ➔ `EN_LIMPIEZA` (cooldown obligatorio de 2 horas) ➔ `DISPONIBLE` / `EN_MANTENIMIENTO` | Cumple estrictamente Consideraciones RDA2 §5. Auto devuelto es invisible en búsqueda por 2h. |
| **Doble Check-in Operativo** | No contemplado | **1. Anticipado Digital:** `POST /autos/reservas/:id/checkin` (Voucher QR Fast-Track).<br>**2. Entrega en Mostrador:** `POST /autos/orders/:id/checkin-entrega` (licencia, `km_salida`).<br>**3. Devolución en Patio:** `POST /autos/orders/:id/checkin-devolucion` (`km_retorno`, combustible, inicio de cooldown 2h) | Cumple Consideraciones RDA2 §4 y §5 para operaciones presenciales seguras. |
| **Mantenimiento Preventivo** | Inexistente | **`POST /autos/:id/mantenimiento/registro`** con rol técnico `MANTENIMIENTO` o `ADMIN` | Cumple Consideraciones RDA2 §5. Alerta preventiva cuando `kilometraje_actual >= proximo_mantenimiento_km`. |
| **Ciclo de Ordenes & PNR** | No documentado | **`POST /autos/orders/create`**, **`GET /autos/orders/{orderId}`** y **`POST /autos/orders/{orderId}/cancel`** | Gestión completa del ciclo de vida de la reserva con `Idempotency-Key` y compensación Saga. |
| **Promociones B2B Mandato §9** | Inexistente | **`GET /autos/promociones/contrato`** y **`PUT /autos/promociones/contrato`** | Cumple Cátedra RDA2 §9: define si acepta combos y porcentaje máximo de descuento. |
| **Salud de Nodo (Semáforo 🟢/🔴)** | Inexistente | **`GET /autos/health`**: latencia, uptime y telemetría de cooldown de flota | Cumple Criterio CE01 y Cátedra RDA2 §2 para monitoreo con focos verde/rojo. |
| **Eventos Asíncronos (EDA)** | Inexistente | **CloudEvents v1.0**: `auto.order.confirmed`, `auto.cleaning.cooldown.started`, `auto.mantenimiento.alerta`, `auto.order.cancelled` y Outbox **`GET /autos/eventos`** | Cumple Criterio CE03 y Semana 8 de Consideraciones (Arquitectura Híbrida RabbitMQ + Kafka). |

---

## 4. Política de Compatibilidad hacia Atrás (Backward Compatibility)

Para asegurar que clientes existentes y evaluaciones previas del Reto 1 continúen funcionando sin disrupciones:

1. **Persistencia de Rutas Legacy v1:**
   - Las rutas `/api/v1/atracciones/*` y `/api/v1/autos/*` se mantienen operativas en el backend NestJS.
   - Las respuestas v1 incluyen cabeceras HTTP estándar de deprecación:
     ```http
     HTTP/1.1 200 OK
     X-API-Deprecation-Date: 2027-12-31
     Sunset: Fri, 31 Dec 2027 23:59:59 GMT
     Link: </api/v2/atracciones>; rel="successor-version"
     ```

2. **Tolerancia a Parámetros Opcionales (Non-Breaking Changes):**
   - Todos los nuevos campos de entrada (`adult_count`, `child_count`, `tipo_cobertura`, `special_requirements`) poseen valores por defecto transparentes.
   - Si un cliente v1 envía `ticket_count: 2`, el BFF asume automáticamente `adult_count: 2`.
   - Si un cliente v1 no especifica cobertura en autos, se asigna por defecto `BASICA`.

---

## 5. Protocolo de Errores Estandarizados (RFC 7807 Problem Details)

Todos los microservicios y respuestas del API Gateway en la especificación v2 implementan el estándar RFC 7807 con cabecera `Content-Type: application/problem+json`:

```json
{
  "type": "https://api.booking.local/errors/vehicle-in-cleaning",
  "title": "Vehículo en Cooldown de Limpieza",
  "status": 409,
  "detail": "El vehículo se encuentra en ciclo de limpieza y desinfección obligatoria (2 horas). Estará disponible a las 14:30 UTC.",
  "instance": "/api/v2/autos/auto-spark-01/orders/create",
  "code": "VEHICLE_IN_CLEANING_COOLDOWN",
  "timestamp": "2026-10-15T08:00:00Z"
}
```

---

## 6. Guía de Entrega para Equipos Externos (Atracciones y Autos)

Los archivos de especificación OpenAPI listos para ser consumidos e implementados por los equipos externos son:
- **Atracciones:** `contracts/atracciones-openapi-v2.yaml`
- **Renta de Autos:** `contracts/autos-openapi-v2.yaml`
- **Protocol Buffers para Stock Inbound:** `src/proto/inventory.proto`

**Requisitos no negociables para las tiendas externas:**
1. Respetar los nombres exactos de campos en DTOs JSON.
2. Soportar la cabecera `Idempotency-Key` en operaciones de creación de reservas.
3. Propagar la cabecera `X-Correlation-Id` recibida en cada llamada.
4. Enviar actualizaciones de stock e inventario a través del servidor gRPC de Booking (`inventory.proto`) sobre el puerto `50051`.
5. Retornar códigos de estado HTTP semánticos y esquemas RFC 7807 en casos de error.
