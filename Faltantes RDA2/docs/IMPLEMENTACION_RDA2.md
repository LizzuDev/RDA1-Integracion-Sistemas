# IMPLEMENTACIÓN COMPLETA DE LAS CONSIDERACIONES RDA2

**Proyecto:** Booking Prototipo - RDA2
**Fecha:** 2026-10-19
**Objetivo:** Implementar de forma detallada, precisa y completa todas las consideraciones RDA2

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura de Comunicación (gRPC + REST + HTTP/2)](#2-arquitectura-de-comunicación-grpc--rest--http2)
3. [Protocolo Buffers (.proto) - Contratos gRPC](#3-protocol-buffers-proto---contratos-grpc)
4. [Nodos, Auditoría, Trazabilidad y Archivos Logs](#4-nodos-auditoría-trazabilidad-y-archivos-logs)
5. [Microservicios, BD Separada y Middleware](#5-microservicios-bd-separada-y-middleware)
6. [Check-In Unificado](#6-check-in-unificado)
7. [Gestión de Autos: Estados, Flujo 2 Horas y Mantenimiento](#7-gestión-de-autos-estados-flujo-2-horas-y-mantenimiento)
8. [Categorías Recursivas de Atracciones + Levantamiento con Agente](#8-categorías-recursivas-de-atracciones--levantamiento-con-agente)
9. [Promociones y Paquetes](#9-promociones-y-paquetes)
10. [EDA, Orquestación, Coreografía, Sagas y Compensaciones](#10-eda-orquestación-coreografía-sagas-y-compensaciones)
11. [Videovigilancia: Botón de Auxilio, Falsos Positivos y Detección de Robo](#11-videovigilancia-botón-de-auxilio-falsos-positivos-y-detección-de-robo)
12. [Estandarización (OpenAPI 3.1, CloudEvents, W3C Trace Context)](#12-estandarización)
13. [SQL DDLs](#13-sql-ddls)
14. [Guía de Uso e Integración](#14-guía-de-uso-e-integración)

---
## 1. RESUMEN EJECUTIVO

La presente implementación consolida todos los requerimientos RDA2:

- **Comunicación híbrida:** gRPC (HTTP/2) para sincronización de inventario `web → Booking` y `inter-servicios`. **REST ÚNICAMENTE** para el envío de una compra. UI sigue consumiendo REST.
- **Trazabilidad por página individual (nodo):** Campos obligatorios `node_id`, `node_code`, `node_url_base`, `correlation_id`, `trace_id`, `span_id` propagados end-to-end.
- **Auditoría en archivos logs:** Prohibido persistir logs crudos en BD. Formato JSON Lines con rotación diaria/tamaño y retención configurable.
- **BD independiente por microservicio:** Sin compartir tablas. Integración vía middleware/API Composition/Eventos.
- **Dominios completos:** Check-in 4 dominios, autos (FSM + 2h), mantenimiento con km y características de llegada, atracciones con categorías recursivas, promociones/paquetes con contrato único y snapshot inmutable.
- **Transacciones distribuidas:** EDA + Orquestación + Coreografía + Sagas + Compensaciones idempotentes con verificación previa en pago.
- **Videovigilancia responsable:** Buffer circular 60s, análisis secuencia causal, reglas exclusión FP, Risk Score, **human-in-the-loop obligatorio** antes de escalar autoridades, búsqueda forense acotada (ropa/accesorios/fecha/hora/ubicación).

Todos los artefactos (proto, entidades, DTOs, SQL, servicios) se encuentran organizados en este repositorio.
EOF
echo "ok"