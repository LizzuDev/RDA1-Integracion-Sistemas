# Documento Técnico — Reto 1: Booking Prototipo (API-First)

**Versión:** 1.0.0  
**Fecha:** 2026-10-07  
**Asignatura:** Integración de Sistemas  
**Equipo:** Semestre 5 Grupal  
**URL Producción (Frontend):** https://rda1-integracion-sistemas.vercel.app  
**URL Producción (Backend):** https://rda1-integracion-sistemas.onrender.com  
**Documentación Swagger:** `{backend_url}/api/docs`

---

## 1. Arquitectura del Sistema

### 1.1 Visión General — Patrón Cliente-Servidor

El sistema sigue una arquitectura **Cliente-Servidor estrictamente desacoplada**, donde el frontend y el backend son sistemas independientes que se comunican únicamente a través de la API REST documentada.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Cliente)                             │
│                   React 18 + Vite — Vercel                              │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐   │
│  │Alojamientos│  │   Vuelos   │  │   Autos    │  │  Atracciones   │   │
│  │   (SPA)    │  │   (SPA)    │  │   (SPA)    │  │    (SPA)       │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────┘   │
│                                                                         │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  AdminDashboard│  │ MisReservas  │  │ Auth (Supabase Client)   │   │
│  └────────────────┘  └──────────────┘  └──────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTP REST / JSON
                                    │ Bearer JWT (Supabase)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Servidor)                              │
│             NestJS (Node.js) — Render                                   │
│                                                                         │
│  Prefijo global: /api/v1                                                │
│                                                                         │
│  ┌───────────────────────── Middleware Global ───────────────────────┐  │
│  │  ValidationPipe (whitelist + forbidNonWhitelisted)                │  │
│  │  Rfc7807ExceptionFilter  (application/problem+json)               │  │
│  │  HateoasInterceptor      (Richardson Level 3: _links en JSON)     │  │
│  │  CORS configurado para Vercel y Render                            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  /vuelos     │  │/alojamientos │  │   /autos     │  │/atraccione│  │
│  │  VuelosModule│  │ AlojModule   │  │  AutosModule │  │AtracModule │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘  │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  /chatbot    │  │  /facturas   │  │  /admin      │  │/telemetry │  │
│  │  ChatbotMod. │  │  FactMod.    │  │  AdminModule │  │TelemetryM.│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘  │
│                                                                         │
│  ┌──────────────────── Capa de Datos (ORM) ────────────────────────┐   │
│  │  TypeORM  →  PostgreSQL (Supabase)                               │   │
│  │  Entidades: Reserva, Vuelo, Segmento, Boleto, Pasajero, Auto,   │   │
│  │             Atraccion, Alojamiento, Factura, SupportTicket, ...  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │   Supabase (PostgreSQL)   │
                    │   + Auth (JWT/RLS)        │
                    └───────────────────────────┘
```

### 1.2 Restricciones REST Implementadas

| Restricción | Implementación Concreta |
|---|---|
| **Cliente-Servidor** | Separación total: frontend en Vercel (React), backend en Render (NestJS). Comunicación exclusiva por HTTP REST. |
| **Stateless** | Autenticación mediante JWT de Supabase. El servidor no guarda estado de sesión. Cada request es auto-contenida. |
| **Cacheable** | `CacheModule` + `CacheInterceptor` de `@nestjs/cache-manager` aplicado en módulos de Atracciones, Alojamientos, Autos y Chatbot con TTL de 60 segundos. |
| **Interfaz Uniforme** | Uso correcto de verbos HTTP (GET, POST, PUT, PATCH, DELETE). URIs con sustantivos en plural. Prefijo global `/api/v1`. |
| **Sistema en Capas** | CORS configurado para proxies y gateways intermedios. Soporte de cabeceras `Authorization`, `Idempotency-Key`, `X-Device-Fingerprint`. |

### 1.3 Nivel 3 de Madurez Richardson (HATEOAS)

Implementado mediante el `HateoasInterceptor` global (`src/core/interceptors/hateoas.interceptor.ts`), que inyecta automáticamente hipervínculos `_links` en las respuestas JSON:

```json
{
  "bookingId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "pnr": "AB1234",
  "_links": {
    "self":    { "href": "/api/v1/vuelos/bookings/{bookingId}", "method": "GET" },
    "tickets": { "href": "/api/v1/vuelos/bookings/{bookingId}/tickets", "method": "GET" },
    "cancel":  { "href": "/api/v1/vuelos/bookings/{bookingId}/cancel", "method": "POST" },
    "checkin": { "href": "/api/v1/vuelos/bookings/{bookingId}/check-in", "method": "POST" }
  }
}
```

### 1.4 Patrón Wrapper (REST ↔ SOAP)

Implementado en `src/modules/atracciones/soap-wrapper.service.ts`. Cuando el módulo de Atracciones confirma una reserva, traduce el payload JSON a un Envelope SOAP y "envía" la petición a un sistema legado CML:

```
Frontend → REST/JSON → [Backend NestJS] → SOAP/XML → [Sistema Legado CML]
                                         ← JSON ←    ← XML ←
```

### 1.5 Manejo de Errores RFC 7807 (Problem Details)

El `Rfc7807ExceptionFilter` intercepta todas las excepciones globalmente y devuelve el formato estándar con `Content-Type: application/problem+json`:

```json
{
  "type": "urn:gds:error:validation-failed",
  "title": "Error de Validación",
  "status": 400,
  "detail": "La petición no supera la validación del esquema.",
  "instance": "/api/v1/vuelos/bookings",
  "code": "VALIDATION_FAILED",
  "invalidParams": [
    { "name": "payment.paymentReference", "reason": "paymentReference es demasiado corto." }
  ]
}
```

---

## 2. Modelo de Datos

### 2.1 Diagrama Conceptual de Entidades

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     USUARIO      │──────▶│     RESERVA       │──────▶│     BOLETO       │
│ ─────────────── │  1:N  │ ──────────────── │  1:N  │ ──────────────── │
│ id (UUID)        │       │ id (UUID)         │       │ id (UUID)         │
│ nombre           │       │ pnr               │       │ ticketId (GDS)   │
│ apellido         │       │ status            │       │ pasajeroId       │
│ email            │       │ totalPrice        │       │ segmentoId       │
│ rol              │       │ currency          │       │ status           │
└──────────────────┘       │ propietarioId     │       └──────────────────┘
                           └────────┬──────────┘
                                    │ 1:N
                           ┌────────▼──────────┐
                           │   ITINERARIO      │
                           │ ──────────────── │
                           │ id (UUID)         │
                           │ origen            │
                           │ destino           │
                           │ orden             │
                           └────────┬──────────┘
                                    │ 1:N
                           ┌────────▼──────────┐
                           │    SEGMENTO       │
                           │ ──────────────── │
                           │ id (UUID)         │
                           │ flightNumber      │
                           │ departureDate     │
                           │ arrivalDate       │
                           │ origin (IATA)     │
                           │ destination (IATA)│
                           └───────────────────┘

┌──────────────────┐       ┌──────────────────┐
│   ATRACCION      │◀─────▶│   RESERVA_ATRAC  │
│ ──────────────── │  N:M  │ ──────────────── │
│ id               │       │ id               │
│ name             │       │ reservationId    │
│ product_type     │       │ email            │
│ operator         │       │ status           │
│ location         │       │ idempotencyKey   │
│ price            │       │ createdAt        │
│ currency         │       └──────────────────┘
│ availableTickets │
└──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│  ALOJAMIENTO     │       │  ORDEN_AUTO      │
│ ──────────────── │       │ ──────────────── │
│ id (UUID)        │       │ id (UUID)        │
│ nombre           │       │ vehicleId        │
│ tipo             │       │ email            │
│ ciudad           │       │ startDate        │
│ precio_noche     │       │ endDate          │
│ estrellas        │       │ status           │
│ amenidades[]     │       │ totalPrice       │
└──────────────────┘       └──────────────────┘

┌──────────────────┐
│ SUPPORT_TICKET   │
│ ──────────────── │
│ id (UUID)        │
│ email            │
│ client_name      │
│ type             │
│ entity_name      │
│ pnr_or_id        │
│ subject          │
│ description      │
│ priority         │
│ status           │ ← PENDING | IN_REVIEW | RESOLVED | REJECTED
│ resolution       │
│ resolved_at      │
│ resolved_by      │
│ created_at       │
└──────────────────┘
```

### 2.2 Estados de Reserva de Vuelos

```
PENDING → PENDING_PAYMENT → TICKET_ISSUING → CONFIRMED
                                                  ↓
                           CHANGE_PENDING ←───────┤
                                  ↓               │
                               CONFIRMED ──────────┘
                                                  ↓
                          CANCELLATION_PENDING → CANCELLED
```

### 2.3 Tablas Principales en Supabase (PostgreSQL)

| Tabla | Descripción | Columnas Clave |
|---|---|---|
| `reserva` | Reservas de vuelos | `reserva_id`, `pnr`, `status`, `propietarioId` |
| `itinerario` | Tramos de un vuelo | `reserva_id`, `origen`, `destino`, `orden` |
| `segmento` | Vuelo específico por tramo | `flightNumber`, `departureDate`, `origin`, `destination` |
| `boleto` | Ticket emitido por pasajero | `ticketId`, `pasajeroId`, `segmentoId`, `status` |
| `pasajero` | Pasajeros por reserva | `nombre`, `apellido`, `tipo_doc`, `tipo` (ADT/CHD/INF) |
| `bloqueo_oferta` | Holds de 15-30 min | `holdId`, `offerId`, `propietarioId`, `expiresAt` |
| `pase_abordar` | Boarding pass | `bookingId`, `asiento`, `puerta`, `checkedIn` |
| `atraccion` | Catálogo de atracciones | `name`, `product_type`, `operator`, `price` |
| `reserva_atraccion` | Reservas de atracciones | `reservationId`, `email`, `idempotencyKey` |
| `alojamiento` | Propiedades hoteleras | `nombre`, `ciudad`, `precio_noche` |
| `reserva_alojamiento` | Reservas de hoteles | `propertyId`, `checkIn`, `checkOut`, `email` |
| `orden_auto` | Alquileres de vehículos | `vehicleId`, `email`, `startDate`, `endDate` |
| `support_tickets` | Tickets de soporte | `email`, `subject`, `priority`, `status`, `resolution` |

---

## 3. Contratos de API (Endpoints)

> **Prefijo global:** `/api/v1`  
> **Documentación interactiva:** `{backend_url}/api/docs` (Swagger UI / OpenAPI 3.0)  
> **Errores:** Todos los errores siguen el estándar **RFC 7807** con `Content-Type: application/problem+json`

### 3.1 Módulo Vuelos — `/api/v1/vuelos`

| Método | Endpoint | Descripción | Auth | Idempotency-Key |
|---|---|---|---|---|
| `POST` | `/search` | Búsqueda de vuelos (ida/vuelta/multidestino) | No | No |
| `POST` | `/offers/hold` | Bloquear inventario y congelar precio (15-30 min) | No | **Requerido** |
| `GET` | `/offers/hold/:holdId` | Consultar estado de un hold | No | No |
| `DELETE` | `/offers/hold/:holdId` | Liberar hold anticipadamente | No | No |
| `GET` | `/offers/:offerId/seatmap` | Mapa de asientos de una oferta | No | No |
| `POST` | `/bookings` | Crear reserva a partir de un hold | No | **Requerido** |
| `GET` | `/bookings` | Listar reservas del usuario (paginado por cursor) | No* | No |
| `GET` | `/bookings/:bookingId` | Detalle completo de una reserva | No* | No |
| `GET` | `/bookings/:bookingId/tickets` | Listar tickets de una reserva | No* | No |
| `POST` | `/bookings/:bookingId/tickets` | Emitir boletos de una reserva | No* | No |
| `GET` | `/bookings/:bookingId/tickets/:ticketId` | Detalle de un ticket | No* | No |
| `GET` | `/bookings/:bookingId/boarding-passes` | Listar pases de abordar | No* | No |
| `POST` | `/bookings/:bookingId/date-change/search` | Buscar disponibilidad para cambio de fecha | No* | No |
| `POST` | `/bookings/:bookingId/date-change` | Confirmar cambio de fecha | No* | **Requerido** |
| `GET` | `/bookings/:bookingId/baggage-options` | Opciones de equipaje post-emisión | No* | No |
| `POST` | `/bookings/:bookingId/check-in` | Realizar check-in | No* | No |
| `GET` | `/bookings/:bookingId/cancellation-quote` | Cotizar cancelación | No* | No |
| `POST` | `/bookings/:bookingId/cancel` | Cancelar reserva | No* | **Requerido** |
| `POST` | `/bookings/:bookingId/baggage` | Agregar maleta extra | No* | **Requerido** |
| `GET` | `/flights/:flightNumber/status` | Estado operativo de un vuelo (público) | No | No |
| `GET` | `/webhooks` | Listar suscripciones a webhooks | No* | No |
| `POST` | `/webhooks` | Registrar suscripción a webhook | No* | No |
| `DELETE` | `/webhooks/:id` | Eliminar suscripción | No* | No |

_*Usa `X-Device-Fingerprint` para identificar al propietario (UUID por sesión de navegador)._

### 3.2 Módulo Atracciones — `/api/v1/atracciones`

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `POST` | `/search` | Búsqueda de atracciones con paginación por tokens | No |
| `POST` | `/details` | Obtener detalles de múltiples atracciones (batch) | No |
| `GET` | `/health` | Healthcheck del módulo | No |
| `GET` | `/` | Listar todas las atracciones (caché 60s) | No |
| `POST` | `/` | Registrar nueva atracción | No |
| `GET` | `/:id` | Detalle de una atracción (caché 60s, HATEOAS) | No |
| `PUT` | `/:id` | Reemplazar una atracción completa | No |
| `PATCH` | `/:id` | Actualizar parcialmente una atracción | No |
| `DELETE` | `/:id` | Eliminar una atracción | No |
| `GET` | `/:id/availability` | Consultar disponibilidad de cupos | No |
| `POST` | `/:id/reservations` | Reservar una atracción | **JWT** |
| `GET` | `/reservations` | Historial de reservas del usuario | **JWT** |
| `GET` | `/reservations/:id` | Detalle de una reserva específica | **JWT** |
| `POST` | `/reservations/:id/cancel` | Cancelar una reserva | **JWT** |

### 3.3 Módulo Alojamientos — `/api/v1/alojamientos`

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `GET` | `/` | Listar alojamientos (caché, filtros opcionales) | No |
| `GET` | `/:id` | Detalle de un alojamiento | No |
| `POST` | `/reservations` | Crear reserva de alojamiento | **JWT** |
| `GET` | `/reservations` | Listar reservas del usuario | **JWT** |
| `DELETE` | `/reservations/:id` | Cancelar reserva de alojamiento | **JWT** |

### 3.4 Módulo Autos — `/api/v1/autos`

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| `POST` | `/search` | Buscar autos disponibles | No |
| `POST` | `/depots` | Listado de depósitos/sucursales | No |
| `POST` | `/constants` | Constantes del sistema de alquiler | No |
| `POST` | `/suppliers` | Listado de proveedores | No |
| `POST` | `/orders/create` | Crear orden de alquiler | No |
| `GET` | `/orders` | Listar órdenes del usuario (caché) | No |
| `GET` | `/orders/:orderId` | Detalle de una orden (caché) | No |
| `POST` | `/orders/:orderId/cancel` | Cancelar una orden | No |

### 3.5 Módulo Chatbot — `/api/v1/chatbot`

| Método | Endpoint | Descripción | Cache |
|---|---|---|---|
| `POST` | `/mensaje` | Enviar mensaje al chatbot (Groq/LLaMA) | No |
| `POST` | `/nueva-conversacion` | Iniciar nueva conversación | No |
| `GET` | `/estado` | Estado del servicio (caché 5s) | 5s |
| `GET` | `/alcance` | Descripción del alcance del chatbot | No |

### 3.6 Módulo Facturas — `/api/v1/facturas`

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/enviar` | Enviar factura PDF por correo (SMTP Gmail) |

### 3.7 Módulo Telemetría — `/api/v1/telemetry`

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/events` | Registrar evento de analítica (pageView, booking_confirmed, etc.) |

---

## 4. Versionamiento y Fecha de Deprecación

Todas las rutas utilizan el prefijo `/api/v1` configurado globalmente en `main.ts`:

```typescript
app.setGlobalPrefix('api/v1');
```

Algunos endpoints llevan adicionalmente la cabecera de respuesta para controlar la deprecación controlada:

```
X-API-Deprecation-Date: 2027-12-31
```

---

## 5. Patrones de Integración Implementados

### 5.1 Verificación Síncrona de Pago

Antes de emitir cualquier ticket o confirmar una reserva que tenga costo adicional, el sistema valida que se haya recibido una `paymentReference` válida (mínimo 4, máximo 120 caracteres). Si no se provee, el sistema devuelve un `422 Unprocessable Entity`:

```typescript
if (Number(oferta.cambioTotalAPagar) > 0 && !dto.payment?.paymentReference) {
  throw new UnprocessableEntityException(
    'El cambio tiene un importe a pagar y no se ha recibido paymentReference.'
  );
}
```

### 5.2 Idempotencia en Operaciones de Escritura

Las operaciones que mueven dinero o inventario requieren la cabecera `Idempotency-Key` (formato UUID). Reenviar la misma clave devuelve la respuesta original sin re-ejecutar la operación.

### 5.3 Telemetría y Preparación para EDA

El módulo `TelemetryModule` captura eventos clave (`payment_started`, `payment_succeeded`, `booking_confirmed`) que modelan el futuro bus de eventos para la arquitectura orientada a eventos (EDA/SOA) del Reto 2.

---

## 6. Puntos de Integración para el Reto 2

| Punto de Integración | Tipo | Descripción |
|---|---|---|
| `POST /api/v1/vuelos/webhooks` | Webhook Saliente | Notificación asíncrona de cambios de estado de reserva a sistemas externos |
| `GET /api/v1/atracciones` | Endpoint Público | Consumo por el sistema central Booking Prototipo para catálogo federado |
| `SoapWrapperService` | Wrapper Interno | Preparado para conectarse a sistemas legados SOAP/XML sin modificar el contrato REST |
| `TelemetryModule` | Event Source | Fuente de eventos para migración futura a Event Bus (RabbitMQ/Kafka) |

---

## 7. Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React (Vite) | 18.x |
| Backend | NestJS | 10.x |
| ORM | TypeORM | 0.3.x |
| Base de Datos | PostgreSQL (Supabase) | 15.x |
| Autenticación | Supabase Auth (JWT) | — |
| Documentación API | Swagger / OpenAPI 3.0 | @nestjs/swagger |
| Validación | class-validator + class-transformer | — |
| Caché | @nestjs/cache-manager | — |
| Despliegue Frontend | Vercel | — |
| Despliegue Backend | Render | — |
