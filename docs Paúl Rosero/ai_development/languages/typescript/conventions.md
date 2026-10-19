# Convenciones de Desarrollo — TypeScript, NestJS y React

> **Proyecto:** Booking Prototipo (Plataforma Central Integradora)  
> **Lenguaje:** TypeScript 5.x / JavaScript ECMAScript 2022+  
> **Frameworks:** NestJS 10.x (Backend) | React 18+ con Vite (Frontend)

---

## 1. Reglas Generales de TypeScript

1. **Tipado Estricto:** Está estrictamente desaconsejado el uso de `any`. Utilizar tipos genéricos, interfaces o `unknown` con type guards si el tipo de dato es incierto.
2. **Nombres de Archivos:** Utilizar `kebab-case` para todos los nombres de archivo y carpetas:
   - Controladores: `*.controller.ts`
   - Servicios: `*.service.ts`
   - Módulos: `*.module.ts`
   - Entidades: `*.entity.ts`
   - DTOs: `*.dto.ts`
   - Componentes React: `*.jsx` o `*.tsx` en `PascalCase` (ej. `AdminDashboard.jsx`, `AtraccionCard.jsx`).
3. **Nombres de Clases y Funciones:**
   - Clases, Interfaces, Tipos y Componentes: `PascalCase` (ej. `AtraccionesService`, `CreateOrderDto`, `Navbar`).
   - Métodos, Funciones y Variables: `camelCase` (ej. `consultarDisponibilidad`, `ordenId`).
   - Constantes Globales y Enums: `UPPER_SNAKE_CASE` (ej. `MAX_COOLDOWN_MINUTES`, `OrderStatus.CONFIRMADA`).

---

## 2. Convenciones para el Backend (NestJS 10.x)

### 2.1. Controladores (Controllers)
- Mantener los controladores delgados (*thin controllers*): únicamente validan DTOs, documentan en Swagger y delegan a los servicios.
- Todo endpoint debe documentarse con `@ApiOperation()`, `@ApiResponse()` y `@ApiTags()`.
- Usar decoradores de parámetros específicos (`@Param()`, `@Query()`, `@Body()`, `@Headers()`).

### 2.2. DTOs y Validación
- Todo payload entrante debe validarse mediante DTOs utilizando decoradores de `class-validator` (`@IsString()`, `@IsNotEmpty()`, `@IsOptional()`, `@IsNumber()`, `@Min()`, `@Max()`).
- Para transformación de tipos numéricos en query parameters o body, usar `@Type(() => Number)` de `class-transformer`.
- El `ValidationPipe` global debe configurarse con `{ whitelist: true, forbidNonWhitelisted: true }`.

### 2.3. Servicios y Lógica de Negocio
- Toda la lógica de negocio, cálculos de tarifas, validación de inventario y comunicación externa reside en los servicios inyectables (`@Injectable()`).
- Para llamadas salientes con `@nestjs/axios`, transformar siempre el Observable de RxJS a Promise mediante `firstValueFrom()`.
- Configurar siempre un timeout explícito de 5,000 ms en cada llamada HTTP saliente.

### 2.4. Entidades y Persistencia (TypeORM)
- Cada entidad debe tener una clave primaria clara (`@PrimaryGeneratedColumn('uuid')`).
- Utilizar `@CreateDateColumn()` y `@UpdateDateColumn()` para trazabilidad temporal automática.
- No importar entidades TypeORM fuera del módulo al que pertenecen.

### 2.5. Manejo de Excepciones (RFC 7807)
- Lanzar excepciones estándar de NestJS (`NotFoundException`, `BadRequestException`, `ConflictException`, `BadGatewayException`).
- El filtro global `rfc7807-exception.filter.ts` intercepta todas las excepciones y las devuelve en formato Problem Details.

---

## 3. Convenciones para el Frontend (React 18 + Vite)

### 3.1. Componentes Funcionales y Hooks
- Usar componentes funcionales con React Hooks (`useState`, `useEffect`, `useContext`, `useMemo`).
- Desacoplar la lógica de red: los componentes no deben hacer `axios.get()` directamente en el renderizado; deben invocar métodos de la capa `services/` (ej. `atraccionesApi.obtenerDetalle(id)`).

### 3.2. Estilos y Diseño
- Mantener los estilos basados en Vanilla CSS o CSS Modules con la identidad de Booking.com:
  - Azul Institucional: `#003b95`
  - Amarillo de Acento: `#febb02`
  - Azul Secundario: `#006ce4`
  - Fondo de Contenedor: `#ffffff` o `#f5f5f5`
- No incorporar librerías CSS pesadas adicionales sin aprobación explícita.

### 3.3. Resiliencia de Renderizado
- Comprobar siempre la existencia de arreglos o propiedades antes de mapear (`items?.map(...) || []`).
- Renderizar componentes de carga (`LoadingSpinner`) mientras la promesa de datos se resuelve.
- Renderizar mensajes informativos de degradación elegante si un microservicio externo no responde.
