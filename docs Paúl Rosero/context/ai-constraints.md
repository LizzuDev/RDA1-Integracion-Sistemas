# Restricciones de Contexto para Agentes de IA — Booking Prototipo

> **Objetivo:** Establecer los límites técnicos y reglas operativas que cualquier asistente o subagente de Inteligencia Artificial debe respetar estrictamente al inspeccionar, generar o refactorizar código en este repositorio.

---

## 1. Entornos de Ejecución y Lenguajes
- **Backend Runtime:** Node.js versión 18+ con TypeScript 5.x y framework **NestJS 10.x**.
- **Frontend Runtime:** Navegador web moderno con **React 18+**, empaquetador **Vite** y Vanilla CSS.
- **Base de Datos:** PostgreSQL 15+ hosteado en **Supabase Cloud**, administrado mediante **TypeORM**.
- **Protocolos de Red:** REST sobre HTTP/1.1 (JSON, HATEOAS Nivel 3, RFC 7807) y gRPC sobre HTTP/2 (Protobuf v3).

---

## 2. Fronteras de Capas y Controladores
- **Controladores Delgados (Thin Controllers):** Los controladores de NestJS deben limitarse a:
  1. Recibir y validar DTOs de entrada (`class-validator` / `ValidationPipe`).
  2. Documentar endpoints con decoradores de Swagger (`@ApiOperation`, `@ApiResponse`).
  3. Delegar inmediatamente la ejecución al servicio inyectado.
  4. Retornar DTOs de salida limpios o hipermedios HATEOAS (`_links`).
  5. **Prohibido:** No colocar lógica de negocio, cálculos de precios, queries de base de datos ni llamadas HTTP salientes dentro de los controladores.

---

## 3. Aislamiento de Módulos y Persistencia
- **Ubicación del Dominio:** Cada vertical de negocio reside en `src/modules/<modulo>/` (`atracciones/`, `autos/`, `alojamientos/`, `vuelos/`, `admin/`).
- **Límites de Persistencia:** Ningún módulo puede importar entidades TypeORM o repositorios de otro módulo.
- **Inyección de Servicios:** Si un módulo requiere datos de otro dominio, debe inyectar el servicio público exported (`export [ModuloService]`) a través de la inyección de dependencias de NestJS o invocar la API interna correspondiente.
- **Prohibido:** Joins SQL inter-módulo directos o claves foráneas cruzadas entre tablas de distintos microservicios.

---

## 4. Registro de Auditoría y Logging
- **Prohibido Guardar Logs en BD:** No generar inserciones SQL en tablas de PostgreSQL para registrar llamadas HTTP, latencias o eventos masivos.
- **Destino Obligatorio:** Utilizar el logger de **Winston** escribiendo en archivos físicos rotativos bajo la carpeta `logs/` (`audit-*.log`, `integration-*.log`, `app-*.log`).

---

## 5. Resiliencia y Manejo de Errores
- **Timeouts en Axios:** Toda llamada saliente a microservicios de compañeros debe tener un timeout máximo explícito de **5,000 milisegundos**.
- **Formato de Error:** Todo error lanzado debe capturarse y transformarse a través del filtro global `rfc7807-exception.filter.ts` produciendo la estructura estándar **Problem Details** (`type`, `title`, `status`, `detail`, `instance`).
- **Resiliencia en Frontend:** Si una tienda externa falla, el componente de React debe mostrar un estado degradado elegante; bajo ninguna circunstancia se debe permitir que un fallo de red desmonte la aplicación o lance una pantalla en blanco.

---

## 6. Integridad de los Diseños y Código Frontend
- **Preservación Visual:** No modificar las clases de CSS ni los colores institucionales de Booking.com (Azul `#003b95`, Amarillo `#febb02`) a menos que sea explícitamente requerido.
- **No Tailwind Ad-Hoc:** Mantener el diseño basado en Vanilla CSS modular ya establecido.
- **Imágenes Estables:** Utilizar siempre URLs seguras de alta disponibilidad (como Wikimedia Commons) para evitar bloqueos por CORS o AdBlockers.

---

## 7. Control de Versiones y Despliegue (Regla de Cero Git Push Automático)
- **Prohibición Absoluta de Push Remoto:** Los agentes y asistentes de IA tienen **estrictamente prohibido ejecutar `git push origin main`** o cualquier comando que transmita cambios a repositorios remotos sin intervención del usuario.
- **Flujo Requerido:** Todos los cambios deben limitarse a modificaciones en el árbol de trabajo local. El usuario realizará la revisión, commit y push manualmente.

---

## 8. Blindaje de Persistencia y Sanitización de Datos
- **Guarda de Sintaxis UUID en PostgreSQL (V-05):** Antes de ejecutar cualquier consulta `findOne`, `delete` o `update` basada en ID en repositorios TypeORM con columnas UUID, se debe validar sintácticamente el parámetro contra una expresión regular de UUID. Si no coincide, se debe retornar inmediatamente `NotFoundException` (HTTP 404) bajo RFC 7807 para impedir que PostgreSQL arroje excepciones internas irrecuperables (`QueryFailedError: invalid input syntax for type uuid` - HTTP 500).
- **Límites Físicos en Formularios y Sanitización:**
  - Todo campo de entrada en frontend y DTO en backend debe poseer un `maxLength` razonable para evitar desbordes de memoria.
  - Las cadenas deben sanearse colapsando espacios en blanco repetitivos (`replace(/\s+/g, ' ').trim()`).

