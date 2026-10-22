# DIRECTIVA OBLIGATORIA - AGENTE DE LEVANTAMIENTO DE REQUISITOS FUNCIONALES

> Conforme a Consideraciones RDA2 Sección 6 y 8

## 1. PRINCIPIOS ÉTICOS Y LEGALES (CRAWLING)

1. **LEER `robots.txt` OBLIGATORIAMENTE** antes de cualquier navegación.
   - URL: `https://<dominio>/robots.txt`
   - Analizar: User-agent, Disallow, Allow, Crawl-delay, Sitemap
2. **RESPETO ABSOLUTO**. **Nunca ignorar `Disallow`**.
3. **CUMPLIR `Crawl-delay`**. Aplicar throttling responsable (no sobrecargar servidor).
4. **ALTERNATIVA OBLIGATORIA ANTE BLOQUEO**. Si `robots.txt` bloquea completamente para el agente, o existen anti-bot (rate-limit/CAPTCHA/JS challenge) que impiden navegación pública válida, **BUSCAR OTRA PÁGINA WEB PÚBLICA** con estructura funcional equivalente. **NO FORZAR ACCESO**.
5. **SOLO CONTENIDO PÚBLICO**. No acceder a áreas autenticadas/privadas/datos sensibles.
6. **TRANSPARENCIA TOTAL**. Documentar todo en `robots_evaluacion.md`.

## 2. OBJETIVO

Levantar RF, RNF, Casos de Uso, Flujos, Entidades, UI/UX para módulo **Atracciones** con jerarquía de categorías (tabla padre-hija recursiva).

## 3. PASOS OBLIGATORIOS

### PASO 1 - Evaluación Inicial
- Leer `robots.txt`. Si bloqueado → buscar alternativa pública + justificar.
- Registrar hallazgos en `robots_evaluacion.md` (dominio, reglas, decisión, alternativa).

### PASO 2 - Navegación Completa
Mapear sitio público: home, menús, footer, categorías, listado, detalle, búsqueda/filtros, reserva, checkout, políticas, FAQ, horarios, cupos, precios.

### PASO 3 - Extracción
RF/RNF, actores, casos de uso, flujos (happy path + errores), entidades. Incluir: inclusiones (comida/transporte/guía), restricciones, políticas cancelación.

### PASO 4 - Diagrama Conceptual
Generar diagrama conceptual que refleje **categoria_atraccion (padre-hija recursiva)**, atracción, tarifas, horarios, cupos, reservas/boletos, proveedor, inclusiones.
- Formato: **Mermaid** (`diagrama_conceptual.mmd`)
- Incluir descripción narrativa.

### PASO 5 - Base en Prototipo de Dylan
- Usar **Prototipo de Dylan** como BASE (componentes, layout, design system, tokens, estados UI, patrones UX).
- Crear matriz: `Prototipo ↔ RF ↔ Pantallas ↔ Componentes`
- Identificar gaps + propuestas adaptación mínimas.

### PASO 6 - Entregables Mínimos
1. `requisitos_funcionales.md`
2. `requisitos_no_funcionales.md`
3. `casos_uso.md`
4. `inventario_pantallas.md`
5. `mapa_navegacion.json`
6. `diagrama_conceptual.mmd`
7. `matriz_prototipo_dylan.md`
8. `robots_evaluacion.md`
9. `backlog_sugerido.md` (Épicas/User Stories + Criterios Aceptación)
10. Trazabilidad: URLs públicas navegadas (SIN PII)

## 4. CATEGORÍAS RECURSIVAS (Modelo Obligatorio)
Usar estructura `padre_id` (FK self-referencing), `nivel`, `ruta_categoria`, flags `incluye_comida`, `incluye_transporte`, `incluye_guia`. Usar CTEs recursivas. Flags explícitos (no herencia automática).

## 5. PRINCIPIO DE CUMPLIMIENTO
**Cumplimiento antes que automatización.**
EOF
echo "ok"