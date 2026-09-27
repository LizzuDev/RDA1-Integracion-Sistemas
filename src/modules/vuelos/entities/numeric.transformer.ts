import { ValueTransformer } from 'typeorm';

/**
 * Utilidades para columnas `NUMERIC`.
 *
 * ## Por qué el dinero se modela como `string` en las entidades
 *
 * El contrato OpenAPI declara `MoneyAmount.baseFare`, `.taxes` y `.total` como
 * `type: string`, y el plan de base de datos prohíbe explícitamente `FLOAT` /
 * `DOUBLE PRECISION` / `REAL`. El driver `pg` devuelve `NUMERIC` como `string`
 * precisamente para no perder precisión, y por eso las entidades de este
 * módulo exponen `NUMERIC(12,2)` también como `string`: así ningún valor
 * monetario pasa por un `number` de JavaScript (IEEE-754, 53 bits) en el camino
 * entre PostgreSQL y la respuesta HTTP.
 *
 * ## Cuándo SÍ usar el transformer
 *
 * Excepcionalmente, en agregados de reporting ( dashboards, `vista_ocupacion_vuelo`,
 * `vista_reembolsos_financieros`) donde un error de un céntimo es irrelevante y
 * la aggregation ocurre íntegramente en SQL. En esos casos se aplica
 * `numericToNumber` explícitamente, dejando la decisión visible en el código en
 * lugar de implícita en el mapeo de la entidad.
 */
export const numericToNumber: ValueTransformer = {
  /**
   * PostgreSQL -> TypeScript. Convierte el string del driver a number.
   * `null` se propaga para no convertir un NULL de la BD en 0.
   */
  to: (value: string | null): number | null =>
    value === null || value === undefined ? null : Number(value),

  /**
   * TypeScript -> PostgreSQL. Se serializa a string para que el driver emita un
   * literal numérico exacto y no un float con notación exponencial.
   */
  from: (value: number | null): string | null =>
    value === null || value === undefined ? null : value.toString(),
};

/**
 * Transformer para columnas `BIGINT` que se usan como contador, en concreto las
 * columnas de bloqueo optimista `bloqueo_cupo.blo_version` y
 * `reserva.res_version` mapeadas con `@VersionColumn`.
 *
 * ## Por qué hace falta
 * El driver `pg` devuelve `BIGINT` como `string` para no perder precisión
 * (un `BIGINT` puede exceder los 2^53 enteros seguros de JavaScript). Sin este
 * transformer, la propiedad quedaría tipada como `string` mientras
 * `@VersionColumn` la trata como numérico en su cláusula de concurrencia
 * optimista, y la comparación de versiones sería inconsistente.
 *
 * ## Por qué es seguro aquí
 * Un contador de versión jamás se acerca a 2^53: incluso a un million de
 * actualizaciones por segundo durante un siglo quedarían en ~3·10^15. Aquí el
 * `number` es seguro; en columnas `BIGINT` que sí almacenen magnitudes de
 * negocio (montos, conteos de inventario) debe usarse `string`.
 */
export const bigintToNumber: ValueTransformer = {
  /** PostgreSQL (string) -> TypeScript (number). */
  to: (value: string | number | null): number | null => {
    if (value === null || value === undefined) {
      return null;
    }
    return typeof value === 'number' ? value : Number(value);
  },

  /** TypeScript (number) -> PostgreSQL (string). */
  from: (value: number | null): string | null =>
    value === null || value === undefined ? null : value.toString(),
};
