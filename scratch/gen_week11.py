# -*- coding: utf-8 -*-
"""
Generador de Contenidos - Semana 11 (Páginas 19 a 22)
Cuaderno Técnico RDA2: Integración de Sistemas
"""

PAGE_19 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 19 | Página 19 de 22
**Semana 11 — Seguridad en Integraciones**  
**Subtema 21:** Mecanismos de Autenticación y Autorización: OAuth2, JWT y mTLS

---

### 1. Definición Teórica & Fundamento Académico
En la integración de sistemas distribuidos, la confianza implícita de red ya no es admisible. La seguridad se construye sobre protocolos criptográficos estandarizados (*Libro de la Clase Semana 11*):

1. **OAuth 2.0 (RFC 6749):** Marco de autorización delegada que permite a una aplicación externa obtener acceso limitado a un recurso protegido en nombre del propietario del recurso.
   - *Roles:* Resource Owner (Usuario), Client (SPA React/Móvil), Authorization Server (Supabase Auth / Okta), Resource Server (API Booking Central).
   - *Flujos clave:* **Authorization Code with PKCE** (para clientes públicos sin secreto como navegadores y apps móviles) y **Client Credentials** (para comunicación máquina a máquina / B2B directa entre servidores).
2. **JSON Web Tokens (JWT - RFC 7519):** Formato compacto y auto-contenido para transmitir aseveraciones (*claims*) entre partes de forma segura.
   - *Estructura:* `Header.Payload.Signature` codificados en Base64Url.
   - *Ventaja distribuida:* Verificación sin estado (*stateless*); los microservicios validan la firma criptográfica (asimétrica RSA/ECDSA o simétrica HMAC) de forma local sin consultar una base de datos central en cada petición.
3. **mTLS (Mutual Transport Layer Security):** Autenticación criptográfica bidireccional en la capa de transporte. Tanto el servidor como el cliente intercambian y validan certificados digitales X.509 emitidos por una Autoridad de Certificación (CA) de confianza mutua.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, la seguridad de autenticación opera en dos niveles:
- **Perímetro Norte-Sur:** Integración con **Supabase Auth** como Servidor de Autorización OAuth2, validando tokens **JWT Bearer** en el API Gateway mediante `SupabaseAuthGuard`.
- **Canal Este-Oeste / Malla Interna:** Emulación de identidad mutua mediante certificados y validación de origen en `SidecarProxyInterceptor`.

---

### 3. Ubicación Exacta en el Código
- **Guard de Autenticación Supabase:** `src/core/guards/supabase-auth.guard.ts`.
- **Extracción y Validación de Tokens Bearer:** `src/core/security/jwt-verifier.service.ts` o `SupabaseService`.
- **Suite de Pruebas de Seguridad de Autenticación:** `src/modules/security/i01-security.spec.ts`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Implementación del Guard de Autenticación en `src/core/guards/supabase-auth.guard.ts`:
```typescript
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        type: 'https://booking.epn.edu.ec/errors/unauthorized',
        title: 'Cabecera Authorization Ausente o Inválida',
        status: HttpStatus.UNAUTHORIZED,
        detail: 'Debe proveer un token JWT Bearer emitido por Supabase Auth en la cabecera Authorization.',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verificación criptográfica de firma, emisor y expiración (exp claim)
      const user = await this.supabaseService.verificarTokenJwt(token);
      request.user = user; // Inyecta el usuario decodificado en la solicitud
      return true;
    } catch (error) {
      this.logger.warn(`Intento de acceso con token inválido o expirado: ${error.message}`);
      throw new UnauthorizedException({
        type: 'https://booking.epn.edu.ec/errors/token-expired',
        title: 'Token JWT Inválido o Expirado',
        status: HttpStatus.UNAUTHORIZED,
        detail: error.message,
      });
    }
  }
}
```

**Explicación técnica:**
- El guard extrae el token Bearer y valida su firma digital contra la clave pública del servidor de autorización.
- Valida estrictamente el claim `exp` (expiración temporal) y el claim `aud` (audiencia), impidiendo ataques de repetición (*replay attacks*) con tokens reciclados.

---

### 5. Planificación y Decisiones de Diseño
- **Desacoplamiento de Identidad:** Se descartó implementar almacenamiento local de contraseñas con hashing manual (bcrypt) en PostgreSQL para evitar riesgos de filtración y cumplimiento de normativas de privacidad. Delegar la identidad a Supabase Auth permite autenticación multifactor (MFA) y rotación de claves criptográficas sin tocar el código fuente.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
sequenceDiagram
    autonumber
    participant User as Usuario / Cliente SPA
    participant AuthSrv as Supabase Auth (OAuth2 Server)
    participant Gateway as Booking API Gateway
    participant Guard as SupabaseAuthGuard
    participant Resource as Microservicio Interno

    User->>AuthSrv: Login (Credenciales / OAuth2 Flow)
    AuthSrv-->>User: Retorna JWT Token {sub, role, exp}
    
    User->>Gateway: GET /api/v2/reservas/mis-reservas (Header: Bearer eyJhbGci...)
    Gateway->>Guard: canActivate(context)
    Guard->>Guard: Verifica firma criptográfica y expiración (exp > now)
    
    alt Token Válido
        Guard->>Resource: Despacha request con request.user autenticado
        Resource-->>User: 200 OK (Datos de Reservas del Usuario)
    else Token Inválido / Expirado
        Guard-->>User: 401 Unauthorized (RFC 7807: Token Expirado)
    end
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Detección de Intentos de Intrusión:** Todo fallo 401 Unauthorized se persiste en `logs/audit.jsonl` con la IP de origen, User-Agent y motivo del rechazo, permitiendo alimentar sistemas de bloqueo automático por fuerza bruta.
"""

PAGE_20 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 20 | Página 20 de 22
**Semana 11 — Seguridad en Integraciones**  
**Subtema 22:** Modelos de Control de Acceso: RBAC vs. ABAC en Arquitecturas Integradas

---

### 1. Definición Teórica & Fundamento Académico
Una vez autenticada la identidad de un sujeto, el sistema debe determinar qué acciones tiene permitido ejecutar (*Libro de la Clase Semana 11*):

| Dimensión Técnica | RBAC (Role-Based Access Control) | ABAC (Attribute-Based Access Control) |
| :--- | :--- | :--- |
| **Entidad Central** | **Rol estático:** Permisos asignados a roles (`ADMIN`, `CLIENTE`, `PROVEEDOR`). | **Atributos dinámicos:** Variables del sujeto, del recurso, de la acción y del entorno. |
| **Flexibilidad** | Baja (proliferación de roles cuando las reglas se vuelven complejas). | Muy Alta (permite políticas booleanas sofisticadas basadas en contexto). |
| **Complejidad** | Muy simple de diseñar, consultar y auditar. | Mayor complejidad computacional en tiempo de evaluación. |
| **Mitigación de BOLA**| **Insuficiente:** Si dos usuarios tienen el rol `CLIENTE`, RBAC no puede impedir que el cliente A consulte la reserva del cliente B. | **Efectiva:** Evalúa la regla `recurso.propietario_id == sujeto.usuario_id`. |
| **Estándar de la Industria** | Modelos clásicos de administración interna | NIST SP 800-162 / XACML / Open Policy Agent (OPA) |

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se adoptó un **Modelo Híbrido RBAC + ABAC**:
- **Capa 1 (Filtro Macro RBAC):** `RolesGuard` decorado con `@Roles('ADMIN', 'PROVEEDOR')` para verificar privilegios estructurales (ej. acceso a paneles de métricas o administración financiera).
- **Capa 2 (Filtro Fino ABAC):** Guards de propiedad contextual (`PaymentReferenceAccessGuard`, `ReservaOwnershipGuard`) que verifican que el usuario autenticado sea el dueño legítimo del recurso o que el socio externo pertenezca a la vertical correspondiente.

---

### 3. Ubicación Exacta en el Código
- **Decorador de Roles:** `src/core/decorators/roles.decorator.ts`.
- **Guard RBAC:** `src/core/guards/roles.guard.ts`.
- **Guard de Administración:** `src/core/guards/admin-role.guard.ts`.
- **Guard Contextual ABAC (Propiedad de Pago):** `src/modules/pagos/guards/payment-reference-access.guard.ts`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Implementación del Guard Contextual ABAC en `src/modules/pagos/guards/payment-reference-access.guard.ts`:
```typescript
@Injectable()
export class PaymentReferenceAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Inyectado previamente por SupabaseAuthGuard
    const recursoId = request.params.id; // ID de la transacción solicitada

    // Regla 1: Administradores tienen bypass por privilegio de auditoría
    if (user.roles?.includes('ADMIN')) {
      return true;
    }

    // Regla 2 (ABAC): Evaluación de atributos contextuales
    // Atributo del Sujeto: user.id
    // Atributo del Recurso: request.pagoRecurso.cliente_id
    const pagoRecurso = request.pagoRecurso;
    if (!pagoRecurso) return true;

    if (pagoRecurso.cliente_id !== user.id) {
      throw new ForbiddenException({
        type: 'https://booking.epn.edu.ec/errors/forbidden',
        title: 'Acceso Denegado a Recurso de Terceros (ABAC / Anti-BOLA)',
        status: HttpStatus.FORBIDDEN,
        detail: 'No tiene privilegios para acceder o modificar transacciones de pago ajenas.',
      });
    }

    return true;
  }
}
```

**Explicación técnica:**
- Esta validación previene activamente la vulnerabilidad número 1 de APIs según OWASP: **Broken Object Level Authorization (BOLA)**, asegurando que un atacante no pueda inspeccionar comprobantes de pago de otros clientes iterando secuencias numéricas en la URL.

---

### 5. Planificación y Decisiones de Diseño
- **Defensa en Profundidad:** Al combinar `RolesGuard` y `PaymentReferenceAccessGuard` en el mismo endpoint, se rechaza de inmediato a clientes no autenticados (401), se bloquea a clientes que no tienen el rol (403 macro) y finalmente se evalúa la titularidad del registro (403 contextual fino).

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart TD
    Req["Solicitud a /api/v2/pagos/TX-9988/factura"] --> Auth{"¿Autenticado?<br/>(SupabaseAuthGuard)"}
    
    Auth -->|No| R401["HTTP 401 Unauthorized"]
    Auth -->|Sí| RBAC{"¿Tiene Rol Válido?<br/>(RolesGuard)"}
    
    RBAC -->|No tiene rol| R403_Role["HTTP 403 Forbidden<br/>(Rol no autorizado)"]
    RBAC -->|Es ADMIN| Permitir["Acceso Concedido (Bypass Auditoría)"]
    
    RBAC -->|Es CLIENTE| ABAC{"¿Sujeto.id == Recurso.cliente_id?<br/>(PaymentReferenceAccessGuard)"}
    
    ABAC -->|Coincide| Permitir
    ABAC -->|Difiere (Intento BOLA)| R403_BOLA["HTTP 403 Forbidden<br/>(Violación de Propiedad ABAC)"]
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Registro Forense de Violaciones ABAC:** Las violaciones de propiedad se etiquetan en los logs físicos bajo el evento `SECURITY_AUTHORIZATION_BREACH_ATTEMPT`, registrando la identidad del usuario intentando vulnerar el recurso ajeno.
"""

PAGE_21 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 21 | Página 21 de 22
**Semana 11 — Seguridad en Integraciones**  
**Subtema 23:** Seguridad en el Borde: WAF, Rate Limiting y Zero Trust  
**Subtema 24:** Criptografía y Protección de Datos en Tránsito y en Reposo

---

### 1. Definición Teórica & Fundamento Académico
La seguridad perimetral contemporánea opera bajo el paradigma de **Defensa en Profundidad (*Defense in Depth*)** (*Libro de la Clase Semana 11*):

1. **WAF (Web Application Firewall):** Inspección de paquetes en Capa 7 para bloquear firmas de ataque comunes del OWASP Top 10 (SQL Injection, Cross-Site Scripting, Command Injection).
2. **Rate Limiting Perimetral:** Algoritmos de estrangulamiento de tráfico (**Sliding Window Counter** o **Token Bucket**) que restringen la cantidad de peticiones permitidas por unidad de tiempo por dirección IP o API Key, previniendo ataques de fuerza bruta y DDoS en la capa de aplicación.
3. **Filosofía Zero Trust (NIST SP 800-207):** *"Nunca confiar, siempre verificar"*. Asume que los atacantes ya residen dentro de la red perimetral; por tanto, cada microservicio debe autenticar y autorizar a todos los emisores, incluso si provienen de la misma subred interna.
4. **Criptografía en Tránsito:**
   - Obligatoriedad de **TLS 1.3** con negociación de suites de cifrado efímeras con *Perfect Forward Secrecy (PFS)* como ECDHE-ECDSA-AES256-GCM-SHA384.
5. **Criptografía en Reposo:**
   - Cifrado transparente de volúmenes de base de datos con **AES-256**.
   - Hashing robusto unidireccional de secretos mediante **Argon2id** o PBKDF2 con salting criptográfico.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se implementó una suite de protección perimetral:
- **Middleware de Rate Limiting en Memoria (`EdgeRateLimitMiddleware`):** Control de flujo basado en ventana deslizante para mitigar abusos de bots.
- **Sanitización de Errores RFC 7807:** Supresión total de trazas de compilación de Node.js o nombres de tablas de PostgreSQL en respuestas de error hacia internet.
- **Terminación TLS 1.3:** Forzada en Azure App Services para todo el tráfico entrante sobre HTTPS.

---

### 3. Ubicación Exacta en el Código
- **Middleware de Rate Limiting:** `src/core/security/edge-rate-limit.middleware.ts`.
- **Servicio de Ventana Deslizante:** `src/core/security/in-memory-rate-limit.service.ts`.
- **Guards de Rate Limiting Específicos:** `src/modules/telemetry/telemetry-rate-limit.guard.ts`, `chatbot-rate-limit.guard.ts`.
- **Script de Pruebas de Sanitización RFC 7807:** `test/test-sanitization-rfc7807.js`.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Implementación del Rate Limiting Perimetral en `src/core/security/edge-rate-limit.middleware.ts`:
```typescript
@Injectable()
export class EdgeRateLimitMiddleware implements NestMiddleware {
  constructor(private readonly rateLimitService: InMemoryRateLimitService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const endpoint = req.baseUrl || req.path;

    // Regla: 100 peticiones por minuto para endpoints generales
    // Regla estricta: 15 peticiones por minuto para checkout y pago
    const maxRequests = endpoint.includes('/checkout') || endpoint.includes('/pagos') ? 15 : 100;
    const windowMs = 60 * 1000; // 1 minuto

    const resultado = this.rateLimitService.evaluarVentanaDeslizante(clientIp, maxRequests, windowMs);

    // Cabeceras HTTP estándar de Rate Limiting (IETF Draft)
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', resultado.restantes);
    res.setHeader('X-RateLimit-Reset', resultado.resetEpochSeconds);

    if (!resultado.permitido) {
      res.setHeader('Retry-After', Math.ceil(resultado.retryAfterMs / 1000));
      return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        type: 'https://booking.epn.edu.ec/errors/rate-limit-exceeded',
        title: 'Límite de Solicitudes Excedido (Edge Rate Limiting)',
        status: HttpStatus.TOO_MANY_REQUESTS,
        detail: `Ha excedido el cupo máximo de ${maxRequests} peticiones por minuto para su dirección IP.`,
        retry_after_seconds: Math.ceil(resultado.retryAfterMs / 1000),
      });
    }

    next();
  }
}
```

---

### 5. Planificación y Decisiones de Diseño
- **Configuración de Umbrales Diferenciados:** Establecer un límite global de 100 req/min para toda la API bloquearía injustamente a un usuario navegando imágenes del catálogo de atracciones; por el contrario, permitir 100 req/min en la pasarela de pagos habilitaría ataques de validación de tarjetas robadas (*Carding*). Se diseñó una política de umbrales segmentada por criticidad transaccional.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart LR
    Internet((Cliente / Atacante)) -->|HTTPS / TLS 1.3| EdgeWAF["Azure WAF (Filtro SQLi / XSS)"]
    
    EdgeWAF --> RateLimit{"EdgeRateLimitMiddleware<br/>(Ventana Deslizante)"}
    
    RateLimit -->|> 15 req/min en Pagos| R429["HTTP 429 Too Many Requests<br/>(Retry-After: 45s)"]
    RateLimit -->|Dentro de Umbral| ZeroTrust["Zero Trust Internal Guards<br/>(SupabaseAuthGuard / RolesGuard)"]
    
    ZeroTrust --> Sanitizer["Filtro de Sanitización RFC 7807"]
    Sanitizer --> DB[(PostgreSQL Cifrado AES-256)]
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Telemetría de Bloqueos:** Todo bloqueo 429 se reporta inmediatamente al panel de administración en `/api/v2/telemetry/events` con el atributo `event_name: "RATE_LIMIT_TRIGGERED"`.
"""

PAGE_22 = """# Cuaderno Técnico de Integración de Sistemas — RDA2
## Ficha Técnica 22 | Página 22 de 22
**Semana 11 — Seguridad en Integraciones**  
**Subtema 25:** Seguridad en Brokers de Mensajería  
**Subtema 26:** Mitigación del OWASP API Security Top 10

---

### 1. Definición Teórica & Fundamento Académico
En arquitecturas orientadas a eventos (**Event-Driven Architecture - EDA**), los brokers de mensajería (RabbitMQ, Apache Kafka) transportan eventos de negocio críticos que requieren protección estricta (*Libro de la Clase Semana 11*):
- **Autenticación SASL (Simple Authentication and Security Layer):** Mecanismos SCRAM-SHA-512 o PLAIN para validar la identidad de productores y consumidores.
- **Cifrado TLS en Canales Asíncronos:** Protocolos AMQPS (puerto 5671) y Kafka SSL (puerto 9093) para asegurar que los mensajes no puedan interceptarse en tránsito.
- **Listas de Control de Acceso (ACLs):** Reglas que restringen qué tópicos o colas puede escribir (*Write*) o leer (*Read*) cada microservicio.

**El Estándar OWASP API Security Top 10 (Edición 2023):**
Catálogo internacional que clasifica los 10 riesgos más críticos en APIs modernas:
1. **API1:2023 - Broken Object Level Authorization (BOLA):** Acceso a objetos ajenos mediante manipulación de identificadores.
2. **API2:2023 - Broken Authentication:** Mecanismos de autenticación defectuosos o tokens reciclados.
3. **API3:2023 - Broken Object Property Level Authorization (BOPLA / Mass Assignment):** Exposición o manipulación no autorizada de propiedades internas.
4. **API4:2023 - Unrestricted Resource Consumption:** Falta de rate limiting, timeouts o cuotas de memoria.
5. **API5:2023 - Broken Function Level Authorization (BFLA):** Usuarios estándar invocando endpoints de administrador.
6. **API6:2023 - Unrestricted Access to Sensitive Business Flows:** Automatización abusiva de flujos (compra masiva de boletos).
7. **API7:2023 - Server Side Request Forgery (SSRF):** El backend ejecuta peticiones hacia URLs arbitrarias enviadas por el usuario.
8. **API8:2023 - Security Misconfiguration:** Depuración habilitada, cabeceras CORS permisivas, claves por defecto.
9. **API9:2023 - Improper Inventory Management:** APIs zombies, versiones antiguas expuestas sin mantenimiento.
10. **API10:2023 - Unsafe Consumption of APIs:** Confianza ciega en las respuestas devueltas por APIs de terceros o socios.

---

### 2. Diseño y Componente Arquitectónico
En **Booking Central**, se consolidó una **Matriz de Mitigación Técnica Exhaustiva** protegiendo el sistema contra cada una de las 10 vulnerabilidades de OWASP y asegurando el módulo de mensajería `EventBusModule`.

---

### 3. Ubicación Exacta en el Código
- **Módulo de Mensajería Event Bus:** `src/modules/event-bus/`.
- **Bitácora Transaccional de Eventos:** Tabla `schema_auditoria.auditoria_transaccional`.
- **Mitigación BOPLA (DTO Whitelist):** `src/core/validation/validation-pipe.ts`.
- **Mitigación BFLA:** `src/core/guards/admin-role.guard.ts`.
- **Mitigación API10 (Consumo Inseguro):** `src/core/validation/ajv-validation.pipe.ts` y adaptadores de socios.

---

### 4. Cómo fue Implementado (Código y Explicación Técnica)

#### Matriz de Mitigación OWASP API Top 10 Implementada en Booking Central:

| Vulnerabilidad OWASP | Riesgo en el Negocio | Mecanismo de Mitigación Concreto en Booking Central | Archivo Fuente |
| :--- | :--- | :--- | :--- |
| **API1: BOLA** | Usuario altera PNR y consulta reserva de otro cliente | Guard de titularidad contextual que compara `user.id == reserva.cliente_id` | `src/modules/pagos/guards/payment-reference-access.guard.ts` |
| **API2: Broken Auth** | Falsificación o reciclaje de tokens | `SupabaseAuthGuard` con verificación asimétrica y validación estricta de `exp` | `src/core/guards/supabase-auth.guard.ts` |
| **API3: BOPLA** | Inyección de `isAdmin: true` en el JSON de registro | ValidationPipe con `{ whitelist: true, forbidNonWhitelisted: true }` | `src/core/validation/validation-pipe.ts` |
| **API4: Resource Cons.**| Caída por sobrecarga o memoria agotada | `EdgeRateLimitMiddleware` + límite estricto de body parser a 5MB | `src/main.ts` y `edge-rate-limit.middleware.ts` |
| **API5: BFLA** | Cliente común borra un nodo socio | Decorador `@Roles('ADMIN')` evaluado en `AdminRoleGuard` | `src/core/guards/admin-role.guard.ts` |
| **API6: Business Flows**| Bots acaparan cupos de atracciones | Validación de aforo atómico en turnos y reCaptcha en frontend | `src/modules/atracciones/atracciones.service.ts` |
| **API7: SSRF** | Envío de `http://169.254.169.254/` en webhooks | Validación de URLs con lista blanca de dominios de socios autorizados | `src/modules/webhooks/webhooks.service.ts` |
| **API8: Misconfig** | Filtración de credenciales en errores 500 | `Rfc7807ExceptionFilter` con ofuscación de stack traces | `src/core/filters/rfc7807-exception.filter.ts` |
| **API9: Inventory Mgmt**| Socios usan versiones obsoletas | Catálogo de contratos vivo (`/contracts`) con cabecera `Sunset` | `src/modules/contracts/contracts.controller.ts` |
| **API10: Unsafe APIs** | El socio envía JSON corrupto o malware | Validación de payloads de entrada con esquemas estrictos **AJV** | `src/core/validation/ajv-validation.pipe.ts` |

---

### 5. Planificación y Decisiones de Diseño
- **Mitigación Especial para API10 (Consumo Inseguro de APIs):** En un proyecto de integración académica con 8 socios externos independientes, el mayor riesgo no proviene de atacantes externos directos, sino de respuestas corruptas, payloads gigantes o datos mal formados devueltos por los compañeros. Se diseñó el sistema para que **ninguna respuesta de socio sea procesada sin validarse primero contra un esquema AJV**.

---

### 6. Gráfica / Diagrama Arquitectónico Mermaid

```mermaid
flowchart TD
    subgraph "Matriz Perimetral de Mitigación OWASP API Top 10"
        In["Request Entrante"] --> G1["API4: Edge Rate Limiter (Anti-DDoS)"]
        G1 --> G2["API2: SupabaseAuthGuard (JWT Verifier)"]
        G2 --> G3["API5: AdminRoleGuard (BFLA Protection)"]
        G3 --> G4["API3: ValidationPipe Whitelist (BOPLA Protection)"]
        G4 --> G5["API1: Ownership Guard (BOLA Protection)"]
        G5 --> Core["Lógica de Negocio y Orquestación Saga"]
        
        Core --> OutCall["Llamada a API Externa de Socio"]
        OutCall --> G10["API10: AJV Response Contract Validator"]
        G10 --> Res["Procesamiento Seguro de Respuesta"]
    end
```

---

### 7. Auditoría, Trazabilidad y Telemetría
- **Auditoría Forense OWASP:** Cualquier discrepancia de esquema, intento BOLA o denegación de privilegios genera una alerta de seguridad indexada con el código de vulnerabilidad respectivo (`SECURITY_OWASP_BOLA_BLOCKED`, `SECURITY_OWASP_BOPLA_REJECTED`) en `logs/booking-gateway.jsonl`.
"""

def get_week11_pages():
    return [PAGE_19, PAGE_20, PAGE_21, PAGE_22]

if __name__ == '__main__':
    pages = get_week11_pages()
    print(f"Semana 11 generada: {len(pages)} páginas.")

