# ADR-005: Jerarquía Recursiva de Categorías de Atracciones con Tabla Padre-Hijo

## Estado
Aceptado (Accepted)

## Contexto
En el catálogo de atracciones turísticas, los servicios presentan una organización taxonómica natural con múltiples niveles de anidamiento (por ejemplo: `Tours` → `Tours Gastronómicos` → `Degustación de Café y Cacao`). Además, ciertas características de negocio aplican a toda una rama o categoría particular (tales como la inclusión de comida, servicio de transporte o acompañamiento de un guía turístico acreditado).

El docente solicitó expresamente:
> *"Controlar las categorías de atracciones (comida, transporte, guía) usando una tabla padre e hija recursiva."*

El modelado plano de categorías impide búsquedas por ancestros comunes y obliga a duplicar flags en cada una de las atracciones.

## Decisión
Se decide modelar las categorías de atracciones mediante una **estructura recursiva padre-hijo (Adjacency List con soporte Closure Table / CTE Recursivo)**:
1. **Entidad `CategoriaAtraccion`:**
   - `id`: UUID (Identificador primario).
   - `nombre`: Nombre legible (ej. "Tours Culturales").
   - `slug`: Identificador URL amigable (ej. "tours-culturales").
   - `parent_id`: UUID nullable con autoreferencia a `CategoriaAtraccion(id)`. Si es `NULL`, representa una categoría raíz.
   - `incluye_comida`: Boolean que indica si las actividades de esta categoría proveen alimentación.
   - `incluye_transporte`: Boolean que indica si incluye traslados.
   - `incluye_guia`: Boolean que indica presencia de guía bilingüe.
2. **Consultas de Árbol Completo:**
   - En TypeORM, se implementa mediante decoradores `@Tree('closure-table')` o `@TreeParent()` / `@TreeChildren()`, permitiendo ejecutar `findTrees()` para devolver la estructura anidada en un solo llamado al endpoint `GET /api/v1/atracciones/categorias/arbol`.
3. **Filtrado Recursivo en Búsquedas:**
   - Al filtrar por una categoría padre (ej. `?categoria=tours`), el backend utiliza una consulta recursiva SQL (`WITH RECURSIVE`) para encontrar todos los descendientes y devolver atracciones asociadas a cualquiera de los subniveles.

## Consecuencias
### Positivas
- Estructura taxonómica flexible con niveles de anidamiento ilimitados.
- El frontend puede renderizar menús desplegables en cascada y filtros multifacéticos con facilidad.
- Cumple con una de las directrices avanzadas de modelado de datos solicitadas para la defensa del RDA2.

### Desafíos Aceptados
- Las operaciones de inserción y eliminación de nodos intermedios requieren validar que no se creen ciclos de referencia circular (un nodo no puede ser ancestro de sí mismo).
