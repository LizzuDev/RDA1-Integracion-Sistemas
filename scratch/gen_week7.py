# -*- coding: utf-8 -*-
"""
Generador de Contenidos - Semana 7 (Páginas 1 a 4)
Cuaderno Técnico RDA2: Integración de Sistemas
"""

PAGE_1 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 01 | Página 1 de 22
**Semana 7 — Esquemas, Compatibilidad y Gestión de Contratos**  
**Subtema 1:** Contratos REST vs. gRPC en Integración de Sistemas

---

### 1. Definición Teórica & Fundamento Académico
En la ingeniería de integración de sistemas orientada a servicios, un **contrato de integración** es un acuerdo formal, explícito e inequívoco entre dos o más componentes de software que define la sintaxis, semántica, tipos de datos, precondiciones, postcondiciones y canales de transporte para el intercambio de información (*Damián Nicolalde, Libro de Clase Semana 07*).

El paradigma de integración ha evolucionado desde el **contrato implícito** (donde las estructuras de datos y códigos de error se descubren empíricamente en tiempo de ejecución o mediante documentación informal propensa a desincronización) hacia el **Contract-Driven Development (CDD)**. En CDD, el contrato es la única fuente de verdad (*single source of truth*), diseñado previamente a la implementación para permitir la generación de stubs/skeletons, pruebas de conformidad y desacoplamiento de equipos.

| Dimensión Técnica | Contrato REST (OpenAPI 3.0.3) | Contrato gRPC (Protocol Buffers v3) |
| :--- | :--- | :--- |
| **Capa de Transporte** | HTTP/1.1 (predominante) o HTTP/2 | HTTP/2 obligatorio nativo |
| **Serialización** | Texto plano (JSON / YAML) | Binario compacto estructurado (.proto) |
| **Tipado** | Tipado débil / dinámico (depende del validador de payload) | Tipado fuerte estricto en tiempo de compilación |
| **Multiplexación** | Head-of-line blocking en HTTP/1.1; limitada por conexión | Multiplexación real de streams bidireccionales en un único socket TCP |
| **Gobernanza / Catálogo** | SwaggerHub, Postman API Network, Portales de Desarrollador | Buf Schema Registry (BSR), Catálogos Proto centralizados |

**Conceptos clave para defensa oral:**
- **Tipado fuerte vs. débil:** En gRPC, el compilador `protoc` genera clases fuertemente tipadas donde la omisión de un tipo o un casting inválido genera error de compilación. En REST tradicional sobre JSON, los tipos numéricos y cadenas pueden colapsar a tipos dinámicos salvo que intervenga un validador en runtime.
- **Contract-Driven Development:** Estrategia donde el contrato OpenAPI o `.proto` se versiona en Git y gobierna el ciclo de vida antes de escribir una sola línea de lógica de negocio.

---

### 2. Diseño y Componente Arquitectónico
En el ecosistema **Booking Central**, se adoptó un **modelo de integración híbrido o dual**:
1. **Perímetro Externo (North-South):** Expone contratos **REST con OpenAPI 3.0.3** para interoperar con clientes web React, aplicaciones móviles y las tiendas de los 8 compañeros socios (Atracciones, Autos, Alojamientos, Vuelos).
2. **Backbone Interno de Alta Frecuencia (East-West / Inbound Ingest):** Expone un servidor **gRPC sobre HTTP/2** escuchando en el puerto `50051`. Este socket inbound implementa el servicio `InventoryStockService` para ingesta de cambios de stock en tiempo real desde tiendas externas que requieran actualización de alta frecuencia sin el overhead de parsing JSON ni latencias de handshake HTTP/1.1.

---

### 3. Ubicación Exacta en el Código
- **Servidor gRPC Inbound:** `src/main.ts` (Líneas 95-120: inicialización de microservicio gRPC con `Transport.GRPC`, puerto `50051`, paquete `inventory`).
- **Definición Canónica del Contrato .proto:** `src/proto/inventory.proto` (Servicio `InventoryStockService`, mensajes `StockUpdateMessage`, `StockUpdateAck`, `StockChangeEvent`).
- **Controlador de Contratos REST:** `src/modules/contracts/contracts.controller.ts` (Endpoints `@Get('contracts')`, `@Get('contracts/:filename')`).
- **Suite de Pruebas de Contrato gRPC:** `test/i09-grpc-inventario.spec.ts` y script de validación `test/test-grpc-inventory.js`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Configuración del Servidor gRPC en `src/main.ts`:
```typescript
// src/main.ts — Inicialización híbrida HTTP/REST + gRPC
const grpcPort = process.env.GRPC_PORT || 50051;
const protoPath = path.join(process.cwd(), 'src', 'proto', 'inventory.proto');

app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.GRPC,
  options: {
    package: 'inventory',
    protoPath: protoPath,
    url: `0.0.0.0:${grpcPort}`,
    loader: {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    },
  },
});
await app.startAllMicroservices();
```

#### Contrato Protocol Buffers v3 en `src/proto/inventory.proto`:
```protobuf
syntax = "proto3";
package inventory;

service InventoryStockService {
  rpc PushStockUpdate (StockUpdateMessage) returns (StockUpdateAck);
  rpc StreamInventoryChanges (stream StockChangeEvent) returns (StreamSummary);
  rpc GetSlotAvailability (SlotAvailabilityRequest) returns (SlotAvailabilityResponse);
}

message StockUpdateMessage {
  string service_id = 1;
  string item_id = 2;
  string date = 3;           // Formato ISO YYYY-MM-DD
  string time_slot = 4;      // Franja horaria '10:30 a.m.'
  int32 available_units = 5; // Aforo remanente neto
  int64 timestamp = 6;       // Regla monotónica de descarte de paquetes obsoletos
  string slot_id = 7;
}

message StockUpdateAck {
  bool success = 1;
  string message = 2;
  int64 processed_at = 3;
  string error_code = 4;     // 'OK', 'STALE_TIMESTAMP_IGNORED', 'ITEM_NOT_FOUND'
  int32 current_available = 5;
}
```

**Explicación técnica:**
- El mensaje `StockUpdateMessage` transporta enteros binarios comprimidos mediante codificación *Varint*, reduciendo el tamaño del payload en más de un 68% comparado con el JSON equivalente.
- Se implementó una **regla de ordenamiento monotónico** en `timestamp` (Unix Epoch en ms): si un paquete arriba con un timestamp menor al último registrado para ese `slot_id`, Booking Central lo descarta retornando `STALE_TIMESTAMP_IGNORED` para evitar carreras en redes inestables.

---

### 5. Planificación y Decisiones de Diseño
- **Decisión:** Mantener una arquitectura bicéfala (REST para el borde, gRPC para sincronización de inventario).
- **Alternativas evaluadas:** Se evaluó utilizar WebSockets o Webhooks REST para toda la sincronización. Se descartaron porque WebSockets carecen de un esquema de tipado estricto por defecto y Webhooks sobre HTTP/1.1 generan un consumo desmedido de descriptores de socket bajo ráfagas de ventas concurrentes.
- **Trade-offs:** gRPC introduce la necesidad de compilar `.proto` y complica las pruebas manuales directas con cURL, lo cual se mitigó desarrollando el script de prueba interactivo `test/test-grpc-inventory.js` y exponiendo el contrato descargable en `/api/v3/contracts/inventory.proto`.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
sequenceDiagram
    autonumber
    participant Partner as Tienda Socia (Dilan/Mateo)
    participant GatewayREST as Booking Gateway (REST :3000)
    participant CoreGRPC as Microservicio gRPC (:50051)
    participant DB as Postgres (Inventario Atomic)

    Note over Partner,GatewayREST: Canal REST (HTTP/1.1 JSON Texto)
    Partner->>GatewayREST: POST /api/v2/atracciones/reservar (JSON)
    GatewayREST-->>Partner: 201 Created (JSON Response + RFC 7807)

    Note over Partner,CoreGRPC: Canal gRPC (HTTP/2 Binario Multiplexado)
    Partner->>CoreGRPC: PushStockUpdate(StockUpdateMessage {item_id, units, timestamp})
    CoreGRPC->>CoreGRPC: Evaluar orden monotónico (timestamp > last_ts)
    CoreGRPC->>DB: UPDATE cupos SET remanente = available_units
    CoreGRPC-->>Partner: StockUpdateAck {success: true, code: "OK", current: 5}
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Logs Físicos Estructurados:** Cada invocación gRPC y REST genera un registro en disco en formato **JSON Lines (`logs/booking-gateway.jsonl`)** mediante `WinstonPhysicalLoggerService`.
- **Campos de Trazabilidad:** Se registran `correlation_id`, `trace_id`, `service: "INVENTORY_GRPC"`, `duration_ms` y `status_code`.
- **Monitoreo de Nodos (LEDs):** El estado del listener gRPC en el puerto `50051` se reporta en el endpoint administrativo `/api/v2/admin/nodes/health`. Un error en la resolución del `.proto` o puerto ocupado cambia el indicador del nodo `inventory-grpc` a **LED ROJO (`status: OFFLINE`)**.
"""

PAGE_2 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 02 | Página 2 de 22
**Semana 7 — Esquemas, Compatibilidad y Gestión de Contratos**  
**Subtema 2:** Enfoques Schema-First vs. Code-First y Versionamiento de APIs

---

### 1. Definición Teórica & Fundamento Académico
El diseño de interfaces programables se divide fundamentalmente en dos metodologías opuestas (*Libro de la Clase Semana 07*):

1. **Schema-First (Contrato Primero):** La especificación formal de la API (OpenAPI YAML/JSON o Protobuf `.proto`) se diseña, valida y consensúa antes de escribir la implementación. 
   - *Ventajas:* El contrato es independiente del lenguaje de programación; promueve el desarrollo en paralelo de frontend y backend; habilita generación automática de mocks y pruebas de contrato.
   - *Riesgos:* Requiere disciplina de diseño y herramientas para evitar desincronización entre el esquema y el código real si no se valida en CI/CD.
2. **Code-First (Código Primero):** Los desarrolladores escriben controladores y modelos de dominio en su lenguaje de programación, y un generador (como Swagger/OpenAPI decorators en NestJS) infiere el esquema como un subproducto de la compilación.
   - *Ventajas:* Velocidad inicial elevada y cambios rápidos reflejados en código.
   - *Riesgos:* Alto riesgo de acoplamiento al modelo de base de datos interno; modificaciones involuntarias en el código generan *breaking changes* accidentales que rompen a los clientes.

**Caso de Estudio Stripe:**
Stripe implementa una estrategia de inmutabilidad estricta: los contratos nunca cambian de forma destructiva. Utilizan un **versionamiento por fechas** (ej. `Stripe-Version: 2020-08-27`). Internamente, un motor de transformación de eventos ejecuta capas de *upgrades/downgrades* para adaptar el payload de la versión solicitada por el cliente al modelo de datos actual del servidor, garantizando compatibilidad absoluta sin forzar migraciones a los comercios.

**Estrategias de Versionamiento en la Industria:**
- **URI Path Versioning (Implementado en Booking):** `/api/v1/resource`, `/api/v2/resource`. Es explícito, transparente para proxies y compatible con CDNs.
- **Header Versioning:** Cabecera HTTP personalizada `X-API-Version: 2`.
- **Content Negotiation (Accept Header):** `Accept: application/vnd.booking.v2+json`.
- **Query Parameter:** `/api/resource?version=2`.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se estructuró un esquema de **Versionamiento URI Semántico** en el framework NestJS con soporte multi-versión concurrente (`v1`, `v2` y `v3`):
- **Capa v1:** Soporte legado para compatibilidad con integraciones iniciales de socios y frontend de reservas (`/api/v1/reservas/:id/estado`).
- **Capa v2:** Contratos B2B consolidados para los 8 socios (RutaLibre de Daniel, AutoSpot de Esteban, Atracciones de Mateo/Dilan, etc.).
- **Capa v3:** Contratos canónicos estrictos con time-slots, validación RFC 7807 y orquestación Saga.

---

### 3. Ubicación Exacta en el Código
- **Activación Global del Versionamiento:** `src/main.ts` (Líneas 55-62: `app.enableVersioning({ type: VersioningType.URI, defaultVersion: ['1', '2', '3'] })`).
- **Controlador Multi-Versión de Atracciones:** `src/modules/atracciones/atracciones.controller.ts` (`@Controller({ path: 'atracciones', version: ['1', '2', '3'] })`).
- **Controlador Versionado de Reservas:** `src/modules/reservas/reservas.controller.ts` (Rutas versionadas `@Version('1')` y `@Version('2')`).
- **Especificaciones OpenAPI Schema-First:** `contracts/schemas/atracciones.schema.json` y `src/modules/contracts/openapi/`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Configuración de Versionamiento en `src/main.ts`:
```typescript
// src/main.ts
app.setGlobalPrefix('api');
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: ['1', '2', '3'],
});
```

#### Manejo de Endpoints Multi-Versión en Controladores:
```typescript
// src/modules/reservas/reservas.controller.ts
@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  // Soporte v1 para sincronización y consulta de estado rápida (Evita 404 de frontend y socios)
  @Get(':id/estado')
  @Version('1')
  async obtenerEstadoReservaV1(@Param('id') id: string) {
    return this.reservasService.consultarEstadoReserva(id);
  }

  // Versión 2 con DTO completo, HATEOAS y metadatos de auditoría
  @Get(':id')
  @Version('2')
  async obtenerReservaV2(@Param('id') id: string) {
    return this.reservasService.buscarPorIdConDetalles(id);
  }
}
```

**Explicación técnica:**
- La resolución del dispatcher de NestJS examina el segmento de ruta inmediatamente posterior al prefijo global (`/api`). Si la solicitud llega a `/api/v1/reservas/MDU-19CE46E8/estado`, se enruta directamente al método decorado con `@Version('1')`.
- Esto resolvió el problema de sincronización donde clientes o paneles en producción continuaban emitiendo peticiones v1 sin romper la transición de la plataforma hacia contratos v2 y v3.

---

### 5. Planificación y Decisiones de Diseño
- **Justificación de URI Versioning sobre Header Versioning:** Aunque el versionamiento por Header es teóricamente más limpio desde el purismo REST (mantener URIs únicas por recurso), en un entorno con 8 equipos de estudiantes integrando plataformas dispares (PHP, Python, Java, Node.js), el versionamiento por URI elimina ambigüedades, facilita el debug visual en cURL/Postman y permite que los API Gateways y reglas de WAF enruten sin parsear encabezados.
- **Preservación de Contratos:** Se determinó que ningún endpoint v1 se elimina; en su lugar, se marca con `@Deprecated` en Swagger y se mantiene un adaptador ligero para evitar colapsar sistemas de compañeros como RutaLibre.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart TD
    Req["Petición HTTP Entrante<br/>ej. GET /api/v1/reservas/XYZ/estado"] --> Router{"NestJS URI Version Dispatcher"}
    
    Router -->|Prefijo /v1/| HandlerV1["Handler v1 (Legacy Adapter)<br/>Payload plano y compatibilidad retroactiva"]
    Router -->|Prefijo /v2/| HandlerV2["Handler v2 (B2B Multi-Socio)<br/>Validación AJV + HATEOAS + Decoradores"]
    Router -->|Prefijo /v3/| HandlerV3["Handler v3 (Canónico)<br/>Saga LIFO + RFC 7807 Estricto"]

    HandlerV1 --> Svc["ReservasService (Dominio Unificado)"]
    HandlerV2 --> Svc
    HandlerV3 --> Svc
    
    Svc --> Resp["Respuesta HTTP con cabecera X-API-Version"]
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Auditoría de Versiones:** El middleware `StructuredHttpRequestMiddleware` extrae automáticamente la versión de la URI y la registra en el log físico JSON Lines:
  ```json
  {"timestamp":"2026-11-15T18:00:00Z","level":"info","api_version":"v1","http":{"method":"GET","path":"/api/v1/reservas/XYZ/estado","status":200},"correlation_id":"CORR-81AD6D98"}
  ```
- **Telemetría de Obsolescencia:** Se contabilizan las invocaciones a versiones `v1` vs `v2/v3` para determinar cuándo los socios externos han completado su migración y programar el desmantelamiento seguro de adaptadores legados.
"""

PAGE_3 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 03 | Página 2 de 22
**Semana 7 — Esquemas, Compatibilidad y Gestión de Contratos**  
**Subtema 3:** Formatos de Serialización y Esquemas: JSON Schema, Avro y Protobuf

---

### 1. Definición Teórica & Fundamento Académico
La serialización es el proceso de codificar un objeto en memoria en un flujo de bytes apto para su transmisión por red o persistencia física (*Libro de la Clase Semana 07*).

| Criterio Técnico | JSON Schema (Draft-07) | Apache Avro | Protocol Buffers v3 |
| :--- | :--- | :--- | :--- |
| **Formato de Salida** | Texto estructurado legible | Binario compacto con esquema incluido en cabecera | Binario puro codificado en tags numéricos (*Varints*) |
| **Definición de Esquema** | JSON declarativo (`.json`) | Archivo JSON (`.avsc`) | Archivo IDL específico (`.proto`) |
| **Sobrecarga de Red (Overhead)**| Alta (repite nombres de claves en cada mensaje) | Mínima (los registros no contienen nombres de campos) | Mínima (solo viajan IDs numéricos de tags y valores) |
| **Velocidad de Serialización** | Lenta (parsing de caracteres de texto) | Muy Rápida | Extremadamente Rápida (orientada a hardware y streaming) |
| **Ecosistema de Uso** | APIs REST, Webhooks, Validación de Borde | Apache Kafka, Event Streams, Data Lakes | gRPC, Comunicación Inter-Microservicios de Alta Concurrencia |

**Principios de JSON Schema Draft-07:**
Permite restringir tipos primitivos (`string`, `number`, `integer`, `boolean`), estructuras complejas (`object`, `array`), formatos estrictos (`date`, `date-time`, `email`, `uuid`), límites cuantitativos (`minimum`, `maximum`, `minItems`) y composición lógica de tipos (`oneOf`, `anyOf`, `allOf`).

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se diseñó una **tubería de validación en dos niveles**:
1. **Nivel Perimetral REST con AJV:** Se implementó `AjvValidationPipe`, que compila esquemas JSON Schema en funciones nativas en lenguaje máquina V8 al inicio del servidor, ejecutando validación en O(1) sobre payloads entrantes de checkout y reservas.
2. **Nivel Inter-Servicio Binario con Protobuf:** Se compilaron esquemas `.proto` para la comunicación gRPC, eliminando la duplicidad de claves y acelerando el throughput de inventario.

---

### 3. Ubicación Exacta en el Código
- **Pipe de Validación AJV en Runtime:** `src/core/validation/ajv-validation.pipe.ts`.
- **Esquema JSON Schema Declarativo:** `contracts/schemas/atracciones.schema.json`.
- **Esquema Protobuf:** `src/proto/inventory.proto`.
- **Pipe de Validación DTO (class-validator):** `src/core/validation/validation-pipe.ts`.
- **Inyección Global de Pipes:** `src/main.ts` (Línea 65: `app.useGlobalPipes(crearValidationPipeGlobal(), new AjvValidationPipe())`).

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Implementación del Validador de Alto Rendimiento con AJV en `src/core/validation/ajv-validation.pipe.ts`:
```typescript
@Injectable()
export class AjvValidationPipe implements PipeTransform {
  private readonly ajv: Ajv;
  private readonly validators: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,        // Captura todas las infracciones, no solo la primera
      coerceTypes: true,      // Coerción segura de tipos de datos compatibles
      strict: false,          // Permite compatibilidad con extensiones OpenAPI
    });
    addFormats(this.ajv);     // Agrega formatos: date, email, uri, uuid
    this.loadSchemas();
  }

  private loadSchemas() {
    const schemaPath = path.resolve('contracts/schemas/atracciones.schema.json');
    if (fs.existsSync(schemaPath)) {
      const raw = fs.readFileSync(schemaPath, 'utf8');
      const schemaBundle = JSON.parse(raw);
      this.ajv.addSchema(schemaBundle, 'atracciones-bundle');
      
      if (schemaBundle.definitions?.CreateReservaRequestV3) {
        this.validators.set(
          'CreateReservaRequestV3',
          this.ajv.compile(schemaBundle.definitions.CreateReservaRequestV3),
        );
      }
    }
  }

  transform(value: any, metadata: ArgumentMetadata) {
    const validator = this.validators.get(metadata.metatype?.name || '');
    if (!validator) return value; // Si no hay esquema específico, pasa a class-validator

    const valid = validator(value);
    if (!valid) {
      throw new HttpException({
        type: 'https://booking.epn.edu.ec/errors/validation-error',
        title: 'Error de Validación de Esquema Contratado (AJV / JSON Schema)',
        status: HttpStatus.BAD_REQUEST,
        detail: 'El cuerpo de la petición no satisface las restricciones del contrato JSON Schema.',
        invalidParams: validator.errors?.map(err => ({
          field: err.instancePath || err.schemaPath,
          message: err.message,
          rule: err.keyword,
        })),
      }, HttpStatus.BAD_REQUEST);
    }
    return value;
  }
}
```

**Explicación técnica:**
- La opción `allErrors: true` garantiza que el cliente reciba un diagnóstico exhaustivo de todos los campos con errores en un solo viaje de red, evitando el antipatrón de corregir un error por cada request.
- Si el validador falla, la excepción se normaliza bajo el estándar **RFC 7807** con un arreglo estructurado `invalidParams`.

---

### 5. Planificación y Decisiones de Diseño
- **Justificación de AJV frente a validadores basados únicamente en TypeScript (`class-validator`):** `class-validator` depende de clases y metadatos de reflexión en TypeScript, lo que acopla el código del servidor con el contrato. Con **AJV**, se toma directamente el archivo `atracciones.schema.json` acordado con los socios de la cátedra; si el socio actualiza el esquema JSON, el servidor Booking se actualiza sin requerir recompilar clases ni redeclarar DTOs.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart LR
    InPayload["Payload JSON Entrante<br/>(HTTP Request Body)"] --> AJVPipe{"AjvValidationPipe<br/>(Esquemas precompilados V8)"}
    
    AJVPipe -->|Válido 100%| ClassVal["ValidationPipe<br/>(class-validator / DTO)"]
    AJVPipe -->|Infracción de Reglas| ErrRFC["Excepción HTTP 400<br/>RFC 7807 Formatted Errors"]
    
    ClassVal --> Controller["Controlador NestJS<br/>(Ejecución Segura de Lógica)"]
    
    ErrRFC --> Client["Cliente Recibe Detalle Exhaustivo:<br/>- field: '/cantidad'<br/>- rule: 'minimum'"]
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Auditoría de Infracciones:** Las fallas de validación de esquemas se registran en los logs de auditoría en disco bajo el evento `VALIDATION_SCHEMA_REJECTED`, registrando la IP del solicitante, el path exacto de la infracción y el payload sanitizado (ocultando datos de pago o contraseñas).
"""

PAGE_4 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 04 | Página 4 de 22
**Semana 7 — Esquemas, Compatibilidad y Gestión de Contratos**  
**Subtema 4:** Compatibilidad de Contratos y Evolución  
**Subtema 5:** Catálogo de Esquemas y Schema Registry

---

### 1. Definición Teórica & Fundamento Académico
En sistemas distribuidos, los servicios evolucionan de manera desacoplada e independiente. Para evitar caídas en cascada (*cascading failures*), la evolución de esquemas se rige por **reglas formales de compatibilidad** (*Libro de la Clase Semana 07*):

1. **Backward Compatibility (Compatibilidad hacia atrás):** Un componente que implementa el nuevo esquema puede procesar datos producidos por componentes que utilizan el esquema anterior.
   - *Regla:* Solo se pueden añadir campos opcionales o eliminar campos obligatorios.
2. **Forward Compatibility (Compatibilidad hacia adelante):** Un componente que implementa el esquema anterior puede procesar datos producidos por componentes que utilizan el nuevo esquema sin fallar.
   - *Regla:* Requiere aplicar la **Ley de Postel (Principio de Robustez):** *"Sé conservador con lo que envías, y liberal con lo que aceptas"*. Los clientes deben ignorar propiedades desconocidas.
3. **Full Compatibility (Compatibilidad total):** Cumple con retrocompatibilidad y anterocompatibilidad simultáneamente.

**Catálogo de Esquemas y Schema Registry:**
Un **Schema Registry** es un repositorio centralizado, gobernado y versionado que almacena las versiones de los contratos de la organización. Impone controles de compatibilidad estrictos antes de registrar una nueva versión, asegurando que ningún productor publique un mensaje que los consumidores no puedan procesar.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se implementó un **Schema Registry / Catálogo de Contratos Centralizado** administrado por `ContractsModule`:
- Publica dinámicamente las especificaciones **OpenAPI v2, OpenAPI v3 y Protobuf v3** utilizadas por todas las verticales (Atracciones, Autos, Alojamientos, Vuelos).
- Ofrece auto-descubrimiento en tiempo de ejecución para que los desarrolladores de los 8 equipos asociados descarguen contratos vigentes, verifiquen sumas hash de integridad y detecten esquemas desactualizados.

---

### 3. Ubicación Exacta en el Código
- **Controlador del Catálogo de Contratos:** `src/modules/contracts/contracts.controller.ts`.
- **Servicio de Inspección y Registro de Contratos:** `src/modules/contracts/contracts.service.ts`.
- **Repositorio de Esquemas Físicos:** Directorios `contracts/schemas/` y `src/proto/`.
- **Pruebas de Compatibilidad de Contratos:** `test/contract/contract-schemas.spec.ts`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Catálogo Vivo de Contratos en `src/modules/contracts/contracts.controller.ts`:
```typescript
@ApiTags('Contratos por Microservicio (RDA2)')
@Controller({ path: 'contracts', version: ['1', '2', '3'] })
export class ContractsController {
  private readonly contractsList: ContractInfo[] = [
    {
      microservicio: 'MS_ATR (Atracciones Turísticas)',
      vertical: 'ATRACCIONES',
      version: '3.0.3 (Canónica v3)',
      archivo: 'atracciones-openapi-v3.yaml',
      formato: 'OpenAPI 3.0.3 (YAML)',
      descripcion: 'Contrato canónico con time_slots, aforo atómico y reglas RFC 7807',
      url_descarga: '/api/v3/contracts/atracciones-openapi-v3.yaml',
    },
    {
      microservicio: 'MS_AUT (Renta de Autos y Flota)',
      vertical: 'AUTOS',
      version: '3.0.0 (Canónica v3)',
      archivo: 'autos-openapi-v3.yaml',
      formato: 'OpenAPI 3.0.3 (YAML)',
      descripcion: 'Contrato canónico de flota con regla de Cooldown de 2h y mantenimiento',
      url_descarga: '/api/v3/contracts/autos-openapi-v3.yaml',
    },
    {
      microservicio: 'MS_STK (Inventario Inbound gRPC)',
      vertical: 'INVENTARIO',
      version: '1.0.0 (Protobuf v3)',
      archivo: 'inventory.proto',
      formato: 'Protocol Buffers v3 (.proto)',
      descripcion: 'Contrato gRPC de alta frecuencia sobre HTTP/2 para actualización de cupos',
      url_descarga: '/api/v3/contracts/inventory.proto',
    },
  ];

  @Get()
  @ApiOperation({ summary: 'Obtener catálogo general de contratos por microservicio (RDA2)' })
  listarContratos() {
    return {
      sistema: 'Booking Central Prototipo (EPN - RDA2)',
      total_contratos: this.contractsList.length,
      contratos: this.contractsList,
    };
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Descargar archivo de contrato físico (.yaml o .proto)' })
  descargarContrato(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.resolve('contracts', filename);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Contrato no encontrado');
    return res.sendFile(filePath);
  }
}
```

---

### 5. Planificación y Decisiones de Diseño
- **Resolución de Conflictos Multi-Socio:** Durante la integración, socios de autos como Daniel (RutaLibre) y Esteban (AutoSpot) disponían de contratos con discrepancias en nombres de atributos (`id_reserva` vs `pnr`, o ventanas de cancelación). En lugar de forzar a todos los socios a reescribir su backend, el Catálogo de Booking Central mantuvo versiones B2B diferenciadas (`v2` adaptada y `v3` canónica) con capas de adaptación en el API Gateway.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
stateDiagram-v2
    [*] --> PropuestaEsquema: Nuevo campo o cambio de contrato
    PropuestaEsquema --> EvaluacionCompatibilidad: Ejecución de Test Suite CI/CD
    
    state EvaluacionCompatibilidad {
        [*] --> VerificarBreakingChanges
        VerificarBreakingChanges --> BackwardOK: Campo añadido es Opcional
        VerificarBreakingChanges --> BreakingDetected: Campo eliminado o Tipo modificado
    }
    
    BackwardOK --> PublicarEnSchemaRegistry: Registro Inmutable en /api/v3/contracts
    BreakingDetected --> IncrementarMajorVersion: Requiere nueva versión (/v4) y deprecación
    PublicarEnSchemaRegistry --> DespliegueProduccion: Notificar a Socios Externos
    IncrementarMajorVersion --> DespliegueProduccion
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Trazabilidad de Consumo de Contratos:** Las descargas y consultas al catálogo de contratos (`GET /api/v3/contracts/:filename`) quedan registradas en disco en `logs/audit.jsonl` capturando qué socio inspeccionó la especificación y cuándo.
- **Alertas de Deprecación:** Si un socio consulta contratos con versiones descontinuadas, el gateway inyecta la cabecera HTTP estándar `Sunset: Sun, 31 Dec 2026 23:59:59 GMT` y `Link: </api/v3/contracts/v3>; rel="successor-version"`.
"""

def get_week7_pages():
    return [PAGE_1, PAGE_2, PAGE_3, PAGE_4]

if __name__ == '__main__':
    pages = get_week7_pages()
    print(f"Semana 7 generada: {len(pages)} páginas.")

