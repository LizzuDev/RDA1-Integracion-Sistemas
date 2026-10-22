# Reglas de Oro — Booking Prototipo (Plataforma Central Integradora)

Estas reglas son **ESTRICTAMENTE INNEGOCIABLES**. Protegen la integridad del sistema, garantizan el cumplimiento de los criterios de evaluación del sílabo (RDA1 y RDA2), y aseguran un diseño arquitectónico determinista, seguro, resiliente y desacoplado.

Si cualquier regla entra en conflicto con una propuesta de implementación: **DETENER** la codificación y revisar los requerimientos normativos de la asignatura.

---

## 1. Reglas Meta (Metodología de Trabajo y Sesiones de IA)

### Regla 1: Cargar Siempre el Contexto Activo al Iniciar
Cada sesión de desarrollo asistido por IA o relevo técnico debe comenzar consultando `context/active-context.md` y `golden-rules.md`.
- **Por qué existe:** Evita tomar decisiones basadas en información obsoleta o asumir que faltan módulos que ya fueron completados y probados.
- **Obligatorio:** Leer el estado actual del proyecto antes de escribir o modificar código.

### Regla 2: Mantener el Contexto Actualizado
Cualquier decisión arquitectónica, adición de endpoints, cambio en los contratos o resolución de vulnerabilidades debe reflejarse en `context/active-context.md`.
- **Por qué existe:** Permite que cualquier miembro del equipo o nuevo agente de IA retome el trabajo sin duplicar esfuerzo ni romper acuerdos previos.

### Regla 3: Respetar la Arquitectura Definida
Todo el código debe ajustarse a las fronteras y patrones establecidos en `architecture/README.md` y en los ADRs correspondientes.
- **Por qué existe:** Previene la entropía del código y mantiene la separación entre la capa de presentación (Frontend React), el Gateway/BFF (NestJS), y las tiendas externas.

### Regla 4: Diseñar Antes de Implementar
Para requerimientos complejos (ej. nuevo protocolo gRPC, máquina de estados, jerarquías recursivas, sagas compensatorias), se debe elaborar o revisar la sesión de diseño correspondiente antes de tocar el código base.

### Regla 5: Verificación de Calidad antes de Entregar
Ninguna funcionalidad se considera terminada hasta que pase la suite de pruebas automatizadas (`npm run build`, `npm run build` en frontend, y los scripts en `test/*.js`), garantizando **0 errores de TypeScript y 0 regresiones**.

---

## 2. Reglas Específicas del Proyecto (Booking Prototipo — RDA1 & RDA2)

### Regla 6: Aislamiento Estricto de Base de Datos por Microservicio (Database-per-Service)
- **Principio:** Cada microservicio es el **único dueño** de su esquema de persistencia.
- **Prohibido:** Está rotundamente prohibido que un módulo acceda directamente a las tablas o entidades TypeORM de otro módulo (ej. `AdminModule` accediendo directamente a `OrderAuto` o tablas de atracciones).
- **Obligatorio:** Cualquier cruce de información entre dominios debe realizarse en la **capa de aplicación / middleware**, consumiendo las interfaces públicas (APIs internas o servicios inyectados) del módulo correspondiente.

### Regla 7: Asimetría Estricta de Protocolos de Comunicación
- **Inbound (Tiendas Externas → Booking):** Las tiendas individuales de los compañeros deben notificar su stock y disponibilidad en tiempo real mediante **gRPC** en el puerto `50051` (`src/proto/inventory.proto`), utilizando la RPC unaria `PushStockUpdate` o streaming continuo `StreamInventoryChanges`.
- **Outbound (Booking → Tiendas Externas):** El Booking Prototipo solo realiza llamadas **REST** hacia las tiendas externas cuando un usuario confirma una transacción de compra (`POST /orders`, `POST /reservations`).
- **Prohibido:** No utilizar polling REST constante hacia las tiendas externas para consultar inventario.

### Regla 8: Auditoría y Trazabilidad en Archivos Físicos (NO en Base de Datos)
- **Principio:** Los registros de auditoría técnica, eventos de integración y trazas no deben competir por I/O ni espacio con la base de datos relacional transaccional.
- **Obligatorio:** Utilizar un sistema de logging basado en archivos físicos rotativos diarios (Winston Daily Rotate File) en el directorio `logs/`:
  - `logs/audit-YYYY-MM-DD.log`: Operaciones administrativas, conmutaciones de Kill-Switches y eventos de compensación de Sagas.
  - `logs/integration-YYYY-MM-DD.log`: Llamadas entrantes gRPC y salientes REST con latencias y códigos de estado.
  - `logs/app-YYYY-MM-DD.log`: Errores y eventos generales del runtime.
- **Prohibido:** Insertar logs de llamadas HTTP o eventos masivos en tablas de PostgreSQL.

### Regla 9: Retrocompatibilidad y Versionamiento Semántico de Contratos (v1 → v2)
- **Principio:** La introducción de nuevas versiones de contrato nunca debe romper los clientes existentes.
- **Obligatorio:** Las rutas `/api/v1/...` deben continuar operando con la cabecera `X-API-Deprecation-Date: 2027-12-31`, mientras se exponen concurrentemente las rutas `/api/v2/...` enriquecidas.
- **Garantía:** Los contratos OpenAPI v2 y los archivos `.proto` deben estar libres de errores de sintaxis y validados contra el estándar.

### Regla 10: Máquina de Estados Finita y Tiempo de Enfriamiento en Alquiler de Autos
- **Principio:** El inventario de vehículos debe gobernarse por una máquina de estados finita formal con transiciones validadas:
  `DISPONIBLE` → `RESERVADO` → `LISTO_PARA_ENTREGAR` → `ENTREGADO` → `EN_LIMPIEZA` → (`DISPONIBLE` o `EN_MANTENIMIENTO`).
- **Regla Crítica de Negocio:** Al recibir la devolución de un vehículo, este pasa forzosamente al estado `EN_LIMPIEZA` durante un **período mínimo de 2 horas**.
- **Prohibido:** Un vehículo no puede volver a estar disponible inmediatamente tras una renta sin cumplir el tiempo de inspección y limpieza.

### Regla 11: Idempotencia y Manejo de Errores Estándar (RFC 7807)
- **Obligatorio:** Todas las operaciones de escritura que involucren transacciones de dinero, reservas o cancelaciones deben soportar la cabecera `Idempotency-Key` para evitar cobros dobles por reintentos de red.
- **Formato de Error:** Todo error HTTP devuelto por el Gateway o los módulos debe implementar la especificación **RFC 7807 (Problem Details)** (`type`, `title`, `status`, `detail`, `instance`, `invalidParams`).

### Regla 12: Resiliencia del Gateway (BFF) y Circuit Breaker en Nodos
- **Obligatorio:** Cada llamada saliente a las APIs externas de los compañeros debe tener un timeout estricto de **5 segundos**.
- **Manejo de Fallas:** Si una tienda externa no responde o falla reiteradamente, el BFF debe aplicar Circuit Breaker (`CLOSED`, `OPEN`, `HALF_OPEN`, `MANUALLY_OPEN`), activando el semáforo rojo en el panel admin y respondiendo al usuario con catálogo cacheado de forma degradada elegante.

### Regla 13: Integridad de Flujos Operativos y Check-in
- **Obligatorio:** Se debe proveer un flujo de check-in independiente y funcional para las 4 verticales (Alojamientos, Atracciones, Autos y Vuelos).
- **Validación:** El check-in solo es válido si la reserva se encuentra en estado confirmado y dentro de la ventana temporal correspondiente, emitiendo una confirmación digital (voucher con QR o pase de abordar).

### Regla 14: Sagas y Compensaciones Atómicas en Cancelaciones (B-01)
- **Obligatorio:** Toda cancelación de una reserva confirmada (Atracciones, Autos, etc.) debe ejecutar el patrón Saga Compensatoria:
  1. Restituir atómicamente los cupos o vehículos al inventario disponible (`stock += tickets`).
  2. Emitir comprobante formal de reembolso monetario del 100% (`REF-ATR-...`).
  3. Notificar al sistema externo del compañero (vía adaptador ACL) la liberación del recurso.
  4. Registrar la compensación en el archivo físico de auditoría (`logs/audit-YYYY-MM-DD.log`).
- **Prohibido:** No se puede marcar una reserva como `CANCELLED` sin liberar el stock y sin calcular el reembolso para el cliente.

### Regla 15: Sanitización Estricta y Límites en Entradas de Usuario (V-01 a V-07)
- **Obligatorio:** Todo campo de texto expuesto al usuario debe tener:
  - Límite estricto `maxLength` (Buscador: 60 chars; Requerimientos: 250 chars; Documentos: 20 chars; Licencia: 25 chars; Días: 1..30; Edad: 18..99).
  - Colapso reactivo de espacios múltiples (`replace(/\s{2,}/g, ' ')`) en cliente y backend (`@Transform`).
  - Validación de aforo previo: no permitir solicitar más entradas que los cupos disponibles en el turno horario seleccionado.
  - Alertas de error permanentes con atributos de accesibilidad (`role="alert"`, `aria-live="assertive"`, `aria-invalid="true"`).

### Regla 16: Blindaje de Tipos Fuertes y Consultas UUID en PostgreSQL (V-05)
- **Principio:** PostgreSQL rechaza con error 500 (`QueryFailedError: invalid input syntax for type uuid`) cualquier consulta SQL directa con valores no-UUID contra columnas de tipo `uuid`.
- **Obligatorio:** Siempre verificar el formato mediante expresión regular (`isUuid`) antes de invocar `findOneBy({ id })`. Si el valor es un identificador alfanumérico o PNR corto, utilizar consultas por lista o normalización determinista hash MD5 a UUID canónico.

---

## 3. Principio Fundamental de Ingeniería

> **"Preferir la claridad sobre la magia, el desacoplamiento real sobre la conveniencia temporal, y los contratos explícitos sobre la suposición."**  
> Todo cambio en el repositorio debe mejorar la estabilidad, la trazabilidad y la defensa académica del proyecto.
