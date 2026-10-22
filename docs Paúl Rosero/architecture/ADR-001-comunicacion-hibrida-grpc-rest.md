# ADR-001: Comunicación Híbrida — Inbound gRPC en Puerto 50051 para Inventario y Outbound REST para Compras

## Estado
Aceptado (Accepted) — Implementado al 100%

## Contexto
El Booking Prototipo actúa como el agregador central de servicios provistos por los sistemas de información independientes desarrollados por otros equipos de la asignatura (Atracciones, Autos, Alojamientos, Vuelos).

Existen dos necesidades operativas con requerimientos de tráfico diametralmente opuestos:
1. **Sincronización de Disponibilidad/Stock:** Las tiendas individuales sufren cambios frecuentes en su inventario (nuevos vehículos devueltos, cancelación de tours, ocupación de habitaciones). Si el Booking realizara polling constante vía REST HTTP/1.1 para consultar el catálogo de todas las tiendas, se generaría un alto overhead de conexiones TCP, cabeceras HTTP repetitivas y latencias innecesarias, con riesgo de agotar recursos en entornos cloud gratuitos.
2. **Confirmación de Compras y Cancelaciones:** Cuando un usuario final decide comprar un servicio en el Booking o cancelar una reserva, se trata de una transacción puntual, de naturaleza transaccional, que requiere trazabilidad HTTP, idempotencia y confirmación síncrona inmediata.

## Decisión
Se decide implementar una **arquitectura de comunicación híbrida asimétrica**:

1. **Inbound (Tiendas Externas → Booking): Protocolo gRPC (HTTP/2 con Protobuf v3)**
   - El Booking levanta una aplicación híbrida en NestJS (`app.connectMicroservice`) escuchando en el puerto TCP **50051** mediante `@grpc/grpc-js` y `@grpc/proto-loader`, gobernada por el contrato `src/proto/inventory.proto`.
   - Se expone el servicio `InventoryStockService` con dos métodos RPC:
     - `rpc PushStockUpdate (StockUpdateMessage) returns (StockUpdateAck);` para envíos puntuales de cupos.
     - `rpc StreamInventoryChanges (stream StockChangeEvent) returns (StreamSummary);` para flujos continuos de eventos en tiempo real.
   - El Booking recibe estas actualizaciones y actualiza una memoria caché local ultrarrápida, asegurando que las búsquedas de los usuarios consulten datos actualizados al milisegundo sin llamadas HTTP salientes en cada búsqueda.
   - Se proveen endpoints auxiliares REST en `/api/v2/inventory` y `/api/inventory/status` para verificación y telemetría HTTP.

2. **Outbound (Booking → Tiendas Externas): Protocolo REST (HTTP/1.1 con JSON)**
   - Cuando el usuario completa el checkout en el Booking o cancela una reserva, el servicio correspondiente emite una petición `POST` con timeout de 5 segundos y cabecera `Idempotency-Key` hacia la API REST de la tienda correspondiente para descontar o revertir el recurso y registrar la orden formal.

## Consecuencias
### Positivas
- Reducción drástica del ancho de banda y del tiempo de respuesta en búsquedas: el Booking responde a los usuarios desde su caché alimentada por gRPC sin esperar a las tiendas externas.
- Tipado estricto garantizado por los esquemas Protobuf, eliminando discrepancias de datos entre equipos.
- Las compras continúan utilizando el estándar REST universal, facilitando la auditoría de facturación y el manejo de errores HTTP estándar (RFC 7807).

### Desafíos Aceptados
- Los equipos externos deben compilar los archivos `.proto` y soportar clientes gRPC para emitir sus actualizaciones de inventario al puerto 50051.
- Se gestiona el ciclo de vida de conexiones gRPC y se implementan reconexiones automáticas si el servidor gRPC reinicia.
