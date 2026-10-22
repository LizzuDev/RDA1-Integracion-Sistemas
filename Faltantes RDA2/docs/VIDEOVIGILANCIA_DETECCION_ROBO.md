# VIDEOVIGILANCIA - Detección de Robo, Falsos Positivos y Búsqueda de Sospechosos

> Enfoque RESPONSABLE, ÉTICO. Sistema de APOYO. **Human-in-the-loop OBLIGATORIO** antes de escalar a autoridades.

## 1. Botón de Auxilio en Buses

- Botón con confirmación anti-activación accidental (pulsación 2–3s o doble pulsación).
- Al activar: `BotonAuxilioActivado` (evento CloudEvents), geolocalización bus, vincular cámaras (interior/exterior).
- **NO ESCALAR AUTOMÁTICAMENTE**. Siempre encolar para revisión humana obligatoria.
- Tras validación positiva → notificar autoridades con clip seguro + datos mínimos.

## 2. Buffer Circular y Retroceso Temporal

- **Buffer circular 60 segundos hacia atrás** por cámara (configurable 30–90s).
- Al detectar anomalía → extraer `[-60s, 0] + [0, +15s/+30s]` → generar **clip candidato** unificado.
- Persistir **SOLO** al generar candidato (no todo continuo).
- Sin interrumpir visualización tiempo real.

## 3. Análisis de Secuencia Causal (Clave para EVITAR Falsos Positivos)

**NO detectar "personas corriendo". Detectar:** `acercamiento → amenaza/forcejeo → arranque súbito → huida`

Factores discriminantes:
- Interacción física/contacto en ventana [-60s,0] → **CRÍTICO**
- Forcejeo por objeto (bolso/celular) → **CRÍTICO**
- Dinámica asimétrica 1–2 personas
- Cambio brusco dirección / evasivo
- Grupo >=3 corriendo misma dirección → **EXCLUIR/BAJAR SCORE** (patrón deportivo)
- Sin interacción previa → **requiere evidencia fuerte**
- Uso celular → **solo factor contextual**, NUNCA disparador único

## 4. Risk Score y Umbrales

- < 40: Baja probabilidad → NO alerta automática
- 40–69: Sospechoso → **Revisión humana OBLIGATORIA**. No escalar
- >= 70: Alto riesgo → Candidato + **Revisión humana OBLIGATORIA**. **NUNCA** escalado automático

**REGLA INQUEBRANTABLE:** Human-in-the-loop obligatorio para cualquier propuesta de escalado a autoridades.

## 5. Reglas de Exclusión (Minimizar Falsos Positivos)

- Grupo >=3 corriendo misma dirección/trayectoria → bajar score drásticamente
- Carrera sin interacción física en [-60s,0] → descartar candidato automático o score bajo
- Movimiento cíclico/repetido (juego) → excluir
- Zona deportiva + horario típico ejercicio → peso negativo
- Sprint < 2–3s sin interacción → baja probabilidad
- Separación natural vs separación brusca post-forcejeo → diferenciar

## 6. Búsqueda de Sospechosos (Forense, Acotada)

Filtros permitidos: **fecha (rango UTC), hora (rango), ubicación/zona/cámara/bus, ropa (atributos visuales), accesorios (atributos visuales), trayectoria**.

Requisitos:
- **POST-INCIDENTE**. No búsqueda masiva en tiempo real.
- **Autorización por rol** (SEGURIDAD/INVESTIGACION) + **justificación obligatoria**.
- **Auditoría completa**: quién, filtros, rango, IP, motivo, expediente, resultados, timestamps, trazas.
- **Minimización datos**: atributos necesarios. Sin indexado facial masivo no justificado.
- **Acceso restringido a video**: enlaces con TTL, auditoría descarga/visualización.
- **Todo registro en auditoría con node_id/correlation_id/trace_id**.

## 7. Pipeline de Detección

1. Detección movimiento (flow/velocidad relativa)
2. Tracking personas (multi-object con ID persistente)
3. Detección interacción (proximidad/contacto/solapamiento)
4. Análisis temporal retroceso [-60s,0]
5. Clasificación contextual
6. Aplicar reglas exclusión
7. Risk Score
8. Generar candidato (clip pre+post + metadatos)
9. **Revisión humana OBLIGATORIA**
10. **Solo tras validación humana** → escalar autoridades

## 8. Privacidad y Seguridad

- Minimización por diseño
- Acceso por "necesidad de saber"
- Retención acotada a incidentes/casos
- Todos accesos auditados (archivos logs - NO BD)
- Clips seguros, enlaces temporales
- Enmascaramiento en logs
EOF
echo "ok"