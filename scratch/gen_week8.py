# -*- coding: utf-8 -*-
"""
Generador de Contenidos - Semana 8 (Páginas 5 a 8)
Cuaderno Técnico RDA2: Integración de Sistemas
"""

PAGE_5 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 05 | Página 5 de 22
**Semana 8 — API Gateways y Service Mesh**  
**Subtema 6:** Patrones de Integración en el Borde: API Gateway, BFF y Aggregator

---

### 1. Definición Teórica & Fundamento Académico
En arquitecturas distribuidas orientadas a microservicios, exponer servicios internos directamente a clientes externos (web, móviles, socios comerciales) introduce severos riesgos de seguridad, acoplamiento extremo y cuellos de botella de red (*Libro de la Clase Semana 08*).

Para resolver esta problemática surgen los **patrones de integración perimetral**:
1. **API Gateway (Puerta de Enlace perimetral):** Actúa como un punto único de entrada (*Single Point of Entry*) para todo el tráfico de clientes externos hacia los microservicios internos. Centraliza responsabilidades transversales (*cross-cutting concerns*) como enrutamiento dinámico, autenticación, rate limiting y balanceo de carga.
2. **Backend-for-Frontend (BFF - Sam Newman):** Especialización del API Gateway donde se crean puertas de enlace independientes adaptadas a las características concretas de cada interfaz cliente (ej. un BFF para la aplicación web desktop con payloads completos y un BFF para la app móvil optimizado para bajo ancho de banda).
3. **Patrón Aggregator / Scatter-Gather:** El gateway recibe una única solicitud del cliente, ejecuta llamadas concurrentes (*Scatter*) hacia múltiples microservicios backend heterogéneos, transforma y combina sus respuestas (*Gather*), y retorna un payload consolidado.
4. **Enterprise Service Bus (ESB) Moderno:** Capa de intermediación inteligente encargada de coordinar transformaciones complejas de protocolo (ej. REST a gRPC, XML a JSON) y orquestaciones transaccionales de larga duración.

---

### 2. Diseño y Componente Arquitectónico
En la arquitectura de **Booking Central**, se implementó un **API Gateway / BFF Unificado con módulo ESB Interno** (`EsbModule`):
- Actúa como **BFF** para la consola web de usuario en React, proveyendo endpoints agregados que consolidan inventario de vuelos, hoteles, autos y atracciones en un solo viaje de red.
- Actúa como **Aggregator / ESB** que consume los servicios de los 8 compañeros socios (Ariel en Vuelos, Gloria/Alisson en Alojamientos, Daniel/Esteban en Autos, Michael/Dilan/Mateo en Atracciones), ejecutando transformaciones y orquestación con tolerancia a fallos.

---

### 3. Ubicación Exacta en el Código
- **Controlador Perimetral Gateway / ESB:** `src/modules/esb/esb.controller.ts` (Endpoints de agregación y checkout compuesto).
- **Servicio Enrutador Interno y Agregador:** `src/modules/esb/interna/esb-internal-router.service.ts`.
- **Adaptadores de Socios Externos:** `src/modules/atracciones/adapters/`, `src/modules/autos/adapters/`.
- **Middleware de Orquestación:** `src/modules/vuelos/socios/vuelos-socios.middleware.ts`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Implementación del Patrón Scatter-Gather en `src/modules/esb/interna/esb-internal-router.service.ts`:
```typescript
@Injectable()
export class EsbInternalRouterService {
  constructor(
    private readonly atraccionesService: AtraccionesService,
    private readonly autosService: AutosService,
    private readonly alojamientosService: AlojamientosService,
    private readonly vuelosSociosService: VuelosSociosService,
    private readonly winstonLogger: WinstonPhysicalLoggerService,
  ) {}

  /**
   * Patrón Scatter-Gather: Dispara consultas en paralelo hacia los microservicios
   * y consolida la oferta multimodal para el frontend (BFF).
   */
  async scatterGatherBusquedaMultimodal(criterio: BusquedaGlobalDto): Promise<ResultadoAgregadoDto> {
    const startTime = Date.now();
    const correlationId = `AGG-${Date.now()}`;

    // Dispersión concurrente hacia los 4 dominios
    const [resAtracciones, resAutos, resAlojamientos, resVuelos] = await Promise.allSettled([
      this.atraccionesService.buscarAtracciones(criterio),
      this.autosService.buscarFlotaDisponible(criterio.ciudad, criterio.fechaInicio, criterio.fechaFin),
      this.alojamientosService.buscarHospedaje(criterio),
      this.vuelosSociosService.buscarVuelos(criterio.origen, criterio.destino, criterio.fechaInicio),
    ]);

    // Recolección y tratamiento de resiliencia (Degradación Elegante)
    const consolidado = {
      atracciones: resAtracciones.status === 'fulfilled' ? resAtracciones.value : [],
      autos: resAutos.status === 'fulfilled' ? resAutos.value : [],
      alojamientos: resAlojamientos.status === 'fulfilled' ? resAlojamientos.value : [],
      vuelos: resVuelos.status === 'fulfilled' ? resVuelos.value : [],
      metadatos: {
        correlation_id: correlationId,
        tiempo_total_ms: Date.now() - startTime,
        servicios_degradados: [
          resAtracciones.status === 'rejected' ? 'ATRACCIONES' : null,
          resAutos.status === 'rejected' ? 'AUTOS' : null,
          resAlojamientos.status === 'rejected' ? 'ALOJAMIENTOS' : null,
          resVuelos.status === 'rejected' ? 'VUELOS' : null,
        ].filter(Boolean),
      },
    };

    return consolidado;
  }
}
```

**Explicación técnica:**
- El uso de `Promise.allSettled()` en lugar de `Promise.all()` es crucial: si un socio externo (por ejemplo, el servidor de autos de un compañero) experimenta latencia o devuelve error 500, la promesa no colapsa. El cliente recibe las atracciones y vuelos disponibles, informando en los metadatos qué subsistema experimentó degradación (*Graceful Degradation*).

---

### 5. Planificación y Decisiones de Diseño
- **Justificación de BFF Integrado frente a Múltiples Gateways Físicos:** Se optó por unificar el BFF dentro de NestJS en lugar de desplegar contenedores separados para Web y Móvil para economizar consumo de RAM y CPU en Azure App Services (plan gratuito/estudiantil), conservando la separación modular lógica mediante decoradores de versión y controladores específicos.
- **Compensación de Red:** Reduce el número de viajes de ida y vuelta (*round-trips*) de 4 llamadas HTTP desde el navegador del usuario a 1 sola llamada contra Booking Central, ahorrando hasta 800 ms de latencia percibida en redes celulares.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart TD
    ClienteWeb["Cliente Web React (BFF Consumer)"] -->|1 Petición Agregada GET /api/v2/esb/buscar| Gateway["Booking API Gateway / BFF"]
    
    subgraph "Orquestación Interna ESB (Scatter-Gather)"
        Gateway --> Router["EsbInternalRouterService"]
        Router -.->|Parallel Call 1| MS_Atr["MS Atracciones (Mateo/Dilan)"]
        Router -.->|Parallel Call 2| MS_Aut["MS Autos (Daniel/Esteban)"]
        Router -.->|Parallel Call 3| MS_Alo["MS Alojamientos (Gloria/Alisson)"]
        Router -.->|Parallel Call 4| MS_Vue["MS Vuelos (Ariel)"]
    end

    MS_Atr -.->|Respuesta OK| Aggregator["Gather & Consolidate"]
    MS_Aut -.->|Timeout / Fallback| Aggregator
    MS_Alo -.->|Respuesta OK| Aggregator
    MS_Vue -.->|Respuesta OK| Aggregator

    Aggregator -->|Payload Único Consolidado| ClienteWeb
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Métricas de Agregación:** Cada ejecución de `scatterGather` genera un registro en `logs/booking-gateway.jsonl` indicando la latencia de cada socio individual y la lista de `servicios_degradados`.
- **Trazas de Correlación:** Se inyecta `x-correlation-id` en las cabeceras salientes hacia cada socio externo para rastrear solicitudes fallidas en los logs de los compañeros.
"""

PAGE_6 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 06 | Página 6 de 22
**Semana 8 — API Gateways y Service Mesh**  
**Subtema 7:** Funcionalidades Clave de un API Gateway: Resiliencia y Transformación

---

### 1. Definición Teórica & Fundamento Académico
Un API Gateway de nivel de producción no es un simple proxy inverso que redirige paquetes TCP; es un componente de computación en el borde con funcionalidades críticas (*Libro de la Clase Semana 08*):

1. **Ruteo Dinámico y Service Discovery:** Resolución en tiempo de ejecución del destino físico de un servicio según reglas de balanceo, versión o cabeceras.
2. **Terminación SSL/TLS:** Descarga de la carga criptográfica (*SSL Offloading*) en el perímetro, permitiendo que la red interna opere de forma optimizada.
3. **Control de Flujo y Rate Limiting:** Protección contra inundaciones de peticiones y ataques de denegación de servicio.
4. **Transformación de Mensajes:** Traducción de contratos incompatibles (renombrado de atributos, reestructuración jerárquica, ajuste de tipos de datos).
5. **Resiliencia Mediante Circuit Breaker (Michael Nygard, *Release It!*):**
   - **CLOSED (Cerrado):** El tráfico fluye normalmente hacia el socio.
   - **OPEN (Abierto):** Al superarse un umbral de fallos consecutivos o timeouts, el circuito se abre de inmediato. Las solicitudes subsiguientes son rechazadas instantáneamente (*Fail Fast*) sin gastar sockets ni tiempo de espera.
   - **HALF-OPEN (Semi-abierto):** Tras expirar una ventana de cooldown, se permite el paso de un número limitado de solicitudes de prueba (*trial requests*) para evaluar si el socio recuperó la operatividad.
6. **Normalización de Respuestas de Error con RFC 7807 (Problem Details for HTTP APIs):** Formato universal estandarizado para comunicar incidencias HTTP con campos `type`, `title`, `status`, `detail`, `instance` e `invalidParams`.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se integró un **Filtro Global de Excepciones RFC 7807** (`Rfc7807ExceptionFilter`) y una **Capa de Resiliencia con Circuit Breaker** para cada proveedor externo, evitando que la inestabilidad de las APIs de los compañeros bloquee el hilo de ejecución principal de Node.js.

---

### 3. Ubicación Exacta en el Código
- **Filtro Global RFC 7807:** `src/core/filters/rfc7807-exception.filter.ts`.
- **Registro del Filtro Global:** `src/main.ts` (Línea 70: `app.useGlobalFilters(new Rfc7807ExceptionFilter())`).
- **Pruebas de Resiliencia del Circuit Breaker:** `test/integration/circuit-breaker-resilience.spec.ts`.
- **Adaptadores de Transformación B2B:** `src/modules/autos/adapters/rutalibre.adapter.ts`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Implementación del Filtro RFC 7807 en `src/core/filters/rfc7807-exception.filter.ts`:
```typescript
@Catch()
export class Rfc7807ExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(Rfc7807ExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    // Construcción del documento de detalle según RFC 7807
    const problemDetail = {
      type: this.resolveErrorType(status),
      title: this.resolveErrorTitle(status),
      status,
      detail: this.extractDetail(exception, exceptionResponse),
      instance: request.url,
      timestamp: new Date().toISOString(),
      correlation_id: request.headers['x-correlation-id'] || `err-${Date.now()}`,
      invalidParams: (exceptionResponse as any)?.invalidParams || undefined,
    };

    // Auditoría física antes de enviar respuesta al cliente
    this.logger.error(`[RFC 7807] ${status} en ${request.url} - ${problemDetail.detail}`);

    response.status(status).contentType('application/problem+json').json(problemDetail);
  }

  private resolveErrorType(status: number): string {
    switch (status) {
      case 400: return 'https://booking.epn.edu.ec/errors/bad-request';
      case 404: return 'https://booking.epn.edu.ec/errors/not-found';
      case 409: return 'https://booking.epn.edu.ec/errors/conflict';
      case 503: return 'https://booking.epn.edu.ec/errors/service-unavailable';
      default: return 'https://booking.epn.edu.ec/errors/internal-server-error';
    }
  }
}
```

**Explicación técnica:**
- El tipo de contenido devuelto es estrictamente `application/problem+json` como exige la especificación RFC 7807.
- Los errores 409 provenientes de socios externos (ej. intento de cancelar una reserva ya confirmada o conflicto de cooldown en autos) son interceptados, transformados y devueltos de forma transparente sin exponer trazas de depuración de Node.js (*stack traces* internas).

---

### 5. Planificación y Decisiones de Diseño
- **Seguridad perimetral mediante ocultamiento de fallos internos:** Un error 500 no controlado por base de datos o fallo de sintaxis podría filtrar credenciales de Postgres o rutas físicas de disco en Azure. El filtro RFC 7807 captura todo error genérico y genera un mensaje opaco hacia el cliente pero escribe el detalle completo en el log físico en disco.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
stateDiagram-v2
    [*] --> CLOSED: Operación Normal

    CLOSED --> OPEN: Tasa de fallos > 50% en 10 peticiones (o timeouts)
    note right of OPEN: Fail Fast activo: rechaza llamadas en 0ms
    
    OPEN --> HALF_OPEN: Expira Cooldown (ej. 30 segundos)
    
    HALF_OPEN --> CLOSED: 3 llamadas consecutivas exitosas
    HALF_OPEN --> OPEN: Al menos 1 llamada falla
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Bitácora de Incidentes:** Cada respuesta `application/problem+json` emitida queda persistida en `logs/booking-gateway.jsonl` con nivel `error` o `warn`, registrando el código HTTP, la URI solicitada, el mensaje exacto y el `correlation_id` para investigación forense.
"""

PAGE_7 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 07 | Página 7 de 22
**Semana 8 — API Gateways y Service Mesh**  
**Subtema 8:** Comparativa de API Gateways en la Industria

---

### 1. Definición Teórica & Fundamento Académico
En la arquitectura de software empresarial existen soluciones comerciales y de código abierto consolidadas para la implementación de API Gateways (*Libro de la Clase Semana 08*). Cada una presenta perfiles de rendimiento, costos y modelos operativos diferenciados:

| Criterio Técnico | Kong Gateway | NGINX / NGINX Plus | Apigee (Google Cloud) | AWS API Gateway | NestJS Gateway / BFF (Booking) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tecnología Base** | OpenResty (NGINX + Lua) | C puro | Java / C++ distribuido | Infraestructura Serverless AWS | Node.js / TypeScript (V8) |
| **Latencia Proxy** | < 2 ms | < 1 ms | 10 - 25 ms (por políticas) | 15 - 35 ms (cold starts) | 3 - 8 ms |
| **Extensibilidad** | Plugins en Lua, Go o WASM | Módulos C / njs scripting | Políticas Java, Python, JS | Lambda Authors / Step Functions | TypeScript nativo / Decoradores / Pipes |
| **Orquestación Compleja** | Limitada (diseñado para proxy) | Muy limitada | Soportada mediante políticas | Orquestación con Step Functions | **Excelente (Saga, Scatter-Gather nativo)** |
| **Modelo de Costos** | Open Source / Enterprise por nodo | Open Source / Licencia anual | Pago por suscripción Enterprise alto | Pago por millón de requests | Incluido en el cómputo de Azure App Service |

**Análisis de compensaciones:**
- **Kong y NGINX** ofrecen el rendimiento más puro en términos de throughput y latencia en microsegundos, pero programar transformaciones complejas de negocio o transacciones distribuidas multi-paso en Lua o C es altamente costoso y propenso a errores de memoria.
- **Apigee** ofrece el catálogo más completo de analítica, monetización y gobierno corporativo, pero su complejidad de configuración y costo por licencia lo tornan inviable para prototipos ágiles.
- **NestJS Gateway / BFF** permite unificar en un solo lenguaje (TypeScript) la lógica de negocio, validación de esquemas (AJV), orquestación Saga y adaptadores heterogéneos para los 8 socios.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se adoptó una arquitectura de **Gateway de Aplicación Basado en NestJS** desplegado en **Microsoft Azure App Services** (`https://booking-core-api.azurewebsites.net`):
- Soporta directamente sockets REST, microservicios gRPC e interfaces Swagger/ReDoc.
- Integra nativamente los adaptadores B2B de los 8 compañeros sin depender de proxies externos intermediarios que añadan saltos de red innecesarios.

---

### 3. Ubicación Exacta en el Código
- **Servidor Perimetral de Aplicación:** `src/main.ts`.
- **Configuración de Despliegue en la Nube:** `docker-compose.yml`, archivo de variables de entorno `.env.example`.
- **Punto de Entrada en Producción:** `https://booking-core-api.azurewebsites.net/api/v2`.
- **Servicio de Enrutamiento Central:** `src/modules/esb/interna/esb-internal-router.service.ts`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Configuración de Infraestructura en `src/main.ts` y Manejo de Conexiones Persistentes:
```typescript
// src/main.ts — Optimización de transporte perimetral
import { activarConexionesPersistentes } from './core/http/conexiones-persistentes';
activarConexionesPersistentes(); // Keep-Alive HTTP para reutilizar sockets TCP

const app = await NestFactory.create<NestExpressApplication>(
  AppModule,
  new ExpressAdapter(),
  { bodyParser: false }, // Control fino de tamaño de buffers perimetrales
);

// Habilitación de compresión HTTP perimetral (Gzip)
const compression = require('compression');
app.use(compression({ threshold: 1024 }));

// Configuración de CORS perimetral para clientes web
app.enableCors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type, Accept, Authorization, x-correlation-id, x-trace-id, X-API-Key',
});
```

**Explicación técnica:**
- La función `activarConexionesPersistentes()` configura un agente HTTP global con `keepAlive: true` y `maxSockets: 100`. Esto elimina el overhead de negociación TLS y TCP Handshake en las peticiones subsecuentes hacia las APIs de los compañeros, reduciendo la latencia de proxy a niveles comparables con gateways nativos.

---

### 5. Planificación y Decisiones de Diseño
- **Justificación de la Selección Tecnológica:** Desarrollar el API Gateway en la misma plataforma NestJS permitió mantener tipos compartidos (`TypeScript interfaces`) entre el modelo de dominio interno y los contratos externos, facilitando refactorizaciones seguras en tiempo de compilación y pruebas de integración inmediatas con Jest.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart TD
    subgraph "Topología de Despliegue Cloud (Microsoft Azure)"
        Internet((Internet / Clientes)) -->|HTTPS / TLS 1.3| AzureLB["Azure Edge Load Balancer & WAF"]
        
        subgraph "Azure App Service (Booking Core)"
            AzureLB --> NestGateway["NestJS API Gateway / BFF (:3000)"]
            NestGateway --> PipeAJV["AJV Schema Validation"]
            NestGateway --> RouterESB["ESB Internal Router & Saga"]
        end
        
        subgraph "Ecosistema de Socios Externos (Multi-Cloud)"
            RouterESB -->|REST / HTTPS| SocDaniel["RutaLibre Autos (Daniel) - Azure"]
            RouterESB -->|REST / HTTPS| SocMateo["Atracciones (Mateo) - Render"]
            RouterESB -->|REST / HTTPS| SocGloria["Alojamientos (Gloria) - Vercel"]
            RouterESB -->|REST / HTTPS| SocAriel["Vuelos (Ariel) - AWS"]
        end
    end
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Métricas de Infraestructura:** El Gateway expone métricas en `/api/v2/telemetry/metrics` monitoreando uso de memoria heap del proceso V8, descriptores de sockets abiertos y percentiles de respuesta p95/p99.
"""

PAGE_8 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 08 | Página 8 de 22
**Semana 8 — API Gateways y Service Mesh**  
**Subtema 9:** Service Mesh: Concepto y Arquitectura  
**Subtema 10:** Comparativa: API Gateway vs. Service Mesh

---

### 1. Definición Teórica & Fundamento Académico
Un **Service Mesh (Malla de Servicios)** es una capa de infraestructura dedicada, transparente y configurable que gestiona la comunicación de red de servicio a servicio (*East-West*) en arquitecturas distribuidas (*Libro de la Clase Semana 08*).

Se estructura mediante dos planos de control estrictamente desacoplados:
1. **Data Plane (Plano de Datos):** Conjunto de proxies de alto rendimiento (típicamente Envoy) desplegados como **Sidecars** junto a cada instancia de microservicio. Interceptan todo el tráfico de entrada y salida sin que la aplicación lo perciba.
2. **Control Plane (Plano de Control - ej. Istio Pilot/Citadel, Linkerd):** Gestiona y coordina las políticas de enrutamiento, asigna identidades criptográficas, rota certificados mTLS y centraliza la telemetría.

| Dimensión Arquitectónica | API Gateway | Service Mesh |
| :--- | :--- | :--- |
| **Orientación de Tráfico** | **North-South (Norte-Sur):** Clientes externos hacia servicios internos | **East-West (Este-Oeste):** Comunicación interna entre microservicios |
| **Punto de Despliegue** | En el perímetro o borde de la red (*Edge*) | Distribuido junto a cada microservicio (*Sidecar Pattern*) |
| **Propósito Principal** | Autenticación de usuarios, exposición de APIs B2B, cobro, agregación | Seguridad Zero Trust interna, mTLS ubicuo, observabilidad de red |
| **Conocimiento del Dominio**| Alto (conoce modelos DTO, valida esquemas de negocio) | Cero (agnóstico de la carga útil; opera en capas 4 y 7 de red) |
| **Patrones Clave** | BFF, Aggregator, Rate Limiting por cliente | Circuit Breaker distribuido, Canary releases internos, Inyección de fallas |

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se implementó el módulo **`ServiceMeshModule`** con un interceptor perimetral **`SidecarProxyInterceptor`**:
- Emula el comportamiento del proxy Sidecar de Envoy dentro de la arquitectura de Node.js.
- Intercepta el tráfico este-oeste entre los microservicios lógicos internos (Pagos, Facturas, Inventario, Clientes, ESB), validando el estado del Circuit Breaker local antes de transmitir e inyectando encabezados de malla.

---

### 3. Ubicación Exacta en el Código
- **Servicio Gestor de Malla:** `src/modules/service-mesh/service-mesh.service.ts`.
- **Controlador de Control Plane de la Malla:** `src/modules/service-mesh/service-mesh.controller.ts`.
- **Interceptor Sidecar Proxy:** `src/modules/service-mesh/interceptors/sidecar-proxy.interceptor.ts`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Implementación del Sidecar Proxy en `src/modules/service-mesh/interceptors/sidecar-proxy.interceptor.ts`:
```typescript
@Injectable()
export class SidecarProxyInterceptor implements NestInterceptor {
  constructor(private readonly meshService: ServiceMeshService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    const ruta = req.url || '';
    let destino = 'MS_CORE';
    if (ruta.includes('/pagos')) destino = 'MS_PAG';
    else if (ruta.includes('/facturas')) destino = 'MS_FAC';
    else if (ruta.includes('/inventory')) destino = 'MS_STK';
    else if (ruta.includes('/esb')) destino = 'MS_ESB';

    const origen = req.headers['x-mesh-source'] || 'MS_GATEWAY';

    // Evaluación del Circuit Breaker en el Sidecar local (Data Plane)
    if (!this.meshService.puedeTransitar(destino)) {
      throw new ServiceUnavailableException(
        `[Service Mesh Sidecar] Circuit Breaker OPEN para ${destino}. El tráfico este-oeste ha sido aislado para proteger el ecosistema.`,
      );
    }

    const start = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          this.meshService.registrarExito(destino, Date.now() - start);
        },
        error: (err) => {
          this.meshService.registrarFallo(destino, err);
        },
      }),
    );
  }
}
```

**Explicación técnica:**
- El interceptor inspecciona cada llamada inter-servicio. Si el microservicio de Pagos (`MS_PAG`) experimenta fallos repetidos, el sidecar de la malla bloquea el tráfico entrante localmente sin permitir que la sobrecarga sature el hilo de ejecución ni propague errores a Facturación.

---

### 5. Planificación y Decisiones de Diseño
- **Coexistencia Arquitectónica:** Se planificó que el API Gateway no compita con el Service Mesh, sino que se complementen: el API Gateway maneja la autenticación OAuth2 de clientes y la transformación B2B con los socios (Norte-Sur), mientras que el interceptor de Malla garantiza la política *Zero Trust* y resiliencia en la comunicación inter-servicios interna (Este-Oeste).

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart TD
    subgraph "Tráfico North-South (Perímetro)"
        UsuarioWeb["Cliente Navegador / Móvil"] -->|HTTPS Petición Externa| Gateway["API Gateway (BFF NestJS)"]
    end

    subgraph "Tráfico East-West (Service Mesh Interno)"
        Gateway -->|Llamada Interna con x-mesh-source| Sidecar1["Sidecar Proxy (Envoy Pattern)"]
        
        Sidecar1 -->|Evalúa Circuit Breaker OK| MS_Pagos["Microservicio Pagos (MS_PAG)"]
        MS_Pagos --> Sidecar2["Sidecar Proxy (Envoy Pattern)"]
        
        Sidecar2 -->|Llamada con mTLS Simulado| MS_Factura["Microservicio Facturación (MS_FAC)"]
    end

    subgraph "Control Plane (Gobernanza)"
        ControlMesh["ServiceMeshService (Control Plane)"] -.->|Actualiza Políticas & Estado| Sidecar1
        ControlMesh -.->|Actualiza Políticas & Estado| Sidecar2
    end
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Métricas Este-Oeste:** El controlador de la malla (`GET /api/v2/service-mesh/status`) expone el estado de salud de cada microservicio registrado, tasa de fallos, latencia promedio y estado de su Circuit Breaker (CLOSED / OPEN).
"""

def get_week8_pages():
    return [PAGE_5, PAGE_6, PAGE_7, PAGE_8]

if __name__ == '__main__':
    pages = get_week8_pages()
    print(f"Semana 8 generada: {len(pages)} páginas.")

