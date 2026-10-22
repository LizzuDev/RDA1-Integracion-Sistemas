# Módulo 1: Alojamientos (Accommodations) — Ingeniería Inversa y Requerimientos

> **Dominio:** Hospedaje, Hoteles, Departamentos y Resorts  
> **Sistema Destino:** Booking Prototipo (RDA2)  
> **Ambiente Auditado:** `https://www.booking.com` (Plataforma Web Producción)  
> **Contrato OpenAPI de Referencia:** `contracts/alojamientos-openapi.yaml`  
> **Contrato de Integración v2:** `docs Paúl Rosero/context/contratos_api_v2.md`

---

## 1. Visión General del Dominio de Alojamientos

La vertical de Alojamientos es el núcleo histórico de Booking.com. La experiencia de usuario se fundamenta en un embudo transaccional de 4 etapas:
1. **Búsqueda Inicial:** Captura de destino geográfico, rango de fechas en calendario interactivo y desglose de composición del grupo (adultos, niños con edades obligatorias y número de habitaciones).
2. **Listado de Resultados (SRP - Search Results Page):** Panel lateral de filtrado multicriterio (rango de precios, cancelación gratuita, desayuno incluido, valoración de clientes) y tarjetas de producto con microcopy persuasivo de escasez (*"Solo queda 1 habitación a este precio"*), cálculo dinámico de impuestos locales e insignias del programa de fidelización (*Genius*).
3. **Ficha de Detalle de la Propiedad:** Galería multimedia inmersiva, bloque de políticas (horarios de check-in / check-out), y una matriz tabular de tipos de habitación que combina configuraciones de camas, planes de comida (solo alojamiento vs con desayuno) y selector de cantidad de habitaciones.
4. **Checkout Transaccional en Dos Pasos:**
   - **Paso 1 (Tus Datos):** Captura del huésped principal, confirmación de correo, número de teléfono con selector de país, peticiones especiales y hora de llegada estimada.
   - **Paso 2 (Últimos Datos / Pago):** Captura de método de pago (tarjeta de crédito para garantía o pago inmediato), dirección de facturación, desglose final de cargos e impuestos urbanos no incluidos, y botón de confirmación final.
5. **Postventa y Check-in Digital (Extensión API v2):** Registro anticipado de huésped con emisión de clave digital de acceso (*smart lock*) o instrucciones de recepción.

---

## 2. Historias de Usuario Detalladas

---

### HU-ALO-01: Búsqueda Multicriterio de Alojamientos con Ocupación y Rango de Fechas

**Como** Huésped que planifica un viaje  
**Quiero** ingresar un destino geográfico, un rango de fechas y la configuración de viajeros y habitaciones  
**Para** obtener un catálogo de propiedades disponibles que cumplan con la capacidad física y fechas requeridas.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Página de Inicio (`https://www.booking.com/index.es.html`) o cabecera global de Alojamientos.
- **Formularios Detectados:** Componente *Searchbox* modular horizontal compuesto por tres bloques de interacción contiguos: Destino, Calendario de Rango de Fechas y Selector Flotante de Ocupación.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones (Max, Min, Required, Pattern) | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `ss` (Destino / Propiedad) | Combobox / Text Input con Autocompletado | Required, min: 2 caracteres, autocompletado con sugerencias IATA/Ciudad/Hotel | String |
  | `checkin` (Fecha Entrada) | Datepicker Interactivo | Required, min: `today()`, formato ISO `YYYY-MM-DD` | Date |
  | `checkout` (Fecha Salida) | Datepicker Interactivo | Required, min: `checkin + 1 day`, max: `checkin + 30 days` | Date |
  | `group_adults` (Adultos) | Numeric Stepper (`-` / `+`) | Required, min: 1, max: 30, default: 2 | Integer |
  | `group_children` (Niños) | Numeric Stepper (`-` / `+`) | Optional, min: 0, max: 10, default: 0 | Integer |
  | `age` (Edad de cada niño) | Select Dropdown dinámico | Condicional (Required si `group_children > 0`), opciones: 0 a 17 años | Integer |
  | `no_rooms` (Habitaciones) | Numeric Stepper (`-` / `+`) | Required, min: 1, max: 30, default: 1 | Integer |
  | `sb_travel_purpose` (Viajo por trabajo) | Checkbox | Optional, boolean (activa filtros corporativos) | Boolean |

- **Flujo Secuencial:** 
  1. El usuario hace foco en el campo de destino; se despliega una lista contextual con búsquedas recientes y destinos populares.
  2. Al tipear ≥ 2 caracteres, se dispara un debouncing de 300 ms consultando el endpoint de autocompletado.
  3. Al seleccionar un destino o pulsar Tab, el foco se transfiere automáticamente al calendario.
  4. El primer clic selecciona la fecha de entrada; las fechas anteriores al día actual están inhabilitadas en gris. El segundo clic define la fecha de salida. El rango queda resaltado en azul suave.
  5. Se despliega el popover de ocupación. Si se incrementa el contador de niños, la UI renderiza de forma reactiva `N` selectores desplegables exigiendo la edad exacta de cada menor para calcular camas supletorias o tasas locales.
  6. Al hacer clic en el botón *"Buscar"*, se valida la presencia del destino y la coherencia cronológica de las fechas.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-ALO-01.1:** La fecha de salida debe ser estrictamente posterior a la fecha de entrada (`checkout > checkin`). Si el usuario selecciona una fecha de salida anterior o igual, el sistema automáticamente reinicia la selección o desplaza la salida al día siguiente.
- **RN-ALO-01.2:** Toda reserva requiere al menos 1 adulto responsable (`group_adults >= 1`). No se permite la búsqueda de habitaciones exclusivas para menores de edad no acompañados.
- **RN-ALO-01.3:** La selección de edad de cada niño es obligatoria para el cálculo impositivo y asignación de cunas/camas; no se permite enviar el formulario con un selector de edad en estado placeholder.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/alojamientos/search` (mapeado desde `/api/v1` en `contracts/alojamientos-openapi.yaml`). El Gateway valida el payload mediante `SearchAccommodationRequestDto` usando `class-validator` (`@IsDateString()`, `@Min(1)`, `@ArrayNotEmpty()`).
  - **Supabase Cloud:** Consulta al esquema `alojamientos.propiedades` y `alojamientos.habitaciones` filtrando por disponibilidad en el rango de fechas.
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` con evento `SEARCH_ACCOMMODATION_REQUESTED` incluyendo destino y fingerprint del cliente.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Búsqueda exitosa con parámetros válidos
- **Dado que** el usuario se encuentra en la página principal de Alojamientos
- **Cuando** ingresa "Madrid", selecciona fecha de entrada "2026-11-10", fecha de salida "2026-11-15", 2 adultos y 1 habitación, y presiona "Buscar"
- **Entonces** el sistema redirige a la pantalla de resultados `/searchresults.es.html` mostrando la lista de hoteles disponibles en Madrid
- **Y** el API Gateway responde con HTTP `200 OK` con la lista paginada y registra la auditoría física en `logs/audit-*.log`.

##### Escenario 2: Intento de búsqueda sin especificar destino
- **Dado que** el usuario tiene fechas y ocupación seleccionadas pero el campo de destino está vacío
- **Cuando** presiona el botón "Buscar"
- **Entonces** la interfaz no navega, enfoca el campo de destino y muestra un tooltip de error en rojo: *"Ingresa un destino para empezar a buscar"*
- **Y** el Gateway rechaza cualquier intento de consulta con HTTP `400 Bad Request` bajo estándar RFC 7807 (`type: ".../missing-destination"`).

---

### HU-ALO-02: Exploración de Resultados, Filtros Perimetrales y Transparencia de Precios

**Como** Huésped que evalúa opciones de hospedaje  
**Quiero** filtrar por presupuesto, cancelación gratuita, régimen de comidas y puntuación de clientes  
**Para** comparar propiedades y visualizar el costo total transparente con impuestos incluidos antes de reservar.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Pantalla de Resultados (`/searchresults.es.html`).
- **Formularios Detectados:** Barra lateral izquierda de filtros multicriterio con acordeones colapsables, barra superior de ordenamiento (*Sorting*) y tarjetas de propiedad con llamadas a la acción.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `price_range` (Filtro Precio) | Dual Range Slider / Checkboxes de rangos | Min: 0, Max: 1000 USD | Array de Strings o Floats |
  | `fc` (Cancelación Gratis) | Checkbox | Valida propiedades con política de cancelación sin costo | Boolean |
  | `mealplan` (Desayuno incluido) | Checkbox | Filtra por código de régimen alimenticio | String |
  | `review_score` (Puntuación) | Checkbox | Opciones: Fantástico 9+, Muy bien 8+, Agradable 7+ | Float |
  | `order` (Criterio de Ordenamiento) | Select Dropdown / Pills | Opciones: popularidad, precio más bajo, estrellas, puntuación | Enum |

- **Flujo Secuencial:**
  1. La página presenta un loader esquelético (*skeleton loading*) mientras consulta el Gateway.
  2. Cada tarjeta de hotel presenta: imagen principal, nombre, estrellas, badge con puntuación numérica (ej. 8.8) y texto ("Fabuloso", "1,240 comentarios"), distancia al centro, tipo de cama disponible, insignia verde de "Cancelación gratis" (si aplica), precio total por la estancia y desglose en letra pequeña (*"Incluye impuestos y cargos: US$ 45"*).
  3. Al marcar un filtro (ej. "Cancelación gratis"), la lista se actualiza instantáneamente vía AJAX sin refrescar toda la página.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-ALO-02.1:** El precio principal exhibido debe reflejar la estancia completa para el número exacto de noches y huéspedes seleccionados, desagregando obligatoriamente los impuestos municipales o cargos de resort si se pagan directamente en la propiedad.
- **RN-ALO-02.2:** Si un hotel no dispone de stock para el rango completo de fechas solicitado, no debe aparecer en los resultados primarios; puede mostrarse en una sección inferior de "Alojamientos con fechas similares".
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/alojamientos/search` recibiendo en el body `filters: { minPrice, maxPrice, freeCancellation, mealPlan }`.
  - **Integración Inbound gRPC:** El Gateway consulta su caché en memoria alimentada continuamente por los microservicios externos vía `inventory.proto` (`StreamAvailability`) para descartar hoteles sin habitaciones libres.
  - **Supabase Cloud:** `alojamientos.tarifas` y `alojamientos.politicas_cancelacion`.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Filtrado reactivo por cancelación gratuita
- **Dado que** el usuario visualiza 50 resultados en Madrid
- **Cuando** marca la casilla "Cancelación gratis" en la barra lateral
- **Entonces** la lista se filtra mostrando únicamente propiedades con política flexible y badge verde "Cancelación gratis"
- **Y** el frontend realiza una petición asíncrona al Gateway devolviendo HTTP `200 OK` con la lista reducida.

##### Escenario 2: Sin resultados para una combinación extrema de filtros
- **Dado que** el usuario aplica un rango de precio menor a US$ 10 por noche con hotel 5 estrellas
- **Cuando** el sistema procesa la búsqueda
- **Entonces** la interfaz muestra el estado vacío (*Empty State*): *"No hemos encontrado alojamientos con estos filtros"* junto con un botón para *"Restablecer todos los filtros"*.

---

### HU-ALO-03: Detalle de Alojamiento, Selección de Inventario de Habitaciones y Políticas

**Como** Huésped interesado en una propiedad  
**Quiero** revisar las fotos, servicios, políticas de entrada/salida y la tabla de habitaciones disponibles  
**Para** seleccionar la cantidad y tipo de habitación con el régimen de comidas y cancelación deseado.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Ficha del Hotel (`/hotel/es/[hotel-slug].html`).
- **Formularios Detectados:** Tabla dinámica de disponibilidad de habitaciones con selectores numéricos por fila y botón de envío global (*Sticky Bar* o lateral).
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `bed_type_choice` (Opción de Cama) | Radio Button | Opciones: 1 cama doble grande O 2 camas individuales | String |
  | `nr_rooms` (Selector de Habitaciones) | Select Dropdown / Stepper | Min: 0, Max: cupo máximo disponible en inventario (ej. 1 a 5) | Integer |
  | `btn_reserve` (Lo reservaré) | Button Submit | Habilitado únicamente si `sum(nr_rooms) >= 1` | Action |

- **Flujo Secuencial:**
  1. El usuario visualiza la tabla de tipos de habitaciones: Suite, Doble Estándar, etc.
  2. Cada fila detalla: capacidad (iconos de personas), tamaño en m², equipamiento, condiciones (Opción A: No reembolsable - US$ 120; Opción B: Cancelación gratis hasta 48h antes + Desayuno - US$ 160).
  3. En la columna "Seleccionar habitaciones", el usuario cambia el desplegable de `0` a `1` en la opción deseada.
  4. Al cambiar el selector, una barra flotante en la parte inferior o lateral se actualiza mostrando: *"1 habitación por US$ 160"* y el botón *"Lo reservaré"*.
  5. Al hacer clic, se valida stock en tiempo real y se redirige a la pasarela de checkout (`secure.booking.com/book.html`).

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-ALO-03.1:** El usuario no puede avanzar al checkout si la suma de habitaciones seleccionadas en la tabla es igual a cero (`sum(nr_rooms) == 0`).
- **RN-ALO-03.2:** Si el stock de una habitación es limitado (ej. ≤ 3 unidades), la interfaz debe mostrar una alerta en color rojo oscuro: *"¡Solo quedan 2 a este precio en nuestra web!"*.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/alojamientos/availability` validando disponibilidad de la tarifa seleccionada.
  - **Inbound gRPC:** Consulta al cache de inventario `inventory.InventoryService/PushStockUpdate`.
  - **Supabase Cloud:** `alojamientos.tipos_habitacion` y `alojamientos.inventario_diario`.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Selección de habitación y redirección al checkout
- **Dado que** el usuario se encuentra en la tabla de disponibilidad del hotel y hay stock disponible
- **Cuando** selecciona 1 unidad de "Habitación Doble Superior con Desayuno" y hace clic en "Lo reservaré"
- **Entonces** el sistema bloquea provisionalmente el cupo y redirige a la pantalla de Checkout Paso 1 (`/book.html`)
- **Y** el Gateway emite un log de integración `ROOM_HOLD_TEMPORARY` en `logs/integration-*.log`.

##### Escenario 2: Intento de reserva sin seleccionar habitación
- **Dado que** todas las cantidades de habitaciones en la tabla están en `0`
- **Cuando** el usuario intenta pulsar el botón "Lo reservaré"
- **Entonces** el botón permanece deshabilitado o muestra una notificación emergente: *"Selecciona al menos una habitación para continuar"*.

---

### HU-ALO-04: Formulario de Checkout Paso 1 — Captura de Datos de Huésped y Peticiones Especiales

**Como** Huésped que realiza la reserva  
**Quiero** ingresar mis nombres, apellidos, datos de contacto, titularidad y peticiones adicionales  
**Para** que la propiedad tenga mi registro oficial y pueda gestionar mis preferencias de llegada.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Formulario de Checkout Paso 1 (`secure.booking.com/book.html?step=1`).
- **Formularios Detectados:** Bloque de datos personales, selector de titularidad, radio de viaje de trabajo, bloque de peticiones especiales y hora de llegada.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `firstname` (Nombre) | Text Input | Required, max: 60 caracteres, solo letras y espacios | String |
  | `lastname` (Apellido) | Text Input | Required, max: 60 caracteres, solo letras y espacios | String |
  | `email` (Dirección de email) | Email Input | Required, formato RFC 5322 válido, prellenado si hay sesión activa | String |
  | `email_confirm` (Confirmar email) | Email Input | Required (en usuarios no logueados), debe coincidir exactamente con `email` | String |
  | `cc1` (País / Región) | Select Dropdown | Required, código ISO 3166-1 alfa-2 (ej. EC, ES, US) | String |
  | `telephone` (Número de teléfono) | Tel Input con selector de código internacional | Required, formato E.164 (ej. +593 991234567), longitud: 7 a 15 dígitos | String |
  | `not_me` (Titularidad de Reserva) | Radio Group | Required, opciones: `0` (Soy el huésped principal) \| `1` (Reservo para otra persona) | Boolean |
  | `other_guest_name` (Nombre otro huésped)| Text Input | Condicional (Required si `not_me == 1`), max: 100 caracteres | String |
  | `business_purpose` (Viajas por trabajo) | Radio Group | Required, opciones: `1` (Sí) \| `0` (No) | Boolean |
  | `special_requests` (Peticiones especiales)| Textarea | Optional, max: 500 caracteres, aviso de no garantía de cumplimiento | String |
  | `arrival_time` (Hora de llegada estimada) | Select Dropdown | Required, opciones: "No lo sé aún", "00:00 - 01:00", ..., "23:00 - 00:00" | String |
  | `opt_in_whatsapp` (Confirmación WhatsApp)| Checkbox | Optional, default: false | Boolean |

- **Flujo Secuencial:**
  1. Si el usuario inició sesión, los campos de Nombre, Apellido y Email aparecen precargados.
  2. Si el usuario marca "Reservo para otra persona", se despliega un campo adicional obligatorio: "Nombre completo del huésped principal".
  3. En la sección lateral derecha, se mantiene fijo el resumen de la reserva: Check-in, Check-out, Noches, Desglose de habitación y Total a pagar con impuestos.
  4. Al presionar *"Siguiente: últimos datos"*, se ejecutan validaciones perimetrales en el cliente. Si un campo obligatorio está vacío o erróneo, el scroll se mueve automáticamente al primer campo inválido con borde rojo y texto de error explícito.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-ALO-04.1:** El número de teléfono debe incluir obligatoriamente el prefijo del país seleccionado y contener una estructura numérica coherente sin letras ni caracteres especiales no permitidos.
- **RN-ALO-04.2:** El texto de peticiones especiales (`special_requests`) se transmite como texto plano sanitizado al hotel; el sistema advierte expresamente que están sujetas a disponibilidad y no constituyen un contrato vinculante.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** DTO `CreateReservationStep1Dto` validado con `class-validator` y `class-transformer`.
  - **Supabase Cloud:** Registro provisional en `alojamientos.reservas` con estado `EN_PROCESO` y expiración en 15 minutos (*TTL*).
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` de la IP, datos anonimizados y validación superada.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Envío exitoso de datos del huésped
- **Dado que** el usuario completó Nombre, Apellido, Email válido, Teléfono internacional y seleccionó "Soy el huésped principal"
- **Cuando** hace clic en "Siguiente: últimos datos"
- **Entonces** la aplicación guarda el estado de la reserva y transiciona a la pantalla de Pago / Paso 2
- **Y** el Gateway responde HTTP `200 OK` con un token de reserva temporal.

##### Escenario 2: Intento de avance con teléfono o apellido vacío
- **Dado que** el usuario borró el campo "Apellido" y dejó el teléfono incompleto
- **Cuando** hace clic en "Siguiente: últimos datos"
- **Entonces** el sistema no avanza de pantalla, colorea el campo Apellido en rojo (#d4111e), muestra *"Ingresa tu apellido"* y sitúa el cursor en el primer campo erróneo
- **Y** el API Gateway respondería con HTTP `422 Unprocessable Entity` (RFC 7807) en caso de bypass directo de API.

---

### HU-ALO-05: Checkout Paso 2 — Garantía de Pago con Tarjeta, Facturación y Confirmación

**Como** Huésped listo para asegurar su hospedaje  
**Quiero** ingresar mi método de pago como garantía y solicitar factura si la requiero  
**Para** confirmar la reserva definitiva sin cobros ocultos y recibir mi número de confirmación y PIN.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Formulario de Checkout Paso 2 (`secure.booking.com/book.html?step=2`).
- **Formularios Detectados:** Selector de métodos de pago (Tarjeta de crédito / débito, PayPal), formulario de datos de tarjeta, toggle y campos de factura, checkbox de aceptación de términos legales.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `payment_type` (Método de Pago) | Radio Cards | Required, opciones: `credit_card`, `paypal`, `google_pay` | String |
  | `cc_name` (Nombre en la Tarjeta) | Text Input | Required, max: 100 caracteres, como aparece en el plástico | String |
  | `cc_number` (Número de Tarjeta) | Text Input / PAN Mask | Required, validación Algoritmo de Luhn, 13 a 19 dígitos, icono de marca (Visa, MC, Amex) dinámico | String |
  | `cc_exp` (Fecha de Caducidad) | Text Input Mask `MM/YY` | Required, mes entre 01-12, año >= año actual | String |
  | `cc_cvc` (Código de Seguridad CVC) | Password / Numeric Input | Required, 3 dígitos (4 para Amex), máscara visual | String |
  | `invoice_required` (¿Deseas Factura?) | Checkbox / Toggle | Optional, boolean | Boolean |
  | `invoice_tax_id` (RUC / CIF / DNI) | Text Input | Condicional (Required si `invoice_required == true`), max: 20 caracteres | String |
  | `invoice_company_name` (Razón Social)| Text Input | Condicional (Required si `invoice_required == true`), max: 120 caracteres | String |
  | `terms_acceptance` (Términos Legales) | Checkbox / Texto Legal | Required, aceptación implícita o explícita de condiciones de cancelación y privacidad | Boolean |

- **Flujo Secuencial:**
  1. El usuario revisa el resumen final del precio: Tarifa base + Impuesto sobre el valor añadido + Tasa turística local a pagar en destino.
  2. Ingresa los números de la tarjeta de crédito; el frontend detecta automáticamente la franquicia (Visa/Mastercard) e ilumina el logo correspondiente.
  3. Si la reserva ofrece "Paga en el alojamiento", la tarjeta se captura exclusivamente como garantía de no-show sin cobro inmediato.
  4. Al hacer clic en el botón principal *"Completar reserva"* (¡Simulado en auditoría, jamás accionado en producción!), el sistema dispara la llamada transaccional protegida con `Idempotency-Key`.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-ALO-05.1:** Toda confirmación de reserva debe procesarse con una cabecera HTTP `Idempotency-Key` en formato UUID v4. Si la red se interrumpe y el cliente reintenta con la misma clave, el backend debe retornar la reserva ya creada sin duplicar cargos ni cupos.
- **RN-ALO-05.2:** En cancelaciones no reembolsables, la propiedad se reserva el derecho de cargar el 100% de la tarifa en cualquier momento posterior a la reserva.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/alojamientos/reservar` protegido por **Circuit Breaker** (5s timeout).
  - **Integración Outbound:** Llamada síncrona REST a la Tienda de Alojamientos externa transmitiendo `Idempotency-Key`.
  - **Supabase Cloud:** Transición del estado de la reserva en `alojamientos.reservas` de `EN_PROCESO` a `CONFIRMADA`. Se crea registro en `facturacion.datos_fiscales` si se solicitó factura.
  - **Auditoría Winston:** Registro obligatorio en `logs/audit-YYYY-MM-DD.log` con evento `RESERVATION_CONFIRMED` guardando `reserva_id`, `monto_total`, `moneda` y código de respuesta HTTP.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Confirmación de reserva exitosa con tarjeta válida
- **Dado que** el usuario ingresó los datos válidos de su tarjeta y aceptó las políticas de cancelación
- **Cuando** envía la orden de compra con una cabecera `Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d`
- **Entonces** el Gateway recibe la respuesta de la tienda externa en < 5 segundos, retorna HTTP `201 Created` con el número de confirmación y el código PIN de acceso
- **Y** se escribe una línea de auditoría física en `logs/audit-*.log`.

##### Escenario 2: Falla de comunicación con la tienda externa (Timeout > 5 segundos)
- **Dado que** la tienda externa de alojamientos no responde en 5000 ms
- **Cuando** el Gateway detecta la expiración del temporizador
- **Entonces** el Circuit Breaker abre el circuito, aborta la transacción y responde con HTTP `504 Gateway Timeout` bajo RFC 7807 (`type: ".../external-timeout"`)
- **Y** se genera un registro en `logs/integration-*.log` con nivel `ERROR`.

---

### HU-ALO-06: Check-in Digital y Asignación de Habitación / Llave Virtual (Extensión API v2)

**Como** Huésped con una reserva confirmada  
**Quiero** realizar el check-in digital antes de mi llegada indicando mi documento y hora de arribo  
**Para** agilizar mi entrada a la propiedad y obtener la clave de acceso a mi habitación.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Portal de Autoservicio / Mis Reservas (`/myreservations/checkin/:id`).
- **Formularios Detectados:** Formulario de Check-in digital anticipado.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `reservation_id` (ID de Reserva) | Read-only Text / Path param | Required, formato alfanumérico o UUID | String |
  | `huesped_principal` (Nombre Huésped)| Text Input | Required, max: 100 caracteres | String |
  | `documento_identidad` (DNI/Pasaporte)| Text Input | Required, alfanumérico, longitud: 6 a 20 caracteres | String |
  | `hora_llegada` (Hora estimada) | Time Input / Dropdown | Required, formato `HH:mm` dentro del rango de check-in del hotel | String |

- **Flujo Secuencial:**
  1. El huésped accede al enlace de check-in enviado a su email o desde su perfil de usuario.
  2. Verifica su nombre y proporciona su documento de identidad y hora estimada de llegada.
  3. Al enviar el formulario, el sistema valida que la reserva esté confirmada y vigente.
  4. La UI muestra la tarjeta de bienvenida con el número de habitación asignada y la clave numérica de apertura digital.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-ALO-06.1:** El check-in digital solo puede ejecutarse dentro de las 24 horas previas a la fecha oficial de check-in y mientras la reserva se encuentre en estado `CONFIRMADA`.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/alojamientos/reservations/:id/checkin` estipulado en `docs Paúl Rosero/context/contratos_api_v2.md`.
  - **Response 200 OK:** `{ "reserva_id": "alo-res-88", "estado": "HOSPEDADO", "habitacion_asignada": "Suite 402 - Torre A", "clave_acceso_digital": "9941#", "mensaje": "Bienvenido..." }`.
  - **Supabase Cloud:** Actualización de `alojamientos.reservas` con `estado = 'HOSPEDADO'` y asignación de `habitacion_id`.
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` de la apertura de puerta / check-in.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Check-in digital completado exitosamente
- **Dado que** la reserva `alo-res-88` está confirmada para el día de hoy
- **Cuando** el usuario envía `POST /api/v2/alojamientos/reservations/alo-res-88/checkin` con su documento y hora de llegada
- **Entonces** la UI exhibe el voucher de bienvenida con la habitación "Suite 402" y la clave "9941#"
- **Y** el backend responde HTTP `200 OK` y actualiza el estado a `HOSPEDADO`.

##### Escenario 2: Intento de check-in en una reserva cancelada o inexistente
- **Dado que** la reserva fue previamente cancelada
- **Cuando** el usuario intenta ejecutar el check-in digital
- **Entonces** la interfaz muestra una alerta: *"No es posible realizar el check-in para una reserva cancelada"*
- **Y** el API Gateway responde con HTTP `409 Conflict` (RFC 7807) indicando el estado incompatible.
