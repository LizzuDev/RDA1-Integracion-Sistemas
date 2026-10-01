# A tomar en consideración RDA1✮ ⋆ ˚｡𖦹 ⋆｡°✩𓆝

fechaೃ 𓈒ॱ⬭ᩙ: 14 de septiembre de 2026
resumen IA .𖥔 ݁ ˖๋ ࣭ ⭑: Implementar API versionada con verificación previa de pago, usar patrón Wrapper para traducir entre REST/JSON y SOAP/CML, aplicar cachés para reducir latencia y carga, cumplir con restricciones de cliente‑servidor, stateless, cacheable, interfaz uniforme y arquitectura en capas, y alcanzar el nivel 3 de madurez Richardson (HATEOAS) en los endpoints.

Tener las api Versionadas

Hacer sincrono que se verifique primero el pago antes de entregar el producto al cliente

Utilizar el patrón de Wrapper para que el API Gateway traduzca de Rest/Json a SOAP/CML y viceversa sin que lo note

Debemos utilizar cachés para menorar la latencia y la carga de red

Debemos implementar estas restricciones:

## Restricciones principales

| Restricción | Descripción | Beneficio |
| --- | --- | --- |
| ClienteServidor | Separación entre interfaz (cliente) y almacenamiento/procesamiento (servidor). | Independencia, escalabilidad y reusabilidad. |
| Sin estado (Stateless) | Cada solicitud contiene toda la información necesaria; el servidor no mantiene sesiones. | Escalabilidad y simplicidad. |
| Cacheable | Las respuestas pueden ser almacenadas para optimizar rendimiento. | Reducción de latencia y carga de red. |
| Interfaz uniforme | Uso coherente de URIs, verbos y formatos de mensaje. | Interoperabilidad y claridad. |
| Sistema en capas | Los componentes intermedios (gateways, proxies) pueden intervenir sin afectar al cliente. | Seguridad, caching y balanceo de carga. |

Utiilzar los estandares para las endpoint GET, POST, PUT, 

Debemos cumplir con el tercer nivel de Madurez de Richardson:

**Nivel** | **Descripción** | **Ejemplo**

**Nivel 0: RPC** | Llamadas sin estructura uniforme (SOAP, XML-RPC). | /getCliente?id=1

**Nivel 1: Recursos** | Se introducen URIs para representar entidades. | /clientes/1

**Nivel 2: Verbos HTTP** | Uso correcto de métodos (GET, POST, PUT, DELETE). | GET /clientes/1

**Nivel 3: HATEOAS** | Respuestas con hipervínculos que guían al cliente. | { "_links": { "self":
"/clientes/1" } }

Para ello debemos cumplir con HATEOAS

## Buenas prácticas generales para el diseño de URIs

| Recomendación | Correcto | Incorrecto |
| --- | --- | --- |
| Usar sustantivos en plural | /productos, /usuarios | /getProducto, /crearUsuario |
| Evitar verbos en la ruta | POST /pedidos | /procesarPedido |
| Mantener jerarquías lógicas | /usuarios/45/pedidos/3 | /pedidosPorUsuario?id=45 |
| No incluir extensiones de formato | /productos | /productos.json |
| Ser consistente en el estilo | /api/v1/productos | /Api/v1/Productos |

# Versionar las URIs de forma obligatoria

# Debemos hacer un control de excepciones para colocar los códigos de estado HTTP, para ello debemos usar el estándar RFC 7807

Hay que colocar en las API el versionamiento y la fecha de deprecación controlada para que sepan cuando se cambiará esa API, todo esta en la URL. Usaar el versionamiento en la URL

Validar las API para no manejar nombres sino manejarse por el estandar para que use números por ejemplo: api/v1/productos/teclado (ES INCORRECTO) api/v1/productos/1 (ES CORRECTO)