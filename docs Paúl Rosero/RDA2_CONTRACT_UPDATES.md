# Actualización y Evolución de Contratos — Reto 2 (RDA2)

> **Asignatura:** Integración de Sistemas — 6to Semestre  
> **Sistema:** Booking Prototipo (Plataforma Central Integradora)  
> **Criterio de Evaluación:** CE07 (Contratos entre servicios documentados y versionados)  
> **Estado:** Especificación v2.0.0 Oficializada e Implementada al 100%

---

## 1. Justificación y Fundamento de la Migración (v1 → v2)

Durante la fase RDA1, los contratos OpenAPI iniciales (`autos-openapi.yaml` y `atracciones-openapi.yaml`) definieron un esquema mínimo viable (MVP). Al construir la interfaz de usuario estilo Booking.com en el Frontend, se identificaron múltiples atributos esenciales para la experiencia del usuario (opiniones, desglose de calificaciones por categoría, fotografías, instrucciones de entrega de autos, reglas de equipaje y accesibilidad) que no estaban contemplados en los contratos iniciales.

Para mantener la fidelidad visual sin romper la integración en vivo, durante el RDA1 **se envolvieron temporalmente estas secciones en comentarios JSX (`{/* ... */}`)**.

En este **Reto 2 (RDA2)**, se formalizaron e implementaron las especificaciones **v2** de los contratos, introduciendo los nuevos campos requeridos, estableciendo el protocolo **gRPC** para la sincronización continua de stock, habilitando la orquestación de **cancelaciones compensatorias (Patrón Saga)** y el **panel de administración de 5 nodos**, cumpliendo con la exigencia de **retrocompatibilidad (backward compatibility)** requerida por la rúbrica.

---

## 2. Detalle de Cambios por Vertical

### 2.1. Microservicio de Alquiler de Vehículos (`autos-openapi-v2.yaml`)

**Versión anterior:** 1.0.0 → **Nueva versión:** 2.0.0

| Esquema / Endpoint | Campo Nuevo | Tipo de Dato | Propósito en el Frontend / Negocio |
|---|---|---|---|
| `CarDetailsResponse` | `transmission` | `string (MANUAL\|AUTOMATICA)` | Mostrar tipo de caja de cambios en la tarjeta |
| `CarDetailsResponse` | `images` | `array of uri` | Carrusel fotográfico del vehículo |
| `CarDetailsResponse` | `supplier_rating_label` | `string` | Texto descriptivo ("Excelente", "Muy buena elección") |
| `CarDetailsResponse` | `reviews_count` | `integer` | Contador total de opiniones recibidas |
| `CarDetailsResponse` | `included_in_price` | `array of string` | Beneficios ("Cancelación gratis", "Km ilimitado") |
| `OrderDetail` | `pickup_instructions` | `string` | Documentación requerida y políticas de depósito |
| `OrderDetail` | `dropoff_instructions` | `string` | Puntos y horarios de devolución del vehículo |
| `CarStatus` | `status` | `enum` | Máquina de estados: `DISPONIBLE`, `RESERVADO`, `LISTO_PARA_ENTREGAR`, `ENTREGADO`, `EN_LIMPIEZA`, `EN_MANTENIMIENTO` |
| `POST /autos/orders/{id}/checkin` | *Nuevo endpoint* | JSON Payload | Check-in: registra hora de entrega, km de salida y conductor |
| `POST /autos/{id}/mantenimiento` | *Nuevo endpoint* | JSON Payload | Registro de inspección de patio y kilometraje (rol mantenimiento) |

---

### 2.2. Microservicio de Atracciones Turísticas (`atracciones-openapi-v2.yaml`)

**Versión anterior:** 1.2.0 → **Nueva versión:** 2.0.0

| Esquema / Endpoint | Campo Nuevo | Tipo de Dato | Propósito en el Frontend / Negocio |
|---|---|---|---|
| `AtraccionResponse` | `ratings_breakdown` | `object` | Calificaciones desglosadas: limpieza, servicio, calidad |
| `AtraccionResponse` | `reviews` | `array of ReviewItem` | Opiniones reales (autor, país, comentario, fecha) |
| `AtraccionResponse` | `highlights` | `array of string` | "Razones para visitar" en viñetas destacadas |
| `AtraccionResponse` | `itinerary` | `array of ItineraryStep` | Cronograma detallado del recorrido turístico |
| `AtraccionResponse` | `service_animals_allowed` | `boolean` | Política de admisión de animales de asistencia |
| `TicketBreakdown` | `precios_por_edad` | `object` | Tarifas diferenciadas (Adulto, Niño, Infante) |
| `CategoriaAtraccion` | `parent_id`, `flags` | `uuid`, `booleans` | Categorías jerárquicas recursivas (comida, transporte, guía) |
| `POST /atracciones/reservas/{id}/checkin` | *Nuevo endpoint* | JSON Payload | Check-in el día del tour y asignación de guía |
| `POST /atracciones/reservas/{id}/cancel` | *Nuevo endpoint Saga* | JSON Payload | Cancelación con reverso de stock, reembolso 100% e idempotencia |

---

### 2.3. Microservicios de Alojamientos y Vuelos

**Versión anterior:** 1.0.0 → **Nueva versión:** 2.0.0

- **Alojamientos:**
  - Endpoint `POST /api/v2/alojamientos/reservations/{id}/checkin`: Permite al huésped registrar su llegada a partir de las 14:00, asignando el número de habitación física.
  - Endpoint `POST /api/v2/alojamientos/reservations/{id}/checkout`: Libera la habitación y emite el recibo final.
- **Vuelos:**
  - Endpoint `POST /api/v2/vuelos/bookings/{id}/check-in`: Selección de asiento (fila/columna), emisión de tarjeta de embarque con código PNR y estado `CHECKED_IN`.

---

### 2.4. Módulo de Administración y Salud de Nodos

**Endpoints de Observabilidad de Nodos:**
- `GET /api/v2/admin/nodes/health`: Retorna el estado en tiempo real de los 5 nodos (`atracciones`, `autos`, `alojamientos`, `vuelos`, `grpc_inventory`), su latencia en ms y el estado del Circuit Breaker (`CLOSED`, `OPEN`, `HALF_OPEN`, `MANUALLY_OPEN`).
- `POST /api/v2/admin/nodes/{serviceId}/toggle`: Conmuta el kill-switch dinámico para conectar o desconectar un servicio externo en caliente.
- `POST /api/v2/admin/nodes/{serviceId}/ping`: Ejecuta un ping manual síncrono para diagnosticar latencia y disponibilidad.

---

## 3. Especificación del Contrato gRPC para Ingesta de Inventario (`inventory.proto`)

Para evitar llamadas constantes de polling REST desde el Booking hacia los microservicios externos, las tiendas de los compañeros envían actualizaciones de disponibilidad a través del contrato **`src/proto/inventory.proto`** en el puerto TCP `50051`:

```protobuf
syntax = "proto3";

package inventory;

// Servicio gRPC Inbound para recepción de actualizaciones de inventario en tiempo real
// Las tiendas individuales envían su stock hacia Booking Prototipo mediante HTTP/2 multiplexado
service InventoryStockService {
  // Envío puntual de actualización de cupos
  rpc PushStockUpdate (StockUpdateMessage) returns (StockUpdateAck);

  // Streaming continuo de eventos de cambio de inventario
  rpc StreamInventoryChanges (stream StockChangeEvent) returns (StreamSummary);
}

message StockUpdateMessage {
  string service_id = 1;      // Identificador de la tienda (ej. "atracciones-dilan")
  string item_id = 2;         // ID de la atracción o tour
  string date = 3;            // Fecha en formato YYYY-MM-DD
  string time_slot = 4;       // Franja horaria (ej. "10:30 a.m.")
  int32 available_units = 5;  // Cupos remanentes disponibles
  int64 timestamp = 6;        // Epoch timestamp
}

message StockUpdateAck {
  bool success = 1;
  string message = 2;
  int64 processed_at = 3;
}

message StockChangeEvent {
  string event_id = 1;
  string service_id = 2;
  string item_id = 3;
  string date = 4;
  string time_slot = 5;
  int32 delta = 6;            // Cambio neto (+1, -2)
  int64 timestamp = 7;
}

message StreamSummary {
  int32 total_events_processed = 1;
  bool is_synchronized = 2;
  string last_sync_hash = 3;
}
```

---

## 4. Estrategia de Retrocompatibilidad (Backward Compatibility)

Para garantizar el cumplimiento de los estándares de la industria y la rúbrica del sílabo (Semana 7: *Gestión de contratos y control de versiones*):

1. **Versionamiento en la URI:**
   - La API mantiene operativas las rutas `/api/v1/...` (contrato RDA1).
   - Se habilitan concurrentemente las rutas `/api/v2/...` (contrato RDA2 enriquecido).
2. **Cabeceras HTTP de Deprecación:**
   - Todas las respuestas emitidas por endpoints v1 incluyen:
     ```http
     X-API-Deprecation-Date: 2027-12-31
     Sunset: Fri, 31 Dec 2027 23:59:59 GMT
     Link: </api/v2/docs>; rel="successor-version"
     ```
3. **No Breaking Changes en v2:**
   - Todos los campos nuevos añadidos en los payloads v2 son opcionales (`nullable` o con valores por defecto) para que los clientes antiguos que lean respuestas v2 sigan funcionando sin errores de parsing.
