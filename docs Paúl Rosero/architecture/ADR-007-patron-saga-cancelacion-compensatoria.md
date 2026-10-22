# ADR-007: Patrón Saga y Cancelación Compensatoria con Reembolso e Idempotencia

## Estado
Aceptado (Accepted)

## Contexto
En una arquitectura distribuida de comercio electrónico y turismo, la cancelación de una reserva confirmada no puede reducirse a una simple actualización de un flag en base de datos.
El usuario que adquirió entradas para un tour y cancela su reserva requiere:
1. **Reverso de Inventario:** Los cupos adquiridos deben reintegrarse de forma inmediata a la disponibilidad del tour para que otros usuarios puedan reservarlos.
2. **Reembolso Financiero:** Se debe calcular y garantizar el reintegro monetario del 100% del valor pagado, generando un comprobante formal de reembolso identificable (`REF-ATR-...`).
3. **Compensación en Servicios Externos:** Se debe notificar al microservicio del socio externo a través de la capa Anti-Corruption Layer (ACL / Adapter) para liberar la reserva en su sistema independiente.
4. **Idempotencia Transaccional:** Se debe blindar el sistema ante múltiples clics o peticiones concurrentes del cliente, evitando duplicidad de reembolsos o sobre-incremento de cupos.
5. **Auditoría Externa:** Toda la transacción compensatoria debe registrarse en archivos físicos de log sin saturar la base de datos relacional.

## Decisión
Se decide implementar el **Patrón Saga Orquestado con Transacciones Compensatorias** en el método `AtraccionesService.cancelarReserva()`:

1. **Blindaje de Entrada y Protección PostgreSQL (V-05):**
   - Se valida la existencia del ID y su formato mediante la expresión regular de UUID. Si el formato es inválido o no existe, se rechaza inmediatamente con `404 Not Found` bajo RFC 7807, impidiendo errores internos `QueryFailedError` (HTTP 500).
2. **Verificación de Idempotencia:**
   - Si la reserva ya se encuentra en estado `CANCELADA`, el orquestador aborta la compensación y retorna una respuesta RFC 7807 con código de error de negocio `ALREADY_REFUNDED` y HTTP 400, protegiendo las finanzas y el stock.
3. **Compensación de Inventario Local:**
   - Se localiza la atracción asociada y se restituyen atómicamente los cupos reservados (`cupos_disponibles += reserva.numero_tickets`).
4. **Transición de Estado y Reembolso:**
   - La reserva transita a estado `CANCELADA`, se registra `monto_reembolsado = total`, `refund_status = 'PROCESADO'` y se emite el código de transacción `REF-ATR-<UUID>`.
5. **Compensación Externa mediante Adapter (ACL):**
   - El servicio invoca `DilanAdapterService.cancelarReserva(id)` con timeout de 5s para sincronizar el estado con el socio de integración externo.
6. **Auditoría Inmutable en Archivo:**
   - Se escribe el registro estructurado de la cancelación en el archivo físico rotativo `logs/audit-YYYY-MM-DD.log` a través de Winston, sin realizar escrituras de telemetría en PostgreSQL.

## Consecuencias
### Positivas
- Consistencia eventual robusta entre el Booking y los socios externos.
- Protección financiera contra reembolsos dobles mediante control de idempotencia.
- Experiencia de usuario transparente en el frontend con confirmación modal y actualización inmediata de la vista "Mis Reservas".
- Cumplimiento de la directriz de cero persistencia de logs en base de datos.

### Desafíos Aceptados
- Si el microservicio del socio externo no responde (timeout > 5s), el adaptador aplica degradación elegante, registrando la alerta en el log de integración para conciliación asíncrona sin bloquear la respuesta de éxito al usuario final.
