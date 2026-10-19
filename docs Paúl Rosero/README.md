# Documentación del Proyecto — Booking Prototipo (Plataforma Central Integradora)

> **Asignatura:** Integración de Sistemas — 6to Semestre  
> **Autor Principal / Responsable:** Paúl Rosero  
> **Equipo:** Booking Prototipo (Plataforma Central Integradora)  
> **Fecha de Actualización:** 19 de Octubre, 2026  
> **Estado General:** **RDA1 y RDA2 100% COMPLETADOS, BLINDADOS Y VALIDADOS LOCALMENTE** (Listo para despliegue manual por el usuario)

Este directorio `docs Paúl Rosero/` contiene la documentación viva, las directrices arquitectónicas, los registros de decisiones (ADRs), los contratos de integración OpenAPI v2 / Protobuf gRPC, y el contexto de desarrollo asistido por IA para el proyecto **Booking Prototipo**.

---

## 📁 Estructura del Directorio

```text
docs Paúl Rosero/
├── README.md                          ← Índice general y guía de navegación (este archivo)
├── golden-rules.md                    ← Reglas de oro innegociables (arquitectura, seguridad, sagas y código)
├── product-requirements.md            ← Requerimientos funcionales del producto (RDA1 y RDA2 100% implementados)
├── technical-requirements.md          ← Requerimientos técnicos, topología híbrida, stack y pruebas
├── RDA2_CONTRACT_UPDATES.md           ← Auditoría y evolución de contratos v1 → v2 y especificación gRPC
│
├── architecture/                      ← Visión arquitectónica y decisiones de diseño
│   ├── README.md                      ← Arquitectura integral (BFF, Microservicios, Diagramas C4 y Secuencias)
│   ├── TEMPLATE-adr.md                ← Plantilla para nuevos Architecture Decision Records
│   ├── ADR-001-comunicacion-hibrida-grpc-rest.md
│   ├── ADR-002-aislamiento-base-datos-por-microservicio.md
│   ├── ADR-003-auditoria-logs-en-sistema-de-archivos.md
│   ├── ADR-004-maquina-estados-flota-autos-cooldown.md
│   ├── ADR-005-jerarquia-recursiva-categorias-atracciones.md
│   └── ADR-006-panel-monitoreo-nodos-semaforo.md
│
├── context/                           ← Estado activo y contratos de integración
│   ├── active-context.md              ← Estado vivo del proyecto: 100% implementado, blindado y probado
│   ├── HANDOVER.md                    ← Documento de traspaso y directrices para relevos / despliegue
│   ├── ai-constraints.md              ← Restricciones y límites técnicos para agentes de IA
│   ├── design-contracts.md            ← Contratos de diseño por capas y fronteras de dominio
│   ├── contratos_api_v1.md            ← Especificación formal de contratos REST v1 (RDA1)
│   ├── contratos_api_v2.md            ← Especificación de contratos REST v2 y Protobuf gRPC (RDA2)
│   ├── diseño_eventos_rda1.md         ← Diseño conceptual preliminar de eventos (SOA/EDA)
│   ├── walkthrough_auditoria_rda1.md  ← Guía de verificación y cumplimiento de criterios RDA1
│   └── preguntas.md                   ← Banco completo de 25 preguntas y respuestas para la defensa oral
│
├── design_sessions/                   ← Minutas de diseño técnico por iteración
│   ├── README.md                      ← Guía para sesiones de diseño
│   ├── TEMPLATE.md                    ← Plantilla de sesión de diseño
│   ├── RDA1-sesion-construccion-vertical.md
│   └── RDA2-sesion-diseno-microservicios-integracion.md  ← Minuta RDA2 con 10 fases 100% completadas
│
└── ai_development/                    ← Roles, convenciones y flujos de trabajo asistido por IA
    ├── README.md                      ← Recursos para agentes de IA
    ├── agents/                        ← Definición de roles (Architect, Engineer, Reviewer)
    ├── languages/                     ← Convenciones por lenguaje (TypeScript, NestJS, React)
    │   ├── README.md
    │   ├── TEMPLATE.md
    │   └── typescript/conventions.md
    └── workflows/                     ← Flujos de trabajo ($prepare, $design-session, $deliver, etc.)
```

---

## 🎯 Panorama Actual del Proyecto (Octubre 2026)

El proyecto **Booking Prototipo** ha superado con éxito las dos metas de evaluación de la asignatura:

1. **Reto 1 (RDA1) — Plataforma API-First y Clon Booking.com:**  
   - Monolito modular en NestJS con API REST versionada (`/api/v1`).
   - SPA moderna en React 18 + Vite con la estética oficial de Booking.com.
   - HATEOAS Nivel 3, especificación RFC 7807 y persistencia en Supabase PostgreSQL.

2. **Reto 2 (RDA2) — Ecosistema Distribuido, Microservicios y Resiliencia:**  
   - **Servidor gRPC Inbound (Puerto 50051):** Aplicación híbrida en `src/main.ts` que escucha RPC unaria (`PushStockUpdate`) y streaming continuo (`StreamInventoryChanges`) gobernado por `src/proto/inventory.proto`.
   - **Monitor de Nodos y Kill-Switches (Admin):** Panel en `AdminDashboard.jsx` con semáforo LED (🟢/🟡/🔴), latencias en tiempo real y toggles manuales (`POST /api/v2/admin/nodes/:serviceId/toggle`) con Circuit Breaker (`CLOSED`, `OPEN`, `HALF_OPEN`, `MANUALLY_OPEN`).
   - **Auditoría Exclusiva en Archivos Físicos:** Logging con Winston en `logs/audit-YYYY-MM-DD.log`, garantizando la política de **Cero Logs en Base de Datos**.
   - **Aislamiento Database-per-Service:** Separación física y DDLs independientes (`database/atracciones_schema_v2.sql`, `database/autos_schema_v2.sql`).
   - **Máquina de Estados de Autos:** 6 estados finitos con **cooldown obligatorio de 2 horas** en `EN_LIMPIEZA`, más rol de mantenimiento con odómetro y alertas preventivas.
   - **Categorías Recursivas en Atracciones:** Árbol jerárquico padre-hijo (`/categorias/arbol`) con badges de comida, transporte y guía.
   - **Sagas y Compensaciones (B-01):** Reversión atómica de stock en cancelaciones, emisión de reembolso del 100% y modal de confirmación en `MisReservasPage.jsx`.
   - **Blindaje Total de Vulnerabilidades (V-01 a V-07) y Heurísticas de Nielsen:** Límites `maxLength`, detector de símbolos/números, colapso de espacios, protección contra error 500 por UUID en Postgres (`isUuid` guards), atajo `Escape` para modales y deshabilitación de fechas pasadas.
   - **Suites de Pruebas 100% Exitosas:** Cuatro scripts de verificación end-to-end (`test-sanitization-rfc7807.js`, `test-cancel-saga.js`, `test-nodes-monitor.js`, `test-grpc-inventory.js`) pasando sin errores.

> [!NOTE]
> **POLÍTICA DE CONTROL DE VERSIONES:**  
> Todos los cambios han sido desarrollados, compilados y verificados exclusivamente en el entorno local de desarrollo. El despliegue remoto a `main` se ejecutará de forma manual por el usuario.

---

## 🚀 Guía de Orientación Rápida

### Para Desarrolladores e Integradores
1. **Comprender el Alcance:** Leer [product-requirements.md](product-requirements.md) y [technical-requirements.md](technical-requirements.md).
2. **Respetar las Reglas:** Revisar [golden-rules.md](golden-rules.md). Cualquier PR o commit que viole estas reglas será rechazado.
3. **Conocer la Arquitectura:** Revisar [architecture/README.md](architecture/README.md) y los ADRs asociados antes de modificar componentes del backend o del gateway.
4. **Verificar el Estado Actual:** Consultar [context/active-context.md](context/active-context.md) para conocer el estado exacto de cada módulo y los comandos de prueba.
5. **Preparar la Defensa Oral:** Estudiar en profundidad [context/preguntas.md](context/preguntas.md) con las 25 preguntas y justificaciones teóricas del sílabo.

### Para Agentes de Inteligencia Artificial (AI Assistants)
1. Iniciar cada sesión leyendo [context/active-context.md](context/active-context.md) y [golden-rules.md](golden-rules.md).
2. Consultar [context/ai-constraints.md](context/ai-constraints.md) y [context/design-contracts.md](context/design-contracts.md) para respetar las capas y los límites de imports.
3. Actualizar [context/active-context.md](context/active-context.md) al culminar tareas significativas para mantener trazabilidad histórica.
