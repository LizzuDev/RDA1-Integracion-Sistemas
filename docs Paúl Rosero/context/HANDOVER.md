# Documento de Traspaso Técnico (HANDOVER) — Booking Prototipo

> **Proyecto:** Booking Prototipo (Plataforma Central Integradora)  
> **Asignatura:** Integración de Sistemas — 6to Semestre  
> **Fase:** RDA1 y RDA2 Completados, Blindados y Verificados al 100%  
> **Destinatario:** Siguiente ingeniero, colaborador o agente de IA  
> **Fecha:** 19 de Octubre, 2026

---

## 1. 🎯 Estado Exacto de la Plataforma

Tanto el **Reto 1 (RDA1)** como el **Reto 2 (RDA2)** están **100% implementados, probados, blindados y listos para la defensa académica**:
- **Backend NestJS (API Gateway / BFF Híbrido):** 
  - Expone APIs REST versionadas en `/api/v1` y `/api/v2`.
  - Levanta un servidor gRPC Inbound en el puerto TCP `50051` (`InventoryStockService`, `inventory.proto`).
  - Orquesta cancelaciones compensatorias bajo el **Patrón Saga** con reverso de stock y cálculo de reembolso.
  - Implementa un **Monitor de 5 Nodos** (`atracciones`, `autos`, `alojamientos`, `vuelos`, `grpc_inventory`) con Circuit Breakers y kill-switches dinámicos.
  - Almacena auditoría exclusivamente en archivos de texto planos bajo `logs/` mediante Winston (cero escrituras en PostgreSQL).
  - Compila con 0 errores de TypeScript (`npm run build`).
- **Frontend React (Vite):** 
  - UI pixel-perfect basada en Booking.com (Hero azul, filtros, buscador integrado, modales accesibles).
  - Componente `OfflineBanner.jsx` con detección reactiva de red para resiliencia PWA.
  - Botón de cancelación de reserva con modal de confirmación y recarga fluida de estado.
  - Tarjetas de monitoreo de 5 nodos con focos LED semafóricos (🟢/🟡/🔴) e interruptores de conexión en caliente en `AdminDashboard.jsx`.
  - Formularios sanitizados con `maxLength`, colapso de espacios en blanco y feedback de error dinámico acorde a las 10 Heurísticas de Nielsen.
  - Compila con 0 errores (`npm run build` en ~675ms).
- **Base de Datos (Supabase):** PostgreSQL activo en la nube con esquemas TypeORM aislados por microservicio (Database-per-Service).
- **Pruebas Automatizadas:** 100% de éxito en todas las suites de prueba (`test-sanitization-rfc7807.js`, `test-cancel-saga.js`, `test-nodes-monitor.js`, `test-grpc-inventory.js`).

---

## 2. 📋 Implementaciones Críticas que NO Deben Alterarse

El siguiente equipo o agente **NO debe sobrescribir ni revertir** las siguientes soluciones de blindaje:
1. **Validación de Sintaxis UUID en PostgreSQL (V-05):** Las funciones `reservar`, `cancelarReserva`, `getReservaById` y `checkin` en `AtraccionesService` verifican primero la expresión regular de UUID. No eliminar esta guarda porque evita que PostgreSQL arroje excepciones internas `QueryFailedError` (HTTP 500).
2. **Patrón Saga e Idempotencia:** La cancelación no debe convertirse en un simple `DELETE` o cambio de estado. Debe mantener el reverso de cupos (`cupos += tickets`), el comprobante `REF-ATR-...` y el bloqueo de doble cancelación (`ALREADY_REFUNDED`).
3. **Servidor gRPC en main.ts:** No remover la llamada a `app.connectMicroservice` ni desacoplar el puerto `50051`.
4. **Política de Cero Logs en BD:** No redirigir los logs de Winston a tablas de PostgreSQL. Las trazas de auditoría deben permanecer exclusivamente en el sistema de archivos físicos.
5. **Circuit Breakers y Kill-Switches:** No eliminar `ConnectorHealthService` ni el estado `MANUALLY_OPEN` que permite desconectar servicios externos desde la UI.

---

## 3. ⚠️ REGLA CARDINAL DE CONTROL DE VERSIONES (GIT)

> [!CAUTION]
> **PROHIBIDO EJECUTAR `git push origin main` O PUSH REMOTO AUTOMÁTICO.**
> El usuario ha especificado expresamente: *"no subas nada tu al main yo lo haré manualmente"*.
> Todos los cambios deben permanecer en el espacio de trabajo local para que el usuario pueda revisarlos, hacer el commit y ejecutar el `git push` de forma manual.

---

## 4. 🧪 Guía Rápida para Ejecutar y Verificar Pruebas

Para constatar que todo el sistema continúa blindado y operativo, ejecutar los siguientes comandos desde la terminal:

```powershell
# 1. Verificar compilación limpia del backend
npm run build

# 2. Verificar compilación limpia del frontend
cd frontend
npm run build
cd ..

# 3. Ejecutar suite de pruebas de sanitización y RFC 7807
node test/test-sanitization-rfc7807.js

# 4. Ejecutar suite de pruebas del Patrón Saga y cancelaciones
node test/test-cancel-saga.js

# 5. Ejecutar suite de pruebas del monitor de 5 nodos y kill-switches
node test/test-nodes-monitor.js

# 6. Ejecutar suite de pruebas de conexión y streaming gRPC
node test/test-grpc-inventory.js
```

---

## 5. 📞 Contactos y Roles del Ecosistema

- **Paúl Rosero (Líder Técnico & Arquitecto):** Responsable del API Gateway híbrido, gRPC (puerto 50051), orquestador Saga, máquina de estados de flota vehicular y panel de nodos.
- **Alejo:** Integración del microservicio de Vuelos (puerto REST y check-in).
- **Lizz:** Integración del microservicio de Alojamientos (puerto REST, check-in 14:00 y check-out).
