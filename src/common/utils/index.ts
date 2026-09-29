import { createHash } from 'crypto';

/**
 * Calcula la diferencia en minutos entre dos instantes.
 *
 * Se hace con `getTime()` sobre `Date` y no leyendo el DTO: los campos
 * `horaSalidaProgramada` y `horaLlegadaProgramada` son TIMESTAMPTZ, que
 * TypeORM mapea a `Date`, y por eso la resta es exacta en milisegundos. El
 * resultado se redondea a entero porque el contrato declara
 * `totalDurationMinutes` y `durationMinutes` como `integer`.
 */
export function minutosEntre(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / 60000);
}

/** Redondea un importe a 2 decimales y lo devuelve como STRING. */
export function aImporte(valor: number): string {
  return valor.toFixed(2);
}

/**
 * Normaliza a `YYYY-MM-DD` un valor de columna `date`.
 *
 * El driver puede entregar un `date` de PostgreSQL como texto (`'2026-11-03'`)
 * o como `Date` de JavaScript, segun el parser de tipos con el que se cree el
 * pool. Un `String(fecha).slice(0, 10)` solo funciona en el primer caso: sobre
 * un `Date` devuelve `'Tue Nov 03'`, que no es una fecha.
 *
 * Cuando llega como `Date` se usa `getFullYear/getMonth/getDate` en vez de
 * `toISOString()`, porque `toISOString()` convierte a UTC y en una zona horaria
 * detras de UTC (Ecuador es UTC-5) puede devolver el dia ANTERIOR: un vuelo que
 * sale el 3 se fecharia el 2.
 */
export function aFechaIso(valor: Date | string): string {
  if (typeof valor === 'string') {
    return valor.slice(0, 10);
  }
  const mes = String(valor.getMonth() + 1).padStart(2, '0');
  const dia = String(valor.getDate()).padStart(2, '0');
  return [valor.getFullYear(), mes, dia].join('-');
}

/**
 * Redondea a dos decimales evitando el error binario de `toFixed`.
 *
 * `(0.1 + 0.2).toFixed(2)` es `"0.30"`, pero `(1.005).toFixed(2)` es
 * `"1.00"` porque 1.005 no es representable y en realidad vale 1.0049999.
 * Multiplicar por 100, redondear y dividir corrige el caso, y la ultima division
 * se vuelve a dejar a dos decimales por si el redondeo ha dejado residuo.
 */
export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function sha256(texto: string): string {
  return createHash('sha256').update(texto).digest('hex');
}
