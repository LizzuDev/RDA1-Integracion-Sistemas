# Contratos de Integración — API v2 y Protocolo gRPC (RDA2)

> **Asignatura:** Integración de Sistemas — 6to Semestre  
> **Sistema:** Booking Prototipo (API Gateway / BFF Central)  
> **Versión:** 2.0.0 (Reto 2 — Arquitectura Distribuida y Microservicios)  
> **Estándares Aplicados:** REST HATEOAS Nivel 3, RFC 7807 (Problem Details), Protobuf v3 (gRPC)  
> **Estado:** 100% Implementado, Blindado y Verificado

---

## 1. Especificaciones Generales de la API v2
- **Base URL REST:** `/api/v2`
- **Protocolo Inbound de Inventario:** gRPC sobre HTTP/2 en el puerto `50051` (`src/proto/inventory.proto`)
- **Retrocompatibilidad:** La versión `/api/v1` continúa disponible en paralelo con cabeceras `X-API-Deprecation-Date: 2027-12-31`.

---

## 2. Contratos REST v2 — Módulo de Atracciones

### 2.1. Detalle de Atracción Enriquecido
- **Endpoint:** `GET /api/v2/atracciones/:id`
- **Response (200 OK):**
```json
{
  "id": "atr-101",
  "nombre": "Tour Histórico Centro de Quito y Degustación de Cacao",
  "descripcion": "Recorrido guiado por iglesias coloniales con cata de chocolate fino de aroma.",
  "ciudad": "Quito",
  "precioTicket": 35.00,
  "categoria": {
    "id": "cat-201",
    "nombre": "Tour Gastronómico",
    "parent_id": "cat-100",
    "incluye_comida": true,
    "incluye_guia": true,
    "incluye_transporte": false
  },
  "ratings_breakdown": {
    "limpieza": 4.9,
    "servicio": 4.8,
    "calidad": 4.7,
    "general": 4.8
  },
  "reviews_count": 128,
  "reviews": [
    {
      "usuario": "Carlos Mendoza",
      "pais": "Ecuador",
      "puntuacion": 5,
      "fecha": "2026-10-02",
      "comentario": "Excelente experiencia, el guía fue muy puntual y el chocolate insuperable."
    }
  ],
  "highlights": [
    "Visita a la Iglesia de la Compañía",
    "Cata de 5 variedades de chocolate orgánico",
    "Guía bilingüe certificado"
  ],
  "itinerary": [
    { "hora": "09:00", "actividad": "Punto de encuentro en Plaza Grande" },
    { "hora": "10:30", "actividad": "Recorrido patrimonial" },
    { "hora": "12:00", "actividad": "Degustación de cacao" }
  ],
  "service_animals_allowed": true,
  "_links": {
    "self": { "href": "/api/v2/atracciones/atr-101", "type": "GET" },
    "reservar": { "href": "/api/v2/atracciones/atr-101/reservar", "type": "POST" },
    "checkin": { "href": "/api/v2/atracciones/reservas/res-999/checkin", "type": "POST" }
  }
}
```

### 2.2. Árbol Jerárquico de Categorías (Recursivo)
- **Endpoint:** `GET /api/v2/atracciones/categorias/arbol`
- **Response (200 OK):**
```json
[
  {
    "id": "cat-100",
    "nombre": "Tours y Experiencias",
    "slug": "tours",
    "subcategorias": [
      {
        "id": "cat-201",
        "nombre": "Tours Gastronómicos",
        "slug": "tours-gastronomicos",
        "incluye_comida": true,
        "incluye_guia": true,
        "subcategorias": [
          {
            "id": "cat-301",
            "nombre": "Degustación de Cacao",
            "slug": "degustacion-cacao",
            "incluye_comida": true
          }
        ]
      }
    ]
  }
]
```

### 2.3. Check-in de Atracción
- **Endpoint:** `POST /api/v2/atracciones/reservas/:id/checkin`
- **Request Body:**
```json
{
  "documento_identidad": "1723456789",
  "hora_llegada": "2026-10-15T08:50:00Z"
}
```
- **Response (200 OK):**
```json
{
  "reserva_id": "res-999",
  "estado": "COMPLETADA",
  "guia_asignado": "Luis Paredes (Licencia #441)",
  "punto_encuentro": "Puerta Principal de la Catedral",
  "voucher_digital_qr": "https://api.booking.local/vouchers/atr-res-999.png",
  "mensaje": "Check-in exitoso. Por favor presente su voucher al guía."
}
```

---

## 3. Contratos REST v2 — Módulo de Alquiler de Autos

### 3.1. Detalle de Auto y Estado de Flota
- **Endpoint:** `GET /api/v2/autos/:id`
- **Response (200 OK):**
```json
{
  "id": "auto-505",
  "marca": "Toyota",
  "modelo": "Corolla 2025",
  "transmision": "AUTOMATICA",
  "status": "DISPONIBLE",
  "kilometraje_actual": 42150,
  "precio_por_dia": 48.00,
  "images": [
    "https://images.unsplash.com/photo-corolla-1.jpg",
    "https://images.unsplash.com/photo-corolla-2.jpg"
  ],
  "supplier_rating_label": "Muy buena elección",
  "reviews_count": 89,
  "included_in_price": [
    "Cancelación gratuita hasta 48 horas antes",
    "Kilometraje ilimitado",
    "Protección básica contra robo"
  ],
  "pickup_instructions": "Presentar licencia de conducir vigente y pasaporte en el mostrador del aeropuerto.",
  "dropoff_instructions": "Devolver en el carril 4 de Rent-a-car con el tanque lleno.",
  "_links": {
    "self": { "href": "/api/v2/autos/auto-505", "type": "GET" },
    "reservar": { "href": "/api/v2/autos/auto-505/reservar", "type": "POST" }
  }
}
```

### 3.2. Check-in y Entrega de Vehículo
- **Endpoint:** `POST /api/v2/autos/orders/:id/checkin`
- **Request Body:**
```json
{
  "conductor_nombre": "María Fernanda Gómez",
  "licencia_numero": "EC-99887766",
  "km_salida": 42150,
  "deposito_retenido_usd": 300.00
}
```
- **Response (200 OK):**
```json
{
  "orden_id": "ord-777",
  "auto_id": "auto-505",
  "nuevo_estado": "ENTREGADO",
  "fecha_hora_entrega": "2026-10-15T10:00:00Z",
  "acta_entrega_url": "/api/v2/autos/orders/ord-777/acta.pdf"
}
```

### 3.3. Inspección de Patio y Kilometraje (Rol Mantenimiento)
- **Endpoint:** `POST /api/v2/autos/:id/mantenimiento/registro`
- **Request Body:**
```json
{
  "kilometraje_llegada": 42800,
  "nivel_combustible": "100%",
  "observaciones_estado": "Vehículo en buen estado. Rayón menor superficial en guardabarros derecho.",
  "proxima_revision_km": 45000
}
```
- **Response (201 Created):**
```json
{
  "log_id": "mnt-1234",
  "auto_id": "auto-505",
  "estado_actual": "EN_LIMPIEZA",
  "limpieza_inicio": "2026-10-15T18:00:00Z",
  "tiempo_limpieza_minutos": 120,
  "alerta_activa": false,
  "mensaje": "Inspección registrada. El auto permanecerá en limpieza durante 2 horas antes de liberarse."
}
```

---

## 4. Contratos REST v2 — Check-in de Alojamientos y Vuelos

### 4.1. Check-in de Alojamientos
- **Endpoint:** `POST /api/v2/alojamientos/reservations/:id/checkin`
- **Request Body:** `{ "huesped_principal": "Juan Pérez", "hora_llegada": "15:30" }`
- **Response (200 OK):**
```json
{
  "reserva_id": "alo-res-88",
  "estado": "HOSPEDADO",
  "habitacion_asignada": "Suite 402 - Torre A",
  "clave_acceso_digital": "9941#",
  "mensaje": "Bienvenido. Su habitación se encuentra lista."
}
```

### 4.2. Check-in de Vuelos
- **Endpoint:** `POST /api/v2/vuelos/bookings/:id/check-in`
- **Request Body:** `{ "asiento_seleccionado": "14A", "pasajero_dni": "1712345678" }`
- **Response (200 OK):**
```json
{
  "booking_id": "vuelo-bk-55",
  "pnr": "XY99K2",
  "estado": "CHECKED_IN",
  "asiento": "14A (Ventana)",
  "grupo_embarque": "Grupo 2",
  "boarding_pass_url": "/api/v2/vuelos/boarding-pass/XY99K2.pdf"
}
```

---

## 5. Especificación del Contrato gRPC (`src/proto/inventory.proto`)

Escuchando en el puerto TCP `50051`:

```protobuf
syntax = "proto3";

package inventory;

// Servicio gRPC Inbound para recepción de actualizaciones de inventario en tiempo real
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

## 6. Contrato REST v2 — Cancelación con Patrón Saga (Reverso de Stock y Reembolso)

- **Endpoint:** `POST /api/v2/atracciones/reservas/:id/cancel`
- **Response Exitosa (200 OK):**
```json
{
  "mensaje": "Reserva cancelada exitosamente y stock revertido",
  "reserva_id": "87e35b71-fc30-4e08-9dfc-2b28cf9db0b8",
  "estado_previo": "CONFIRMADA",
  "nuevo_estado": "CANCELADA",
  "stock_revertido": 2,
  "reembolso": {
    "monto": 70.00,
    "moneda": "USD",
    "porcentaje": "100%",
    "codigo_transaccion": "REF-ATR-87e35b71",
    "estado": "PROCESADO"
  },
  "socio_notificado": true
}
```
- **Response Error Idempotencia (400 Bad Request — RFC 7807):**
```json
{
  "type": "https://api.booking.local/errors/already-refunded",
  "title": "Bad Request",
  "status": 400,
  "detail": "La reserva ya se encuentra cancelada y su reembolso fue procesado previamente",
  "instance": "/api/v2/atracciones/reservas/87e35b71-fc30-4e08-9dfc-2b28cf9db0b8/cancel"
}
```

---

## 7. Contratos REST v2 — Monitor de 5 Nodos y Kill-Switches

### 7.1. Consulta de Salud de Nodos
- **Endpoint:** `GET /api/v2/admin/nodes/health`
- **Response (200 OK):**
```json
{
  "timestamp": 1729340000000,
  "nodes": [
    {
      "serviceId": "atracciones",
      "name": "Microservicio Atracciones",
      "status": "ONLINE",
      "latencyMs": 45,
      "circuitBreaker": "CLOSED",
      "enabled": true
    },
    {
      "serviceId": "autos",
      "name": "Microservicio Autos y Flota",
      "status": "ONLINE",
      "latencyMs": 52,
      "circuitBreaker": "CLOSED",
      "enabled": true
    },
    {
      "serviceId": "alojamientos",
      "name": "Microservicio Alojamientos",
      "status": "ONLINE",
      "latencyMs": 78,
      "circuitBreaker": "CLOSED",
      "enabled": true
    },
    {
      "serviceId": "vuelos",
      "name": "Microservicio Vuelos",
      "status": "ONLINE",
      "latencyMs": 65,
      "circuitBreaker": "CLOSED",
      "enabled": true
    },
    {
      "serviceId": "grpc_inventory",
      "name": "Servidor Ingesta gRPC (Puerto 50051)",
      "status": "ONLINE",
      "latencyMs": 5,
      "circuitBreaker": "CLOSED",
      "enabled": true
    }
  ]
}
```

### 7.2. Conmutación Dinámica de Kill-Switch
- **Endpoint:** `POST /api/v2/admin/nodes/:serviceId/toggle`
- **Response (200 OK):**
```json
{
  "success": true,
  "serviceId": "autos",
  "enabled": false,
  "circuitBreaker": "MANUALLY_OPEN",
  "message": "Servicio autos desactivado dinámicamente mediante kill-switch"
}
```

### 7.3. Ping Síncrono Manual
- **Endpoint:** `POST /api/v2/admin/nodes/:serviceId/ping`
- **Response (200 OK):**
```json
{
  "serviceId": "atracciones",
  "status": "ONLINE",
  "latencyMs": 48,
  "timestamp": 1729340005000
}
```
