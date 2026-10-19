# Módulo 2: Renta de Autos (Car Rentals) — Ingeniería Inversa y Requerimientos

> **Dominio:** Alquiler de Vehículos, Flotas, Agencias (Depots) y Coberturas  
> **Sistema Destino:** Booking Prototipo (RDA2)  
> **Ambiente Auditado:** `https://cars.booking.com` y `https://www.booking.com/cars/index.es.html`  
> **Contrato OpenAPI de Referencia:** `contracts/autos-openapi.yaml`  
> **Contrato de Integración v2:** `docs Paúl Rosero/context/contratos_api_v2.md`

---

## 1. Visión General del Dominio de Renta de Autos

La vertical de Renta de Autos opera bajo una lógica de metabuscador y agregador global conectando flotas de proveedores internacionales y locales (Hertz, Avis, Enterprise, Europcar, Localiza). El embudo de reserva de Booking Cars descubierto en producción comprende:

1. **Búsqueda Geoterritorial y Temporal:**
   - Selección de punto de recogida (*Pick-up Depot* / Código IATA de aeropuerto o centro urbano).
   - Opción de devolución en un punto diferente (*One-way rental* con recargo de tasa por trayecto único).
   - Fechas y franjas horarias exactas de recogida y devolución (en intervalos de 15 o 30 minutos).
   - Control de edad del conductor principal: Checkbox por defecto *"El conductor tiene entre 30 y 65 años"*. Si se desmarca, se activa un campo numérico obligatorio para aplicar sobretasas por conductor joven (menor de 30 años) o sénior (mayor de 65 años).
2. **Resultados de Búsqueda y Comparativa de Flotas:**
   - Filtros por categoría de vehículo: Pequeño (Mini/Económico), Mediano (Compacto), Grande, SUV, Monovolumen, Premium.
   - Filtros técnicos: Transmisión (Automática vs Manual), Política de combustible (*Lleno a Lleno* vs *Prepago*), Kilometraje ilimitado.
   - Puntuación de la agencia (evaluada sobre 10, ej. 8.4 "Muy bueno", basada en atención en mostrador, limpieza del auto y tiempo de espera).
3. **Ficha de la Oferta y Selección de Cobertura:**
   - Paquete Básico Incluido: Protección contra robo (TP) y Cobertura parcial por colisión (CDW) con franquicia (*Excess* de US$ 800 - 1500) y exigencia de depósito de garantía en tarjeta de crédito física a nombre del conductor.
   - Upselling de Cobertura Total / Protección Completa: Reembolso de franquicia por daños a cristales, neumáticos, bajos y pérdida de llaves, además de asistencia en carretera 24/7.
4. **Checkout y Captura del Conductor Principal:**
   - Datos personales, teléfono, país y número de vuelo (crucial para que la agencia mantenga la reserva si el vuelo se retrasa).
   - Solicitud de extras: Silla de bebé / elevador para niños, conductor adicional, dispositivo GPS.
   - Bloqueo de vehículo (*Hold*) y confirmación transaccional protegida con `Idempotency-Key`.
5. **Operaciones Postventa y Patio (API v2):**
   - Check-in y entrega de vehículo con registro de kilometraje de salida y depósito retenido.
   - Inspección de patio y mantenimiento para vehículos devueltos (registro de combustible, rayones y pase a limpieza por 2 horas).

---

## 2. Historias de Usuario Detalladas

---

### HU-AUT-01: Búsqueda de Vehículos con Geolocalización, Franjas Horarias y Regla de Edad

**Como** Conductor que requiere alquilar un automóvil  
**Quiero** definir el punto de retiro, punto de devolución, fechas con horarios y mi edad  
**Para** encontrar opciones de vehículos disponibles con tarifas que reflejen las regulaciones de seguros según mi perfil etario.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Página de Inicio de Alquiler de Coches (`https://cars.booking.com` o `/cars/index.es.html`).
- **Formularios Detectados:** Componente *Searchbox* de Autos con radio de trayecto único, inputs con autocompletado de aeropuertos/ciudades, selectores de fecha/hora y toggle de edad.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `same_location` (Mismo punto) | Radio Button / Toggle | Default: true (Recogida y entrega en el mismo lugar) | Boolean |
  | `pu_location` (Lugar de recogida) | Combobox / Text Input | Required, min: 2 caracteres, autocompletado con nombre e IATA (ej. "UIO - Aeropuerto de Quito") | String |
  | `do_location` (Lugar de devolución) | Combobox / Text Input | Condicional (Required si `same_location == false`), min: 2 caracteres | String |
  | `pu_date` (Fecha de recogida) | Datepicker | Required, min: `today()`, formato `YYYY-MM-DD` | Date |
  | `pu_time` (Hora de recogida) | Select Dropdown | Required, intervalos de 15 o 30 min (ej. "10:00") | Time / String |
  | `do_date` (Fecha de devolución) | Datepicker | Required, min: `pu_date`, formato `YYYY-MM-DD` | Date |
  | `do_time` (Hora de devolución) | Select Dropdown | Required, intervalos de 15 o 30 min (ej. "10:00") | Time / String |
  | `driver_age_bracket` (Edad estándar)| Checkbox | Default: checked (*"El conductor tiene entre 30 y 65 años"*) | Boolean |
  | `driversAge` (Edad exacta conductor) | Numeric Input | Condicional (Required si `driver_age_bracket == false`), min: 18, max: 99 | Integer |

- **Flujo Secuencial:**
  1. El usuario introduce el punto de recogida (ej. "Quito"); el desplegable lista aeropuertos prioritarios (icono de avión con código IATA) y oficinas céntricas (icono de edificio).
  2. Al seleccionar las fechas de recogida y devolución, se habilitan los selectores de hora.
  3. Si el usuario desmarca la casilla *"El conductor tiene entre 30 y 65 años"*, la interfaz despliega un input numérico para escribir la edad exacta (ej. 23). Aparece un microcopy informativo: *"Los proveedores pueden aplicar tasas adicionales a conductores jóvenes o mayores"*.
  4. Al pulsar *"Buscar"*, el sistema empaqueta la petición codificada hacia la página de resultados (`/search-results`).

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-AUT-01.1:** El período mínimo de alquiler es de 24 horas continuas para efectos tarifarios; si la duración es menor (ej. 5 horas), el sistema factura el día completo de renta.
- **RN-AUT-01.2:** Si la edad ingresada es menor a 21 años, el sistema restringe ciertas categorías de flota (ej. vehículos Premium o SUV grandes) y añade automáticamente el cargo por conductor joven en la cotización. Menores de 18 años son rechazados terminantemente por impedimento legal de conducción.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/autos/search` mapeado desde el contrato `contracts/autos-openapi.yaml` (`CarSearchRequest`). Valida `pickupLocation`, `returnLocation`, `pickupDateTime`, `returnDateTime` y `driverAge`.
  - **Header de Afiliado:** Requiere cabecera `X-Affiliate-Id: <number>`.
  - **Supabase Cloud:** Consulta al esquema `autos.vehiculos` y `autos.agencias` filtrando por stock disponible.
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` de la búsqueda de autos con `puLocation` y `driverAge`.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Búsqueda exitosa en aeropuerto con conductor estándar
- **Dado que** el usuario ingresa lugar de recogida "UIO", fecha de recogida "2026-11-05 10:00", fecha de devolución "2026-11-08 10:00" y mantiene marcada la edad entre 30 y 65 años
- **Cuando** presiona "Buscar"
- **Entonces** el sistema navega a la lista de resultados mostrando los vehículos disponibles en el Aeropuerto de Quito ordenados por precio
- **Y** el Gateway responde con HTTP `200 OK` y cabecera de caché `Cache-Control: public, max-age=300`.

##### Escenario 2: Conductor menor de 18 años rechazado
- **Dado que** el usuario desmarca la edad estándar e ingresa "17" en el campo de edad
- **Cuando** presiona el botón "Buscar"
- **Entonces** el formulario detiene la ejecución, resalta el campo de edad en rojo y muestra: *"El conductor debe tener al menos 18 años para alquilar un vehículo"*
- **Y** el Gateway emite un error RFC 7807 (`status: 422, type: ".../underage-driver"`).

---

### HU-AUT-02: Filtrado y Comparación de Flota, Especificaciones Técnicas y Proveedores

**Como** Conductor que compara vehículos  
**Quiero** filtrar por tipo de caja de cambios, capacidad de maletas, política de combustible y calificación del proveedor  
**Para** elegir el automóvil que mejor se adapte a mi ruta y presupuesto.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Pantalla de Resultados de Búsqueda de Autos (`/search-results`).
- **Formularios Detectados:** Barra lateral izquierda de filtros de flota y tarjetas de oferta de vehículos.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `car_category` (Categoría) | Checkbox Group | Opciones: Pequeño, Mediano, Grande, SUV, Premium | Array de Strings |
  | `transmission` (Transmisión) | Checkbox Group | Opciones: Automática, Manual | String |
  | `seats` (Número de asientos) | Checkbox Group | Opciones: 4-5 asientos, 7+ asientos | Integer |
  | `fuel_policy` (Combustible) | Checkbox | Opciones: Lleno a Lleno (Full-to-Full) | String |
  | `supplier_rating` (Valoración) | Checkbox Group | Opciones: Excelente (8.5+), Muy bueno (8.0+) | Float |
  | `deposit_amount` (Depósito) | Checkbox Group | Opciones: Menos de US$ 500, US$ 500 a US$ 1000 | String |

- **Flujo Secuencial:**
  1. Cada tarjeta de auto exhibe: Imagen del modelo (ej. "Toyota Corolla o similar"), categoría ("Compacto"), especificaciones técnicas con iconos (4 plazas, 2 maletas grandes, 5 puertas, A/C, transmisión automática).
  2. Muestra el logotipo de la compañía proveedora (ej. Hertz) con su puntuación de clientes (ej. 8.4) y ubicación de la oficina (*"Mostrador en la terminal de llegadas"* vs *"Autobús de cortesía"*).
  3. Muestra las condiciones clave: *"Cancelación gratis hasta 48h antes"*, *"Kilometraje ilimitado"*.
  4. Muestra el precio total por los `X` días y el precio promedio por día, junto al botón *"Ver oferta"*.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-AUT-02.1:** La política "Lleno a Lleno" exige devolver el vehículo con la misma cantidad de combustible recibida; de lo contrario, el proveedor descontará del depósito el combustible faltante más una tasa administrativa de repostaje.
- **RN-AUT-02.2:** La designación *"o similar"* es una norma del estándar ACRISS (código de 4 letras de categorización de vehículos); el usuario reserva una categoría y características mecánicas, no una placa o color garantizado.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/autos/search` aplicando filtros en la capa de servicio.
  - **Inbound gRPC:** Consulta al cache de inventario sincronizado vía `inventory.proto`.
  - **Supabase Cloud:** `autos.vehiculos` y `autos.categorias`.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Filtrado exitoso por transmisión automática
- **Dado que** el usuario ve 25 vehículos mixtos en los resultados
- **Cuando** activa el checkbox "Automática"
- **Entonces** la lista se refresca instantáneamente mostrando únicamente vehículos con icono de transmisión automática
- **Y** el backend responde con HTTP `200 OK`.

---

### HU-AUT-03: Ficha de Oferta, Coberturas de Seguro y Desglose de Franquicia

**Como** Conductor que analiza una oferta de auto  
**Quiero** examinar los detalles de la franquicia, el depósito de garantía y las opciones de Protección Total  
**Para** mitigar riesgos financieros por colisión o robo durante el viaje.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Pantalla de Oferta del Vehículo (`/package/deal/...`).
- **Formularios Detectados:** Selector comparativo de cobertura (Protección Básica vs Cobertura Total).
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `coverage_plan` (Plan de Cobertura)| Radio Cards comparativas | Required, opciones: `BASIC` (Incluida) \| `FULL_PROTECTION` (+ US$ 14.50/día) | Enum / String |
  | `terms_acknowledgement` | Informative Box | Detalla el depósito requerido en tarjeta de crédito en mostrador (ej. US$ 800) | Read-only |

- **Flujo Secuencial:**
  1. El usuario revisa los puntos de recogida y devolución con mapa satelital y horarios de apertura de la oficina.
  2. Se expone la tabla comparativa de seguros:
     - **Protección Básica:** Franquicia de daños: US$ 1,000; Franquicia de robo: US$ 1,000; Excluye ruedas, cristales, chasis y cerraduras. Depósito requerido en mostrador: US$ 1,000.
     - **Protección Total:** Reembolso del 100% de los cargos de franquicia, cobertura integral de carrocería, neumáticos y cristales, remolque y pérdida de llaves.
  3. Al seleccionar "Añadir Protección Total", el precio final en la barra de resumen se recalcula sumando el costo diario del seguro multiplicado por los días de renta.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-AUT-03.1:** Para retirar el auto es estrictamente obligatorio presentar en el mostrador una **tarjeta de crédito física** emitida a nombre del conductor principal, con cupo suficiente para el bloqueo temporal del depósito de seguridad. Tarjetas de débito o prepago no son aceptadas por la mayoría de agencias para el depósito.
- **RN-AUT-03.2:** La Protección Total ofrecida en la plataforma web actúa como póliza de reembolso administrada por el bróker (Booking / RentalCover); la agencia en mostrador retiene el depósito y, en caso de siniestro, el usuario reclama el reintegro.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/autos/orders/preview` validando los ítems de cobertura y calculando el precio final (`OrderPreviewResponse`).
  - **Supabase Cloud:** `autos.coberturas` y `autos.tarifas_adicionales`.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Incorporación de Protección Total en la orden
- **Dado que** el vehículo tiene una tarifa base de US$ 120 por 3 días
- **Cuando** el usuario selecciona la opción "Añadir Protección Total" a US$ 15 por día
- **Entonces** el total de la reserva se actualiza a US$ 165 reflejando el desglose transparente
- **Y** el endpoint `/orders/preview` responde HTTP `200 OK` con el desglose impositivo y de póliza.

---

### HU-AUT-04: Formulario de Checkout y Datos del Conductor Principal

**Como** Conductor que formaliza el alquiler  
**Quiero** ingresar mis nombres, apellidos, correo, teléfono y número de vuelo de llegada  
**Para** que la agencia asigne el contrato a mi nombre y custodie el auto en caso de retraso del vuelo.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Formulario de Checkout de Autos (`cars.booking.com/checkout`).
- **Formularios Detectados:** Formulario de datos del conductor, número de vuelo y selección de extras de viaje.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `driver_firstname` (Nombre) | Text Input | Required, max: 60 caracteres, exactamente como en la licencia de conducir | String |
  | `driver_lastname` (Apellido) | Text Input | Required, max: 60 caracteres, exactamente como en la licencia de conducir | String |
  | `driver_email` (Correo electrónico) | Email Input | Required, formato válido RFC 5322 | String |
  | `driver_phone` (Teléfono) | Tel Input con selector de país | Required, formato internacional E.164 | String |
  | `flight_number` (Número de vuelo) | Text Input | Optional (pero recomendado en recogidas de aeropuerto), patrón `^[A-Z0-9]{2,3}\s?[0-9]{1,4}$` (ej. "AV 7385") | String |
  | `extra_baby_seat` (Silla de bebé) | Counter Stepper | Optional, min: 0, max: 3 | Integer |
  | `extra_gps` (Navegador GPS) | Checkbox | Optional, boolean | Boolean |

- **Flujo Secuencial:**
  1. El formulario solicita los datos del conductor advirtiendo: *"El nombre debe coincidir exactamente con el documento de identidad y la licencia de conducir física"*.
  2. Si el punto de recogida es un aeropuerto, se muestra el campo "Número de vuelo" con la nota: *"Si tu vuelo se retrasa, la empresa de alquiler esperará hasta 1 hora"*.
  3. Los extras solicitados (ej. sillas de bebé) se marcan con la aclaración: *"Se pagan directamente en el mostrador de recogida"*.
  4. Al presionar *"Continuar hacia la confirmación"*, se procede al bloqueo del inventario.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-AUT-04.1:** Si el usuario no proporciona número de vuelo en un alquiler de aeropuerto, la empresa no asume responsabilidad de custodia en caso de demoras del vuelo superiores a 60 minutos desde la hora pactada.
- **RN-AUT-04.2:** El conductor debe contar con al menos 1 o 2 años de antigüedad en su licencia de conducir para retirar el automóvil según las políticas de cada proveedor.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/autos/orders/hold` para bloquear temporalmente el vehículo (`OrderHoldRequest`).
  - **Cabecera Idempotente:** Envío obligatorio de `Idempotency-Key: <UUID-v4>`.
  - **Supabase Cloud:** `autos.ordenes` con estado `HOLD` (expiración a los 20 minutos).

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Bloqueo exitoso de auto con número de vuelo válido
- **Dado que** el usuario ingresó nombre "María Fernanda Gómez", email, teléfono y vuelo "AV 7385"
- **Cuando** presiona "Continuar"
- **Entonces** el sistema bloquea el vehículo en el inventario por 20 minutos y avanza a la pantalla de pago
- **Y** el Gateway responde con HTTP `200 OK` en `/orders/hold` y registra el evento en `logs/integration-*.log`.

##### Escenario 2: Intento de envío con formato de vuelo inválido
- **Dado que** el usuario escribe "VUELO-AYER" en el campo de número de vuelo
- **Cuando** intenta continuar
- **Entonces** el campo resalta en rojo con el mensaje: *"Ingresa un código de aerolínea y número de vuelo válido (ej. IB3160)"*.

---

### HU-AUT-05: Creación Transaccional de Orden de Renta con Idempotencia y Circuit Breaker

**Como** Conductor que aprueba el alquiler  
**Quiero** formalizar la reserva enviando los datos de pago bajo una conexión segura y tolerante a fallos  
**Para** garantizar que no se efectúen cobros duplicados en caso de intermitencia de red.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Pantalla Final de Confirmación de Alquiler de Auto.
- **Formularios Detectados:** Pasarela de pago de la tarifa de alquiler o garantía de cobro, checkbox de términos de la agencia.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `card_holder` (Titular) | Text Input | Required, max: 100 caracteres | String |
  | `card_pan` (Número tarjeta) | Text Input Mask | Required, validación Luhn | String |
  | `card_expiry` (Expiración) | Text Input Mask `MM/YY` | Required, fecha futura | String |
  | `card_cvv` (CVV) | Password Input | Required, 3 o 4 dígitos | String |
  | `terms_car_partner` | Checkbox | Required, aceptación de las condiciones del proveedor de autos | Boolean |

- **Flujo Secuencial:**
  1. El cliente revisa la cotización final y los términos de cancelación (ej. *"Cancelación gratuita hasta 48 horas antes de la recogida"*).
  2. Ingresa los datos bancarios y pulsa el botón *"Reservar ahora"* (¡Simulado en auditoría!).
  3. El cliente web genera un `Idempotency-Key` único (UUID v4) y lo despacha en la cabecera HTTP.
  4. El Gateway procesa la orden a través del Circuit Breaker con un timeout perimetral estricto de 5000 ms.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-AUT-05.1:** Si la tienda externa de autos tarda más de 5 segundos en confirmar la orden, el Circuit Breaker interrumpe la petición para no colgar los recursos del Gateway y emite un fallo controlado bajo RFC 7807.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/autos/orders/create` mapeado desde `contracts/autos-openapi.yaml`.
  - **Circuit Breaker:** Parámetros: `timeout: 5000ms`, `errorThresholdPercentage: 50`, `resetTimeout: 10000ms`.
  - **Outbound REST:** Envío con cabecera `Idempotency-Key: <UUID>`.
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` de la orden de auto confirmada (`order_id`, `monto_total`, `estado: CONFIRMADA`).

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Creación de orden exitosa
- **Dado que** el vehículo está bloqueado en `HOLD` y la tarjeta es válida
- **Cuando** se invoca `POST /api/v2/autos/orders/create` con `Idempotency-Key: e82b3d11-5360-4493-83f0-44026da4663a`
- **Entonces** el Gateway retorna HTTP `201 Created` con el detalle completo de la orden (`OrderDetail`)
- **Y** se escribe el registro transaccional en `logs/audit-*.log`.

##### Escenario 2: Reintento con la misma clave de idempotencia
- **Dado que** una orden ya fue creada previamente con la misma clave de idempotencia
- **Cuando** el cliente envía nuevamente la misma petición por corte de red
- **Entonces** el Gateway no ejecuta una segunda llamada al proveedor externo, recupera la orden existente y responde HTTP `200 OK` con los mismos datos sin duplicar la reserva.

---

### HU-AUT-06: Check-in, Acta de Entrega y Mantenimiento de Flota (Extensión API v2)

**Como** Agente de Alquiler / Personal de Patio  
**Quiero** registrar la entrega del auto al cliente con su kilometraje inicial y registrar la inspección al devolverlo  
**Para** formalizar el acta de entrega digital y programar la limpieza y mantenimiento del vehículo.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Panel de Operaciones de Autos / Mostrador de Entrega.
- **Formularios Detectados:** Formulario de Check-in de salida y Formulario de Mantenimiento de patio.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `conductor_nombre` (Conductor) | Text Input | Required, max: 100 caracteres | String |
  | `licencia_numero` (No. Licencia) | Text Input | Required, alfanumérico, max: 30 caracteres | String |
  | `km_salida` (Kilometraje salida) | Numeric Input | Required, valor >= kilometraje registrado en flota | Integer |
  | `deposito_retenido_usd` (Depósito)| Currency Input | Required, float positivo (ej. 300.00) | Float |
  | `kilometraje_llegada` (Km llegada) | Numeric Input | Required en devolución, debe ser `>= km_salida` | Integer |
  | `nivel_combustible` (Nivel gasolina)| Select Dropdown | Required, opciones: "100%", "75%", "50%", "25%", "0%" | String |
  | `observaciones_estado` (Daños) | Textarea | Optional, reporte de rayones o desperfectos | String |

- **Flujo Secuencial:**
  1. Al presentarse el cliente en mostrador, el agente busca la orden y valida la licencia física.
  2. Registra el odómetro actual (`km_salida`) y confirma la retención del depósito.
  3. El sistema emite el acta de entrega digital en PDF (`acta_entrega_url`).
  4. Al devolver el auto, el inspector registra el kilometraje de llegada, combustible y observaciones.
  5. El sistema cambia automáticamente el estado del auto a `EN_LIMPIEZA` con un contador de 2 horas (120 minutos) antes de volver a estar disponible en inventario.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-AUT-06.1:** Todo vehículo devuelto debe pasar por un período mandatorio de limpieza y sanitización de 120 minutos antes de que el motor de inventario vuelva a ofrecerlo en búsqueda.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoints estipulados en `docs Paúl Rosero/context/contratos_api_v2.md`:
    - `POST /api/v2/autos/orders/:id/checkin`
    - `POST /api/v2/autos/:id/mantenimiento/registro`
  - **Supabase Cloud:** Actualización de `autos.vehiculos` (`status = 'EN_LIMPIEZA'`) y creación de registro en `autos.mantenimientos`.
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` de la entrega y recepción del vehículo.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Registro de check-in y entrega exitoso
- **Dado que** la orden `ord-777` está confirmada para el auto `auto-505`
- **Cuando** el agente despacha `POST /api/v2/autos/orders/ord-777/checkin` con `km_salida: 42150` y depósito de US$ 300
- **Entonces** el Gateway actualiza el estado a `ENTREGADO` y retorna el enlace al PDF del acta
- **Y** el sistema responde HTTP `200 OK`.

##### Escenario 2: Inspección de devolución y paso a limpieza
- **Dado que** el auto `auto-505` retorna con `km_llegada: 42800`
- **Cuando** se envía `POST /api/v2/autos/auto-505/mantenimiento/registro`
- **Entonces** el Gateway retorna HTTP `201 Created`, fija `estado_actual: EN_LIMPIEZA` por 120 minutos y bloquea el auto en el caché de inventario gRPC.
