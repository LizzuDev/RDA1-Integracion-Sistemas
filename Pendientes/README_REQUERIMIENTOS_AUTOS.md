# Requerimientos de Ingeniería Inversa y Especificación Técnica — Vertical de Renta de Autos

**Plataforma de Referencia:** [Booking.com Car Rentals](https://www.booking.com/cars/index.es.html) (Modo Autenticado — Perfil *Semestre5 Grupal*)  
**Sistema Destino:** Booking Prototipo (Reto 2 - RDA2)  
**Ubicación:** `Pendientes/README_REQUERIMIENTOS_AUTOS.md`  
**Fecha:** Octubre 2026  

---

## 1. Resumen de Hallazgos de Booking.com Oficial (Vertical de Renta de Autos)

A partir de la inspección interactiva y extracción del DOM en producción mediante `browser_subagent`, se identificaron los siguientes patrones, comportamientos y estructuras de datos:

### 1.1 Buscador y Parámetros de Recogida (`/cars/index.es.html`)
- **Punto de Recogida y Devolución:**
  - Campo predictivo con autocompletado inteligente para aeropuertos internacionales (código IATA, ej. "UIO - Aeropuerto Internacional Mariscal Sucre, Quito"), estaciones y centros urbanos.
  - Checkbox interactivo: *"Devolver el auto en un lugar diferente"*. Al activarse, despliega un segundo campo de destino para devolución en otra ciudad u oficina de la misma red con recargo de tasa *One-Way*.
- **Selectores de Fechas y Horas:**
  - Selector de fecha de recogida y fecha de devolución.
  - Selectores desplegables de franja horaria en intervalos estrictos de **30 minutos** (ej. `09:00`, `09:30`, `10:00`, `10:30`, `11:00`).
- **Control de Edad del Conductor:**
  - Checkbox por defecto: *"Conductor entre 30 y 65 años"*.
  - Si se desmarca, se habilita un campo numérico obligatorio para ingresar la edad real del conductor. Si la edad es `< 25 años` o `> 70 años`, el sistema aplica un recargo obligatorio (*Young / Senior Driver Surcharge*).

### 1.2 Resultados y Filtros de Catálogo (`/cars/searchresults.es.html`)
- **Taxonomía de Categorías del Vehículo:**
  - *Pequeño / Económico:* Chevrolet Spark, Kia Picanto, Hyundai Grand i10 (ideal para ciudad, 4 plazas, 1-2 maletas).
  - *Mediano / Compacto:* Volkswagen Gol, Toyota Yaris, Renault Sandero (5 plazas, 2 maletas).
  - *Grande / Familiar:* Chevrolet Cruze, Toyota Corolla, Hyundai Elantra (5 plazas, 3 maletas).
  - *SUV / Todoterreno:* Chevrolet Tracker, Renault Duster, Toyota RAV4 (tracción alta, 5 plazas, 4 maletas).
  - *Furgoneta / Pasajeros:* Hyundai H1, Toyota Hiace (7 a 9 plazas, grupos y familias).
  - *Premium / Lujo:* Audi A4, BMW Serie 3, Mercedes-Benz Clase C.
- **Especificaciones Técnicas Visibles en Tarjeta:**
  - Transmisión: `Manual` vs `Automática`.
  - Capacidad de pasajeros: 👥 `4`, `5` o `7` asientos.
  - Puertas: 🚪 `2-3` o `4-5` puertas.
  - Equipaje: 🧳 `1 grande + 1 de mano` o `2 grandes + 2 de mano`.
  - Climatización: ❄️ `Aire acondicionado incluido`.
- **Insignias y Políticas de Transparencia:**
  - ⛽ **Política de Combustible:** *Lleno a lleno (Full-to-Full)* — Se entrega con tanque lleno y se devuelve lleno para evitar cobros de servicio por repostaje.
  - 🛣️ **Kilometraje:** *Kilometraje ilimitado* incluido en la tarifa.
  - 🔄 **Cancelación:** *Cancelación gratis hasta 48 horas antes de la recogida*.
- **Agencias Proveedoras Integradas:**
  - Calificación sobre 10 de agencias reconocidas (Hertz, Avis, Europcar, Budget, Localiza, Alamo, Sixt).
  - Indicador de ubicación del mostrador: *"En la terminal aérea"* vs *"Autobús de cortesía (Shuttle Bus)"*.

### 1.3 Ficha Técnica y Selección de Coberturas / Seguros (`/cars/[detalle]`)
- **Protección Básica (Incluida en Tarifa Base):**
  - Cobertura de Responsabilidad Civil a Terceros (TPL).
  - Cobertura Parcial por Colisión (CDW) y Protección contra Robo (TP) con **Franquicia Alta** (ej. $1,200.00 USD).
  - Requiere retención de **Depósito de Garantía reembolsable** en tarjeta de crédito física al momento de retirar el auto.
- **Cobertura Total / Protección Premium (Upgrade Recomendado):**
  - Elimina o reembolsa la franquicia en caso de siniestro.
  - Cubre partes críticas no amparadas por la básica: lunas/parabrisas, neumáticos, bajos del vehículo, techo, pérdida de llaves y gastos de remolque/grúa.
- **Instrucciones Claras de Recogida y Devolución:**
  - Horarios de oficina del proveedor, dirección física, política de gracia por retraso de vuelo y teléfono de asistencia 24/7.

### 1.4 Checkout, Datos del Conductor y Requisitos Obligatorios
- **Datos del Conductor Principal:**
  - Nombres y Apellidos exactos según constan en la licencia de conducir física.
  - Correo electrónico para entrega del voucher digital y factura.
  - Teléfono móvil con prefijo internacional E.164.
  - Número de Licencia de Conducir y país emisor.
  - Número de vuelo de llegada (opcional, permite a la agencia retener el vehículo si el vuelo sufre demoras).
- **Requisitos Obligatorios al Momento de la Recogida:**
  1. Licencia de conducir física vigente con antigüedad mínima de 1 o 2 años.
  2. Documento de identidad oficial (Cédula o Pasaporte).
  3. Tarjeta de crédito física a nombre del titular con cupo disponible para el depósito de garantía.

### 1.5 Reglas Específicas de Cátedra para RDA2 ([Consideraciones RDA2.md §5](file:///c:/Users/ASUS/Documents/6to%20Semestre/Integración%20Sistemas/proyecto/plantilla%20inicial/teoria/Consideraciones%20RDA2.md)):
1. **Máquina de Estados del Vehículo con Cooldown de 2 Horas:**
   - Flujo: `Listo para rentar` (DISPONIBLE) → `Reservado` (RESERVADO) → `Entregado al cliente` (ENTREGADO) → `En limpieza y revisión` (EN_LIMPIEZA) → **(Espera obligatoria de 2 horas)** → `Listo para rentar` (DISPONIBLE).
   - Durante las 2 horas de enfriamiento y limpieza, el vehículo **no aparece en los resultados de búsqueda**.
2. **Rol de Mantenimiento Vehicular:**
   - Acceso técnico para registrar: kilometraje del odómetro, condiciones físicas (abolladuras, rasguños, nivel de combustible).
   - Generación de alerta preventiva si `kilometraje_actual >= proximo_mantenimiento_km`.
3. **Check-in de Autos:**
   - Confirmación anticipada de licencia y datos para agilizar la entrega de llaves.

---

## 2. Historias de Usuario (HU) y Criterios de Aceptación Gherkin

### HU-AUT-01: Búsqueda de Vehículos por Ubicación, Fechas, Horas y Edad
```gherkin
Como usuario que necesita movilizarse en su destino
Quiero buscar autos de alquiler por ciudad o aeropuerto, fechas y tramos horarios de 30 minutos
Para comparar vehículos disponibles y verificar el precio total exacto.

Criterios de Aceptación:
Escenario 1: Búsqueda exitosa con conductor estándar (30 a 65 años)
  Dado que el usuario busca en "Aeropuerto de Quito (UIO)" del 2026-10-20 al 2026-10-23
  Y mantiene marcado el checkbox "Conductor entre 30 y 65 años"
  Cuando pulsa "Buscar autos"
  Entonces el sistema consulta el catálogo de vehículos disponibles
  Y excluye automáticamente vehículos que se encuentren en estado RESERVADO o EN_LIMPIEZA (cooldown de 2h)
  Y retorna código HTTP 200 OK con la lista de autos y filtros disponibles.

Escenario 2: Conductor joven menor de 25 años
  Dado que el usuario desmarca el checkbox de edad e ingresa 21 años
  Cuando ejecuta la búsqueda
  Entonces las tarifas retornadas incluyen el recargo por conductor novel
  Y se muestra la notificación explicativa correspondiente.
```

### HU-AUT-02: Ficha Técnica, Especificaciones y Selección de Cobertura
```gherkin
Como viajero evaluando un vehículo
Quiero revisar su capacidad de pasajeros, maletas, transmisión y elegir entre Protección Básica o Cobertura Total
Para viajar con tranquilidad y conocer el depósito retenido en tarjeta de crédito.

Criterios de Aceptación:
Escenario 1: Selección de Cobertura Total
  Dado que el cliente visualiza un vehículo SUV con tarifa base de $45.00/día (Protección Básica con franquicia de $1,000.00)
  Cuando selecciona la opción "Cobertura Total / Protección Premium (+ $18.00/día)"
  Entonces el total a pagar se incrementa proporcionalmente a los días de alquiler
  Y el resumen indica "Franquicia cero: sin responsabilidad económica por daños en carrocería y cristales".
```

### HU-AUT-03: Cooldown Obligatorio de 2 Horas Post-Devolución y Limpieza
```gherkin
Como sistema de gestión de flota de vehículos
Quiero que un auto devuelto entre en estado de limpieza durante exactamente 2 horas
Para garantizar la higienización del vehículo antes de que vuelva a estar disponible para alquiler.

Criterios de Aceptación:
Escenario 1: Bloqueo de auto en limpieza en el buscador
  Dado que un vehículo Chevrolet Tracker fue devuelto a las 14:00 horas y pasa a estado "EN_LIMPIEZA"
  Y su marca temporal de disponibilidad se fija para las 16:00 horas
  Cuando un cliente realiza una búsqueda de autos a las 14:30 horas
  Entonces el vehículo Chevrolet Tracker no aparece en los resultados de búsqueda disponibles.

Escenario 2: Liberación automática tras cumplirse las 2 horas
  Dado que transcurrieron las 2 horas de cooldown (16:01 horas)
  Cuando el cron de verificación o una nueva búsqueda se procesa
  Entonces el vehículo pasa automáticamente a estado "DISPONIBLE"
  Y vuelve a ser visible en el catálogo de reservas.
```

### HU-AUT-04: Rol de Mantenimiento Preventivo y Registro de Odómetro
```gherkin
Como técnico de mantenimiento del taller
Quiero ingresar el kilometraje del auto y registrar novedades físicas
Para programar los mantenimientos preventivos y advertir al equipo operativo.

Criterios de Aceptación:
Escenario 1: Registro de kilometraje con alerta preventiva
  Dado que el técnico autenticado registra odómetro en 10,050 km sobre un auto cuyo mantenimiento vence a los 10,000 km
  Cuando envía POST /api/v2/autos/:id/mantenimiento/registro
  Entonces el sistema actualiza el odómetro del vehículo
  Y activa la bandera de alerta "MANTENIMIENTO_REQUERIDO" en el dashboard administrativo
  Y escribe la auditoría correspondiente en logs/audit-*.log.
```

### HU-AUT-05: Checkout Seguro y Emisión de Voucher Digital con QR de Recogida
```gherkin
Como cliente formalizando el alquiler
Quiero ingresar los datos de mi licencia de conducir y recibir mi voucher digital con código QR
Para presentarlo en el mostrador de la agencia y retirar las llaves del vehículo.

Criterios de Aceptación:
Escenario 1: Confirmación de reserva y generación de voucher
  Dado que el cliente completó sus datos de conductor y efectuó el pago simulado
  Cuando el sistema confirma la reserva
  Entonces el vehículo pasa a estado "RESERVADO"
  Y la interfaz despliega el localizador PNR y el código QR de recogida
  Y se muestra el checklist de documentos requeridos en el mostrador.
```

---

## 3. Catálogo de Errores RFC 7807 (Problem Details)

```json
{
  "type": "https://api.booking.local/errors/vehicle-unavailable",
  "title": "Vehículo No Disponible para Renta",
  "status": 409,
  "detail": "El vehículo seleccionado se encuentra actualmente en ciclo de limpieza e inspección técnica (disponible en 1 hora y 20 minutos).",
  "instance": "/api/v2/autos/auto-suv-01/reservas",
  "code": "VEHICLE_IN_CLEANING_COOLDOWN",
  "timestamp": "2026-10-14T19:30:00Z"
}
```

| Código HTTP | Código Interno | Motivo y Escenario de Disparo |
|:---:|:---|:---|
| **400** | `INVALID_RENTAL_DATES` | Fecha de devolución anterior a la recogida o período menor a 24 horas. |
| **401** | `UNAUTHORIZED` | Acceso a endpoints de mantenimiento sin rol `tecnico_mantenimiento`. |
| **404** | `VEHICLE_NOT_FOUND` | Identificador de vehículo o reserva inexistente. |
| **409** | `VEHICLE_UNAVAILABLE` | El vehículo se encuentra reservado o en cooldown de limpieza de 2 horas. |
| **422** | `INVALID_DRIVER_LICENSE` | Licencia de conducir ausente o con formato no reconocido. |
| **503** | `SUPPLIER_TIMEOUT` | La agencia externa de autos no respondió en menos de 5 segundos. |

---

## 4. Bitácora de Archivos y Componentes Adaptados en el Repositorio

| Archivo | Capa / Dominio | Tipo de Modificación Realizada | Justificación Técnica |
|---|---|---|---|
| `frontend/src/pages/AutosPage.jsx` | Frontend (React) | Refactorización Completa | Eliminado `mockAutos`, integrados inputs reales de aeropuerto/ciudad, selectores de horas (30 min), checkbox de edad, pills de categorías y exclusión visual de autos en limpieza. |
| `frontend/src/pages/AutoDetail.jsx` | Frontend (React) | Refactorización Completa | Selector interactivo de cobertura (Básica vs Total), especificaciones técnicas, modales de recogida/devolución y apertura de voucher digital QR. |
| `frontend/src/components/AutoCard.jsx` | Frontend (React) | Componente UI Enriquecido | Insignias oficiales de transparencia (Lleno a lleno, cancelación gratis, mostrador en terminal) y cálculo dinámico de días de renta. |
| `frontend/src/components/AutoVoucherModal.jsx` | Frontend (React) | Componente Nuevo | Voucher digital con QR para autos, localizador PNR, checklist de mostrador y check-in digital express. |
| `frontend/src/services/autosApi.js` | Frontend (Servicio API) | Métodos v2 Agregados | Métodos para `getCoberturas`, `checkinAuto`, `registrarDevolucionAuto` y `registrarMantenimientoAuto`. |
| `src/modules/autos/autos.controller.ts` | Backend (NestJS Gateway) | Nuevos Endpoints v2 | Endpoints `/search`, `/:id/coberturas`, `/orders/create`, `/reservas/:id/checkin`, `/:id/devolucion` y `/:id/mantenimiento/registro`. |
| `src/modules/autos/autos.service.ts` | Backend (Lógica de Negocio) | Máquina de Estados & Cooldown | Ciclo de 2 horas post-limpieza (`disponible_desde`), exclusión en búsquedas, algoritmo de alerta preventiva de odómetro y logging Winston en disco. |
| `src/modules/autos/acl/autos-circuit-breaker.adapter.ts` | Backend (ACL Resiliencia) | Servicio Adaptador Nuevo | Circuit Breaker con timeout de 5s, normalización de teléfonos a E.164 y propagación de `Idempotency-Key` y `X-Correlation-Id`. |
| `src/modules/autos/entities/` | Backend (TypeORM) | Entidades Actualizadas/Nuevas | `Auto` con campos de ciclo de vida/odómetro, `OrderAuto` con PNR/cobertura/QR y `MantenimientoAuto` para bitácora técnica. |
| `src/modules/autos/autos.module.ts` | Backend (NestJS Módulo) | Módulo Actualizado | Registro de entidades, ACL Circuit Breaker, WinstonPhysicalLoggerService y exportación de servicios. |
| `database/autos_schema_v2.sql` | Base de Datos (PostgreSQL) | Script DDL | Esquema aislado `autos_schema` (Database-per-Service), flota con kilometraje, bitácora de mantenimiento y reservas. |
| `contracts/autos-openapi-v2.yaml` | Contrato OpenAPI | Especificación v2.0.0 | Contrato v2 con estados de limpieza, odómetro, coberturas, check-in express y respuestas RFC 7807. |

