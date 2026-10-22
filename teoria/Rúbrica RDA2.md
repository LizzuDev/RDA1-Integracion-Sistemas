# Criterios de calificación

## Condición habilitante obligatoria (criterio excluyente)

| Criterio excluyente | Verificación | Resultado |
|---|---|---|
| Todas las tiendas/sistemas individuales del curso se encuentran integradas funcionalmente con Booking Prototipo y operativas durante la demostración | Sí / No | Si es **No** → Calificación final del curso/grupo = **0** |

### Justificación académica del criterio excluyente

El Reto 2 representa la transición formal desde sistemas aislados hacia un ecosistema distribuido basado en microservicios e integración interoperable.

Debido a que el proyecto se construye sobre una arquitectura colaborativa y dependiente entre servicios, la ausencia de integración de uno o más sistemas afecta directamente:

- el funcionamiento del Booking Prototipo;
- la interoperabilidad global;
- las pruebas de integración;
- la consistencia de contratos;
- el flujo de datos;
- la observabilidad;
- la seguridad distribuida;
- la validación de arquitectura orientada a microservicios.

Por este motivo, el curso es evaluado como un único ecosistema funcional. Si una tienda no se integra correctamente, el ecosistema distribuido queda incompleto y no cumple el objetivo formativo del reto.

## Rúbrica

| Criterio | No cumple | Cumple |
|---|---|---|
| Todas las tiendas del curso están integradas funcionalmente con Booking Prototipo (criterio obligatorio excluyente) | 0 puntos | 1 puntos |
| Cada sistema migró correctamente a arquitectura de microservicios | 0 puntos | 1 puntos |
| El Booking Prototipo consume correctamente APIs y/o eventos de los sistemas integrados | 0 puntos | 1 puntos |
| El marketplace web integrado funciona correctamente en entorno distribuido | 0 puntos | 1 puntos |
| El sistema de administración continúa operativo bajo arquitectura distribuida | 0 puntos | 1 puntos |
| Existe API Gateway funcional y correctamente configurado | 0 puntos | 1 puntos |
| Los contratos entre servicios están documentados y versionados | 0 puntos | 1 puntos |
| Se evidencian pruebas de integración funcionales entre sistemas | 0 puntos | 1 puntos |
| Se implementaron mecanismos básicos de seguridad (JWT, autenticación, roles o protección de APIs) | 0 puntos | 1 puntos |
| Todos los sistemas están desplegados y accesibles en Internet durante la presentación | 0 puntos | 1 puntos |
| El estudiante demuestra dominio técnico del código fuente, integración y arquitectura durante la defensa | 0 puntos | 1 puntos |