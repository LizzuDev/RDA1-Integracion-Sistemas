# context/ — Contexto Vivo y Documentación Operativa

> **Proyecto:** Booking Prototipo (Plataforma Central Integradora)  
> **Asignatura:** Integración de Sistemas — 6to Semestre

Este directorio almacena el **contexto vivo** del proyecto. Permite a los desarrolladores, evaluadores y agentes de IA comprender las restricciones, reglas de diseño, contratos de integración y el estado actual de las sesiones de trabajo sin tener que reconstruir manualmente el historial del repositorio.

---

## Índice de Archivos del Directorio

| Archivo | Propósito y Contenido |
|---|---|
| [`active-context.md`](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/docs%20Pa%C3%BAl%20Rosero/context/active-context.md) | Estado actual de la plataforma (RDA1 y RDA2 100% completados, blindados y verificados), fases superadas y próximos pasos. |
| [`HANDOVER.md`](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/docs%20Pa%C3%BAl%20Rosero/context/HANDOVER.md) | Documento de traspaso técnico, implementaciones críticas blindadas, suites de pruebas y advertencia cardinal de **Cero Git Push automático**. |
| [`contratos_api_v1.md`](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/docs%20Pa%C3%BAl%20Rosero/context/contratos_api_v1.md) | Especificación de los contratos REST originales de RDA1 y cabeceras de deprecación (`X-API-Deprecation-Date`). |
| [`contratos_api_v2.md`](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/docs%20Pa%C3%BAl%20Rosero/context/contratos_api_v2.md) | Contratos REST v2 enriquecidos, especificación de `inventory.proto` en puerto 50051, endpoint Saga de cancelación y contratos del monitor de 5 nodos. |
| [`preguntas.md`](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/docs%20Pa%C3%BAl%20Rosero/context/preguntas.md) | Banco de 25 preguntas y respuestas técnicas para la defensa del proyecto (RDA1, RDA2, Sagas, gRPC, Heurísticas de Nielsen y blindaje). |
| [`ai-constraints.md`](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/docs%20Pa%C3%BAl%20Rosero/context/ai-constraints.md) | Restricciones innegociables para agentes de IA (cero git push, validación UUID en PostgreSQL, límites de capas y logging físico). |
| [`design-contracts.md`](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/docs%20Pa%C3%BAl%20Rosero/context/design-contracts.md) | Reglas de dependencia entre capas (Layering Rules), flujo unidireccional y códigos HTTP semánticos. |
| [`diseño_eventos_rda1.md`](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/docs%20Pa%C3%BAl%20Rosero/context/dise%C3%B1o_eventos_rda1.md) | Memoria técnica del diseño de eventos y mensajería de la etapa inicial RDA1. |
| [`walkthrough_auditoria_rda1.md`](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integraci%C3%B3n%20Sistemas/proyecto/plantilla%20inicial/docs%20Pa%C3%BAl%20Rosero/context/walkthrough_auditoria_rda1.md) | Registro de la auditoría y ejecución de pruebas del Reto 1. |
