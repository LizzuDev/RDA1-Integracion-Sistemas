# -*- coding: utf-8 -*-
"""
Generador de Contenidos - Semana 10 (Páginas 14 a 18)
Cuaderno Técnico RDA2: Integración de Sistemas
"""

PAGE_14 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 14 | Página 14 de 22
**Semana 10 — Observabilidad y Trazas Distribuidas**  
**Subtema 16:** Los Tres Pilares de la Observabilidad

---

### 1. Definición Teórica & Fundamento Académico
En la ingeniería de sistemas distribuidos moderna, el **monitoreo clásico** (determinar si un sistema está vivo o muerto mediante healthchecks estáticos) resulta insuficiente para diagnosticar estados internos complejos. La **Observabilidad** (formalizada por Rudolf Kalman en teoría de control y popularizada por Charity Majors) se define como la capacidad de inferir los estados internos de un sistema distribuido basándose exclusivamente en sus salidas externas (*Libro de la Clase Semana 10*).

La observabilidad se fundamenta en **Tres Pilares complementarios**:
1. **Logs Estructurados (Structured Logs):** Registro inmutable, discreto y temporal de eventos contextualizados en formato parseable (típicamente **JSON Lines / `.jsonl`**). Contienen atributos ricos como `timestamp`, `level`, `service`, `trace_id` y `correlation_id`.
2. **Métricas (Metrics):** Series temporales numéricas agregables que miden el comportamiento cuantitativo del sistema a lo largo del tiempo (contadores de requests, medidores de memoria, histogramas de latencia). Optimizadas para detección inmediata de anomalías y alertas automáticas.
3. **Trazas Distribuidas (Distributed Tracing):** Registro del recorrido de extremo a extremo que realiza una transacción al propagarse a través de múltiples microservicios, brokers de mensajería y límites de red.

**El "Pegamento" de Correlación:**
Ningún pilar es útil en aislamiento. El identificador universal **`trace_id`** y el identificador de negocio **`correlation_id`** interconectan los tres pilares: una alarma en una métrica (pico de errores 500) conduce a una traza distribuida, y la traza señala los logs estructurados exactos donde ocurrió la excepción.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, los tres pilares se implementaron con estricto apego a las **Consideraciones Específicas de RDA2**:
- **Almacenamiento Físico de Logs en Disco:** Se utiliza `WinstonPhysicalLoggerService` escribiendo registros JSON Lines particionados en disco local (`logs/`), **prohibiendo expresamente el almacenamiento de logs en tablas relacionales de base de datos** para evitar colapsar los pools de conexiones y la latencia I/O de PostgreSQL.
- **Trazabilidad Perimetral:** Middleware `StructuredHttpRequestMiddleware` que genera o propaga identificadores de correlación en cada petición HTTP.

---

### 3. Ubicación Exacta en el Código
- **Servicio de Logging Físico Winston:** `src/core/logger/winston-logger.service.ts`.
- **Middleware de Peticiones HTTP Estructuradas:** `src/core/logger/structured-http-request.middleware.ts`.
- **Directorio de Persistencia de Logs en Disco:** `logs/` (ej. `logs/booking-gateway.jsonl`).
- **Interceptor de Trazas:** `src/core/tracing/trace-context.interceptor.ts`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Implementación del Logger Físico en `src/core/logger/winston-logger.service.ts`:
```typescript
export interface StructuredLogRecord {
  timestamp: string;
  level: string;
  service: string;
  correlation_id: string;
  trace_id: string;
  span_id: string;
  node_id: string;
  event: string;
  duration_ms: number;
  http: {
    method: string;
    path: string;
    status: number;
  };
  payload?: any;
  error?: { name: string; message: string; stack?: string };
}

@Injectable()
export class WinstonPhysicalLoggerService implements LoggerService {
  private readonly logsDirectory = path.resolve(process.cwd(), 'logs');
  private readonly serviceName = process.env.LOG_SERVICE_NAME || 'booking-gateway';

  // Sanitización de seguridad contra fuga de credenciales o tarjetas
  private sanitize(data: any): any {
    const SENSITIVE_REGEX = /authorization|password|token|cvv|secret|card_number/i;
    // Oculta automáticamente datos sensibles reemplazando con [REDACTED]
  }

  logRequest(record: StructuredLogRecord): void {
    const today = new Date().toISOString().split('T')[0];
    const logFilePath = path.join(this.logsDirectory, `audit-${today}.jsonl`);

    // Inyección de identificador de nodo físico
    record.node_id = os.hostname();
    record.payload = this.sanitize(record.payload);

    // Escritura append-only no bloqueante en disco
    const line = JSON.stringify(record) + '\n';
    fs.appendFile(logFilePath, line, 'utf8', (err) => {
      if (err) console.error('Error escribiendo log físico:', err);
    });
  }
}
```

**Explicación técnica:**
- La escritura se ejecuta de forma append-only no bloqueante (`fs.appendFile`), garantizando que la operación de logging tenga una complejidad temporal **O(1)** y un impacto despreciable en el tiempo de respuesta hacia el cliente.
- Se implementó un filtro de expresiones regulares que detecta campos sensibles como números de tarjeta de crédito, contraseñas o tokens de autorización y los reemplaza automáticamente por `[REDACTED]`.

---

### 5. Planificación y Decisiones de Diseño
- **Justificación de Logs en Disco vs. Base de Datos Relacional (RDA2):** En una plataforma integradora que atiende peticiones concurrentes de 8 socios, registrar cada solicitud en tablas de PostgreSQL satura el *Write-Ahead Logging (WAL)* y agota las conexiones. Escribir archivos `.jsonl` en disco garantiza persistencia inmutable de alta velocidad y compatibilidad directa con agentes recolectores de logs como Fluentbit, Logstash o Filebeat.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart TD
    Req["Petición HTTP Entrante"] --> Mid["StructuredHttpRequestMiddleware"]
    Mid -->|Inyecta correlation_id & trace_id| Tracer["TraceContextInterceptor"]
    
    subgraph "Los Tres Pilares en Booking Central"
        Tracer -->|Pilar 1: Trazas| OTel["Spans Jerárquicos W3C (traceparent)"]
        Tracer -->|Pilar 2: Logs| Winston["WinstonPhysicalLogger (JSON Lines en Disco)"]
        Tracer -->|Pilar 3: Métricas| Metrics["Prometheus Telemetry (/metrics)"]
    end

    Winston --> LogDisk["logs/audit-YYYY-MM-DD.jsonl"]
    OTel --> DAGGraph["Dashboard de Grafo de Trazas (/observabilidad)"]
    Metrics --> Grafana["Métricas RED / Apdex Dashboard"]

    LogDisk -.->|Correlación Unificada por trace_id| DAGGraph
    Grafana -.->|Correlación Unificada por trace_id| DAGGraph
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Ejemplo Real de Registro JSON Lines Auditado:**
  ```json
  {"timestamp":"2026-11-15T18:15:30.102Z","level":"info","service":"booking-gateway","correlation_id":"SAGA-8F12B","trace_id":"4bf92f3577b34da6a3ce929d0e0e4736","node_id":"azure-app-vm","event":"ORDER_CREATED","duration_ms":142,"http":{"method":"POST","path":"/api/v2/esb/checkout-saga","status":201}}
  ```
"""

PAGE_15 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 15 | Página 15 de 22
**Semana 10 — Observabilidad y Trazas Distribuidas**  
**Subtema 17:** OpenTelemetry: Estándar Abierto de Observabilidad en Sistemas Distribuidos

---

### 1. Definición Teórica & Fundamento Académico
**OpenTelemetry (OTel)** es un estándar abierto, agnóstico del proveedor y respaldado por la Cloud Native Computing Foundation (CNCF), surgido de la convergencia histórica de OpenTracing y OpenCensus (*Libro de la Clase Semana 10*).

Su arquitectura se organiza en tres capas:
1. **API de OpenTelemetry:** Conjunto abstracto de interfaces de instrumentación (independiente de implementaciones concretas).
2. **SDK de OpenTelemetry:** Implementación de referencia que gestiona el estado en memoria, procesamiento por lotes (*batching*) y exportación.
3. **OpenTelemetry Collector:** Componente de infraestructura proxy que recibe, procesa, filtra y exporta telemetría hacia backends como Jaeger, Prometheus o Datadog.

**Conceptos Nucleares:**
- **TracerProvider:** Fábrica de trazadores con configuración compartida.
- **Span:** Unidad elemental de trabajo con nombre, timestamp de inicio y fin, código de estado, atributos semánticos (*key-value pairs*) y eventos.
- **Baggage:** Mecanismo para propagar pares clave-valor arbitrarios a lo largo de todo el grafo transaccional distribuido sin impactar el cuerpo del mensaje.
- **W3C Trace Context (Estándar Oficial):** Especificación que estandariza la propagación de contexto en cabeceras HTTP:
  - `traceparent: 00-{trace_id}-{parent_id}-{trace_flags}` (ej. `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`).
  - `tracestate`: Información específica de proveedores opaca.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se implementó un motor de **Propagación de Contexto OTel** liderado por `TraceContextService` y `TraceContextInterceptor`:
- Intercepta toda petición entrante; si el cliente envía cabeceras W3C `traceparent` o `x-trace-id`, las adopta; de lo contrario, genera un nuevo `trace_id` criptográfico de 128 bits.
- Inyecta automáticamente estas cabeceras en todas las peticiones HTTP salientes hacia los servicios de los compañeros mediante interceptores de Axios.

---

### 3. Ubicación Exacta en el Código
- **Servicio Gestor de Trazas:** `src/core/tracing/trace-context.service.ts`.
- **Interceptor de Propagación de Contexto:** `src/core/tracing/trace-context.interceptor.ts`.
- **Inyección en Servidor Principal:** `src/main.ts` (Línea 82: `app.useGlobalInterceptors(new TraceContextInterceptor())`).

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Propagación de Cabeceras W3C en `src/core/tracing/trace-context.service.ts`:
```typescript
@Injectable()
export class TraceContextService {
  /**
   * Extrae o genera el contexto de traza distribuida cumpliendo con W3C Trace Context.
   */
  resolverContexto(headers: Record<string, any>): { traceId: string; spanId: string; parentId?: string } {
    const traceparent = headers['traceparent'];

    if (traceparent && typeof traceparent === 'string') {
      // Formato: 00-{trace_id_32hex}-{parent_id_16hex}-{flags_2hex}
      const partes = traceparent.split('-');
      if (partes.length === 4 && partes[0] === '00') {
        return {
          traceId: partes[1],
          parentId: partes[2],
          spanId: crypto.randomBytes(8).toString('hex'), // Nuevo Span ID local
        };
      }
    }

    // Si no viene traceparent, se genera una nueva raíz (Root Trace)
    return {
      traceId: headers['x-trace-id'] || crypto.randomBytes(16).toString('hex'),
      spanId: crypto.randomBytes(8).toString('hex'),
    };
  }

  /**
   * Serializa el contexto actual en la cabecera estándar W3C para llamadas salientes
   */
  formatearTraceparent(traceId: string, spanId: string): string {
    return `00-${traceId}-${spanId}-01`;
  }
}
```

**Explicación técnica:**
- El formato hexadecimal respeta escrupulosamente los 16 bytes (32 caracteres hex) del `trace_id` y los 8 bytes (16 caracteres hex) del `span_id`, garantizando compatibilidad total con agentes externos de Jaeger y Datadog.

---

### 5. Planificación y Decisiones de Diseño
- **Interoperabilidad Multi-Proveedor:** Al consensuar el estándar W3C con los 8 compañeros de curso, Booking Central pudo asociar sus trazas con microservicios escritos en Spring Boot (Java), FastAPI (Python) o Express (Node.js) sin que ninguno deba modificar su arquitectura interna.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
classDiagram
    class W3CTraceparent {
        +String version "00"
        +String traceId "32 caracteres hex (16 bytes)"
        +String parentId "16 caracteres hex (8 bytes)"
        +String traceFlags "01 (sampled)"
        +formatear() String
    }

    class SpanContext {
        +String traceId
        +String spanId
        +String parentSpanId
        +Map attributes
        +List events
        +setTag(key, value)
    }

    W3CTraceparent --> SpanContext : Parseado por TraceContextService
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Propagación Verificada:** Cada petición HTTP emitida por Booking Central hacia APIs de socios adjunta las cabeceras `traceparent` y `x-trace-id`, verificadas en las aserciones de `test/i08-trazas-dashboard.spec.ts`.
"""

PAGE_16 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 16 | Página 16 de 22
**Semana 10 — Observabilidad y Trazas Distribuidas**  
**Subtema 18:** Trazas Distribuidas en Acción: Ciclo de Vida de una Transacción Distribuida

---

### 1. Definición Teórica & Fundamento Académico
Una transacción distribuida implica múltiples mutaciones de estado coordinadas a través de diferentes bases de datos y microservicios independientes (*Libro de la Clase Semana 10*).

**Ciclo de Vida de una Traza Distribuida:**
1. **Root Span (Span Raíz):** Se origina cuando el cliente inicia la operación en el API Gateway (ej. `CheckoutSaga`).
2. **Child Spans (Spans Hijos):** Cada llamada secundaria hereda el `trace_id` y establece el `parent_id` apuntando al span que la originó. Pueden ser secuenciales o concurrentes.
3. **Mapeo de Fallas y Causalidad:** Si un microservicio subordinado arroja una excepción, el span hijo se marca con `status.code = ERROR` y atributos semánticos del fallo (`error.type`, `error.message`), propagando la señal de fallo al orquestador.
4. **Spans de Compensación:** En arquitecturas de tipo **Saga**, la falla dispara transacciones de compensación en orden inverso (**LIFO: Last-In, First-Out**). Cada paso compensatorio genera sus propios spans etiquetados para auditar la reversión exitosa de los recursos reservados previamente.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, el **Orquestador Saga LIFO (`SagaOrchestratorService`)** coordina transacciones distribuidas complejas (vuelos, autos, atracciones, pagos):
- Utiliza una pila transaccional LIFO (`pasosEjecutadosConExito.pop()`).
- Inyecta `correlation_id` y `trace_id` en cada paso transaccional y en cada acción de compensación automática ante fallos de pago o inventario agotado.

---

### 3. Ubicación Exacta en el Código
- **Orquestador Saga LIFO:** `src/modules/esb/interna/saga-orchestrator.service.ts`.
- **Controlador ESB:** `src/modules/esb/esb.controller.ts`.
- **Suite de Pruebas de Trazas de la Saga:** `test/i05-saga-compensacion.spec.ts` y `test/i08-trazas-dashboard.spec.ts`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Lógica de Orquestación y Compensación LIFO con Trazabilidad en `src/modules/esb/interna/saga-orchestrator.service.ts`:
```typescript
async ejecutarCheckoutCompuesto(dto: CheckoutSagaInput, idempotencyKey: string): Promise<any> {
  const correlationId = `SAGA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const pasosEjecutadosConExito: Array<{ nombre: string; compensacion_fn: Function }> = [];

  try {
    // Paso 1: Reservar Atracción (Genera Span Hijo 1)
    const resAtr = await this.atraccionesService.reservar(itemAtr.item_id, itemAtr.dto);
    pasosEjecutadosConExito.push({
      nombre: 'RESERVA_ATRACCION',
      compensacion_fn: () => this.atraccionesService.cancelarReserva(resAtr.reservation_id, {
        reason: 'Rollback compensatorio automático Saga LIFO',
      }),
    });

    // Paso 2: Reservar Auto (Genera Span Hijo 2)
    const resAut = await this.autosService.createOrder(itemAut.dto);
    pasosEjecutadosConExito.push({
      nombre: 'RESERVA_AUTO',
      compensacion_fn: () => this.autosService.cancelOrder(resAut.pnr, {
        reason: 'Rollback compensatorio automático Saga LIFO',
      }),
    });

    // Paso 3: Cobro en Pasarela de Pagos (Genera Span Hijo 3)
    if (dto.simular_fallo_en_paso === 'PAGO_RECHAZADO') {
      throw new HttpException('Pago rechazado por fondos insuficientes', HttpStatus.PAYMENT_REQUIRED);
    }
    await this.pagosService.procesarPago(dto.pagoDto);

  } catch (error) {
    // FASE DE COMPENSACIÓN LIFO (Spans de Reversión)
    this.logger.error(`[SAGA ERROR ${correlationId}] Iniciando Rollback LIFO debido a: ${error.message}`);

    while (pasosEjecutadosConExito.length > 0) {
      const paso = pasosEjecutadosConExito.pop(); // Desapilado en orden inverso
      try {
        await paso.compensacion_fn();
        this.logger.warn(`[Compensación LIFO OK] Revertido: ${paso.nombre}`);
      } catch (compErr) {
        this.logger.error(`[CRÍTICO] Falló compensación de ${paso.nombre}`);
      }
    }

    throw new HttpException({
      type: 'https://booking.epn.edu.ec/errors/saga-rollback',
      title: 'Transacción Distribuida Cancelada y Compensada (Saga LIFO)',
      status: HttpStatus.CONFLICT,
      detail: error.message,
      correlation_id: correlationId,
    }, HttpStatus.CONFLICT);
  }
}
```

---

### 5. Planificación y Decisiones de Diseño
- **Justificación de LIFO Estricto:** Si se cancelara primero la atracción y luego el auto, o en orden aleatorio, podrían generarse condiciones de carrera en inventarios dependientes. LIFO garantiza que la última reserva confirmada sea la primera en liberarse, devolviendo el estado del sistema al punto previo exacto al inicio del checkout.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
sequenceDiagram
    autonumber
    participant Client as Cliente Web
    participant Saga as SagaOrchestratorService
    participant Atr as MS Atracciones (Paso 1)
    participant Aut as MS Autos (Paso 2)
    participant Pag as MS Pagos (Paso 3)

    Client->>Saga: POST /api/v2/esb/checkout-saga (SAGA-F82B)
    Saga->>Atr: Reservar Tour (OK - Push a la Pila)
    Atr-->>Saga: Confirmado (ID: ATR-101)
    
    Saga->>Aut: Reservar Auto (OK - Push a la Pila)
    Aut-->>Saga: Confirmado (PNR: CAR-202)
    
    Saga->>Pag: Procesar Cobro
    Pag-->>Saga: 402 Payment Required (FALLO TRANSACCIONAL)

    Note over Saga: Inicia Rollback Compensatorio LIFO (POP de la Pila)
    Saga->>Aut: Cancelar Auto CAR-202 (Compensación Paso 2)
    Aut-->>Saga: 200 OK (Liberado Cooldown)
    
    Saga->>Atr: Cancelar Tour ATR-101 (Compensación Paso 1)
    Atr-->>Saga: 200 OK (Cupo Reintegrado)

    Saga-->>Client: 409 Conflict (RFC 7807: Estado Revertido Íntegramente)
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Trazabilidad en Bitácora:** Cada fase de la Saga emite eventos `SAGA_STEP_COMPLETED`, `SAGA_FAILED` y `SAGA_COMPENSATED` vinculados al mismo `correlation_id` en los logs físicos.
"""

PAGE_17 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 17 | Página 17 de 22
**Semana 10 — Observabilidad y Trazas Distribuidas**  
**Subtema 19:** Stack de Observabilidad: Jaeger, Zipkin, ELK/EFK, Grafana y Telemetría

---

### 1. Definición Teórica & Fundamento Académico
En arquitecturas distribuidas a escala de producción, la observabilidad se materializa mediante herramientas especializadas (*Libro de la Clase Semana 10*):
- **Jaeger & Zipkin:** Almacenamiento, indexación y visualización gráfica de trazas distribuidas en cascada (Waterfall DAG), facilitando la localización de cuellos de botella y llamadas redundantes.
- **ELK (Elasticsearch, Logstash, Kibana) / EFK (Elasticsearch, Fluentd, Kibana):** Pipeline unificado de recolección de logs, indexación semántica a gran escala y búsqueda full-text con filtros booleanos.
- **Grafana:** Plataforma líder de visualización métrica que consolida paneles unificados de Prometheus, OTel y alertas.

**Requisito de Cátedra RDA2 — Monitor de Nodos y Telemetría:**
Se exige la implementación de un **Panel de Monitoreo de Red de Nodos** con indicadores visuales tipo semáforo (**LED Verde = Operativo, LED Rojo = Caído o Degradado**) para fiscalizar en tiempo real el estado de los 8 subsistemas socios sin recurrir a sondeos manuales invasivos.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se construyó el módulo de **Observabilidad y Telemetría (`ObservabilidadModule` y `TelemetryModule`)**:
- Endpoint `/api/v2/observabilidad/trazas/:correlationId` que reconstruye dinámicamente el Grafo Acíclico Dirigido (DAG) de la transacción para renderizar nodos en verde o rojo.
- Endpoint `/api/v2/admin/nodes/health` que ejecuta sondeos no invasivos periódicos y reporta el semáforo de disponibilidad y estado del Circuit Breaker de cada socio.

---

### 3. Ubicación Exacta en el Código
- **Controlador de Observabilidad de Trazas:** `src/modules/observabilidad/observabilidad.controller.ts`.
- **Servicio de Grafo de Trazas:** `src/modules/observabilidad/observabilidad.service.ts`.
- **Controlador de Telemetría:** `src/modules/telemetry/telemetry.controller.ts`.
- **Script de Verificación de Nodos con Semáforos:** `test/test-nodes-monitor.js` y `test/i10-consolidar-nodos-admin.spec.ts`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Reconstrucción del Grafo DAG en `src/modules/observabilidad/observabilidad.service.ts`:
```typescript
@Injectable()
export class ObservabilidadService {
  constructor(private readonly winstonLogger: WinstonPhysicalLoggerService) {}

  async obtenerTrazaGrafo(correlationId: string) {
    // 1. Lee los logs físicos en disco (.jsonl) asociados al correlationId
    const eventos = await this.leerLogsFisicosPorCorrelacion(correlationId);
    if (!eventos || eventos.length === 0) {
      throw new NotFoundException(`No existen trazas registradas para correlation_id: ${correlationId}`);
    }

    // 2. Construye el árbol de nodos con colores LED
    const nodos = eventos.map((ev) => ({
      id: ev.span_id || ev.event,
      label: `${ev.service} -> ${ev.event}`,
      estado: ev.level === 'error' || ev.status === 'failed' ? 'ROJO' : 'VERDE',
      duracion_ms: ev.duration_ms,
      timestamp: ev.timestamp,
      detalles: ev.http || ev.payload,
    }));

    return {
      correlation_id: correlationId,
      total_pasos: nodos.length,
      estado_general: nodos.some((n) => n.estado === 'ROJO') ? 'FALLIDO_COMPENSADO' : 'EXITOSO',
      grafo_dag: nodos,
    };
  }
}
```

---

### 5. Planificación y Decisiones de Diseño
- **Lectura Eficiente de Logs Físicos en Disco:** En lugar de cargar archivos gigantescos de gigabytes en memoria, `leerLogsFisicosPorCorrelacion` utiliza un flujo de lectura por líneas (`readline` stream en Node.js) que procesa el archivo append-only de hoy con un límite estricto de búfer, protegiendo al contenedor de problemas de Out-Of-Memory (OOM).

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart LR
    subgraph "Monitor de Nodos en Producción (/api/v2/admin/nodes/health)"
        NodeAtr["Nodo Atracciones (Mateo/Dilan)"] -->|Ping HTTP OK (45ms)| Led1["[LED VERDE] ONLINE"]
        NodeAut["Nodo Autos RutaLibre (Daniel)"] -->|Ping HTTP OK (38ms)| Led2["[LED VERDE] ONLINE"]
        NodeVue["Nodo Vuelos (Ariel)"] -->|Timeout > 2000ms| Led3["[LED ROJO] OFFLINE"]
        NodeAlo["Nodo Alojamientos (Gloria)"] -->|500 Server Error| Led4["[LED ROJO] DEGRADED"]
    end

    subgraph "Grafo de Trazas DAG (/observabilidad/trazas/:id)"
        RootNode["Saga Init [VERDE]"] --> StepAtr["Reserva Atracción [VERDE]"]
        StepAtr --> StepAut["Reserva Auto [VERDE]"]
        StepAut --> StepPag["Cobro Pasarela [ROJO]"]
        StepPag --> CompAut["Compensar Auto [VERDE]"]
        CompAut --> CompAtr["Compensar Atracción [VERDE]"]
    end
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Payload Real del Endpoint de Nodos:**
  ```json
  {
    "summary": {"total": 4, "online": 2, "offline": 2},
    "nodes": [
      {"id": "atracciones", "status": "ONLINE", "led": "GREEN", "latency": 45, "circuitBreaker": "CLOSED"},
      {"id": "autos", "status": "ONLINE", "led": "GREEN", "latency": 38, "circuitBreaker": "CLOSED"},
      {"id": "vuelos", "status": "OFFLINE", "led": "RED", "latency": 2040, "circuitBreaker": "OPEN"}
    ]
  }
  ```
"""

PAGE_18 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 18 | Página 18 de 22
**Semana 10 — Observabilidad y Trazas Distribuidas**  
**Subtema 20:** Métricas Clave de Integración y Acuerdos de Servicio (SLI, SLO, SLA)

---

### 1. Definición Teórica & Fundamento Académico
En la ingeniería de confiabilidad de sitios (**Site Reliability Engineering - SRE**, Google Framework), la calidad y estabilidad de una integración se evalúa mediante un marco cuantitativo riguroso (*Libro de la Clase Semana 10*):

1. **SLI (Service Level Indicator - Indicador de Nivel de Servicio):** Métrica cuantitativa observable en tiempo real que refleja el desempeño técnico.
   - *Ejemplo:* Proporción de llamadas HTTP exitosas (códigos 2xx/3xx) con latencia inferior a 250 ms.
2. **SLO (Service Level Objective - Objetivo de Nivel de Servicio):** Meta o umbral acordado internamente por el equipo de ingeniería para un SLI determinado.
   - *Ejemplo:* 99.5% de disponibilidad durante una ventana móvil de 30 días.
3. **SLA (Service Level Agreement - Acuerdo de Nivel de Servicio):** Contrato legal y comercial formalizado con clientes o socios externos que define compensaciones financieras si no se cumple el SLO.
4. **Error Budget (Presupuesto de Error):** Margen de fallo admisible calculado como `100% - SLO` (ej. si el SLO es 99.5%, el Error Budget es 0.5%). Determina el balance entre velocidad de innovación y estabilidad.
5. **Apdex Score (Application Performance Index):** Medida estándar de satisfacción del usuario:
   $$\\text{Apdex}_T = \\frac{\\text{Peticiones Satisfechas} + \\frac{\\text{Peticiones Tolerables}}{2}}{\\text{Peticiones Totales}}$$
   - *Satisfecho:* Latencia $\\le T$.
   - *Tolerable:* $T < \\text{Latencia} \\le 4T$.
   - *Frustrado:* $\\text{Latencia} > 4T$ o código HTTP 5xx.
6. **Métricas RED:** Rate (Tasa de peticiones/seg), Errors (Tasa de errores/seg), Duration (Distribución temporal de latencias).

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se implementó el cálculo de métricas de integración y se formalizó la **Regla de Negocio del Cooldown de 2 Horas en Autos**:
- Tras la devolución o liberación de un auto, el sistema impone un período de bloqueo de 2 horas con estado `EN_LIMPIEZA`. Durante ese período, las búsquedas para fechas inmediatas descartan el vehículo, protegiendo el SLO de calidad y mantenimiento.

---

### 3. Ubicación Exacta en el Código
- **Endpoint de Métricas:** `src/modules/telemetry/telemetry.controller.ts` (`@Get('metrics')`).
- **Lógica de Cooldown de 2 Horas en Autos:** `src/modules/autos/` y adaptadores de RutaLibre (evaluación de timestamp `returned_at + 2 hours`).
- **Pruebas de Métricas y Rendimiento:** `test/performance/`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Algoritmo de Percentiles de Latencia y Apdex en `src/modules/telemetry/telemetry.service.ts`:
```typescript
@Injectable()
export class TelemetryService {
  private readonly T_THRESHOLD_MS = 200; // Umbral T = 200ms

  calcularMetricasIntegracion(muestrasLatenciaMs: number[], fallos: number): MetricasRda2Dto {
    const total = muestrasLatenciaMs.length;
    if (total === 0) return { apdex: 1.0, p50: 0, p95: 0, p99: 0, error_rate: 0 };

    // Ordenamiento numérico para cálculo de percentiles
    const ordenadas = [...muestrasLatenciaMs].sort((a, b) => a - b);
    const p50 = ordenadas[Math.floor(total * 0.50)];
    const p95 = ordenadas[Math.floor(total * 0.95)];
    const p99 = ordenadas[Math.floor(total * 0.99)];

    // Cálculo Apdex
    let satisfechas = 0;
    let tolerables = 0;
    for (const lat of muestrasLatenciaMs) {
      if (lat <= this.T_THRESHOLD_MS) satisfechas++;
      else if (lat <= 4 * this.T_THRESHOLD_MS) tolerables++;
    }

    const apdex = (satisfechas + tolerables / 2) / total;
    const errorRate = (fallos / total) * 100;

    return {
      apdex: parseFloat(apdex.toFixed(2)),
      p50_ms: p50,
      p95_ms: p95,
      p99_ms: p99,
      error_rate_pct: parseFloat(errorRate.toFixed(2)),
      slo_cumplido: apdex >= 0.85 && p95 < 500,
    };
  }
}
```

---

### 5. Planificación y Decisiones de Diseño
- **Uso de Percentiles p95/p99 sobre el Promedio:** En integraciones con múltiples socios, la media aritmética enmascara la degradación severa sufrida por el 5% de usuarios afectados por timeouts. El percentil p95 refleja la experiencia real en el caso crítico.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart LR
    subgraph "Evaluación de Salud del Servicio (SRE Framework)"
        Req["Petición HTTP"] --> LatCheck{"Latencia vs Umbral T (200ms)"}
        LatCheck -->|Latencia <= 200ms| Sat["Satisfecho (Apdex = 1.0)"]
        LatCheck -->|200ms < Lat <= 800ms| Tol["Tolerable (Apdex = 0.5)"]
        LatCheck -->|Lat > 800ms o Error 500| Frust["Frustrado (Apdex = 0.0)"]
    end

    subgraph "Gestión de Error Budget"
        Sat --> Consumo["Consumo de Error Budget: 0%"]
        Tol --> ConsumoNormal["Consumo de Error Budget: Normal"]
        Frust --> Quema["Quema Acelerada de Presupuesto (Burn Rate)"]
    end
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Exposición de Métricas Prometheus:** El endpoint `/api/v2/telemetry/metrics` entrega métricas formateadas para graficar en Grafana:
  ```
  # HELP booking_http_duration_ms Duración de peticiones HTTP en percentiles
  # TYPE booking_http_duration_ms summary
  booking_http_duration_ms{quantile="0.5"} 42
  booking_http_duration_ms{quantile="0.95"} 185
  booking_http_duration_ms{quantile="0.99"} 410
  ```
"""

def get_week10_pages():
    return [PAGE_14, PAGE_15, PAGE_16, PAGE_17, PAGE_18]

if __name__ == '__main__':
    pages = get_week10_pages()
    print(f"Semana 10 generada: {len(pages)} páginas.")

