# ADR-006: Panel de Monitoreo de 5 Nodos con Semáforo, Circuit Breakers y Kill-Switches

## Estado
Aceptado (Accepted) — Implementado al 100%

## Contexto
En un ecosistema distribuido donde el Booking central agrega cuatro tiendas desarrolladas por compañeros externos más el flujo de ingesta gRPC, los microservicios externos pueden experimentar caídas temporales, fallas en la red o periodos de mantenimiento. Si el administrador no tiene visibilidad en tiempo real del estado de cada nodo, es imposible diagnosticar rápidamente el origen de las fallas.

Además, el docente solicitó como requerimiento operativo explícito:
> *"Usar nodos para tener una auditoría de los servicios para ver con un foco rojo o verde las páginas webs conectadas y ver en rojo las que están desconectadas, poder desconectar o conectar páginas webs."*

Sin un mecanismo para deshabilitar temporalmente un microservicio con problemas, el Gateway continuaría intentando llamadas que terminarían en timeouts, afectando la experiencia de usuario y degradando el marketplace.

## Decisión
Se decide implementar el **Monitor de Nodos y Circuit Breakers** administrado por `ConnectorHealthService` (`src/modules/admin/connector-health.service.ts`):

1. **5 Nodos Registrados:**
   - `atracciones`: Microservicio de Tours y Experiencias.
   - `autos`: Microservicio de Alquiler de Vehículos y Mantenimiento.
   - `alojamientos`: Microservicio de Hoteles y Hospedajes.
   - `vuelos`: Microservicio de Aerolíneas y Vuelos.
   - `grpc_inventory`: Servicio de Ingesta gRPC en puerto 50051.

2. **Estados del Nodo y Semáforo Visual:**
   - 🟢 **Verde (ONLINE):** Respuesta HTTP 200 en menos de 500 ms o gRPC socket operativo.
   - 🟡 **Amarillo (DEGRADED):** Respuesta HTTP 200 con latencia entre 500 ms y 2,000 ms.
   - 🔴 **Rojo (OFFLINE):** Timeout (>2,000 ms), código HTTP 5xx o conexión rehusada.
   - ⚪ **Gris (DISABLED):** Nodo apagado voluntariamente por el administrador.

3. **Circuit Breakers Integrados:**
   - Estados: `CLOSED` (operación normal), `OPEN` (bloqueado por fallos reiterados), `HALF_OPEN` (prueba de recuperación), `MANUALLY_OPEN` (kill-switch activado).

4. **Endpoints de Administración v2:**
   - `GET /api/v2/admin/nodes/health`: Retorna el estado en vivo, latencia, porcentaje de disponibilidad y estado del circuit breaker de los 5 nodos.
   - `POST /api/v2/admin/nodes/:serviceId/toggle`: Invierte el switch dinámico (`MANUALLY_OPEN` vs `CLOSED`) sin reiniciar el Gateway.
   - `POST /api/v2/admin/nodes/:serviceId/ping`: Ejecuta un ping síncrono bajo demanda para refrescar métricas inmediatas.

5. **Integración en la UI (`AdminDashboard.jsx`):**
   - Tarjetas para cada uno de los 5 nodos con focos LED semafóricos (verde/rojo), interruptores tipo switch interactivos y botón de ping manual.

## Consecuencias
### Positivas
- Observabilidad operativa en tiempo real y diagnóstico inmediato de latencias y disponibilidad.
- Capacidad de aislar fallas de microservicios externos evitando que ralenticen el resto del sistema.
- Cumple directamente con el requerimiento del docente para la demostración práctica de los Criterios CE05 y CE06.
- Control granular de tráfico saliente con respuesta en caché cuando un nodo está desconectado.

### Desafíos Aceptados
- El chequeo de salud proactivo genera peticiones recurrentes a los servidores externos; se configuran intervalos controlados y pings bajo demanda para no saturar las instancias gratuitas de prueba.
