# Banco de Preguntas y Respuestas para la Defensa — Booking Prototipo

> **Asignatura:** Integración de Sistemas — 6to Semestre  
> **Estudiante / Responsable:** Paúl Rosero  
> **Ámbitos Evaluados:** Fundamentos RDA1 y Arquitectura Distribuida / Microservicios RDA2

---

## Bloque 1: Tecnologías y Fundamentos de Arquitectura (RDA1)

### 1. ¿Qué es Axios y cómo funciona en este proyecto?
- **Respuesta:** Axios es un cliente HTTP basado en promesas para JavaScript y TypeScript. En este proyecto se utiliza de dos formas complementarias:
  1. **En el Frontend (React):** Realiza llamadas asíncronas hacia el API Gateway de NestJS (`http://localhost:3000/api/v1` y `/api/v2`), inyectando en cada petición la cabecera `X-Correlation-Id` para trazabilidad distribuida.
  2. **En el Backend (NestJS):** Mediante el módulo `@nestjs/axios` (que envuelve Axios con programación reactiva RxJS). Permite al Gateway invocar las APIs REST de los microservicios de los compañeros, configurando timeouts estrictos de 5 segundos y cabeceras de idempotencia.

### 2. ¿Qué es Supabase y por qué lo usamos para la base de datos?
- **Respuesta:** Supabase es una plataforma Backend-as-a-Service (BaaS) que provee una base de datos relacional PostgreSQL completa hosteada en la nube con alta disponibilidad y SSL nativo.
- **Justificación:** Permite tener persistencia cloud real desde el primer día sin que los miembros del equipo ni los evaluadores tengan que configurar servidores PostgreSQL locales o contenedores Docker en sus máquinas; basta con configurar la variable de entorno `DATABASE_URL` en el `.env`.

### 3. ¿Qué es un BFF (Backend For Frontend)?
- **Respuesta:** Es un patrón de diseño arquitectónico donde una capa de backend intermedia se construye específicamente para satisfacer las necesidades de interfaz de usuario de un cliente particular (en este caso, la SPA de Booking en React).
- En lugar de que el navegador web del usuario tenga que realizar múltiples llamadas directas y desordenadas a las 4 tiendas externas (con problemas de CORS, latencias acumuladas y exposición de IPs privadas), el BFF centraliza el tráfico, agrega los catálogos, estandariza los formatos de respuesta a HATEOAS / RFC 7807 y maneja la resiliencia si un servicio externo se cae.

### 4. ¿Qué es TypeORM y cómo gestiona las tablas?
- **Respuesta:** Es un Object-Relational Mapper (ORM) para TypeScript y Node.js. Permite definir la estructura de la base de datos utilizando clases de TypeScript decoradas (`@Entity()`, `@Column()`, `@PrimaryGeneratedColumn()`, `@CreateDateColumn()`). TypeORM traduce automáticamente las entidades a sentencias DDL en PostgreSQL y ejecuta las consultas mediante un QueryBuilder fuertemente tipado.

### 5. ¿Qué es Swagger (OpenAPI) y cómo opera en NestJS?
- **Respuesta:** Swagger es un conjunto de herramientas para documentar y probar APIs REST interactivamente. En NestJS se implementa mediante el paquete `@nestjs/swagger`, decorando los controladores y DTOs con `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()` y `@ApiProperty()`. La especificación OpenAPI se genera dinámicamente en tiempo de compilación y se expone visualmente en `/api/docs`.

### 6. ¿Qué es CORS y por qué debe habilitarse?
- **Respuesta:** Cross-Origin Resource Sharing (CORS) es un mecanismo de seguridad implementado por los navegadores que restringe que una página web cargada en un origen (ej. `localhost:5173` de Vite) realice peticiones HTTP asíncronas hacia un origen diferente (ej. `localhost:3000` de NestJS). Se habilita explícitamente en el backend con `app.enableCors()` configurando los métodos permitidos (`GET`, `POST`, `PUT`, `DELETE`), cabeceras (`Content-Type`, `Authorization`, `X-Correlation-Id`) y orígenes de confianza.

### 7. ¿Por qué usamos React con Vite para el Frontend?
- **Respuesta:** React es la librería declarativa basada en componentes estándar de la industria para crear interfaces reactivas de alto rendimiento. Vite es el bundler y servidor de desarrollo moderno que utiliza módulos ES nativos (ESM) en el navegador y el compilador Rollup/esbuild, ofreciendo Hot Module Replacement (HMR) instantáneo y tiempos de inicio drásticamente más rápidos que Webpack.

---

## Bloque 2: Estructura Modular y Patrones de NestJS

### 8. ¿Cómo funcionan Controladores, Servicios y Módulos en NestJS?
- **Controlador (`@Controller`):** Es la capa de transporte HTTP/REST. Escucha las peticiones entrantes, valida y transforma los parámetros mediante DTOs y `ValidationPipe`, documenta los contratos en Swagger y delega la ejecución al servicio. No contiene lógica de negocio ni queries de base de datos.
- **Servicio (`@Injectable`):** Contiene la lógica de negocio, validaciones de dominio, orquestación de transacciones e integraciones externas. En nuestro BFF, inyecta `HttpService` para consumir microservicios externos y repositorios TypeORM para persistir datos propios.
- **Módulo (`@Module`):** Es la frontera de empaquetamiento y el contenedor de Inyección de Dependencias. Declara qué controladores expone, qué servicios provee internamente (`providers`) y qué dependencias exporta para que otros módulos puedan utilizarlas de forma limpia.

### 9. ¿Por qué se utilizó `POST /atracciones/search` en lugar de `GET` para buscar atracciones?
- **Respuesta:** En REST purista las consultas se hacen con `GET`. Sin embargo, en la industria real del turismo (Amadeus, Booking, Expedia) se usa `POST /search` por 5 razones técnicas fundamentales:
  1. **Estructuras de Búsqueda Complejas:** Los filtros turísticos involucran arreglos de categorías, rangos de fechas, geolocalización por polígonos y edades de acompañantes en estructuras JSON anidadas difíciles de serializar en un query string.
  2. **Límite de Longitud de URL (HTTP 414 URI Too Long):** Servidores web y proxies limitan la URL a 2,048 u 8,192 caracteres; con `POST`, el payload viaja en el cuerpo sin esta restricción.
  3. **Incompatibilidad de `GET` con Request Body:** Aunque HTTP no prohíbe un cuerpo en `GET`, la mayoría de proxies, firewalls y librerías cliente (Axios) descartan (strip) el body de una petición `GET`.
  4. **Seguridad y Privacidad de Logs:** Las URLs de `GET` se guardan en texto plano en los archivos de log de servidores web intermedios; con `POST`, el body viaja cifrado en el túnel TLS/HTTPS.
  5. **Estándar Consolidado:** Es el mismo patrón utilizado por Elasticsearch (`POST /_search`) y GraphQL (`POST /graphql`).

---

## Bloque 3: Arquitectura Distribuida, gRPC y Microservicios (RDA2)

### 10. ¿Debemos implementar persistencia NoSQL o memoria caché para tener la información de inventario actualizada?
- **Respuesta:** En una arquitectura de agregación turística en tiempo real, la solución óptima es una **Caché en Memoria de Alto Rendimiento (In-Memory Cache / Redis)** alimentada por eventos de ingesta push vía **gRPC**:
  - **Por qué NO persistir cada ping de inventario en BD Relacional/NoSQL:** Si las 4 tiendas externas notifican cambios de stock continuamente, escribir cada actualización en una base de datos saturaría el disco y el pool de conexiones con operaciones I/O innecesarias para datos volátiles que caducan en segundos.
  - **Cómo se resuelve en el Booking Prototipo:** El servidor gRPC recibe los mensajes `StockUpdateRequest` en memoria, actualiza una estructura clave-valor indexada por ID de recurso y responde con ACK en sub-milisegundos. Cuando el usuario busca en el marketplace, el Gateway consulta esta caché instantánea. La base de datos relacional se reserva exclusivamente para datos permanentes y transaccionales (usuarios, facturas, compras confirmadas).

### 11. ¿Por qué usamos gRPC para el inventario de las tiendas y REST para la confirmación de compras?
- **Respuesta:** Representa una decisión de **comunicación asimétrica híbrida (ADR-001)** justificada en las propiedades de cada protocolo:
  - **gRPC (Tiendas → Booking):** Utiliza **HTTP/2 multiplexado** (múltiples streams sobre una sola conexión TCP) y serialización binaria compacta con **Protocol Buffers (Protobuf)**. Esto reduce el consumo de ancho de banda hasta en un 80% y elimina la latencia de apertura/cierre de conexiones HTTP/1.1 para el streaming continuo de disponibilidad.
  - **REST (Booking → Tiendas):** Se reserva para la compra puntual. Una orden de compra es un evento esporádico y de alta criticidad financiera que requiere la universalidad de HTTP REST: códigos de estado semánticos (201 Created, 400 Bad Request, 409 Conflict), soporte estándar de cabeceras de idempotencia (`Idempotency-Key`), y trazabilidad auditada con RFC 7807 sin requerir sockets de streaming abiertos.

### 12. ¿Por qué los registros de auditoría y logs de integración se deben guardar en archivos físicos de texto y NO en la base de datos relacional?
- **Respuesta (ADR-003):** Por tres principios esenciales de ingeniería de sistemas distribuidos y cumplimiento de la directriz del docente:
  1. **Aislamiento de Rendimiento (I/O Throughput):** En un sistema con múltiples llamadas gRPC y REST concurrentes, registrar cada traza en la base de datos satura el pool de conexiones y el rendimiento de disco de PostgreSQL, degradando las transacciones de compra de los usuarios reales.
  2. **Inmutabilidad y Supervivencia ante Caídas:** Si la base de datos falla o entra en bloqueo, un logger basado en base de datos colapsaría e impediría registrar la causa de la falla. Los archivos físicos de log (`logs/audit-*.log`, `logs/integration-*.log`) son inmutables (*append-only*) y continúan registrando eventos incluso si la base de datos está inaccesible.
  3. **Rotación y Estándares Empresariales:** Los archivos de texto rotativos con Winston (`winston-daily-rotate-file`) permiten purga automática tras 14 días y pueden ser procesados directamente por agentes de observabilidad de la industria (Elastic Filebeat, Fluentd, Datadog) sin sobrecargar PostgreSQL.

### 13. ¿Cómo se garantiza el principio de "Database-per-Service" y cómo se comunican los datos entre microservicios?
- **Respuesta (ADR-002):**
  - **Frontera de Datos:** Cada microservicio es el único dueño y responsable de su esquema de base de datos. Está estrictamente prohibido que un módulo ejecute sentencias SQL directas contra tablas de otro módulo o importe sus entidades TypeORM. No existen `FOREIGN KEY` entre tablas de diferentes microservicios.
  - **Orquestación en la Capa de Aplicación:** Cuando se requiere consolidar información de diferentes dominios (por ejemplo, para generar la vista unificada de "Mis Reservas" o emitir una factura de carrito mixto), la composición no se hace mediante un `JOIN` en SQL; se realiza en la **capa de aplicación (BFF)** mediante llamadas a los servicios exportados o peticiones HTTP/gRPC independientes, combinando los objetos en memoria.

### 14. ¿Cómo funciona la máquina de estados de los vehículos y por qué es obligatorio el período de enfriamiento de 2 horas en limpieza?
- **Respuesta (ADR-004):**
  - **Máquina de Estados Finita:** Modela el ciclo operativo real de una agencia de alquiler mediante 6 estados exclusivos: `DISPONIBLE` → `RESERVADO` → `LISTO_PARA_ENTREGAR` → `ENTREGADO` → `EN_LIMPIEZA` → (`DISPONIBLE` o `EN_MANTENIMIENTO`).
  - **Regla de Negocio de las 2 Horas:** Un automóvil devuelto no puede alquilarse inmediatamente sin antes ser desinfectado, aspirado e inspeccionado. Al registrarse la devolución, el sistema marca `limpieza_inicio = NOW` y bloquea el vehículo en estado `EN_LIMPIEZA`. Un cron job evalúa los vehículos en este estado y solo transita el auto a `DISPONIBLE` una vez transcurridos al menos 120 minutos (2 horas) y siempre que no exista una alerta de mantenimiento activa.
  - **Parámetro para Defensa:** Se incluyó la variable de entorno `CLEANING_COOLDOWN_MINUTES` para permitir demostrar esta transición automática en 1 o 2 minutos durante la sustentación académica.

### 15. ¿Qué rol cumple el personal de Mantenimiento de Flota y cómo funcionan las alertas por kilometraje?
- **Respuesta:** Es un rol especializado del sistema (`mantenimiento`) con acceso restringido. Al recibir un auto devuelto, el operario accede al endpoint `POST /api/v1/autos/:id/mantenimiento/registro` e ingresa el kilometraje de llegada, nivel de combustible y observaciones del estado físico. Si el kilometraje registrado supera el umbral de próxima revisión (`kilometraje_llegada >= km_proxima_revision`), el sistema activa automáticamente la bandera `alerta_mantenimiento = true` y transita el auto a `EN_MANTENIMIENTO`, impidiendo que vuelva a salir al catálogo público hasta que el personal mecánico complete el servicio.

### 16. ¿Por qué se implementó una estructura recursiva (padre-hija / Closure Table) para las categorías de atracciones?
- **Respuesta (ADR-005):**
  - Permite modelar taxonomías turísticas con profundidad arbitraria (`Tours` → `Tours Gastronómicos` → `Cata de Cacao`) sin limitarse a categorías planas.
  - Incorpora flags booleanos heredables de negocio (`incluye_comida`, `incluye_transporte`, `incluye_guia`).
  - **Eficiencia en Consultas:** Al usar el patrón Closure Table o CTE recursivo (`WITH RECURSIVE`), una búsqueda de atracciones filtrada por una categoría superior devuelve automáticamente todas las atracciones asignadas a sus subcategorías hijas en una sola consulta SQL indexada, sin requerir múltiples consultas anidadas.

### 17. ¿Cómo opera el panel de monitoreo de nodos (semáforo visual) y el toggle dinámico de servicios?
- **Respuesta (ADR-006):**
  - **Health Check Proactivo:** El endpoint `GET /api/v1/admin/integraciones/health` envía pings controlados con timeout de 3s a los endpoints `/health` de cada tienda externa registrada en la tabla `tiendas_integradas`.
  - **Semáforo en Tiempo Real:** Clasifica la salud en base a la latencia real: 🟢 Verde (<500ms, respuesta óptima), 🟡 Amarillo (500ms-2s, latencia degradada), 🔴 Rojo (>2s o inalcanzable).
  - **Toggle en Caliente:** Desde el `AdminDashboard.jsx`, el administrador puede pulsar un botón toggle que ejecuta `PUT /api/v1/admin/integraciones/:id/toggle`. Esto cambia `habilitada = false` en memoria y base de datos, ordenando al API Gateway cortar inmediatamente el tráfico hacia esa tienda y responder con datos en caché y un aviso visual amigable al usuario, sin tener que modificar variables de entorno ni reiniciar el servidor.

### 18. ¿Cómo se diseñó el flujo operativo de Check-in en las cuatro verticales turísticas?
- **Respuesta:** En la industria del turismo, la compra de una reserva no equivale a la prestación del servicio. El check-in es el acto formal previo al uso del recurso:
  - **Atracciones:** Valida la llegada del cliente el día del tour, asigna el guía acreditado y genera el voucher con código QR.
  - **Autos:** Valida que el auto esté `LISTO_PARA_ENTREGAR`, registra conductor, licencia y km de salida, y pasa el estado a `ENTREGADO`.
  - **Alojamientos:** Se habilita en la fecha acordada a partir de las 14:00, asignando el número de habitación y clave de acceso digital.
  - **Vuelos:** Permite al pasajero seleccionar su asiento (ventana/pasillo) y emite la tarjeta de embarque con código PNR y grupo de abordaje.

### 19. ¿Qué es Contract Testing y cómo se garantiza la retrocompatibilidad entre las versiones v1 y v2 de la API?
- **Respuesta:** Contract Testing consiste en verificar mediante pruebas automatizadas (Jest + Supertest) que las respuestas emitidas por un microservicio cumplan fielmente con la estructura de campos, tipos de datos y códigos de estado definidos en la especificación OpenAPI v2.
- **Retrocompatibilidad:** Se garantiza mediante versionado por URI (`/api/v1` y `/api/v2`). Los endpoints `/api/v1` continúan respondiendo con la cabecera `X-API-Deprecation-Date: 2027-12-31`. Todos los campos nuevos incorporados en v2 son opcionales (`nullable`), garantizando que ningún cliente v1 se rompa al consumir el backend.

### 20. ¿Qué mecanismos de seguridad protegen al API Gateway y los microservicios?
- **Respuesta:**
  1. **Rate Limiting:** Con `@nestjs/throttler` (límite global de 120 peticiones/minuto por IP y 10 peticiones/minuto en rutas de checkout y pago).
  2. **Cabeceras HTTP Seguras:** Configuración de `helmet()` para mitigar ataques XSS, Clickjacking y MIME sniffing.
  3. **Autenticación y Roles:** Validación de tokens JWT en `SupabaseAuthGuard` con control de roles (`cliente`, `admin`, `mantenimiento`).
  4. **Sanitización Estricta:** `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`, rechazando parámetros extraños e inyecciones de código.

### 21. ¿Qué ocurre si una tienda externa se cae durante la defensa?
- **Respuesta:** El sistema está protegido por el patrón **Circuit Breaker y Fallback Local**:
  - La llamada saliente de Axios expira en exactamente **5 segundos**, evitando que la petición se quede congelada.
  - El Gateway captura el error o timeout, registra la falla en `logs/integration-*.log`, marca el nodo en 🔴 Rojo en el panel de administración y responde al frontend con los datos cacheados más recientes.
  - El frontend de React muestra un banner informativo (*"Datos provistos desde caché local. Proveedor temporalmente no disponible"*), garantizando que la aplicación continúe funcionando sin pantallas en blanco ni excepciones no controladas.

---

## Bloque 4: Blindaje, Resiliencia y Heurísticas UX/UI (RDA2 Avanzado)

### 22. ¿Cómo funciona el Patrón Saga y la Cancelación Compensatoria con Reembolso e Idempotencia?
- **Respuesta (ADR-007):**
  - En lugar de una simple actualización booleana en base de datos, la cancelación de una reserva orquesta una serie de transacciones compensatorias distribuidas:
    1. **Reverso de Stock Local:** Devuelve los cupos reservados a la disponibilidad pública del tour (`cupos_disponibles += tickets`).
    2. **Reembolso Financiero 100%:** Genera un recibo formal de reembolso con identificador unívoco (`REF-ATR-...`) y marca `refund_status: PROCESADO`.
    3. **Compensación Externa:** Invoca síncronamente al microservicio del socio externo a través del Adaptador (Anti-Corruption Layer).
    4. **Auditoría Física Inmutable:** Registra la transacción compensatoria en el archivo rotativo `logs/audit-YYYY-MM-DD.log` de Winston sin escribir en PostgreSQL.
    5. **Control de Idempotencia:** Si un usuario hace doble clic o reintenta cancelar una reserva ya procesada, el orquestador intercepta la llamada y responde con `400 Bad Request` bajo formato RFC 7807 indicando el error de negocio `ALREADY_REFUNDED`, evitando reembolsos duplicados o sobre-incremento de stock.

### 23. ¿Cómo se blindó el sistema para evitar errores HTTP 500 por inyección de identificadores inválidos en PostgreSQL (V-05)?
- **Respuesta:**
  - **Causa Raíz:** En PostgreSQL, cuando una columna está tipada como `UUID` y se le envía una cadena arbitraria (ej. `reserva_id = "test-123"` o `"invalid-id"`), el motor de base de datos lanza inmediatamente una excepción irrecuperable: `QueryFailedError: invalid input syntax for type uuid`, que TypeORM propaga como un error interno 500 no controlado.
  - **Solución Implementada:** Se añadieron guardas de pre-validación sintáctica con expresiones regulares en `AtraccionesService` (`isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`) antes de invocar cualquier método del repositorio TypeORM (`findOne`, `reservar`, `cancelarReserva`, `checkin`). Si la cadena no cumple la especificación de UUID, el servicio lanza inmediatamente una excepción limpia de dominio `NotFoundException` (HTTP 404) formateada bajo RFC 7807, blindando a PostgreSQL contra caídas y eliminando por completo los errores 500.

### 24. ¿Cómo se blindaron los formularios contra inyecciones de texto masivo, espacios infinitos y cómo se proporciona feedback dinámico?
- **Respuesta:**
  - **Límites Físicos con `maxLength`:** Todos los inputs de texto tanto en frontend como en DTOs de backend tienen límites estrictos (ej. nombres máx. 30 caracteres, motivos máx. 250 caracteres, identificaciones máx. 20 caracteres) para prevenir desbordes de buffer o bloqueos por procesamiento de strings gigantes.
  - **Colapso de Espacios en Blanco:** Se aplica transformación regex `value.replace(/\s+/g, ' ').trim()` para impedir que un usuario envíe cadenas compuestas únicamente por espacios infinitos o saltos de línea repetitivos.
  - **Feedback Reactivo y Dinámico:** La UI detecta errores a medida que el usuario escribe, retirando los bordes rojos cuando el input es válido y mostrando mensajes de error dinámicos acordes al estándar RFC 7807 en tiempo real sin recargar la página.

### 25. ¿Cómo cumple la plataforma con las 10 Heurísticas de Nielsen y la experiencia Progressive Web / Resiliencia Offline?
- **Respuesta:**
  - **Visibilidad del Estado del Sistema (H1):** Semáforo LED en vivo en el panel de administración, spinners de carga durante peticiones asíncronas y banners de estado de red.
  - **Prevención de Errores (H5):** Modales de confirmación en dos pasos antes de ejecutar acciones destructivas (como cancelaciones de reservas o desconexión de microservicios).
  - **Reconocimiento antes que Recuerdo (H6):** Badges visuales de estado (`CONFIRMADA` en verde, `CANCELADA` en rojo, `COMPLETADA` en azul) e historial completo en "Mis Reservas".
  - **Recuperación ante Errores (H9):** Mensajes descriptivos en lenguaje humano basados en RFC 7807 indicando exactamente la causa y cómo solucionarlo.
  - **Resiliencia Offline (PWA):** Componente `OfflineBanner.jsx` que escucha el evento `window.addEventListener('offline')` e informa al usuario de la pérdida de conectividad, apoyándose en la caché local del navegador para permitir seguir consultando los catálogos y reservas previamente descargados.