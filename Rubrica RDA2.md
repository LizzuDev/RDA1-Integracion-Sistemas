---
title: "Condición habilitante obligatoria (criterio excluyente)"
type: "criterio excluyente"
evaluation_scale: "Cumple / No cumple"
evaluation_type: "Binaria con condición habilitante excluyente"
max_score: 11
enabling_condition: "Todas las tiendas/sistemas individuales del curso se encuentran integradas funcionalmente con Booking Prototipo y operativas durante la demostración. Si es No → Calificación final del curso/grupo = 0."
rubric:
  - id: CE01
    criterion: "Todas las tiendas del curso están integradas funcionalmente con Booking Prototipo (criterio obligatorio excluyente)"
    mandatory: true
    scores:
      no_cumple: 0
      cumple: 1
  - id: CE02
    criterion: "Cada sistema migró correctamente a arquitectura de microservicios"
    mandatory: false
    scores:
      no_cumple: 0
      cumple: 1
  - id: CE03
    criterion: "El Booking Prototipo consume correctamente APIs y/o eventos de los sistemas integrados"
    mandatory: false
    scores:
      no_cumple: 0
      cumple: 1
  - id: CE04
    criterion: "El marketplace web integrado funciona correctamente en entorno distribuido"
    mandatory: false
    scores:
      no_cumple: 0
      cumple: 1
  - id: CE05
    criterion: "El sistema de administración continúa operativo bajo arquitectura distribuida"
    mandatory: false
    scores:
      no_cumple: 0
      cumple: 1
  - id: CE06
    criterion: "Existe API Gateway funcional y correctamente configurado"
    mandatory: false
    scores:
      no_cumple: 0
      cumple: 1
  - id: CE07
    criterion: "Los contratos entre servicios están documentados y versionados"
    mandatory: false
    scores:
      no_cumple: 0
      cumple: 1
  - id: CE08
    criterion: "Se evidencian pruebas de integración funcionales entre sistemas"
    mandatory: false
    scores:
      no_cumple: 0
      cumple: 1
  - id: CE09
    criterion: "Se implementaron mecanismos básicos de seguridad (JWT, autenticación, roles o protección de APIs)"
    mandatory: false
    scores:
      no_cumple: 0
      cumple: 1
  - id: CE10
    criterion: "Todos los sistemas están desplegados y accesibles en Internet durante la presentación"
    mandatory: false
    scores:
      no_cumple: 0
      cumple: 1
  - id: CE11
    criterion: "El estudiante demuestra dominio técnico del código fuente, integración y arquitectura durante la defensa"
    mandatory: false
    scores:
      no_cumple: 0
      cumple: 1
---

# Condición habilitante obligatoria (criterio excluyente)

## Criterio excluyente

| Criterio excluyente | Verificación | Resultado |
|---|---|---|
| Todas las tiendas/sistemas individuales del curso se encuentran integradas funcionalmente con Booking Prototipo y operativas durante la demostración | Sí / No | Si es No → Calificación final del curso/grupo = 0 |

## Justificación académica del criterio excluyente

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

| ID | Criterio | Evaluación | Puntos si No cumple | Puntos si Cumple |
|---|---|---|---|---|
| CE01 | Todas las tiendas del curso están integradas funcionalmente con Booking Prototipo (criterio obligatorio excluyente) | Cumple / No cumple | 0 | 1 |
| CE02 | Cada sistema migró correctamente a arquitectura de microservicios | Cumple / No cumple | 0 | 1 |
| CE03 | El Booking Prototipo consume correctamente APIs y/o eventos de los sistemas integrados | Cumple / No cumple | 0 | 1 |
| CE04 | El marketplace web integrado funciona correctamente en entorno distribuido | Cumple / No cumple | 0 | 1 |
| CE05 | El sistema de administración continúa operativo bajo arquitectura distribuida | Cumple / No cumple | 0 | 1 |
| CE06 | Existe API Gateway funcional y correctamente configurado | Cumple / No cumple | 0 | 1 |
| CE07 | Los contratos entre servicios están documentados y versionados | Cumple / No cumple | 0 | 1 |
| CE08 | Se evidencian pruebas de integración funcionales entre sistemas | Cumple / No cumple | 0 | 1 |
| CE09 | Se implementaron mecanismos básicos de seguridad (JWT, autenticación, roles o protección de APIs) | Cumple / No cumple | 0 | 1 |
| CE10 | Todos los sistemas están desplegados y accesibles en Internet durante la presentación | Cumple / No cumple | 0 | 1 |
| CE11 | El estudiante demuestra dominio técnico del código fuente, integración y arquitectura durante la defensa | Cumple / No cumple | 0 | 1 |

## Resumen de puntuación

- **Total máximo:** 11 puntos.
- **Cada criterio:** 0 puntos si No cumple; 1 punto si Cumple.
- **Condición habilitante excluyente:** CE01. Si CE01 no cumple, la calificación final del curso/grupo es 0 y no se evalúan los demás criterios.