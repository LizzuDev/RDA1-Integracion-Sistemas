# Estandarización: CloudEvents v1.0 + W3C Trace Context + OpenAPI 3.1

## CloudEvents v1.0 (Eventos EDA)

Formato obligatorio para eventos publicados en Event Bus.

```json
{
  "specversion": "1.0",
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "source": "booking.inventory.service",
  "type": "com.booking.inventory.stock.updated",
  "subject": "recurso/atraccion/123e4567-e89b-12d3-a456-426614174000",
  "time": "2026-10-19T12:00:00.000Z",
  "datacontenttype": "application/json",
  "datacontentencoding": "utf-8",
  "traceparent": "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
  "tracestate": "",
  "correlationid": "a9f3b8e7-6d2c-4c81-9a42-2e7f61a08d53",
  "data": {
    "recurso_id": "...",
    "tipo_recurso": "atraccion",
    "cantidad_disponible": 15,
    "delta": -3,
    "node_id": "...",
    "metadata": {}
  }
}
```

## W3C Trace Context

Propagar siempre:
- `traceparent`: formato `00-<trace-id>-<span-id>-<flags>`
- `tracestate` opcional
- Complementar con `correlation_id` (UUID v4)

## OpenAPI 3.1 (REST - Compra ÚNICAMENTE)

La operación de compra debe exponerse via REST conforme a lo requerido. Otros flujos pueden usar v1/v2 con versionado URI.

## Reglas
- Todos los timestamps UTC (ISO 8601)
- Monedas ISO 4217
- Errores RFC 7807
- Idempotency-Key para mutaciones críticas
- Trazabilidad obligatoria node_id/node_code/correlation_id/trace_id
EOF
echo "ok"