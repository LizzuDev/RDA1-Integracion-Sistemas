# ai_development/ — Recursos para Agentes de IA

> **Proyecto:** Booking Prototipo (Plataforma Central Integradora)  
> **Asignatura:** Integración de Sistemas — 6to Semestre

Este directorio proporciona las definiciones de roles, estándares de codificación por lenguaje y flujos de trabajo estructurados para guiar el desarrollo asistido por Inteligencia Artificial en este repositorio.

---

## Estructura del Directorio

```text
ai_development/
├── README.md       ← Este archivo
├── agents/         ← Definición de roles de IA (Architect, Engineer, Reviewer)
├── languages/      ← Estándares y convenciones por lenguaje de programación
│   ├── README.md
│   ├── TEMPLATE.md
│   └── typescript/
│       └── conventions.md  ← Convenciones para TypeScript, NestJS y React
└── workflows/      ← Comandos y flujos de trabajo ($prepare, $design-session, $deliver, etc.)
```

---

## Uso Recomendado para Asistentes de IA

1. **Seleccionar Rol:** Cargar la guía del rol correspondiente (`architect.md` para diseño de sistemas, `engineer.md` para codificación, `architect-reviewer.md` para auditoría de calidad).
2. **Aplicar Convenciones:** Consultar `languages/typescript/conventions.md` para asegurar consistencia en nomenclatura, tipado estricto y manejo de errores.
3. **Respetar Flujos:** Seguir los flujos de trabajo definidos en `workflows/` al iniciar o culminar tareas de desarrollo.
