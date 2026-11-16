# -*- coding: utf-8 -*-
"""
Constructor Maestro del Cuaderno Técnico RDA2 (22 Páginas)
Cuaderno de Integración de Sistemas — EPN
"""

import os
import json
from gen_week7 import get_week7_pages
from gen_week8 import get_week8_pages
from gen_week9 import get_week9_pages
from gen_week10 import get_week10_pages
from gen_week11 import get_week11_pages

PORTADA_Y_TOC = """# Cuaderno de Integración de Sistemas (RDA2)
## Dossier de Ingeniería de Integración, Arquitectura de Servicios y Observabilidad
**Institución:** Escuela Politécnica Nacional (EPN)  
**Facultad:** Facultad de Ingeniería de Sistemas  
**Materia:** Integración de Sistemas  
**Docente:** Ing. Damián Nicolalde  
**Proyecto:** Booking Central Prototipo (Plataforma Multimodal de Vuelos, Autos, Alojamientos y Atracciones)  
**Entorno Productivo:** Microsoft Azure App Services (`https://booking-core-api.azurewebsites.net`)  
**Fecha de Publicación:** Noviembre 2026  

---

### Índice General de las 22 Fichas Técnicas del Cuaderno

#### Semana 7 — Esquemas, Compatibilidad y Gestión de Contratos
- **Ficha 01 (Página 1):** Contratos REST vs. gRPC en Integración de Sistemas
- **Ficha 02 (Página 2):** Enfoques Schema-First vs. Code-First y Versionamiento de APIs
- **Ficha 03 (Página 3):** Formatos de Serialización y Esquemas: JSON Schema, Avro y Protobuf
- **Ficha 04 (Página 4):** Compatibilidad de Contratos, Evolución y Catálogo de Esquemas (Schema Registry)

#### Semana 8 — API Gateways y Service Mesh
- **Ficha 05 (Página 5):** Patrones de Integración en el Borde: API Gateway, BFF y Aggregator
- **Ficha 06 (Página 6):** Funcionalidades Clave de un API Gateway: Resiliencia y Transformación
- **Ficha 07 (Página 7):** Comparativa de Soluciones API Gateway en la Industria
- **Ficha 08 (Página 8):** Service Mesh: Concepto, Data Plane vs Control Plane, y Comparativa vs API Gateway

#### Semana 9 — Pruebas de Integración y Contract Testing
- **Ficha 09 (Página 9):** La Pirámide de Pruebas en Integración de Sistemas
- **Ficha 10 (Página 10):** Pruebas de Contrato con Pact y Consumer-Driven Contracts (CDC)
- **Ficha 11 (Página 11):** Contract-Driven Testing vs. Pruebas de Integración Tradicionales
- **Ficha 12 (Página 12):** Estrategias de Aislamiento y Dobles de Prueba (Test Doubles)
- **Ficha 13 (Página 13):** Integración de Pruebas de Contrato en Pipelines de CI/CD

#### Semana 10 — Observabilidad y Trazas Distribuidas
- **Ficha 14 (Página 14):** Los Tres Pilares de la Observabilidad: Logs, Métricas y Trazas
- **Ficha 15 (Página 15):** OpenTelemetry: Estándar Abierto de Observabilidad en Sistemas Distribuidos
- **Ficha 16 (Página 16):** Trazas Distribuidas en Acción: Ciclo de Vida de una Transacción Distribuida (Saga LIFO)
- **Ficha 17 (Página 17):** Stack de Observabilidad: Jaeger, Zipkin, ELK/EFK, Grafana y Telemetría del Sistema
- **Ficha 18 (Página 18):** Métricas Clave de Integración y Acuerdos de Servicio (SLI, SLO, SLA, Cooldown 2h)

#### Semana 11 — Seguridad en Integraciones
- **Ficha 19 (Página 19):** Mecanismos de Autenticación y Autorización: OAuth2, JWT y mTLS
- **Ficha 20 (Página 20):** Modelos de Control de Acceso: RBAC vs. ABAC en Arquitecturas Integradas
- **Ficha 21 (Página 21):** Seguridad en el Borde (WAF, Rate Limiting, Zero Trust) y Criptografía en Tránsito y Reposo
- **Ficha 22 (Página 22):** Seguridad en Brokers de Mensajería y Mitigación del OWASP API Security Top 10

---
"""

PAGE_BREAK = "\n\n<div style=\"page-break-after: always;\"></div>\n\n"

def build_cuaderno():
    pages = []
    pages.extend(get_week7_pages())
    pages.extend(get_week8_pages())
    pages.extend(get_week9_pages())
    pages.extend(get_week10_pages())
    pages.extend(get_week11_pages())

    assert len(pages) == 22, f"Se esperaban 22 páginas pero se tienen {len(pages)}"

    documento_completo = PORTADA_Y_TOC + PAGE_BREAK
    documento_completo += PAGE_BREAK.join(pages)

    # 1. Guardar en Workspace Root
    workspace_path = r"c:\Users\ASUS\Documents\6to Semestre\Integración Sistemas\proyecto\plantilla inicial\CUADERNO_RDA2_22_PAGINAS.md"
    with open(workspace_path, "w", encoding="utf-8") as f:
        f.write(documento_completo)
    print(f"Documento guardado en Workspace: {workspace_path}")

    # 2. Guardar en Artefactos
    artifact_dir = r"C:\Users\ASUS\.gemini\antigravity\brain\57a7869d-e7f6-44cf-8981-9375339be2e1"
    artifact_path = os.path.join(artifact_dir, "cuaderno_integracion_rda2_22_paginas.md")
    with open(artifact_path, "w", encoding="utf-8") as f:
        f.write(documento_completo)
    print(f"Documento guardado en Artefactos: {artifact_path}")

    # 3. Guardar Metadatos del Artefacto
    meta_path = artifact_path + ".metadata.json"
    metadata = {
        "RequestFeedback": False,
        "Summary": "Cuaderno Técnico Completo de Integración de Sistemas (RDA2) de 22 páginas exhaustivas, cubriendo las Semanas 7 a 11 con fundamentos teóricos, arquitectura, ubicación en código, fragmentos técnicos, justificación de diseño, diagramas Mermaid y auditoría/telemetría.",
        "UserFacing": True
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Metadatos del artefacto guardados en: {meta_path}")

    # Estadísticas del documento
    lines = documento_completo.splitlines()
    words = documento_completo.split()
    print(f"Estadísticas: {len(pages)} páginas | {len(lines)} líneas | {len(words)} palabras | {len(documento_completo.encode('utf-8')) / 1024:.2f} KB")

if __name__ == '__main__':
    build_cuaderno()

