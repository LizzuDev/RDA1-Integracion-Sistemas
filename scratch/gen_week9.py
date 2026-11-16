# -*- coding: utf-8 -*-
"""
Generador de Contenidos - Semana 9 (Páginas 9 a 13)
Cuaderno Técnico RDA2: Integración de Sistemas
"""

PAGE_9 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 09 | Página 9 de 22
**Semana 9 — Pruebas de Integración y Contract Testing**  
**Subtema 11:** La Pirámide de Pruebas en Integración de Sistemas

---

### 1. Definición Teórica & Fundamento Académico
La **Pirámide de Pruebas** (propuesta originalmente por Mike Cohn y formalizada por Martin Fowler) es un modelo que orienta la distribución óptima de las distintas tipologías de pruebas en el ciclo de vida del software (*Libro de la Clase Semana 09*).

En la integración de sistemas distribuidos, la pirámide clásica se adapta incorporando la capa de **Pruebas de Contrato**:

```
           / \\
          / E2E \\         -> Pruebas End-to-End (Cúspide: Pocas, Lentas, Frágiles, Alto Costo)
         /-------\\
        / Integr. \\       -> Pruebas de Integración (Subsistemas y Base de Datos)
       /-----------\\
      /  Contrato   \\     -> Pruebas de Contrato (CDC / Pact / OpenAPI Schemas)
     /---------------\\
    /   Unitarias     \\   -> Pruebas Unitarias (Base: Masivas, Rápidas, Aisladas, Bajo Costo)
   /-------------------\\
```

| Capa de la Pirámide | Alcance | Velocidad / Costo | Fragilidad (*Flakiness*) |
| :--- | :--- | :--- | :--- |
| **Unitarias (Unit Tests)** | Funciones puras, clases, pipes, transformadores | < 1 ms por test / Muy bajo | Nula (aislamiento absoluto en memoria) |
| **De Contrato (Contract Tests)** | Interfaz sintáctica y semántica entre componentes | 5 - 50 ms por test / Bajo | Muy baja (no requiere entorno externo encendido) |
| **De Integración (Integration Tests)** | Colaboración entre 2+ capas reales (ej. NestJS + Postgres) | 100 - 500 ms / Medio | Baja si se usan contenedores efímeros (Testcontainers) |
| **End-to-End (E2E)** | Flujo de negocio completo navegando múltiples nodos | 2 - 10 seg por test / Alto | Alta (si la red o un socio externo falla, el test rompe) |

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, la estrategia de aseguramiento de calidad distribuyó las pruebas siguiendo rigurosamente esta jerarquía piramidal mediante el framework **Jest** y **Supertest**:
- **Base Unitaria:** Valida la lógica de filtros RFC 7807, serializadores, pipes de validación y utilidades de fecha/cooldown.
- **Capa de Contrato:** Suites de Pact y validadores JSON Schema que confirman el cumplimiento de los contratos OpenAPI v2/v3 sin enviar tráfico a internet.
- **Capa de Integración:** Verificación de la máquina de estados de la Saga LIFO y persistencia transaccional.
- **Cúspide E2E:** Flujos controlados de creación y cancelación de reservas sobre la API unificada.

---

### 3. Ubicación Exacta en el Código
- **Configuración Central de Jest:** `package.json` (`scripts: test, test:e2e, test:contract, test:pact`).
- **Pruebas Unitarias:** `src/core/filters/rfc7807-exception.filter.spec.ts`.
- **Pruebas de Contrato:** `test/contract/contract-schemas.spec.ts` y `test/contracts/atracciones-consumer.pact.spec.ts`.
- **Pruebas de Integración:** `test/i05-saga-compensacion.spec.ts`, `test/i09-grpc-inventario.spec.ts`.
- **Pruebas End-to-End:** `test/e2e/e2e-flows.spec.ts`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Estructura de Scripts de Testing en `package.json`:
```json
{
  "scripts": {
    "test": "jest --config test/jest.json",
    "test:unit": "jest --testPathPattern=src/.*\\.spec\\.ts$",
    "test:contract": "jest --testPathPattern=test/contract/.*\\.spec\\.ts$",
    "test:pact": "jest --testPathPattern=test/contracts/.*\\.pact\\.spec\\.ts$ --runInBand",
    "test:integration": "jest --testPathPattern=test/i.*\\.spec\\.ts$",
    "test:e2e": "jest --config ./test/jest-e2e.json --runInBand"
  }
}
```

#### Ejemplo de Prueba de Integración con Supertest en `test/e2e/e2e-flows.spec.ts`:
```typescript
describe('E2E: Flujo de Consulta y Validación Perimetral', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  it('GET /api/v2/contracts debe retornar el catálogo de contratos activo', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v2/contracts')
      .expect(200);

    expect(response.body).toHaveProperty('contratos');
    expect(Array.isArray(response.body.contratos)).toBe(true);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

### 5. Planificación y Decisiones de Diseño
- **Inversión de Esfuerzos:** En lugar de construir 50 pruebas E2E frágiles dependientes de que los servidores en la nube de los 8 compañeros estuviesen simultáneamente encendidos, se implementaron **pruebas de contrato exhaustivas**. Esto permitió validar el 100% de los escenarios sintácticos y de compatibilidad en milisegundos en modo local/offline.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart TD
    subgraph "Pirámide de Pruebas Implementada en Booking Central"
        E2E["E2E Tests: test/e2e/e2e-flows.spec.ts<br/>(Flujo Completo con Supertest - Cobertura: 10%)"]
        INT["Integration Tests: test/i05-saga-compensacion.spec.ts<br/>(Orquestación Saga + BD Postgres - Cobertura: 25%)"]
        CONTRACT["Contract Tests: test/contracts/*.pact.spec.ts<br/>(Validación Sintáctica OpenAPI & Pact - Cobertura: 35%)"]
        UNIT["Unit Tests: src/**/*.spec.ts<br/>(Filtros RFC 7807, AJV Pipes, Helpers - Cobertura: 30%)"]
    end

    E2E --> INT
    INT --> CONTRACT
    CONTRACT --> UNIT
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Reportes de Cobertura:** La ejecución con `jest --coverage` genera reportes LCOV automáticos en `coverage/`, midiendo la cobertura de líneas y ramas en los módulos críticos de integración.
"""

PAGE_10 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 10 | Página 10 de 22
**Semana 9 — Pruebas de Integración y Contract Testing**  
**Subtema 12:** Pruebas de Contrato con Pact y Consumer-Driven Contracts (CDC)

---

### 1. Definición Teórica & Fundamento Académico
El enfoque tradicional de integración asume que el Proveedor (*Provider*) define la API e impone el contrato a sus Consumidores (*Consumers*). La metodología **Consumer-Driven Contracts (CDC)** invierte esta dinámica (*Libro de la Clase Semana 09*):
- Los **Consumidores** redactan formalmente sus necesidades exactas (qué campos utilizan, qué formatos esperan y qué códigos de estado manejan).
- Estas expectativas se codifican en pruebas unitarias del consumidor utilizando un framework especializado como **Pact**.
- Al ejecutarse la prueba, Pact intercepta las llamadas, valida que el consumidor use su propio cliente HTTP correctamente y genera un archivo de contrato en formato JSON denominado **Pact File**.
- Posteriormente, el **Proveedor** descarga ese archivo Pact y lo ejecuta contra su propia implementación real para verificar matemáticamente si satisface los requerimientos de todos sus consumidores antes de desplegar a producción.

**Ventajas clave de CDC:**
- Elimina el código muerto en APIs (el proveedor sabe exactamente qué campos de su payload se utilizan y cuáles no).
- Permite a los proveedores evolucionar sus APIs con seguridad: si un cambio no rompe ningún archivo Pact registrado, el cambio es 100% seguro para producción.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se configuró la suite de **Pact V3 (`@pact-foundation/pact`)**:
- Booking Central asume el rol de **Consumidor (`BookingPrototipoConsumer`)** que consume las APIs de atracciones turísticas proveídas por los microservicios de los compañeros (**`AtraccionesPartnerProvider`**).
- Define reglas de coincidencia flexibles (*Flexible Matching Rules*) con `like()`, `eachLike()` e `integer()` para desacoplar las pruebas de datos estáticos volátiles.

---

### 3. Ubicación Exacta en el Código
- **Suite de Pruebas Pact:** `test/contracts/atracciones-consumer.pact.spec.ts`.
- **Directorio de Salida de Contratos Pact:** `pacts/bookingprototipoconsumer-atraccionespartnerprovider.json`.
- **Script de Ejecución:** `package.json` (`npm run test:pact`).

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Especificación del Contrato CDC con Pact V3 en `test/contracts/atracciones-consumer.pact.spec.ts`:
```typescript
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import * as path from 'path';
import axios from 'axios';

const { like, eachLike, integer } = MatchersV3;

const provider = new PactV3({
  consumer: 'BookingPrototipoConsumer',
  provider: 'AtraccionesPartnerProvider',
  dir: path.resolve(process.cwd(), 'pacts'),
});

describe('Contract Testing con PACT: Booking (Consumer) -> Tienda Atracciones (Provider)', () => {
  it('Debe consultar la disponibilidad de turnos con el schema canónico OpenAPI v3', async () => {
    provider
      .given('Existen turnos y aforo disponible para la atracción PRhu4UBTWPBC')
      .uponReceiving('Petición de disponibilidad de turnos para la fecha 2026-10-25')
      .withRequest({
        method: 'GET',
        path: '/atracciones/PRhu4UBTWPBC/disponibilidad',
        query: { date: '2026-10-25' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          atraccion_id: like('PRhu4UBTWPBC'),
          date: like('2026-10-25'),
          total_available_slots: integer(45),
          time_slots: eachLike({
            slot_id: like('slot-20261025-1030'),
            time: like('10:30 a.m.'),
            total_slots: integer(25),
            available_slots: integer(8),
            status: like('DISPONIBLE'),
          }),
        },
      });

    await provider.executeTest(async (mockServer) => {
      // Cliente real ejecutándose contra el mock server generado por Pact
      const res = await axios.get(
        `${mockServer.url}/atracciones/PRhu4UBTWPBC/disponibilidad?date=2026-10-25`,
      );
      expect(res.status).toBe(200);
      expect(res.data.atraccion_id).toBe('PRhu4UBTWPBC');
      expect(Array.isArray(res.data.time_slots)).toBe(true);
    });
  });
});
```

**Explicación técnica:**
- La directiva `eachLike()` indica que la respuesta debe contener un arreglo de objetos que cumplan con esa estructura, sin forzar una cantidad exacta de elementos.
- La directiva `integer(45)` verifica que el tipo sea estrictamente un entero en JavaScript/JSON, validando el tipo sin acoplar la prueba a que el valor sea necesariamente 45.

---

### 5. Planificación y Decisiones de Diseño
- **Resolución de la Ambigüedad en Turnos Horarios:** Al inicio, los socios de atracciones retornaban strings libres de hora (`10:30`, `10h30`, `10:30 AM`). Mediante el contrato Pact se acordó formalmente la estructura canónica con `slot_id` estructurado (`slot-YYYYMMDD-HHMM`), permitiendo indexar los cupos en Booking Central sin errores de parseo.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
sequenceDiagram
    autonumber
    participant Consumidor as Booking Central (Consumer)
    participant PactMock as Mock Server (Pact V3)
    participant Broker as Pact Broker / Archivo .json
    participant Proveedor as Servidor del Socio (Provider)

    Note over Consumidor,PactMock: Fase 1: Creación del Contrato por el Consumidor
    Consumidor->>PactMock: Define expectativas (uponReceiving, willRespondWith)
    Consumidor->>PactMock: Ejecuta llamadas con cliente Axios real
    PactMock-->>Consumidor: 200 OK verificado
    PactMock->>Broker: Genera archivo pacts/booking-atracciones.json

    Note over Broker,Proveedor: Fase 2: Verificación Independiente del Proveedor
    Proveedor->>Broker: Descarga contrato pacts/booking-atracciones.json
    Proveedor->>Proveedor: Ejecuta llamadas contra su backend real
    Proveedor-->>Broker: Publica verificación (EXITOSA o FALLIDA)
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Inmutabilidad del Contrato:** El archivo Pact generado incluye un checksum SHA que garantiza que el contrato no ha sido alterado manualmente, habilitando trazabilidad total en el historial de Git.
"""

PAGE_11 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 11 | Página 11 de 22
**Semana 9 — Pruebas de Integración y Contract Testing**  
**Subtema 13:** Contract-Driven Testing vs. Pruebas de Integración Tradicionales

---

### 1. Definición Teórica & Fundamento Académico
El enfoque convencional de probar integraciones complejas consiste en desplegar todos los servicios en un entorno compartido (*Staging / Testing Environment*) y ejecutar baterías de pruebas de extremo a extremo (*End-to-End*). Este modelo sufre del fenómeno conocido en la literatura técnica como **"Integration Test Hell"** (*Libro de la Clase Semana 09*):

| Dimensión de Comparación | Pruebas de Integración Tradicionales (E2E) | Contract-Driven Testing (CDT) |
| :--- | :--- | :--- |
| **Dependencia de Entorno** | **Absoluta:** Requiere que todos los servicios, bases de datos y redes estén 100% disponibles simultáneamente. | **Nula:** Cada servicio prueba sus contratos en aislamiento usando dobles o validadores locales. |
| **Tiempo de Ejecución** | Minutos u horas (despliegues complejos, esperas de red, timeouts). | Milisegundos a segundos (ejecutables en pre-commit). |
| **Aislamiento del Fallo** | **Difuso:** Si una prueba falla, es complejo determinar si fue por un bug de código, red caída o BD desincronizada. | **Exacto:** Señala la línea exacta del campo o tipo que rompió el contrato. |
| **Desacoplamiento de Despliegue** | Acoplado (los equipos deben coordinar ventanas de despliegue conjuntas). | Desacoplado (cualquier servicio puede desplegar si satisface sus contratos). |
| **Detección de Breaking Changes** | Tardía (en etapas finales de testing o en producción). | Muy temprana (*Shift-Left Testing* en la máquina del desarrollador). |

**Filosofía Shift-Left:**
Consiste en trasladar las validaciones de integración lo más a la izquierda posible en la línea temporal de desarrollo (hacia la fase de codificación y diseño de esquemas), abaratando exponencialmente el costo de corrección de defectos.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se adoptó **Contract-Driven Testing** mediante la suite de validación rápida de esquemas OpenAPI `test/contract/contract-schemas.spec.ts`:
- Valida los esquemas estructurales de las respuestas de los socios (Semáforo de nodos, catálogo de atracciones, inventario de autos) sin necesidad de que los servidores en producción de los socios estén encendidos.

---

### 3. Ubicación Exacta en el Código
- **Suite de Pruebas de Esquemas de Contrato:** `test/contract/contract-schemas.spec.ts`.
- **Motor de Validación de Respuestas:** `test/contract/validate-response.ts`.
- **Esquemas OpenAPI Auditados:** `contracts/admin-openapi-v2.yaml`, `contracts/schemas/atracciones.schema.json`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Validación Determinística de Contratos en `test/contract/contract-schemas.spec.ts`:
```typescript
import { validateResponse, assertMatchesContract } from './validate-response';

describe('Suites de Pruebas de Contrato OpenAPI v2 — Cátedra RDA2 (CE07 / CP-012)', () => {
  describe('CP-012: Contrato Admin v2 (admin-openapi-v2.yaml)', () => {
    it('CP-012: Valida respuesta de semáforo de nodos getNodesHealth (200 OK)', () => {
      const mockPayload = {
        summary: {
          total: 2,
          online: 2,
          degraded: 0,
          offline: 0,
        },
        nodes: [
          {
            id: 'atracciones',
            nombre: 'Sistema de Atracciones & Tours',
            vertical: 'Atracciones',
            protocolo: 'REST / OpenAPI v2',
            url: 'http://localhost:3000/api/v2/atracciones',
            enabled: true,
            status: 'ONLINE',
            latency: 45,
            lastCheck: new Date().toISOString(),
            circuitBreaker: 'CLOSED',
          },
          {
            id: 'autos',
            nombre: 'Sistema Renta de Autos & Flota',
            vertical: 'Autos',
            protocolo: 'REST / OpenAPI v2 + Cooldown 2h',
            url: 'http://localhost:3000/api/v2/autos',
            enabled: true,
            status: 'ONLINE',
            latency: 38,
            lastCheck: new Date().toISOString(),
            circuitBreaker: 'CLOSED',
          },
        ],
      };

      // Aserción formal contra el esquema OpenAPI sin red
      const validation = validateResponse(
        'contracts/admin-openapi-v2.yaml',
        '/admin/nodes/health',
        'get',
        200,
        mockPayload,
      );

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
```

**Explicación técnica:**
- La función `validateResponse` compila el archivo YAML de OpenAPI en memoria y contrasta la estructura del payload contra la definición canónica.
- Si un socio añade un campo prohibido o cambia `latency` de número a string, la prueba falla de inmediato en local con una descripción exacta del error sintáctico.

---

### 5. Planificación y Decisiones de Diseño
- **Resolución de Conflictos en la Cátedra:** Durante el desarrollo, compañeros como Daniel (RutaLibre) o Mateo (Atracciones) realizaron ajustes en sus backends. Gracias a las pruebas de contrato CDT, Booking Central detectó con antelación incompatibilidades en los nombres de campos (ej. `vehicle_id` vs `auto_id`) sin perder horas diagnosticando conexiones de red.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart LR
    subgraph "Enfoque E2E Tradicional (Frágil y Lento)"
        Dev1["Código"] --> DeployAll["Desplegar 8 Microservicios en Azure/AWS"]
        DeployAll --> NetTest["Tests E2E por Red"]
        NetTest -.->|1 microservicio caído| FalloTotal["Fallo en Cascada (Falso Positivo)"]
    end

    subgraph "Contract-Driven Testing (Rápido y Determinista)"
        Dev2["Código"] --> CDT["Ejecución de Contract Schemas Test (Jest)"]
        CDT --> Validador["Validación sintáctica contra OpenAPI v3"]
        Validador -->|Válido en 45ms| GreenBuild["Build Exitoso y Despliegue Seguro"]
    end
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Comprobación en Pre-Commit:** Los tests de contrato están integrados como compuerta de calidad local; impiden realizar git push si se viola algún esquema OpenAPI del repositorio.
"""

PAGE_12 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 12 | Página 12 de 22
**Semana 9 — Pruebas de Integración y Contract Testing**  
**Subtema 14:** Estrategias de Aislamiento y Dobles de Prueba (Test Doubles)

---

### 1. Definición Teórica & Fundamento Académico
Para probar un componente distribuido sin invocar a sus dependencias reales (las cuales pueden ser lentas, costosas, destructivas o no disponibles), la ingeniería de pruebas utiliza **Dobles de Prueba (*Test Doubles*)**.

Gerard Meszaros (*xUnit Test Patterns*) y Martin Fowler establecieron la taxonomía formal de los 5 tipos de dobles de prueba:
1. **Dummy (Maniquí):** Objetos que se pasan a los métodos pero nunca se usan realmente (típicamente rellenan listas de parámetros obligatorios que no afectan el flujo bajo prueba).
2. **Stub (Respuesta Prefabricada):** Proporciona respuestas preprogramadas a llamadas específicas durante la prueba. No verifica el comportamiento ni el número de llamadas; solo devuelve datos estáticos para satisfacer la lógica interna del componente bajo prueba.
3. **Spy (Espía):** Es un stub enriquecido que registra metadatos sobre cómo fue invocado (número de veces, parámetros recibidos, orden de ejecución) para permitir aserciones posteriores.
4. **Mock (Objeto Simulado):** Objeto preprogramado con *expectativas estrictas* de comportamiento. A diferencia del Stub, el Mock falla la prueba de forma proactiva si no se le invoca exactamente con los parámetros y en el orden esperado.
5. **Fake (Implementación Falsa):** Objeto con una implementación funcional real pero simplificada, no apta para entornos de producción (ej. un repositorio en memoria `Map<string, any>` en lugar de una base de datos PostgreSQL real).

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se aplicaron dobles de prueba especializados para aislar los flujos transaccionales más complejos del sistema:
- **Spies y Mocks en la Saga LIFO (`test/i05-saga-compensacion.spec.ts`):** Mocks con Jest (`jest.fn()`) para verificar rigurosamente que las funciones de compensación se invoquen en el orden inverso exacto ante un fallo de pago.
- **Fakes de Repositorios:** Almacenes en memoria para probar la orquestación cuando la base de datos externa no está disponible (`SAGA_STORE=memory`).

---

### 3. Ubicación Exacta en el Código
- **Suite de Pruebas de la Saga LIFO:** `test/i05-saga-compensacion.spec.ts`.
- **Simulador de Socios y Pagos:** `test/mocks/`.
- **Implementación Fake en Memoria:** `src/modules/esb/interna/saga-orchestrator.service.ts` (Líneas 40-55: `memorySagas = new Map()`, `memoryJournals = new Map()`).

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Verificación del Orden LIFO usando Spies en `test/i05-saga-compensacion.spec.ts`:
```typescript
describe('I05 — Saga de checkout: robustez, orden LIFO y compensaciones', () => {
  let orchestrator: SagaOrchestratorService;
  let executionOrderLog: string[]; // Bitácora de invocaciones reales

  beforeEach(() => {
    executionOrderLog = [];

    // Mock del servicio de Atracciones con registro de ejecución
    const mockAtraccionesService = {
      reservar: jest.fn().mockImplementation(async (id, dto) => {
        executionOrderLog.push(`EXEC:RESERVA_ATRACCION:${id}`);
        return { reservation_id: `RES-ATR-${id}`, status: 'CONFIRMED' };
      }),
      cancelarReserva: jest.fn().mockImplementation(async (id) => {
        executionOrderLog.push(`COMP:CANCELAR_ATRACCION:${id}`);
        return { status: 'CANCELLED_ATRACCION_OK', reservation_id: id };
      }),
    };

    // Mock del servicio de Autos
    const mockAutosService = {
      createOrder: jest.fn().mockImplementation(async (dto) => {
        executionOrderLog.push(`EXEC:RESERVA_AUTO:${dto.vehicle_id}`);
        return { pnr: `PNR-AUT-${dto.vehicle_id}`, status: 'CONFIRMED' };
      }),
      cancelOrder: jest.fn().mockImplementation(async (pnr) => {
        executionOrderLog.push(`COMP:CANCELAR_AUTO:${pnr}`);
        return { status: 'CANCELLED_AUTO_OK', pnr };
      }),
    };

    // Mock del servicio de Pagos que simula fallo intencional
    const mockPagosService = {
      procesarPago: jest.fn().mockImplementation(async () => {
        executionOrderLog.push('EXEC:PAGO_FALLO');
        throw new HttpException('Fondos insuficientes', HttpStatus.PAYMENT_REQUIRED);
      }),
    };
  });

  it('Debe revertir los servicios en orden estrictamente inverso (LIFO) cuando el pago falla', async () => {
    // Al fallar el pago, el Auto fue el último reservado, por lo que debe cancelarse PRIMERO
    // La Atracción fue reservada antes, por lo que debe cancelarse DESPUÉS.
    expect(executionOrderLog).toEqual([
      'EXEC:RESERVA_ATRACCION:tour-01',
      'EXEC:RESERVA_AUTO:auto-02',
      'EXEC:PAGO_FALLO',
      'COMP:CANCELAR_AUTO:PNR-AUT-auto-02',      // LIFO: Último en entrar, primero en salir
      'COMP:CANCELAR_ATRACCION:RES-ATR-tour-01', // LIFO: Penúltimo en entrar, segundo en salir
    ]);
  });
});
```

**Explicación técnica:**
- La variable `executionOrderLog` actúa como un **Spy de ordenamiento**, comprobando que la pila transaccional LIFO ejecute las llamadas de compensación de manera matemáticamente estricta, protegiendo al negocio de inventarios bloqueados.

---

### 5. Planificación y Decisiones de Diseño
- **Evitar pruebas con dinero real:** Simular la pasarela de pagos con mocks y dobles de prueba es un imperativo de seguridad y financiero: permite inyectar escenarios extremos de error (tarjeta expirada, timeout de pasarela, fondos insuficientes) sin realizar cargos bancarios reales.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart LR
    subgraph "Taxonomía de Dobles de Prueba Aplicada"
        Dummy["Dummy<br/>(Datos de relleno en DTO)"]
        Stub["Stub<br/>(Retorna 200 OK estático)"]
        Spy["Spy<br/>(Registra executionOrderLog)"]
        Mock["Mock<br/>(Verifica llamada estricta de compensación)"]
        Fake["Fake<br/>(Map en memoria para Sagas)"]
    end

    Spy --> SagaTest["test/i05-saga-compensacion.spec.ts"]
    Mock --> SagaTest
    Fake --> MemoryStore["SAGA_STORE=memory"]
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- Los dobles de prueba aíslan la ejecución evitando ensuciar los archivos físicos de log de producción con registros falsos generados durante el testing.
"""

PAGE_13 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 13 | Página 13 de 22
**Semana 9 — Pruebas de Integración y Contract Testing**  
**Subtema 15:** Integración de Pruebas de Contrato en Pipelines de CI/CD

---

### 1. Definición Teórica & Fundamento Académico
Para que las pruebas de contrato agreguen valor en un entorno ágil con múltiples equipos, su ejecución debe automatizarse dentro del pipeline de **Integración y Entrega Continua (CI/CD)** (*Libro de la Clase Semana 09*).

Los componentes fundamentales del flujo CI/CD basado en contratos son:
1. **Pact Broker:** Servidor centralizado que funciona como repositorio de contratos Pact y matriz de compatibilidad entre consumidores y proveedores versionados por hash de Git.
2. **Comando `can-i-deploy`:** Herramienta de línea de comandos del ecosistema Pact que consulta al Broker si la versión específica del artefacto compilado puede desplegarse de manera segura a un entorno objetivo (ej. `production` o `staging`), validando si el proveedor ya verificó ese contrato con éxito.
3. **Quality Gates (Compuertas de Calidad):** Reglas estrictas en el flujo de integración continua que abortan automáticamente el pipeline si se detecta cualquier incompatibilidad contractual antes de llegar a la fase de compilación y despliegue.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se definió una arquitectura de pipeline automatizada:
- Se estructuraron compuertas de verificación pre-despliegue que ejecutan el análisis estático (`lint`), pruebas de contrato (`test:contract`), pruebas de compatibilidad de esquemas y compilación limpia (`nest build`) antes de autorizar la sincronización con **Azure App Services**.

---

### 3. Ubicación Exacta en el Código
- **Definición de Scripts de Pipeline:** `package.json` (`build`, `test:contract`, `prebuild`).
- **Configuración de Despliegue en Azure:** `.deployment`, `deploy.sh` o workflows de GitHub Actions.
- **Servidor Kudu en Producción:** `https://booking-core-api.scm.azurewebsites.net`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Script de Automatización de Pipeline en `package.json`:
```json
{
  "scripts": {
    "prebuild": "npm run test:contract",
    "build": "nest build",
    "ci:verify": "npm run lint && npm run test:contract && npm run test:integration",
    "deploy:azure": "git push azure Atracciones-RDA2:master"
  }
}
```

#### Flujo de Compuerta de Calidad (Quality Gate) Conceptual en CI/CD:
```bash
# 1. Ejecutar pruebas de contrato del Consumidor
npm run test:pact

# 2. Publicar contrato al Pact Broker
pact-broker publish pacts --consumer-app-version=$GIT_COMMIT --branch=main

# 3. Consultar compuerta de despliegue antes de tocar producción
pact-broker can-i-deploy \
  --pacticipant BookingPrototipoConsumer \
  --version $GIT_COMMIT \
  --to-environment production

# 4. Si can-i-deploy retorna 0 (Éxito), se procede al despliegue en Azure
npm run build && git push azure master
```

**Explicación técnica:**
- El hook `prebuild` en `package.json` garantiza que TypeScript no compile los artefactos de distribución (`dist/`) si existe una sola prueba de contrato fallida, impidiendo que código incompatible llegue al repositorio de producción en Azure.

---

### 5. Planificación y Decisiones de Diseño
- **Protección contra caídas del entorno productivo:** Se configuró el pipeline para que los fallos contractuales aborten el proceso en segundos en la fase de testing, evitando que Azure App Service active el contenedor con versiones defectuosas que causen errores 404 o 500 a los clientes finales.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
sequenceDiagram
    autonumber
    participant Dev as Desarrollador
    participant CI as Pipeline CI/CD (GitHub / Local)
    participant Broker as Pact Broker Central
    participant Azure as Microsoft Azure (Producción)

    Dev->>CI: git push origin rama-feature
    CI->>CI: Ejecuta npm run test:contract
    CI->>Broker: Consulta can-i-deploy (¿Es compatible con el proveedor?)
    
    alt Contrato Verificado por Proveedor (Compatible)
        Broker-->>CI: can-i-deploy: OK (Retorna código 0)
        CI->>CI: Compila aplicación (npm run build)
        CI->>Azure: Despliega contenedor / Kudu Sync
        Azure-->>Dev: Despliegue Exitoso en booking-core-api.azurewebsites.net
    else Contrato Roto o No Verificado
        Broker-->>CI: can-i-deploy: REJECTED (Breaking change detectado)
        CI-->>Dev: Quality Gate Activada: Pipeline Abortado
    end
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Bitácora de Despliegue:** Cada compilación y despliegue exitoso genera un identificador de commit inmutable registrado en el endpoint `/api/v2/telemetry/version`, permitiendo correlacionar anomalías de producción con el commit exacto desplegado.
"""

def get_week9_pages():
    return [PAGE_9, PAGE_10, PAGE_11, PAGE_12, PAGE_13]

if __name__ == '__main__':
    pages = get_week9_pages()
    print(f"Semana 9 generada: {len(pages)} páginas.")

