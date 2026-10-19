# RDA2: Uso de gRPC en los microservicios

## 1. gRPC y protocolos de comunicación

- **Implementar gRPC** en el RDA2 para los microservicios.
- **gRPC**: mecanismo de comunicación de alto rendimiento, basado en RPC y orientado a métodos.
- **REST no desaparece**: sigue siendo el protocolo para comunicarse con la **interfaz de usuario**. Asimismo, conforme a lo definido, **únicamente REST** se utilizará para el **envío de una compra**.
- **HTTP/1.1**: envía la petición y **debe esperar** la respuesta (comunicación síncrona request–response).
- **HTTP/2**: permite comunicación más eficiente con distintos modos:
  - envía y espera la respuesta (unary);
  - envía varios y responde 1 (client streaming);
  - envía varios y recibe varios (bidirectional streaming / full duplex).
- Se debe utilizar **Protocol Buffers** (`.proto`) para **documentar y definir los contratos** entre servicios.
- **RPC (Remote Procedure Call)**: modelo que permite invocar una función/método en un servidor remoto mediante una URL/endpoint, ejecutando la lógica del lado del servidor y retornando el resultado al cliente.
- **REST** piensa en **recursos** (`/recurso/{id}`); **gRPC** piensa en **métodos/servicios** (`Servicio.Metodo`).
- **Protocol Buffers** es más eficiente que JSON porque utiliza **serialización binaria** en lugar de texto, lo que reduce el tamaño del mensaje y mejora el rendimiento.
- **Multiplexación de streams (HTTP/2)**: varios flujos lógicos pueden viajar simultáneamente sobre una misma conexión TCP. La analogía es: “varios autos van en un solo bloque”, es decir, en un solo envío se pueden transmitir múltiples peticiones/respuestas.

## 2. Auditoría y monitoreo

- Usar **nodos** para tener una auditoría de los servicios. Cada página web individual que se conecta a Booking debe representarse como un **nodo** con su propia identidad (p. ej., `node_id`, `node_code`, `url_base`).
- En el tablero de monitoreo, las páginas web conectadas deben mostrarse con un **foco verde** y las páginas web desconectadas con un **foco rojo**.
- Debe ser posible **conectar y desconectar páginas web** desde el panel de administración, registrando dicha acción con trazabilidad y auditoría.
- Usar **archivos logs** para la parte de auditoría de logs; **no guardarlos en la base de datos**. Estos logs deben ser estructurados (formato JSON Lines), con rotación, retención configurable, inmutables y contener los campos de trazabilidad necesarios (correlation_id, trace_id, span_id, node_id, node_code, entre otros).
- Se deben incluir **campos para trazabilidad y auditoría por página individual**, de modo que quede claro el origen, acción, actor, recurso, fecha/hora, resultado y nodo que originó cada operación.

## 3. Integración con Booking

- Usar **gRPC** (sobre HTTP/2) **desde las páginas web hacia nuestro Booking** para la sincronización de inventario (stock, disponibilidad, cupos y precios). Esto permite mantener actualizado el inventario entre las páginas web individuales y Booking de forma continua.
- **ÚNICAMENTE** se debe utilizar un **API REST** para enviar cuando se hace una **compra**. Es decir, la transacción de compra se realiza vía REST; la sincronización de inventario se realiza vía gRPC.
- El motivo es que las páginas web individuales deben tener su inventario actualizado siempre y enviarnos ese stock a nosotros. Nosotros solo actualizamos el stock cuando un usuario compra algo **desde nuestro sitio web**.
- Esta separación mantiene clara la frontera: **sincronización = gRPC; registro/confirmación de compra = REST**.

## 4. Arquitectura de microservicios y datos

- Al usar microservicios, la base de datos se separa.
- Cada microservicio debe tener su **base de datos independiente**.
- **No se pueden compartir tablas entre microservicios**.
- La integración entre datos de distintos microservicios se realiza **en la capa de aplicación**, mediante **middleware**, composición de APIs (API Composition), orquestación, coreografía o eventos (EDA). Esto sustituye el acceso directo entre esquemas, manteniendo el aislamiento por microservicio.
- Hay que realizar un **check-in** para:
  - alojamientos;
  - atracciones;
  - vuelos;
  - autos.
- **Trazabilidad y auditoría por página individual**: Debe existir un conjunto de campos obligatorios para garantizar la trazabilidad de cada operación, identificando claramente qué página web individual (nodo) la originó. Esto incluye: `node_id`, `node_code`, `node_url_base`, `correlation_id`, `trace_id`, `span_id`, `actor_id`, `actor_type`, `action`, `resource_type`, `resource_id`, `transport` (rest/grpc/event), `grpc_method`/`http_method`, `endpoint`/`rpc_full_name`, `status`, `response_code`, `duration_ms`, `result_message`, `timestamp` (UTC), `service_name` y `environment`. Estos datos deben registrarse **exclusivamente en archivos logs estructurados** (JSON Lines), **sin guardarse en la base de datos**.

## 5. Gestión de autos, mantenimiento y flujos

- Hay que manejar los estados de los autos:
  - Auto listo para entregar.
  - Auto reservado.
  - Auto en limpieza.
  - Auto listo para rentar.
- Debemos poner un tiempo de **2 horas** para poner nuevamente al auto disponible para rentar (temporizador obligatorio de cool-down tras devolución y finalización de limpieza).
- Hay que manejar flujos, como el flujo de autos:
  - listo para reservar;
  - se reserva;
  - está en limpieza;
  - está listo nuevamente para reservar.
- Usar un **control de mantenimiento** con restricción por **usuario o rol autorizado** para:
  - poder ingresar el kilometraje;
  - registrar las **características de cómo llega el auto** (descripción detallada al ingreso a mantenimiento);
  - permitir **codificar un umbral de kilometraje** para que, cuando el vehículo alcance o supere dicho umbral, **salte una alerta** para programar el mantenimiento.
- Todo cambio/registro de kilometraje debe quedar trazado (historial), y las alertas deben ser auditables con sus respectivos metadatos.

## 6. Atracciones y levantamiento de requerimientos

- Hay que controlar las categorías de atracciones para cuando incluye:
  - comida;
  - transporte;
  - guía.
- Se puede usar una **tabla padre** y una **tabla hija recursiva** (estructura jerárquica con auto-referencia `padre_id`, que permita representar múltiples niveles).
- Pedirle al agente que navegue en toda la página web para levantar los requerimientos funcionales.
- Si existe bloqueo de `robots.txt` o mecanismos anti-bot que impiden la navegación pública, **debe buscar obligatoriamente otra página web pública** que no presente ese mismo problema. **Nunca se debe forzar el acceso** ignorando las restricciones de `robots.txt`.
- Luego, decirle que, en base a esos requerimientos, cree un **diagrama conceptual** para ver el flujo.
- Después, mandarlo a crear las cosas.
- Poder usar el **prototipo de Dylan** como base para atracciones.

## 7. EDA, orquestación y coreografía

- **EDA** (Event-Driven Architecture) consiste en que cada microservicio reaccione únicamente a los eventos que necesita, evitando acoplamientos innecesarios entre servicios.
- Hay que programar los microservicios para que, ante los eventos que existan, reaccionen con un mensaje.
- Las respuestas deben ser semánticas y no limitarse a un simple **200 OK**; por ejemplo: “cliente sí existe”, “stock insuficiente”, “reserva válida”, entre otras.
- Se debe utilizar tanto un **orquestador** como una **coreografía**, combinados de forma estratégica:
  - **Coreografía**: cada parte realiza su acción correspondiente en respuesta a eventos (cada servicio hace su parte, de forma descentralizada).
  - **Orquestador**: coordina y verifica cada paso del flujo para garantizar su correcta ejecución.
- Es necesario evaluar, caso por caso, quién requiere **orquestación** y quién requiere **coreografía**.
- En el caso del **proceso de pago**, **sí** se debe realizar una **verificación previa** antes de autorizar el cobro.
- **Consideración sobre Event Bus y ESB**: El objetivo del Event Bus es evitar que el ESB se sature. En este sistema, el Event Bus puede utilizarse para gestionar eventos de alto volumen, como las búsquedas que realizan los usuarios (p. ej., miles de búsquedas de vuelos, alojamientos, atracciones o autos para rentar), distribuyendo la carga de forma asíncrona.
- **Publicación de eventos con respuesta esperada**: Cuando se publica un evento para notificar cambios (por ejemplo, al confirmar una factura para actualizar el stock), es fundamental que en el contrato se especifique claramente que los microservicios consumidores reciben ese evento y realizan la acción correspondiente. **No es suficiente publicar un evento sin definir la expectativa de respuesta o el tratamiento por parte del consumidor**; el contrato debe establecer la semántica del evento, sus destinatarios esperados y la garantía o mecanismo de confirmación según corresponda.

## 8. Sagas y compensaciones

- Hay que tener en cuenta las **compensaciones**. Una compensación es una acción inversa que permite restaurar el sistema a un estado consistente cuando ocurre un error en un flujo distribuido y ya se ejecutaron pasos previos con efectos laterales.
- Por ejemplo: si en el último paso del proceso de pago ocurre un fallo, pero ya se descontó el stock y se crearon reservas, es necesario ejecutar un **reverso o compensación** para devolver el stock, liberar las reservas y cancelar lo que corresponda.
- Se debe implementar el patrón **Saga** para gestionar transacciones distribuidas, contemplando tanto el **happy path** (flujo exitoso) como los **casos de fallo** (flujo con compensaciones).
- Las Sagas pueden combinarse con orquestación o coreografía según el caso de uso, asegurando que cada acción forward tenga su correspondiente acción compensatoria cuando aplique.

## 9. Estandarización

- Es **fundamental** utilizar **estandarizaciones** para garantizar que la información que se envíe y reciba sea correcta, consistente, trazable y válida entre todos los microservicios.
- Se recomienda aplicar estándares técnicos para contratos, eventos, trazabilidad, formatos de datos y errores (p. ej., OpenAPI 3.1 para REST, Protocol Buffers v3 para gRPC, CloudEvents v1.0 para eventos EDA, W3C Trace Context para trazas distribuidas, ISO 8601 para fechas/horas en UTC, ISO 4217 para monedas y RFC 7807 para errores REST).
- Toda comunicación entre servicios debe seguir estas convenciones para facilitar la interoperabilidad, el mantenimiento y la evolución de la arquitectura.
- **Promociones y paquetes**: Debemos poder armar **promociones o paquetes** que integren **autos, vuelos, atracciones y alojamiento**, en función de lo que busca el usuario. En el contrato con los partners se solicita **una sola vez**: si acepta hacer promociones y cuál es el **porcentaje máximo de descuento** que estaría dispuesto a aplicar. Para ello, se debe crear una **base de datos dedicada a paquetes** (`paquetes`, `paquete_items`, `contrato_promociones`) con trazabilidad, referencias lógicas entre microservicios (sin compartir tablas) y **snapshot** de los ítems al momento de armar el paquete para mantener la integridad comercial.