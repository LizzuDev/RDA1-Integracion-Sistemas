# ADR-002: Aislamiento de Base de Datos por Microservicio (Database-per-Service)

## Estado
Aceptado (Accepted)

## Contexto
En arquitecturas monolíticas tradicionales, es común que múltiples módulos consulten directamente las mismas tablas de base de datos o utilicen claves foráneas (Foreign Keys) para vincular entidades de dominios diferentes (por ejemplo, relacionar la tabla de `facturas` directamente con la tabla de `reservas_auto`).

Sin embargo, para el Reto 2 (RDA2), la rúbrica (Criterio CE02) y la directriz del docente exigen una **migración real a arquitectura de microservicios**:
> *"Al usar microservicios la base de datos se separa. El microservicio es hacer una base de datos independiente, no se puede compartir tablas entre microservicios; en la capa de aplicación es donde se usa un middleware para conectar las tablas."*

Permitir que un módulo lea tablas de otro módulo acoplaría los esquemas e impediría que cada microservicio escale o migre su persistencia de manera independiente.

## Decisión
Se decide aplicar de forma estricta el patrón **Database-per-Service**:
1. **Separación Lógica y de Esquemas:**
   - **Módulo Admin & Ventas:** Dueño exclusivo de `usuarios`, `carritos`, `facturas`, `tiendas_integradas`.
   - **Módulo Autos:** Dueño exclusivo de `autos`, `orders_auto`, `maintenance_logs`, `auto_state_history`.
   - **Módulo Atracciones:** Dueño exclusivo de `atracciones`, `categorias_atraccion`, `reservas_atraccion`.
2. **Prohibición de Joins y Claves Foráneas Cruzadas:**
   - Ninguna tabla de un dominio puede tener un `FOREIGN KEY` hacia una tabla de otro dominio.
   - Las entidades TypeORM de un módulo no pueden ser importadas ni inyectadas directamente en los servicios o controladores de otro módulo.
3. **Agregación en la Capa de Aplicación:**
   - Si el Admin necesita mostrar un reporte que incluye detalles de órdenes de autos o reservas de atracciones, no ejecuta una consulta SQL conjunta. Invoca los métodos de los servicios correspondientes (`AutosService.obtenerResumen()`) o endpoints internos, componiendo los datos en memoria en la capa de aplicación (BFF).

## Consecuencias
### Positivas
- Desacoplamiento total: los cambios en el modelo de datos de un microservicio no afectan a los demás.
- Cumplimiento riguroso del criterio evaluativo CE02 de la rúbrica RDA2.
- Facilita la extracción futura de cualquier módulo hacia un contenedor Docker y base de datos física independiente sin reescribir consultas.

### Desafíos Aceptados
- No es posible delegar la integridad referencial al motor de base de datos relacional para entidades de distintos dominios.
- Se debe manejar la consistencia en la capa de aplicación o mediante compensaciones transaccionales en caso de fallos.
