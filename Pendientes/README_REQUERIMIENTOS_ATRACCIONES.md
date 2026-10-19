# Requerimientos de Ingeniería Inversa y Especificación Técnica — Vertical de Atracciones

**Plataforma de Referencia:** [Booking.com Attractions](https://www.booking.com/attractions/index.es.html) (Modo Autenticado — Perfil *Semestre5 Grupal*)  
**Sistema Destino:** Booking Prototipo (Reto 2 - RDA2)  
**Ubicación:** `Pendientes/README_REQUERIMIENTOS_ATRACCIONES.md`  
**Fecha:** Octubre 2026  

---

## 1. Resumen de Hallazgos de Booking.com Oficial (Vertical de Atracciones)

A partir de la inspección interactiva y extracción del DOM en producción mediante `browser_subagent`, se identificaron los siguientes patrones, comportamientos y estructuras de datos:

### 1.1 Discovery, Buscador y Categorías (`/attractions/index.es.html`)
- **Hero Buscador:**
  - Input predictivo de destinos con soporte de búsqueda fonética y sugerencias enriquecidas por localidad geográfica (ej. "Quito, Pichincha, Ecuador" con conteo de experiencias disponibles).
  - Selector de fechas con mini-calendario modal que admite selección de fecha puntual o ventana flexible.
  - Validación de caracteres alfabéticos y control de espacios en blanco.
- **Taxonomía Jerárquica de Categorías:**
  - Estructura recursiva de categorías padre-hija:
    - *Tours y Experiencias* → *Tours Gastronómicos*, *Tours a Pie*, *Tours Históricos*.
    - *Museos y Cultura* → *Galerías de Arte*, *Sitios Arqueológicos*.
    - *Naturaleza y Aire Libre* → *Excursiones a Volcanes*, *Senderismo*.
    - *Paseos en Barco y Deportes Acuáticos*.
  - Indicadores clave por producto:
    - 🍽️ `incluye_comida`: Degustaciones, almuerzos campestres o cenas.
    - 🚌 `incluye_transporte`: Recogida en hotel, traslado ida y vuelta o bus panorámico hop-on hop-off.
    - 🗣️ `incluye_guia`: Guía oficial certificado con indicación de idiomas disponibles (*Español, Inglés, Francés*).
- **Filtros Laterales Avanzados:**
  - **Duración:** Menos de 1 hora, 1 a 4 horas, 4 horas a 1 día, Más de 1 día.
  - **Idiomas del Guía:** Filtro multiselección con recuento de tours coincidentes.
  - **Accesibilidad:** Accesible para usuarios en silla de ruedas, apto para carriolas, admisión de animales de servicio.
  - **Condiciones de Compra:** Distintivo destacado de *"Cancelación gratis hasta 24 horas antes del inicio"*.

### 1.2 Ficha de Detalle de la Atracción (`/attractions/[pais]/[slug].html`)
- **Galería Multimedia y Badges Sociales:**
  - Carrusel fotográfico en alta resolución con miniaturas y visualizador de pantalla completa.
  - Puntuaciones numéricas sobre 10 con calificativos textuales:
    - `9.0+`: *"Excepcional"*
    - `8.5 - 8.9`: *"Muy bien"*
    - `8.0 - 8.4`: *"Fabuloso"*
  - Badges contextuales: *#1 Más vendido*, *Recomendado*, *Genius 10% de descuento*.
- **Desglose de Puntuaciones por Pilares (Ratings Breakdown):**
  - **Limpieza e Higiene:** Valoración de 1 a 10.
  - **Servicio y Atención del Guía:** Valoración de 1 a 10.
  - **Relación Calidad-Precio:** Valoración de 1 a 10.
  - **Calidad General de la Experiencia:** Valoración calculada.
- **Itinerario Cronológico Paso a Paso:**
  - Lista ordenada de hitos temporales con tiempo de permanencia:
    - `09:00`: Punto de encuentro en Boulevard Naciones Unidas.
    - `09:40`: Parada fotográfica en Basílica del Voto Nacional (⏱️ 15 min).
    - `10:30`: Recorrido peatonal en Plaza de San Francisco (⏱️ 30 min).
    - `11:45`: Mirador Panecillo (⏱️ 40 min).
- **Inclusiones vs Exclusiones:**
  - *Qué incluye:* Transporte turístico, audioguía multilingüe, degustación local.
  - *Qué no incluye:* Propinas voluntarias, bebidas alcohólicas adicionales, entradas no especificadas.

### 1.3 Selector de Turno Horario (*Time Slots*) y Matriz de Boletos
- **Disponibilidad por Fechas:** Días operativos con precios base más bajos visibles directamente en el mini-calendario.
- **Matriz de Turnos Horarios:**
  - Horarios de inicio con aforo dinámico: `09:00 a.m.`, `10:00 a.m.`, `11:00 a.m.`, `12:00 p.m.`, `01:00 p.m.`, `02:00 p.m.`, `03:00 p.m.`, `04:00 p.m.`.
  - Estados interactivos:
    - *Activo/Seleccionable*: Cupos disponibles.
    - *Agotado / Sold Out*: Botón deshabilitado con aviso visual.
    - *Últimos cupos*: Etiqueta de escasez (*"¡Solo quedan 2 cupos!"*).
- **Desglose de Boletos por Edad:**
  - **Adulto** (13 a 64 años): Tarifa completa.
  - **Niño** (5 a 12 años): Tarifa con descuento (50%).
  - **Senior** (65+ años): Tarifa preferencial.
  - **Bebé / Infante** (0 a 4 años): Tarifa $0.00, pero ocupa cupo legal en el transporte.
- **Totalizador Dinámico:** Desglose en vivo de subtotal, impuestos locales incluidos y total neto en la moneda seleccionada (USD).

### 1.4 Checkout, Voucher Digital QR y Check-in Presencial
- **Formulario del Comprador:**
  - Nombre(s) y Apellido(s) del viajero titular.
  - Correo electrónico para entrega del voucher digital (RFC 5322).
  - Teléfono internacional con código de país (E.164).
  - Documento de identidad (Cédula ecuatoriana o Pasaporte internacional).
  - Campo opcional para requerimientos dietéticos o de movilidad.
- **Confirmación Transaccional:**
  - Inyección de cabecera de idempotencia `Idempotency-Key` (SHA-256) para evitar cobros dobles por clics repetidos.
  - Pasarela simulada localmente (PCI Mock) con generación de token de pago.
- **Voucher Digital con Código QR:**
  - Emisión de localizador alfanumérico único (PNR).
  - Código QR dinámico firmado criptográficamente que contiene el ID de reserva, documento del titular y hash de verificación.
  - Instrucciones de llegada y botón de descarga en PDF / impresión.
- **Check-in Presencial (API v2):**
  - Validación del voucher en puerta mediante escaneo de QR o consulta de documento.
  - Transición de la reserva a estado `COMPLETADA` o `CHECKED_IN` registrando timestamp de asistencia.

---

## 2. Historias de Usuario (HU) y Criterios de Aceptación Gherkin

### HU-ATR-01: Búsqueda y Filtrado Jerárquico de Atracciones
```gherkin
Como turista planificando actividades en una ciudad destino
Quiero consultar el catálogo filtrando por categorías recursivas, duración e inclusiones
Para encontrar de forma inmediata las actividades que se ajusten a mi presupuesto e itinerario.

Criterios de Aceptación:
Escenario 1: Búsqueda exitosa con filtros combinados
  Dado que el usuario busca experiencias en "Quito"
  Y selecciona la categoría "Tours Gastronómicos" con filtro "Almuerzo incluido"
  Cuando el sistema ejecuta la consulta contra el API Gateway v2
  Entonces se retorna una lista paginada de experiencias que cumplen con todos los criterios
  Y el backend responde con HTTP 200 OK y metadatos de paginación.

Escenario 2: Destino sin coincidencias
  Dado que el usuario busca un destino sin proveedores activos
  Cuando el Gateway consulta el catálogo
  Entonces se muestra un estado amigable con sugerencias de destinos populares cercanos
  Y no se producen errores en consola.
```

### HU-ATR-02: Ficha Detallada, Reseñas y Cronología de Itinerario
```gherkin
Como usuario evaluando un tour específico
Quiero revisar el desglose de calificaciones por pilares, itinerario y servicios incluidos
Para tener certeza de la calidad del servicio antes de realizar el pago.

Criterios de Aceptación:
Escenario 1: Visualización completa de detalles
  Dado que el usuario abre la ficha de la atracción "Quito City Bus Tour"
  Cuando el componente de detalle carga la información
  Entonces se renderizan los pilares de Limpieza, Servicio y Calidad General
  Y se muestra la línea de tiempo con cada parada y sus minutos estimados
  Y se identifican claramente los elementos incluidos y excluidos.
```

### HU-ATR-03: Selección de Turnos Horarios y Steppers de Boletos por Edad
```gherkin
Como comprador configurando una experiencia
Quiero elegir el día, el turno horario disponible y especificar cantidad de adultos y niños
Para asegurar los cupos en el horario exacto y conocer el importe total liquidado.

Criterios de Aceptación:
Escenario 1: Cálculo dinámico de precio por tipos de boleto
  Dado que la tarifa de adulto es $13.50 y la de niño es $6.75
  Cuando el comprador incrementa a 2 Adultos y 1 Niño
  Entonces el subtotal se actualiza inmediatamente a $33.75 USD
  Y los botones de selección de horario reflejan si existen cupos suficientes para 3 personas.

Escenario 2: Turno horario sin aforo suficiente
  Dado que el turno de las "09:00 a.m." tiene únicamente 1 cupo remanente
  Cuando el usuario intenta seleccionar 2 o más boletos
  Entonces el botón de dicho horario se deshabilita con la leyenda "Agotado / Sin aforo suficiente"
  Y se impide avanzar al checkout con ese turno.
```

### HU-ATR-04: Checkout Seguro con Idempotencia y Emisión de Voucher Digital QR
```gherkin
Como cliente abonando sus entradas
Quiero ingresar mis datos personales con validación de teléfono y cédula
Para recibir al instante mi voucher digital con código QR de acceso.

Criterios de Aceptación:
Escenario 1: Creación de reserva exitosa con código QR
  Dado que el comprador completó sus datos válidos y seleccionó su método de pago
  Cuando pulsa "Pagar y Confirmar" enviando la cabecera "Idempotency-Key"
  Entonces el API Gateway procesa la reserva con el microservicio correspondiente
  Y la interfaz despliega el voucher digital con su localizador y código QR escaneable
  Y se escribe la traza correspondiente en los logs físicos rotativos de disco.

Escenario 2: Solicitud duplicada con la misma clave de idempotencia
  Dado que el cliente presiona dos veces rápidamente el botón de pago con el mismo UUID
  Cuando la segunda petición llega al servidor
  Entonces el Gateway detecta la colisión y retorna HTTP 409 Conflict o el resultado previo en caché
  Y no se genera cobro duplicado ni doble reserva de inventario.
```

### HU-ATR-05: Check-in Presencial en Punto de Encuentro
```gherkin
Como guía u operador en taquilla
Quiero escanear el voucher QR del turista o ingresar su documento de identidad
Para registrar su ingreso y marcar la reserva como completada.

Criterios de Aceptación:
Escenario 1: Validación presencial satisfactoria
  Dado que existe una reserva confirmada vigente para el día de hoy
  Cuando el operador despacha POST /api/v2/atracciones/reservas/:id/checkin
  Entonces el estado de la reserva transiciona a "CHECKED_IN"
  Y el sistema retorna los datos del guía asignado y punto de encuentro con HTTP 200 OK.
```

---

## 3. Catálogo de Errores Estándar RFC 7807 (Problem Details)

Todas las respuestas de error en `/api/v2` cumplen con la especificación RFC 7807 (`Content-Type: application/problem+json`):

```json
{
  "type": "https://api.booking.local/errors/conflict",
  "title": "Aforo Insuficiente o Horario Agotado",
  "status": 409,
  "detail": "El turno horario seleccionado (10:00) solo dispone de 1 cupo y se solicitaron 2 boletos.",
  "instance": "/api/v2/atracciones/PRhu4UBTWPBC/reservas",
  "code": "SLOT_CAPACITY_EXCEEDED",
  "timestamp": "2026-10-14T19:00:00Z"
}
```

### Matriz de Mapeo de Códigos de Error:
| Código HTTP | Código Interno | Motivo y Escenario de Disparo |
|:---:|:---|:---|
| **400** | `INVALID_PARAMS` | Parámetros de consulta incorrectos, fechas en el pasado o formato UUID corrupto. |
| **401** | `UNAUTHORIZED` | Token JWT ausente, expirado o con firma criptográfica inválida. |
| **404** | `RESOURCE_NOT_FOUND` | La atracción, categoría o reserva solicitada no existe. |
| **409** | `CAPACITY_CONFLICT` | Horario agotado (*Sold Out*) o intento de doble check-in sobre una misma reserva. |
| **422** | `VALIDATION_FAILED` | Teléfono no cumple E.164, documento de identidad inválido o faltan campos obligatorios. |
| **503** | `CIRCUIT_BREAKER_OPEN` | El microservicio externo de atracciones no respondió dentro de los 5 segundos de timeout. |

---

## 4. Bitácora de Archivos y Componentes Adaptados en el Repositorio

| Archivo | Capa / Dominio | Tipo de Modificación Realizada | Justificación Técnica |
|---|---|---|---|
| `frontend/src/pages/AtraccionDetail.jsx` | Frontend (React) | Refactorización Integral | Selector dinámico de turnos horarios, contadores de tickets adulto/niño, activación de reseñas por pilares e itinerario cronológico. |
| `frontend/src/pages/AtraccionesPage.jsx` | Frontend (React) | Mejora UX y Filtros | Integración visual del árbol de categorías padre-hija y filtros por inclusiones (comida, guía, transporte). |
| `frontend/src/components/VoucherModal.jsx` | Frontend (React) | Componente Nuevo | Modal de visualización de voucher digital con código QR dinámico (`qrcode.react`) y comprobante de check-in. |
| `src/main.ts` | Backend (NestJS Gateway) | Habilitación de Versiones | Soporte de versionamiento dual por URI (`/api/v1` legacy y `/api/v2` enriquecida). |
| `src/modules/atracciones/atracciones.controller.ts` | Backend (NestJS) | Nuevos Endpoints v2 | Endpoints `/categorias/arbol`, `/:id/disponibilidad` y `/:id/checkin`. |
| `src/modules/atracciones/acl/dilan-atracciones.adapter.ts` | Backend (Integración) | Componente Nuevo (ACL) | Adaptador Anti-Corrupción que media entre Booking Gateway y la API de Dilan (`SistemaAtracciones`) con Circuit Breaker. |
| `database/atracciones_schema_v2.sql` | Base de Datos (PostgreSQL) | Script DDL | Aislamiento Database-per-Service, tabla recursiva de categorías y registro de turnos horarios con aforo. |
| `src/core/logger/winston-logger.service.ts` | Observabilidad | Logger Físico Rotativo | Archivos rotativos diarios `logs/audit-*.log` e `logs/integration-*.log` (cero persistencia en PostgreSQL). |
