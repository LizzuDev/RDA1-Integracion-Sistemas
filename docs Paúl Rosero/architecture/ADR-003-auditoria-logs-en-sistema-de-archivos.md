# ADR-003: Auditoría y Logging en Archivos Físicos del Servidor (NO en Base de Datos)

## Estado
Aceptado (Accepted)

## Contexto
En el Reto 1 inicial, se incluyó una tabla `api_request_logs` en PostgreSQL para registrar llamadas entrantes. No obstante, en un entorno de integración distribuido con múltiples microservicios interactuando constantemente (tráfico gRPC, pings de salud y peticiones REST), registrar cada evento en la base de datos relacional genera serios problemas:
1. **Saturación de I/O y Bloqueos de Conexiones:** Cada inserción compite por el pool de conexiones de PostgreSQL y agota la cuota gratuita de I/O en plataformas cloud (Supabase/Neon/Render).
2. **Fragilidad ante Caídas:** Si la base de datos experimenta lentitud o interrupción, el sistema no puede registrar los propios errores que intentan diagnosticar el problema.
3. **Directriz Explícita del Docente:**
   > *"Usar archivos logs para la parte de auditoría de logs, no guardarlo en la base de datos."*

## Decisión
Se decide migrar la totalidad del subsistema de auditoría técnica y trazabilidad de integración a **archivos físicos rotativos en el sistema de archivos del servidor**:
1. **Stack de Logging:** Uso de `winston` y `winston-daily-rotate-file`.
2. **Directorio Dedicado:** Carpeta `logs/` en la raíz del servidor (ignorada en Git pero preservada en el entorno de despliegue mediante volúmenes o almacenamiento de logs).
3. **Flujos de Registro Específicos:**
   - `logs/audit-YYYY-MM-DD.log`: Operaciones administrativas críticas (creación de usuarios, cambios de rol, activación/desactivación de tiendas externas, intentos de acceso no autorizado).
   - `logs/integration-YYYY-MM-DD.log`: Eventos de ingesta gRPC recibidos y llamadas salientes REST (URL de destino, tiempo de respuesta en ms, código de estado, tamaño del payload, correlation_id).
   - `logs/app-YYYY-MM-DD.log`: Errores no controlados de la aplicación, excepciones de NestJS y logs generales de arranque.
4. **Formato Estructurado:** Formato JSON por línea (JSONL), facilitando su ingesta futura en herramientas de análisis de logs (ELK Stack, Datadog o Grafana Loki).
5. **Política de Retención:** Rotación diaria automática con purga de archivos antiguos tras 14 días (`maxFiles: '14d'`).

## Consecuencias
### Positivas
- Cero impacto en el rendimiento o la capacidad transaccional de PostgreSQL en Supabase.
- Los logs son inmutables y persisten incluso si la base de datos colapsa.
- Cumplimiento literal y estricto del requerimiento indicado por el ingeniero evaluador.

### Desafíos Aceptados
- El panel de administración web no puede hacer un simple `SELECT * FROM logs` en SQL; para visualizar logs recientes en el panel, se debe exponer un endpoint específico en el backend que lea las últimas líneas del archivo físico de forma segura (`tail`).
