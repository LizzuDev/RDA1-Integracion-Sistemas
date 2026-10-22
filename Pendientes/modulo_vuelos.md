# Módulo 4: Vuelos (Flights) — Ingeniería Inversa y Requerimientos

> **Dominio:** Billetes Aéreos, Itinerarios, Tarifas, Escalas y Check-in  
> **Sistema Destino:** Booking Prototipo (RDA2)  
> **Ambiente Auditado:** `https://www.booking.com/flights/index.es.html`  
> **Contrato OpenAPI de Referencia:** `contracts/vuelos-openapi.yaml`  
> **Contrato de Integración v2:** `docs Paúl Rosero/context/contratos_api_v2.md`

---

## 1. Visión General del Dominio de Vuelos

La vertical de Vuelos en Booking.com opera como un agregador GDS (Global Distribution System) conectado a más de 300 aerolíneas en todo el mundo. La experiencia y arquitectura descubierta en producción abarca:

1. **Búsqueda Multitrayecto y Cabina:**
   - Tipos de viaje: Ida y vuelta (*Round trip*), Solo ida (*One-way*) y Múltiples destinos (*Multi-city* con hasta 6 tramos independientes).
   - Autocompletado de aeropuertos con códigos IATA de 3 letras (ej. UIO - Quito, BOG - Bogotá, MAD - Madrid Adolfo Suárez) y opción de *"Todos los aeropuertos"* para ciudades metropolitanas con múltiples terminales (ej. LON, PAR, NYC).
   - Desglose riguroso de pasajeros: Adultos (12+ años), Niños (2-11 años) y Bebés en regazo (0-1 años), además de la clase de viaje: Turista / Económica, Premium Economy, Business y Primera Clase.
2. **Resultados de Vuelo e Itinerarios con Escalas:**
   - Filtros por número de escalas: Vuelos directos, 1 escala, 2+ escalas.
   - Filtros de equipaje: Muestra únicamente ofertas que incluyan maleta de cabina o equipaje facturado en bodega.
   - Tarjetas de vuelo detallando: Aerolínea operadora, horas locales de salida y llegada (+1 si arriba al día siguiente), duración total del viaje y tiempo de conexión entre vuelos.
3. **Selección de Familia Tarifaria (Fare Families):**
   - **Tarifa Light / Básica:** Solo artículo personal bajo el asiento (bolso o mochila pequeña), cambios con penalidad económica y sin opción de reembolso.
   - **Tarifa Estándar:** Artículo personal + equipaje de mano en cabina (10 kg) + maleta facturada en bodega (23 kg) + selección estándar de asiento.
   - **Tarifa Flexible:** Todos los beneficios anteriores + cambios de fecha gratuitos ilimitados y reembolso total por cancelación voluntaria.
4. **Checkout Riguroso de Pasajeros y Asignación de Asientos:**
   - Captura mandatoria de género/tratamiento, nombres y apellidos exactamente como constan en el pasaporte, fecha de nacimiento estricta (día, mes, año) para validar categorías de edad, nacionalidad, número de documento y fecha de expiración.
   - Mapa interactivo de asientos por segmento (`/seatmap`).
   - Bloqueo de inventario (*Hold*) para congelar la tarifa y disponibilidad durante el proceso de pago.
5. **Check-in Digital y Tarjeta de Embarque (API v2):**
   - Check-in en línea anticipado (disponible 24 a 48 horas antes de la salida).
   - Asignación de asiento final, grupo de embarque (*Boarding Group*) y generación del pase de abordar digital en PDF con código de barras PDF417 o QR.

---

## 2. Historias de Usuario Detalladas

---

### HU-VUE-01: Búsqueda Multitrayecto de Vuelos con Códigos IATA y Configuración de Pasajeros

**Como** Pasajero que planifica un viaje aéreo  
**Quiero** ingresar aeropuertos de origen y destino, fechas de vuelo, tipo de cabina y composición de viajeros  
**Para** obtener las combinaciones de vuelos disponibles ordenadas por precio y conveniencia horaria.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Página principal de Vuelos (`/flights/index.es.html`).
- **Formularios Detectados:** Barra de búsqueda aérea con selector de modalidad (Ida y vuelta / Solo ida / Multidestino), inputs de origen/destino, calendario de fechas y selector modal de pasajeros/cabina.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `trip_type` (Tipo de Viaje) | Radio Group / Tabs | Required, opciones: `ROUND_TRIP`, `ONE_WAY`, `MULTI_CITY` | Enum |
  | `origin` (Aeropuerto Origen) | Combobox Autocomplete | Required, código IATA de 3 letras o ID de ciudad (ej. "UIO") | String |
  | `destination` (Aeropuerto Destino) | Combobox Autocomplete | Required, código IATA de 3 letras, debe ser distinto a `origin` | String |
  | `departure_date` (Fecha Salida) | Datepicker | Required, min: `today()`, formato ISO `YYYY-MM-DD` | Date |
  | `return_date` (Fecha Retorno) | Datepicker | Condicional (Required si `trip_type == ROUND_TRIP`), min: `departure_date` | Date |
  | `adults` (Adultos 12+ años) | Numeric Stepper (`-` / `+`) | Required, min: 1, max: 9 | Integer |
  | `children` (Niños 2-11 años) | Numeric Stepper (`-` / `+`) | Optional, min: 0, max: 8 | Integer |
  | `infants` (Bebés 0-1 año) | Numeric Stepper (`-` / `+`) | Optional, min: 0, max: `adults` (máximo 1 bebé por adulto en regazo) | Integer |
  | `cabin_class` (Clase de Cabina) | Select Dropdown | Required, opciones: `ECONOMY`, `PREMIUM_ECONOMY`, `BUSINESS`, `FIRST` | Enum |
  | `direct_only` (Solo Directos) | Checkbox | Optional, boolean (excluye itinerarios con escalas) | Boolean |

- **Flujo Secuencial:**
  1. El usuario selecciona "Ida y vuelta".
  2. Escribe "Quito" en el origen; el selector muestra "UIO - Mariscal Sucre Intl". Escribe "Bogotá" en destino; se selecciona "BOG - El Dorado".
  3. El calendario exige fecha de ida y de vuelta.
  4. En el selector de pasajeros, si se intenta subir el contador de bebés a 2 teniendo solo 1 adulto, el botón `+` se desactiva preventivamente.
  5. Pulsa el botón principal *"Buscar vuelos"*.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-VUE-01.1:** El aeropuerto de origen no puede coincidir con el aeropuerto de destino (`origin != destination`).
- **RN-VUE-01.2:** Regla de aviación civil internacional: El número de bebés en regazo no puede superar el número de adultos (`infants <= adults`), ya que cada infante debe viajar sujeto al cinturón de un adulto responsable.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/vuelos/search` (mapeado desde `contracts/vuelos-openapi.yaml` `/search`). Exige header `X-Device-Fingerprint: <string>`. DTO `SearchRequest` validado rigurosamente.
  - **Supabase Cloud:** `vuelos.aeropuertos` y `vuelos.rutas`.
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` del evento `FLIGHT_SEARCH_EXECUTED`.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Búsqueda exitosa de vuelo internacional
- **Dado que** el usuario ingresa origen "UIO", destino "BOG", fechas válidas y 1 pasajero adulto
- **Cuando** presiona el botón "Buscar vuelos"
- **Entonces** el sistema navega a la pantalla de resultados con el listado de aerolíneas (Avianca, LATAM) ordenado por la opción más rápida o económica
- **Y** el API Gateway responde con HTTP `200 OK`.

##### Escenario 2: Intento de búsqueda con origen y destino idénticos
- **Dado que** el usuario selecciona "UIO" en origen y "UIO" en destino
- **Cuando** intenta buscar
- **Entonces** la interfaz muestra una alerta perimetral en rojo: *"El punto de partida y de llegada no pueden ser el mismo"*
- **Y** el Gateway emite un error RFC 7807 (`status: 400, type: ".../same-origin-destination"`).

---

### HU-VUE-02: Resultados de Vuelos, Itinerarios con Escalas y Filtros de Equipaje

**Como** Pasajero que evalúa vuelos  
**Quiero** visualizar las escalas, duración total y aerolíneas operadoras, y filtrar por equipaje incluido  
**Para** elegir el trayecto más cómodo sin sorpresas de cobros por maleta en el aeropuerto.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Pantalla de Resultados de Vuelos (`/flights/results`).
- **Formularios Detectados:** Barra de filtros (escalas, aerolíneas, horas de despegue) y tarjetas de itinerario.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `stops_filter` (Escalas) | Checkbox Group | Opciones: Directo (0 escalas), 1 escala, 2+ escalas | Array de Strings |
  | `baggage_filter` (Equipaje) | Checkbox Group | Opciones: Maleta en cabina incluida, Maleta en bodega incluida | Array de Strings |
  | `airlines_filter` (Aerolíneas) | Checkbox Group | Lista dinámica de aerolíneas con tarifas en el resultado | Array de Strings |
  | `sort_by` (Ordenar por) | Select Dropdown / Tabs | Opciones: El mejor, El más barato, El más rápido | Enum |

- **Flujo Secuencial:**
  1. Cada tarjeta de vuelo despliega:
     - Logotipo de la aerolínea (ej. Iberia).
     - Hora de salida, código IATA de salida, hora de llegada y código IATA de destino.
     - Indicador de escala (ej. *"1 escala de 1h 45m en BOG"* en color naranja o gris).
     - Duración total del vuelo (ej. "5h 30m").
     - Iconos de equipaje: Maleta de mano tachada o en verde si está incluida.
     - Precio total en USD por todos los pasajeros.
  2. Al pulsar *"Ver vuelo"*, se despliega el acordeón con el detalle tramo a tramo (número de vuelo, modelo de avión ej. Airbus A320, terminal de salida).

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-VUE-02.1:** Los precios mostrados en los resultados deben incluir obligatoriamente todas las tasas aeroportuarias gubernamentales obligatorias (Tarifa de Uso de Aeropuerto - TUA).
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/vuelos/search`.
  - **Inbound gRPC:** Consulta al cache de inventario sincronizado vía `inventory.proto` (`StreamAvailability`).
  - **Supabase Cloud:** `vuelos.itinerarios` y `vuelos.tarifas`.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Filtrado de vuelos solo directos
- **Dado que** se muestran 15 opciones de vuelo incluyendo vuelos con escalas
- **Cuando** el usuario marca el filtro "Solo vuelos directos"
- **Entonces** la lista se actualiza mostrando únicamente vuelos sin paradas intermedias
- **Y** el backend responde HTTP `200 OK`.

---

### HU-VUE-03: Selección de Tarifa (Fare Families) y Paquetes de Equipaje Adicional

**Como** Pasajero que selecciona un vuelo específico  
**Quiero** comparar los paquetes tarifarios (Light, Estándar, Flexible)  
**Para** elegir el nivel de flexibilidad de cambios y franquicia de equipaje adecuado para mi equipaje.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Modal / Pantalla de Selección de Tarifa (`/flights/fare-family`).
- **Formularios Detectados:** Selector en columnas de familias tarifarias.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `fare_tier` (Nivel de Tarifa) | Radio Cards en Columna | Required, opciones: `LIGHT`, `STANDARD`, `FLEX` | String |
  | `add_checked_bag` (Maletas extra) | Stepper (`-` / `+`) | Optional, min: 0, max: 2 por pasajero (23 kg c/u) | Integer |

- **Flujo Secuencial:**
  1. La UI presenta 3 columnas comparativas:
     - **Básica (Light):** US$ 180. 1 bulto bajo el asiento. Cambios no permitidos.
     - **Estándar:** US$ 230. 1 bulto bajo asiento + 1 maleta de mano en compartimento superior (10 kg) + 1 maleta en bodega (23 kg) + selección estándar de asiento.
     - **Flexible:** US$ 290. Todo lo anterior + cambios de fecha sin penalidad + reembolso en voucher si cancelas.
  2. El usuario selecciona "Estándar". El resumen de la orden se actualiza y se presiona *"Elegir"* para ingresar los datos de los pasajeros.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-VUE-03.1:** El paquete tarifario seleccionado aplica a todos los tramos del itinerario para ese pasajero. No se permite seleccionar tarifa Light en la ida y Flexible en el regreso en boletos combinados de la misma aerolínea.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/vuelos/offers/hold` donde se envía `offerId` y `fareTier`.
  - **Supabase Cloud:** `vuelos.familias_tarifarias` y `vuelos.reglas_equipaje`.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Elección de tarifa estándar con maleta en bodega
- **Dado que** el usuario visualiza las 3 opciones de tarifas para el vuelo seleccionado
- **Cuando** hace clic en "Seleccionar Estándar"
- **Entonces** el sistema avanza al formulario de pasajeros indicando que incluye 1 maleta de cabina y 1 de bodega
- **Y** el Gateway confirma el bloqueo temporal en `/offers/hold`.

---

### HU-VUE-04: Formulario de Checkout y Datos de Pasajeros con Validación Rigurosa de Documentos

**Como** Pasajero que emite un billete aéreo  
**Quiero** ingresar los nombres, apellidos, fecha de nacimiento, nacionalidad y datos de pasaporte de cada viajero  
**Para** cumplir con los estándares de seguridad aeronáutica internacional (TSA / IATA) y evitar ser denegado en el embarque.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Formulario de Datos de Pasajeros (`/flights/checkout/passengers`).
- **Formularios Detectados:** Formularios repetidos por cada pasajero del grupo + Formulario de contacto del comprador.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `title` (Tratamiento) | Select Dropdown | Required, opciones: "Sr.", "Sra.", "Srta." | String |
  | `first_name` (Nombres) | Text Input | Required, max: 50 caracteres, solo caracteres alfabéticos estándar | String |
  | `last_name` (Apellidos) | Text Input | Required, max: 50 caracteres, exactamente como en el pasaporte | String |
  | `dob_day` (Día de Nacimiento) | Select Dropdown | Required, valores: 1 a 31 | Integer |
  | `dob_month` (Mes de Nacimiento) | Select Dropdown | Required, valores: Enero a Diciembre (1 a 12) | Integer |
  | `dob_year` (Año de Nacimiento) | Select Dropdown | Required, año coherente con la categoría (Adulto: `<= año_actual - 12`) | Integer |
  | `gender` (Género oficial) | Radio Group | Required por regulaciones de vuelo: "Masculino" \| "Femenino" | String |
  | `nationality` (Nacionalidad) | Select Dropdown con búsqueda | Required, país emisor del documento (código ISO de 2 letras) | String |
  | `document_type` (Tipo de Doc) | Select Dropdown | Required, opciones: "Pasaporte", "DNI / Documento Nacional" | String |
  | `document_number` (Número de Doc) | Text Input | Required, alfanumérico, sin espacios, max: 20 caracteres | String |
  | `doc_expiry_date` (Vencimiento) | Datepicker | Required en vuelos internacionales, min: `flight_date + 6 months` | Date |
  | `contact_email` (Email contacto) | Email Input | Required, para envío de billetes electrónicos (e-tickets) | String |
  | `contact_phone` (Teléfono contacto)| Tel Input con código país | Required, formato E.164 | String |

- **Flujo Secuencial:**
  1. Si hay 2 adultos y 1 niño, se renderizan 3 bloques colapsables claramente rotulados: "Adulto 1 (Contacto principal)", "Adulto 2", "Niño 1".
  2. En el bloque de Niño 1, los selectores de año de nacimiento se limitan únicamente a fechas comprendidas entre hace 2 y 11 años.
  3. Si la fecha de caducidad del pasaporte es menor a 6 meses desde la fecha del vuelo, se muestra una alerta preventiva.
  4. Al pulsar *"Continuar a asientos / pago"*, se ejecuta una validación exhaustiva de los formatos.

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-VUE-04.1:** Los nombres y apellidos no pueden contener caracteres numéricos, tildes especiales ni símbolos (ej. "Carlos-José" debe normalizarse a formato IATA estándar "CARLOS JOSE").
- **RN-VUE-04.2:** La fecha de nacimiento debe validar matemáticamente la categoría seleccionada en el buscador. Si un pasajero fue registrado como "Niño" pero su fecha de nacimiento arroja 13 años, el formulario bloquea el envío con un error perimetral impidiendo la evasión de tarifa de adulto.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/vuelos/bookings/create` (documentado en `contracts/vuelos-openapi.yaml`).
  - **Supabase Cloud:** `vuelos.pasajeros` y `vuelos.reservas`.
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` de los pasajeros validados (datos anonimizados).

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Validación exitosa de pasajeros internacionales
- **Dado que** se ingresaron los datos de 1 adulto con pasaporte vigente por más de 6 meses
- **Cuando** presiona "Continuar"
- **Entonces** el sistema valida el formulario y abre el mapa de asientos o pasarela de pago
- **Y** el API Gateway responde con HTTP `200 OK`.

##### Escenario 2: Incoherencia en la fecha de nacimiento de un niño
- **Dado que** el pasajero fue declarado como niño (2-11 años)
- **Cuando** el usuario selecciona como año de nacimiento "2010" (16 años)
- **Entonces** la UI marca el bloque en rojo y exhibe: *"La fecha de nacimiento no corresponde a la categoría de niño (debe tener entre 2 y 11 años al momento de viajar)"*
- **Y** el Gateway rechaza con HTTP `422 Unprocessable Entity` (RFC 7807).

---

### HU-VUE-05: Retención de Inventario (Hold), Emisión de PNR y Confirmación con Idempotencia

**Como** Pasajero listo para pagar  
**Quiero** asegurar los asientos seleccionados y congelar la tarifa mediante un bloqueo formal (Hold)  
**Para** pagar con tranquilidad y recibir mi localizador PNR de reserva oficial.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Pantalla de Resumen Final de Vuelo y Pasarela Bancaria.
- **Formularios Detectados:** Resumen de itinerario con mapa de asientos, pasarela de pago y checkbox de aceptación de condiciones de la IATA.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `hold_id` (Identificador de Hold) | Hidden / Token | Required, UUID retornado por `/offers/hold` | String |
  | `payment_reference` (Referencia) | Text Input / Token | Required, identificador de pago acreditado | String |
  | `idempotency_key` | HTTP Header | Required, UUID v4 (`Idempotency-Key`) | UUID |

- **Flujo Secuencial:**
  1. El cliente revisa la cotización final desglosada: Tarifa aérea base + Impuestos de salida de país + Tasa aeroportuaria + Asientos de pago seleccionados.
  2. El sistema mantiene una cuenta regresiva visible: *"Tarifa reservada durante 15:00 minutos"*.
  3. El usuario envía el pago. La llamada viaja con cabecera `Idempotency-Key`.
  4. El Gateway confirma la reserva con la aerolínea externa y emite el **PNR** (Passenger Name Record, código alfanumérico de 6 caracteres, ej. `XY99K2`).

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-VUE-05.1:** Toda emisión aérea debe concretarse dentro del tiempo límite del Hold (15 a 20 minutos). Si expira el temporizador, el PNR provisional se cancela automáticamente y los asientos se liberan al inventario global gRPC.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/vuelos/bookings/create` protegido por **Circuit Breaker** (5s timeout).
  - **Outbound REST:** Envío a la API de Vuelos con `Idempotency-Key`.
  - **Supabase Cloud:** `vuelos.reservas` con estado `EMITIDO` y `pnr = 'XY99K2'`.
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` de la emisión del boleto.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Emisión exitosa de PNR y billete electrónico
- **Dado que** el hold está activo y el pago fue autorizado
- **Cuando** se invoca la creación de reserva con cabecera `Idempotency-Key: a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- **Entonces** el Gateway emite el billete con código PNR `XY99K2` en < 5 segundos y responde HTTP `201 Created`
- **Y** se genera un registro en `logs/audit-*.log` con evento `FLIGHT_TICKET_ISSUED`.

---

### HU-VUE-06: Check-in Digital, Asignación de Asiento y Emisión de Tarjeta de Embarque (Extensión API v2)

**Como** Pasajero con reserva de vuelo confirmada  
**Quiero** realizar el check-in en línea en las 24 horas previas a mi vuelo e ingresar mi DNI/asiento  
**Para** descargar mi tarjeta de embarque digital (Boarding Pass) y dirigirme directo a la puerta de embarque.

#### 🖥️ Mapa de Pantallas y Atributos de Interfaz (UI/UX Discovery):
- **Pantalla Origen:** Portal de Check-in en Línea de Vuelos (`/flights/check-in`).
- **Formularios Detectados:** Formulario de Check-in y Selección final de asiento.
- **Esquema de Atributos e Inputs:**

  | Nombre del Campo / Input | Tipo de Componente | Atributos / Validaciones | Tipo de Dato Técnico |
  | :--- | :--- | :--- | :--- |
  | `booking_id` (ID de Reserva) | Path Param | Required, identificador en el sistema | String |
  | `asiento_seleccionado` (Asiento) | Seatmap Selector / Text | Required, código fila y letra (ej. "14A") | String |
  | `pasajero_dni` (Documento) | Text Input | Required, debe coincidir con el registro emitido | String |

- **Flujo Secuencial:**
  1. El pasajero introduce su PNR o identificador de reserva y apellido.
  2. La UI presenta el mapa de asientos del avión; el usuario confirma el asiento "14A (Ventana)".
  3. Confirma la declaración obligatoria de no transporte de mercancías peligrosas (baterías de litio sueltas, aerosoles).
  4. El sistema procesa el check-in y genera la tarjeta de embarque con código de barras, número de asiento y Grupo de Embarque (ej. "Grupo 2").

#### 🧠 Reglas de Negocio Deducidas de la Navegación Real:
- **RN-VUE-06.1:** El check-in en línea solo está disponible entre 48 horas y hasta 2 horas antes de la hora programada de despegue. Pasado ese tiempo, el pasajero debe realizar el check-in presencialmente en el mostrador del aeropuerto.
- **Mapeo Arquitectónico:**
  - **Gateway NestJS v2:** Endpoint `POST /api/v2/vuelos/bookings/:id/check-in` estipulado en `docs Paúl Rosero/context/contratos_api_v2.md`.
  - **Respuesta 200 OK:**
    ```json
    {
      "booking_id": "vuelo-bk-55",
      "pnr": "XY99K2",
      "estado": "CHECKED_IN",
      "asiento": "14A (Ventana)",
      "grupo_embarque": "Grupo 2",
      "boarding_pass_url": "/api/v2/vuelos/boarding-pass/XY99K2.pdf"
    }
    ```
  - **Supabase Cloud:** `vuelos.reservas` (`estado = 'CHECKED_IN'`).
  - **Auditoría Winston:** Registro en `logs/audit-YYYY-MM-DD.log` del check-in aéreo.

#### ✅ Criterios de Aceptación (Formato Gherkin):
##### Escenario 1: Check-in aéreo exitoso con generación de pase de abordar
- **Dado que** la reserva `vuelo-bk-55` tiene PNR `XY99K2` y el vuelo sale en 18 horas
- **Cuando** el usuario envía `POST /api/v2/vuelos/bookings/vuelo-bk-55/check-in` con asiento "14A" y DNI correspondiente
- **Entonces** la UI exhibe el pase de abordar con Grupo 2 y el enlace para descargar el PDF
- **Y** el Gateway responde con HTTP `200 OK`.
