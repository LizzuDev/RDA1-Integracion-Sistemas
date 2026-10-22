# Módulo 3: Atracciones y Experiencias (Attractions) — Ingeniería Inversa y Requerimientos

> **Dominio:** Tours Guiados, Entradas a Museos, Paquetes Turísticos y Actividades  
> **Sistema Destino:** Booking Prototipo (RDA2)  
> **Ambiente Auditado:** `https://www.booking.com/attractions/index.es.html`  
> **Contrato OpenAPI de Referencia:** `contracts/atracciones-openapi.yaml`  
> **Contrato de Integración v2:** `docs Paúl Rosero/context/contratos_api_v2.md`

---

## 1. Visión General del Dominio de Atracciones

La vertical de Atracciones y Experiencias de Booking.com gestiona un catálogo enriquecido de actividades turísticas con ticketing digital y asignación de franjas horarias (*time slots*). Su embudo transaccional inspeccionado en producción presenta las siguientes fases:

1. **Búsqueda y Descubrimiento:**
   - Campo de destino con autocompletado predictivo para ciudades globales (ej. Madrid, Barcelona, Quito, Roma).
   - Selector de fechas único o rango flexible para encontrar experiencias disponibles durante la estancia del viajero.
2. **Exploración de Catálogo y Árbol de Categorías:**
   - Filtrado por categorías jerárquicas: Tours y Experiencias, Tours Gastronómicos, Museos y Galerías, Actividades al Aire Libre, Excursiones de un día.
   - Filtros operativos: Duración de la actividad (hasta 1 hora, 1-4 horas, día completo), Idioma del guía (Español, Inglés, Bilingüe), Accesibilidad para sillas de ruedas y admisión de animales de servicio.
   - Distintivo de tranquilidad: Insignia de *"Cancelación gratis hasta 24 horas antes del inicio"*.
3. **Ficha Enriquecida del Tour / Atracción (Estándar v2 HATEOAS):**
   - Cronograma detallado e itinerario por hitos horarios (ej. 09:00 Punto de encuentro, 10:30 Visita guiada, 12:00 Cata).
   - Inclusiones y exclusiones (entradas incluidas, transporte, degustación, propinas).
   - Desglose de puntuaciones por facetas: Limpieza, Servicio, Calidad y General (ratings breakdown).
4. **Configuración de Boletos y Selección de Turno Horario (*Time Slot*):**
   - Calendario de selección de día específico.
   - Selector de franja horaria / hora de inicio (ej. 09:00, 11:30, 14:00) con control de cupos en tiempo real.
   - Contadores numéricos por tipo de ticket: Adulto (tarifa completa), Niño (descuento por edad), Senior (65+ años) y Bebé (gratuito pero con cupo requerido).
5. **Checkout y Emisión de Voucher Digital QR:**
   - Captura del viajero principal, teléfono para emergencias del operador local.
   - Confirmación transaccional con `Idempotency-Key` y emisión de voucher digital con código QR.
6. **Check-in Presencial en Punto de Encuentro (API v2):**
   - Validación del documento de identidad por parte del guía certificado y canje del voucher digital en campo.

---

## 2. Historias de Usuario Detalladas

---

### HU-ATR-01: Búsqueda y Descubrimiento de Atracciones Turísticas por Ciudad y Fechas

**Como** Turista que planifica actividades en su destino  
**Quiero** buscar atracciones ingresando el nombre de una ciudad y la fecha de visita  
**Para** descubrir tours, entradas a museos y experiencias disponibles en mi itinerario.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Página principal de Atracciones (`/attractions/index.es.html`).
- **Formularios Detectados:** Buscador de experiencias de dos campos interactivos horizontales: Destino y Fechas.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `query` (¿Adónde vas?) | Combobox / Text Input con Autocompletado | Required, min: 2 caracteres, lista sugerencias de ciudades y atracciones famosas | String |
  | `dates` (¿Cuándo?) | Datepicker Modal / Rango | Optional, min: `today()`, permite seleccionar fecha única o rango de estancia | Date / DateRange |

- **Flujo Secuencial:**
  1. El usuario se posiciona en el input "¿Adónde vas?"; se visualizan píldoras rápidas con destinos tendencia (París, Roma, Madrid, Quito).
  2. Al escribir "Madrid", se despliega la lista con la ciudad y sus atracciones principales asociadas (ej. "Museo Nacional del Prado", "Parque Warner").
  3. Al seleccionar la fecha o dejarla abierta, presiona *"Buscar"*.
  4. El sistema redirige a la página de resultados de atracciones para dicha localidad.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-ATR-01.1:** Si no se especifica una fecha en la búsqueda, el catálogo muestra todas las atracciones activas de la ciudad indicando el precio base *"Desde US$ XX por adulto"*.
- **RN-ATR-01.2:** Las fechas anteriores al día en curso quedan completamente bloqueadas en el calendario para evitar reservas en el pasado.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/atracciones/search` (mapeado desde `contracts/atracciones-openapi.yaml` `/atracciones/search`). DTO `SearchAtraccionesRequest` validando `ciudad`, `fechaInicio` y `categoriaId`.
  - **Supabase Cloud:** `atracciones.catalogo` y `atracciones.ciudades`.
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` de la búsqueda de atracciones.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Búsqueda exitosa en ciudad turística
- **Dado que** el usuario ingresa "Quito" y presiona "Buscar"
- **Cuando** el sistema procesa la consulta
- **Entonces** se despliega el listado de tours urbanos, excursiones a volcanes y experiencias gastronómicas en Quito
- **Y** el API Gateway responde con HTTP `200 OK`.

##### Escenario 2: Intento de búsqueda con campo de destino vacío
- **Dado que** el usuario no ha ingresado ninguna letra en el buscador
- **Cuando** hace clic en el botón "Buscar"
- **Entonces** el input se resalta en rojo con la advertencia: *"Ingresa un destino o nombre de atracción para continuar"*
- **Y** la aplicación no realiza navegación.

---

### HU-ATR-02: Navegación del Árbol Jerárquico de Categorías y Filtros Temáticos

**Como** Turista con gustos específicos  
**Quiero** navegar por el árbol de categorías y filtrar por duración, idioma y accesibilidad  
**Para** localizar experiencias que coincidan con mis preferencias gastronómicas o culturales.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Página de Resultados de Atracciones (`/attractions/searchresults.es.html`).
- **Formularios Detectados:** Barra lateral izquierda con árbol de categorías multinivel y filtros de atributos.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `category_id` (Categoría) | Tree View / Checkbox jerárquico | Opciones jerárquicas: Tours > Gastronomía > Degustación de Cacao | String / UUID |
  | `duration` (Duración) | Checkbox Group | Opciones: 0-2 horas, 2-4 horas, 4-8 horas, Más de 1 día | String |
  | `language` (Idioma del Guía) | Checkbox Group | Opciones: Español, Inglés, Francés, Alemán | String |
  | `service_animals` (Mascotas servicio)| Checkbox | Valida tours que admiten animales de asistencia | Boolean |
  | `wheelchair_access` (Silla de ruedas) | Checkbox | Filtra por accesibilidad física total | Boolean |

- **Flujo Secuencial:**
  1. El usuario visualiza el árbol de categorías expandible (ej. "Tours y Experiencias" -> "Tours Gastronómicos").
  2. Al marcar una subcategoría (ej. "Tours Gastronómicos"), se activa un tag o píldora en la parte superior.
  3. Los resultados se actualizan mostrando la tarjeta de cada atracción: Fotografía de alta calidad, título, badge de puntuación (ej. 4.9 "Excelente", 128 opiniones), duración estimada (ej. "3 horas"), idioma y política de cancelación sin costo.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-ATR-02.1:** Si una categoría padre es desmarcada, todas sus subcategorías descendientes deben desmarcarse automáticamente en cascada.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `GET /api/v2/atracciones/categorias/arbol` documentado en `contratos_api_v2.md` retornando la estructura recursiva JSON (`id`, `nombre`, `slug`, `subcategorias`).
  - **Supabase Cloud:** `atracciones.categorias` con auto-referencia `parent_id`.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Consulta del árbol de categorías recursivo
- **Dado que** el cliente frontend solicita la taxonomía de actividades
- **Cuando** realiza una petición `GET /api/v2/atracciones/categorias/arbol`
- **Entonces** el Gateway retorna HTTP `200 OK` con el arreglo anidado de categorías y sus indicadores de `incluye_comida` y `incluye_guia`.

---

### HU-ATR-03: Ficha Detallada, Selección de Turno Horario (Time Slot) y Desglose de Boletos

**Como** Turista interesado en una atracción  
**Quiero** consultar el itinerario, elegir una fecha, turno horario y cantidad de entradas por edad  
**Para** asegurar cupos en la franja horaria exacta de mi conveniencia.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Ficha Técnica de la Atracción (`/attractions/[pais]/[slug].html`).
- **Formularios Detectados:** Panel de reserva interactivo: Selector de fecha, selector de turno horario (*Time Slots*) y matriz de contadores de entradas.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `tour_date` (Fecha del Tour) | Mini Calendar Datepicker | Required, disponibilidad según días operativos del operador | Date |
  | `time_slot` (Turno Horario) | Radio Pills / Button Group | Required, opciones activas: "09:00", "11:30", "14:00" | Time / String |
  | `qty_adults` (Boletos Adulto) | Stepper (`-` / `+`) | Required, min: 1, max: cupo remanente en el turno | Integer |
  | `qty_children` (Boletos Niño) | Stepper (`-` / `+`) | Optional, min: 0, tarifa reducida (edad 3-12 años) | Integer |
  | `qty_infants` (Boletos Bebé) | Stepper (`-` / `+`) | Optional, min: 0, costo $0.00 pero ocupa aforo | Integer |
  | `btn_continue` (Continuar) | Button CTA | Habilitado solo si `qty_adults >= 1` y hay slot seleccionado | Action |

- **Flujo Secuencial:**
  1. El turista examina la descripción, los puntos destacados (*Highlights*), el itinerario paso a paso y la ubicación del punto de encuentro en el mapa.
  2. En el bloque de tickets, pulsa un día del calendario que tenga disponibilidad (días sin cupo aparecen tachados).
  3. Se iluminan los botones de turno horario; el usuario hace clic en "10:30".
  4. Se habilitan los contadores de tickets. Al pulsar `+` en Adultos, el panel calcula el importe total en tiempo real (ej. 2 Adultos x US$ 35 = US$ 70).
  5. Hace clic en *"Continuar / Reservar"* para iniciar el checkout.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-ATR-03.1:** El aforo por turno horario es estricto; el selector no permite sumar boletos que excedan la capacidad remanente del turno (`sum(tickets) <= aforo_disponible`).
- **RN-ATR-03.2:** Los boletos de infantes/bebés tienen costo cero pero consumen capacidad legal en vehículos de transporte o recintos cerrados.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `GET /api/v2/atracciones/:id` con HATEOAS `_links` (`self`, `reservar`, `checkin`) y `ratings_breakdown`.
  - **Inbound gRPC:** Consulta al servicio de inventario `inventory.InventoryService/StreamAvailability` para validar cupos del time slot.
  - **Supabase Cloud:** `atracciones.turnos` y `atracciones.aforo_diario`.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Selección de turno con cupos suficientes
- **Dado que** el tour "Degustación de Cacao" tiene 10 cupos en el turno de las 10:30
- **Cuando** el usuario selecciona 2 boletos de Adulto y pulsa "Continuar"
- **Entonces** el sistema reserva temporalmente 2 cupos y transiciona al checkout
- **Y** el backend responde HTTP `200 OK`.

##### Escenario 2: Turno horario agotado (Sold Out)
- **Dado que** el turno de las 09:00 tiene cero cupos disponibles
- **Cuando** el usuario visualiza los turnos en el calendario
- **Entonces** el botón "09:00" se muestra deshabilitado con la etiqueta *"Agotado"* y no permite interacción.

---

### HU-ATR-04: Formulario de Checkout y Datos de Contacto del Turista Titular

**Como** Turista que formaliza su compra de boletos  
**Quiero** ingresar mis nombres, apellidos, correo electrónico y número de teléfono  
**Para** recibir las instrucciones de encuentro y los vouchers digitales de acceso.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Formulario de Checkout de Atracciones (`/attractions/checkout.html`).
- **Formularios Detectados:** Bloque de información del comprador y viajero principal.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `lead_first_name` (Nombre) | Text Input | Required, max: 60 caracteres, solo alfabético | String |
  | `lead_last_name` (Apellido) | Text Input | Required, max: 60 caracteres, solo alfabético | String |
  | `lead_email` (Correo electrónico) | Email Input | Required, formato válido RFC 5322 | String |
  | `lead_phone` (Teléfono) | Tel Input con bandera de país | Required, formato E.164 internacional | String |
  | `special_needs` (Requerimientos) | Textarea | Optional, max: 300 caracteres (alergias alimentarias o movilidad) | String |

- **Flujo Secuencial:**
  1. El formulario precarga los datos del perfil si el usuario está autenticado.
  2. Muestra un recordatorio importante: *"Se enviará el voucher digital con código QR a este correo electrónico"*.
  3. El usuario completa los datos y presiona *"Ir al pago"*. Si hay datos incompletos, se activa la validación en cliente.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-ATR-04.1:** Si la actividad incluye degustación de alimentos, el campo de requerimientos debe permitir especificar alergias alimentarias que se notificarán al guía.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/atracciones/:id/reservar`.
  - **Supabase Cloud:** `atracciones.reservas` con estado `PENDIENTE_PAGO`.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Validación exitosa de datos del comprador
- **Dado que** el comprador ingresó "Carlos Mendoza", correo válido y teléfono internacional
- **Cuando** hace clic en "Ir al pago"
- **Entonces** el sistema valida los campos y avanza al resumen de pago
- **Y** el Gateway valida el esquema con HTTP `200 OK`.

---

### HU-ATR-05: Confirmación de Compra Idempotente y Emisión de Voucher Digital QR

**Como** Turista que abona su entrada  
**Quiero** realizar el pago seguro y recibir inmediatamente mi voucher digital con código QR  
**Para** presentarlo desde mi teléfono al momento de iniciar la actividad.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Pantalla de Pago y Pantalla de Confirmación de Atracciones.
- **Formularios Detectados:** Pasarela de pago de tickets y visor de confirmación.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `payment_token` (Token de Pago) | Hidden Field / PCI Token | Required, generado por el SDK de pagos | String |
  | `terms_conditions` | Checkbox | Required, aceptación de política de cancelación de 24h | Boolean |

- **Flujo Secuencial:**
  1. El turista confirma el pago de los boletos.
  2. La llamada viaja con cabecera `Idempotency-Key`.
  3. Tras la aprobación, la pantalla de éxito renderiza: Número de confirmación, itinerario, mapa del punto de encuentro y un **código QR dinámico** de validación.
  4. Se ofrece el botón *"Descargar Voucher PDF"* y *"Guardar en Apple Wallet / Google Wallet"*.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-ATR-05.1:** Toda reserva de atracción confirmada debe generar un código QR único que codifique la firma criptográfica de la reserva para validación offline por el guía.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** `POST /api/v2/atracciones/:id/reservar` con cabecera `Idempotency-Key: <UUID-v4>`.
  - **Outbound REST:** Envío al microservicio de atracciones con Circuit Breaker (5s timeout).
  - **Supabase Cloud:** Actualización de `atracciones.reservas` (`estado = 'CONFIRMADA'`).
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` de la compra de boletos.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Confirmación de reserva y generación de QR
- **Dado que** el pago fue autorizado por la pasarela
- **Cuando** el Gateway completa la transacción en el microservicio de atracciones
- **Entonces** la pantalla muestra el mensaje *"¡Tu reserva está confirmada!"* junto a la imagen del código QR y el punto de encuentro
- **Y** se genera un log físico en `logs/audit-*.log` con evento `TICKETS_ISSUED`.

---

### HU-ATR-06: Check-in Presencial en Punto de Encuentro con Guía Asignado (Extensión API v2)

**Como** Guía Turístico / Operador de la Atracción  
**Quiero** escanear el voucher del turista o validar su documento de identidad y hora de llegada  
**Para** completar el check-in oficial y entregar las entradas físicas o dar inicio al tour.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Aplicación móvil del Guía / Terminal de Check-in en Taquilla.
- **Formularios Detectados:** Formulario de Check-in de Atracción.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `id` (ID de Reserva) | Path Param | Required, identificador de la reserva (ej. `res-999`) | String |
  | `documento_identidad` (Documento) | Text Input | Required, cédula o pasaporte del titular | String |
  | `hora_llegada` (Hora del Check-in) | Timestamp Input | Required, formato ISO-8601 UTC | DateTime |

- **Flujo Secuencial:**
  1. El turista se presenta en el punto de encuentro (ej. "Puerta Principal de la Catedral").
  2. El guía ingresa el ID de reserva y documento de identidad del turista.
  3. El sistema valida la reserva, confirma los cupos y retorna el guía asignado con su credencial oficial.
  4. La reserva pasa a estado `COMPLETADA`.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-ATR-06.1:** El check-in presencial solo puede llevarse a cabo el día programado de la actividad entre 60 minutos antes y hasta 15 minutos después de la hora de inicio pactada (*Grace Period*).
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/atracciones/reservas/:id/checkin` estipulado en `docs Paúl Rosero/context/contratos_api_v2.md`.
  - **Respuesta 200 OK:**
    ```json
    {
      "reserva_id": "res-999",
      "estado": "COMPLETADA",
      "guia_asignado": "Luis Paredes (Licencia #441)",
      "punto_encuentro": "Puerta Principal de la Catedral",
      "voucher_digital_qr": "https://api.booking.local/vouchers/atr-res-999.png",
      "mensaje": "Check-in exitoso. Por favor presente su voucher al guía."
    }
    ```
  - **Supabase Cloud:** `atracciones.reservas` (`estado = 'COMPLETADA'`, `checkin_at = NOW()`).
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` del check-in presencial.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Check-in presencial exitoso con guía certificado
- **Dado que** la reserva `res-999` está vigente para hoy a las 09:00
- **Cuando** el guía despacha `POST /api/v2/atracciones/reservas/res-999/checkin` con `documento_identidad: "1723456789"`
- **Entonces** el sistema valida el check-in, asigna a "Luis Paredes (Licencia #441)" y retorna HTTP `200 OK`
- **Y** se audita el evento en `logs/audit-*.log`.
