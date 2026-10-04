# Documento Técnico - Proyecto Integrador: Booking Prototipo (Reto 1)

## 1. Arquitectura Inicial (Enfoque API-first)
La arquitectura inicial de este proyecto sigue un patrón monolítico modular (Cliente-Servidor) con un enfoque **API-first**. 
- **Frontend (Cliente):** Aplicación de una sola página (SPA) desarrollada en React (Vite), con diseño responsivo, semántica estricta (HTML5) y pautas de accesibilidad (WCAG AA). Actúa de manera "Stateless", donde el estado local maneja UI y el estado global (Contextos) maneja la sesión.
- **Backend (Servidor):** Construido sobre NestJS, exponiendo una API RESTful documentada mediante OpenAPI 3.0. Cumple con las restricciones REST: cliente-servidor, stateless, interfaz uniforme y cacheable.
- **Base de Datos:** Inicialmente se dispone de una única base de datos operativa centralizada en Supabase (PostgreSQL).

## 2. Modelo de Datos (Conceptual)
El modelo de datos relacional inicial cubre el dominio del negocio (Ventas y Reservas):
1. **Usuarios/Clientes:** Almacena perfil, credenciales encriptadas y roles.
2. **Productos/Servicios:** Representa Atracciones, Vuelos y Autos de Renta.
3. **Reservas (Booking):** Entidad transaccional que asocia un Cliente con un Servicio. Posee control de estado (Pendiente, Confirmada, Cancelada).
4. **Facturación:** Emisión de comprobantes, asociada a la pasarela de pagos.

## 3. Contratos API
Siguiendo las restricciones de REST y el Nivel 3 de Richardson (HATEOAS), la API implementa URIs con sustantivos en plural y versionamiento explícito (`/api/v1/`).

* **Endpoints Principales:**
  - `POST /api/v1/clientes` - Registro de usuario
  - `GET /api/v1/servicios/atracciones` - Catálogo de atracciones
  - `POST /api/v1/reservas` - Creación de reserva

*El contrato detallado de interoperabilidad se encuentra definido en el archivo `openapi.yaml` adjunto en el proyecto, que sigue el estándar OpenAPI 3.0 y utiliza RFC 7807 para el manejo estandarizado de excepciones (Problem Details).*

## 4. Identificación de Futuros Puntos de Integración
En preparación para el Reto 2 y la interoperabilidad con los sistemas de otros estudiantes, se han diseñado los siguientes puntos de integración:
- **Catálogo Federado:** Exposición del endpoint `GET /api/v1/catalogo/exportar` para que el sistema central *Booking Prototipo* consuma los servicios locales.
- **Webhook de Notificación de Pagos:** Recepción asíncrona de confirmaciones de pago desde un gateway externo.
- **Sincronización de Disponibilidad:** Endpoints para consultar disponibilidad en tiempo real y evitar el *overbooking* entre sistemas heterogéneos.

## 5. Propuesta de Evolución hacia Microservicios (SOA/EDA)
Para el Reto 2, el sistema monolítico de NestJS será refactorizado utilizando los siguientes principios:
1. **Desacoplamiento por Dominio:** Separación del monolito en microservicios independientes (Autenticación, Catálogo, Reservas y Pagos).
2. **API Gateway & Wrapper:** Implementación de un API Gateway para rutear solicitudes, manejar CORS, Rate Limiting y utilizar el **Patrón Wrapper** en caso de que algún sistema externo provea SOAP/XML, traduciéndolo a REST/JSON.
3. **Arquitectura Orientada a Eventos (EDA):** Introducción de un Event Bus (Ej. RabbitMQ o Kafka) para la comunicación asíncrona. 
   - *Ejemplo de Evento:* `ReservaCreadaEvent` disparará procesos de facturación y correos de confirmación sin bloquear el hilo principal.
4. **gRPC:** Para comunicación de alta latencia entre los microservicios internos (ej. Motor de Búsqueda de Vuelos con el Servicio de Disponibilidad).
