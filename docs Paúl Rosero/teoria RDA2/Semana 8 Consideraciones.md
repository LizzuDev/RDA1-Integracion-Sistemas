Hay que implementar el patrón Saga para permitir la compensación o el reverso, como ejemplo, la cancelación de una compra de alojamientos, atracciones, vuelos y renta de autos. Otro ejemplo es cuando tenemos un error durante la compra de  alojamientos, atracciones, vuelos y renta de autos, haciendo que se de un reverso. Hay que tomar en cuenta no solo el happy path sino también los flujos de reversos o cuando algo falla.

Los COmponentes de la Saga son eventos de inicio y de transición que son los nombres estandarizados como PedidoCreado, InventarioReservado y Pago Procesado; también tiene Compensaciones como RestaurarInventario, CancelarPedido, ReembolsarPago. Posee también reintentos idempotentes y el Correlation-id.

Hay que implementar el correlation-id, los reintentos idempotentes, las compensaciones, los eventos de inicio y de transición que componen al patrón Saga.

El correlation-id debe estar en cada uno de los microservicios, este aparece a nivel de aplicación, no en la base de datos.

## Arquitectura Híbrida de Eventos: Combinación de RabbitMQ y Apache Kafka

Se debe implementar una arquitectura de mensajería híbrida combinando **RabbitMQ** y **Apache Kafka**, donde cada tecnología se utiliza en el dominio para el cual fue diseñada. La regla arquitectónica fundamental es:

> **"RabbitMQ para lo que el negocio no puede fallar (transaccional/Sagas). Kafka para lo que el negocio necesita escalar (telemetría, analítica y observabilidad)."**

---

### 1. RabbitMQ: Brazo Transaccional y Operativo (Sagas y Negocio Crítico)

RabbitMQ es un **message broker tradicional** basado en el protocolo **AMQP**, diseñado para garantizar enrutamiento flexible, confirmación de entrega (ACKs), almacenamiento temporal y fiabilidad transaccional en el corto plazo.

#### Casos de uso en el proyecto:
- **Orquestación y Coreografía del Patrón Saga**: Flujos de compra de paquetes turísticos (vuelos, alojamientos, atracciones y autos).
- **Compensaciones y reversos**: Ejecución de acciones compensatorias idempotentes en orden inverso cuando falla un paso de la compra.
- **Transacciones críticas de negocio**: Reserva de inventario, procesamiento de pagos y confirmación de pedidos.
- **Garantías de entrega estricta**: Uso de exchanges, colas dedicadas, Dead Letter Queues (DLQs) y políticas de reintento para evitar pérdida de mensajes ante caídas de microservicios.

---

### 2. Apache Kafka: Plataforma Distribuida de Event Streaming (Telemetría y Observabilidad)

Apache Kafka opera como un **distributed commit log** optimizado para almacenar, replicar y transmitir flujos masivos de eventos en tiempo real con altísimo throughput, baja latencia y retención persistente y configurable.

#### Naturaleza técnica de Kafka:
- **Topics**: Canales lógicos de eventos.
- **Particiones**: Segmentos ordenados y paralelos de cada topic que permiten escalabilidad horizontal.
- **Offsets**: Punteros de lectura independientes por consumidor, lo que habilita el reprocesamiento (replay) histórico.
- **Consumer Groups**: Consumo distribuido y balanceo automático de carga.
- **Persistencia Durable**: Almacenamiento desacoplado del consumo (minutos a meses).

#### Casos de uso en el proyecto (Enfoque en Telemetría y Analítica):
- **Telemetría y Métricas en Tiempo Real**: Ingesta masiva de métricas de frontend y backend (latencias de servicios, uso de recursos, throughput, tasas de error).
- **Trazabilidad y Observabilidad de Eventos**: Streaming de trazas y eventos de monitorización para alimentar dashboards (Grafana, Jaeger, OpenTelemetry).
- **Métricas de Navegación y Búsqueda**: Registro de eventos de alto volumen como búsquedas de vuelos, alojamientos, autos y atracciones sin degradar el motor transaccional.
- **Historial y Análisis de Comportamiento**: Base para sistemas de recomendación y patrones de consumo del usuario.
- **Resiliencia desacoplada**: Si Kafka se satura por picos de telemetría, el flujo de compras y pagos en RabbitMQ sigue operando sin interrupción.

---

### 3. Comparativa Técnica y Funcional

| Criterio | RabbitMQ | Apache Kafka |
| :--- | :--- | :--- |
| **Modelo conceptual** | Message Broker (AMQP) | Distributed Commit Log |
| **Enfoque principal** | Transaccional, consistente, confiable | Streaming masivo y escalabilidad extrema |
| **Persistencia** | Temporal (hasta confirmación/ACK) | Durable y configurable en disco |
| **Orden** | Garantizado por cola | Garantizado por partición |
| **Prioridad** | Integridad de negocio y entrega estricta | Throughput extremo y baja latencia masiva |
| **Reprocesamiento (Replay)** | Limitado / No nativo | Nativo e ilimitado (vía offsets) |
| **Throughput** | Alto | Muy alto / Masivo |
| **Rol en el sistema** | **Sagas, compras, pagos, compensaciones** | **Telemetría, métricas, logs masivos, analítica** |

---

### 4. Coexistencia y Trazabilidad Cross-Broker

Para que la combinación funcione de manera unificada y coherente:
1. **Correlation ID Universal**: El `correlation_id` debe viajar tanto en los mensajes transaccionales de RabbitMQ como en los eventos de telemetría y métricas de Kafka.
2. **Dashboard de Monitoreo Tipo Grafo**: Gracias a esta trazabilidad cruzada, el dashboard del Booking puede correlacionar la telemetría masiva (Kafka) con el estado de la transacción (RabbitMQ), identificando en el grafo:
   - Los nodos activos en **verde**.
   - El microservicio que falló en **rojo**.
   - Todo el árbol de spans del Saga, incluyendo la causa del error y las compensaciones aplicadas.

Hay que identificar las Sagas para saber qué microservicios y eventos están dentro de esa Saga, permitiendo que, cuando se dé en ese microservicio, se emita un evento que no es nada más que un mensaje como **Factura creada**.

Hay que implementar el Event-Driven Architecture para eliminar los acoplamientos Espacial, Temporal, Semántico y Evolutivo

Se debe implementar el monitoreo y trazabilidad en EDA, ejemplo donde tenga un grafo con varios nodos conectados mostrando que todos esos nodos están en verde pero cuando uno deja de funcionar se pone en rojo, para ello hay que usar esta teoria:

6.5. Monitoreo y trazabilidad en arquitecturas orientadas a eventos
La Arquitectura Orientada a Eventos (EDA) presenta beneficios extraordinarios para la
escalabilidad y resiliencia de los sistemas distribuidos. Sin embargo, esta misma naturaleza
descentralizada introduce un desafío que no existe en sistemas monolíticos ni en arquitecturas
con control centralizado: ¿cómo comprender, seguir y diagnosticar el comportamiento del
sistema cuando las interacciones ocurren de forma asincrónica, distribuida y emergente?
En una EDA, los microservicios no se llaman directamente. No hay una cadena REST clara, no
hay un orquestador que dirija todo el flujo, y no existen transacciones centralizadas. En su
lugar, hay eventos que van y vienen, múltiples consumidores con estados intermedios,
reintentos, colas, particiones, offsets, DLQs y varias capas de cachés. Esto convierte al
diagnóstico en una tarea compleja que exige herramientas, métricas, estándares y técnicas
avanzadas de observabilidad.
La trazabilidad distribuida es un componente vital del éxito de toda arquitectura moderna. Sin
ella, un sistema puede funcionar, pero no es capaz de evolucionar adecuadamente. La
observabilidad no solo permite detectar fallos. Cada evento necesita un identificador único que viaje en el mensaje, en los logs y cualquier respuesta. Es exactamente el campo correlationID que porpagarás manualmente entre los microservicios se requiere poner por lo minimo esta estructura:
- Ejemplo:
- {
**timestamp**: **2025-11-28T16:44:01Z**,
**service**: **InventarioService**,
**event_received**: **PedidoCreado**,
**correlation_id**: **cid-8821a**,
**status**: **processed**,
- "
Esto para que, cuando un evento falle, debo tener un flujo que me indique el origen del error y cuál fue todo el flujo de error, esto en un dashboard de monitoreo. El Booking debe tener esto. Por ejemplo, el Booking debe ver que la compra del paquete conlleva ver toda la saga: qué vuelo tiene, qué atracciones tiene, qué alojamiento, qué auto se rentó, además de ver el flujo o saga de los fallos, es decir, si un microservicio interno o externo fallo indique toda la saga del fallo. Se pueden usar herramientas para el monitoreo como OpenTelemetry, Jaeger, Prometheus + Grafana.   Para esto necesitarás esta teoría:

6.5. Monitoreo y trazabilidad en arquitecturas orientadas a eventos
La Arquitectura Orientada a Eventos (EDA) presenta beneficios extraordinarios para la
escalabilidad y resiliencia de los sistemas distribuidos. Sin embargo, esta misma naturaleza
descentralizada introduce un desafío que no existe en sistemas monolíticos ni en arquitecturas
con control centralizado: ¿cómo comprender, seguir y diagnosticar el comportamiento del
sistema cuando las interacciones ocurren de forma asincrónica, distribuida y emergente?
En una EDA, los microservicios no se llaman directamente. No hay una cadena REST clara, no
hay un orquestador que dirija todo el flujo, y no existen transacciones centralizadas. En su
lugar, hay eventos que van y vienen, múltiples consumidores con estados intermedios,
reintentos, colas, particiones, offsets, DLQs y varias capas de cachés. Esto convierte al
diagnóstico en una tarea compleja que exige herramientas, métricas, estándares y técnicas
avanzadas de observabilidad.
La trazabilidad distribuida es un componente vital del éxito de toda arquitectura moderna. Sin
ella, un sistema puede funcionar, pero no es capaz de evolucionar adecuadamente. La
observabilidad no solo permite detectar fallos: permite entender cómo se comporta el
sistema, cómo escalarlo y cómo garantizar consistencia eventual.

# 1. Concepto de observabilidad en EDA
La observabilidad se refiere a la capacidad de un sistema distribuido para exponer suficiente
información interna que permita inferir su estado, comportamiento, causas de errores y
performance. En la EDA, observar significa poder reconstruir flujos que no existen como
llamadas directas, sino como conjuntos de eventos diseminados en el tiempo y en diferentes
microservicios.
1.1. Diferencia entre monitoreo y observabilidad
- Monitoreo: recolecta métricas predefinidas (CPU, RAM, latencia).
- Observabilidad: permite responder preguntas que no fueron anticipadas.
Ejemplo: ¿por qué los pedidos de Guayaquil tardan más en la fase
InventarioReservado?
1.2. El desafío de la asincronía
En REST, un flujo típico es:
A → B → C → D
En EDA, un flujo puede ser:
Evento X → Servicio A → Evento Y → Servicio C → Evento Z → Servicio B → Evento W → Servicio D
Es imposible inferir este flujo sin mecanismos avanzados.
- Trazabilidad distribuida
La trazabilidad distribuida consiste en seguir el “rastro” de un evento a través de múltiples
servicios. Esto se logra mediante:
- Correlation IDs
- Trace IDs y Span IDs
- Context propagation
- Logs estructurados
- Sistemas de visualización de trazas
Correlation ID
Cada evento necesita un identificador único que permita rastrear su propagación. Este ID debe
- viajar:
- En el mensaje RabbitMQ
- En el mensaje Kafka
- En los logs
- En los headers internos
- En cualquier respuesta que genere
El correlation ID es la columna vertebral de la trazabilidad.
- Componentes esenciales del monitoreo en EDA
3.1. Logs estructurados
Los logs tradicionales en texto plano son inadecuados. Los sistemas distribuidos requieren logs
con estructura:
- JSON
- Campos: timestamp, trace_id, span_id, correlation_id, service, event_name, duration,
- payload_size
- Enviados a un sistema central (ELK, Loki, CloudWatch)
Los logs deben reflejar:
- Recepción de eventos
- Envío de eventos
- Errores al procesar
- Retrasos
- Reintentos
3.2. Métricas
Las métricas son indicadores cuantitativos:
- Tiempo promedio de procesamiento por evento
- Cantidad de eventos procesados por minuto
- Número de mensajes en cola
- Latencia entre productor y consumidor
- Fallos por tipo de evento
- Retrasos de particiones Kafka
- Tamaño de DLQs
Estas métricas permiten detectar cuellos de botella y realizar escalamiento proactivo.
3.3. Trazas distribuidas
Las trazas (traces) permiten reconstruir la secuencia de pasos que siguió un evento.
Cada paso de la traza se denomina span:
- Span de PedidoService
- Span de Inventario
- Span de Pago
- Span de Notificaciones
Cuando se visualizan en un grafo temporal, permiten observar la propagación del evento.
Figura 11. Representación de trazabilidad distribuida en EDA.
Fuente: Creación propia (2025).
- Herramientas fundamentales
4.1. OpenTelemetry
Es el estándar moderno para:
- Recolección de logs
- Propagación de contexto
- Generation de trace_id y span_id
- Métricas
- Exportación a sistemas de monitoreo
Aborda uno de los problemas históricos de los microservicios: la falta de uniformidad.
4.2. Jaeger
Plataforma para visualizar trazas distribuidas:
- Muestra diagramas de Gantt de los spans
- Permite filtrar por trace_id
- Revela servicios lentos
- Detecta patrones anómalos
4.3. Prometheus + Grafana
- Prometheus recolecta métricas.
- Grafana las visualiza.
Se crean dashboards como:
- Latencia total del flujo “CrearPedido”
- Retraso de colas RabbitMQ
- Lag de particiones Kafka
- Fallos por microservicio
- Throughput del sistema
4.4. ELK (Elasticsearch, Logstash, Kibana)
Ideal para análisis profundo de logs estructurados.
- Monitoreo y trazabilidad aplicados al proyecto Amazon Distribuido
En el proyecto del curso:
5.1. Cada evento RabbitMQ incluye:
- correlation_id
- nombre del evento
- timestamp de emisión
- timestamp de recepción
- payload minimizado
5.2. Cada evento Kafka incluye:
- offset
- partición
- correlation_id
- metadata adicional
5.3. Cada microservicio mantiene logs estructurados:
- Ejemplo:
- {
**timestamp**: **2025-11-28T16:44:01Z**,
**service**: **InventarioService**,
**event_received**: **PedidoCreado**,
**correlation_id**: **cid-8821a**,
**status**: **processed**,
- **duration_ms**: 42
- }
- 5.4. Trazas distribuidas
La herramienta Jaeger permite visualizar:
- Flujo completo de un pedido desde PedidoService hasta NotificaciónService
- Identificación del microservicio más lento
- Retrasos en Inventario o Pago
- Retrasos en el Event Bus
Figura 12. Flujo trazado de un pedido en Amazon Distribuido.
Fuente: Elaboración propia (2025).
- Retos profundos del monitoreo en EDA
6.1. Fragmentación de información
El estado está distribuido, no centralizado.
6.2. Consistencia eventual
El sistema puede estar en estados intermedios no triviales.
6.3. Latencias variables
Los flujos asincrónicos generan tiempos no deterministas.
6.4. Volumen de datos
EDA produce millones de eventos → millones de logs → terabytes de información.
6.5. Correlación compleja
Una traza puede involucrar:
- RabbitMQ
- Kafka
- 6 microservicios
- 3 reintentos
- 1 compensación
Reconstruir la historia completa sin herramientas es imposible.
- Estrategias recomendadas para observabilidad en EDA
- Correlation ID obligatorio en todos los eventos.
- Logs JSON estructurados en todos los microservicios.
- Propagación de contexto mediante OpenTelemetry.
- Dashboards especializados por flujo (CrearPedido, ReembolsarPedido, etc.).
- Alertas proactivas:
o DLQ > 10 mensajes.
o Latencia Kafka > 2s.
o Caída de throughput.
- Trazabilidad cross-broker (RabbitMQ + Kafka).
- Monitoreo del Event Bus como componente crítico.
- Conclusión
El monitoreo y la trazabilidad son elementos indispensables para operar y evolucionar
arquitecturas orientadas a eventos. La asincronía, la distribución y la consistencia eventual
introducen complejidad que solo puede manejarse mediante observabilidad avanzada. Un
sistema event-driven sin trazabilidad está condenado al caos operacional: los errores son
invisibles, los cuellos de botella permanecen ocultos y los procesos críticos se vuelven
imposibles de auditar.
Al implementar mecanismos robustos de correlación, logs estructurados, métricas, trazas
distribuidas y visualización, se logra un ecosistema controlado, estable y predecible. En
Amazon Distribuido, estas prácticas permiten reconstruir flujos enteros de eventos, identificar
problemas con precisión y garantizar una operación confiable incluso bajo alta concurrencia