/**
 * Barrel de entidades del módulo de Vuelos.
 *
 * ## ✅ COBERTURA COMPLETA — 35/35 entidades
 *
 * | Bloque | Tablas | Estado |
 * |---|---|---|
 * | 1 · Catálogo e Inventario | 3 | `aerolinea`, `vuelo`, `asiento_vuelo` |
 * | 2 · Ofertas y Tarifas | 6 | `oferta`, `oferta_itinerario`, `oferta_segmento`, `tarifa_cabina`, `tarifa_equipaje`, `tarifa_precio_pasajero` |
 * | 3 · Hold | 2 | `bloqueo_cupo`, `bloqueo_itinerario` |
 * | 4 · Reservas | 5 | `reserva`, `reserva_itinerario`, `reserva_segmento`, `pasajero`, `asiento_asignado` |
 * | 5 · Emisión | 6 | `boleto`, `boleto_segmento`, `checkin`, `checkin_pasajero`, `checkin_segmento`, `pase_abordar` |
 * | 6 · Postventa y Soporte | 13 | `equipaje_pasajero`, `oferta_cambio_fecha`, `oferta_cambio_segmento`, `cotizacion_cancelacion`, `historial_cambio`, `suscripcion_webhook`, `evento_webhook`, `entrega_webhook`, `idempotencia`, `limite_dispositivo`, `codigo_error`, `evento_error`, `log_auditoria_vuelos` |
 * | **Total** | **35** | **35/35 mapeadas** |
 *
 * Además: 2 archivos de soporte (`vuelos.enums.ts`, `numeric.transformer.ts`).
 *
 * ## Orden de registro
 * `vuelos_schema.sql` es la fuente de verdad y `synchronize` DEBE permanecer en
 * `false`: las entidades son un espejo de lectura del DDL, nunca el generador.
 * Los triggers, `CHECK`, políticas RLS, índices parciales y columnas GENERATED
 * no son expresables con decoradores, de modo que una entidad con
 * `synchronize: true` intentaría recrear el esquema y perdería esas garantías.
 */

export * from './vuelos.enums';
export * from './numeric.transformer';

// ---- Bloque 1 · Catálogo e Inventario ----
export * from './aerolinea.entity';
export * from './vuelo.entity';
export * from './asiento_vuelo.entity';

// ---- Bloque 2 · Ofertas y Tarifas ----
export * from './oferta.entity';
export * from './oferta_itinerario.entity';
export * from './oferta_segmento.entity';
export * from './tarifa_cabina.entity';
export * from './tarifa_equipaje.entity';
export * from './tarifa_precio_pasajero.entity';

// ---- Bloque 3 · Bloqueo de Cupos (Hold) ----
export * from './bloqueo_cupo.entity';
export * from './bloqueo_itinerario.entity';

// ---- Bloque 4 · Reservas ----
export * from './reserva.entity';
export * from './reserva_itinerario.entity';
export * from './reserva_segmento.entity';
export * from './pasajero.entity';
export * from './asiento_asignado.entity';

// ---- Bloque 5 · Boletos, Check-in, Pases de abordar ----
export * from './boleto.entity';
export * from './boleto_segmento.entity';
export * from './checkin.entity';
export * from './checkin_pasajero.entity';
export * from './checkin_segmento.entity';
export * from './pase_abordar.entity';

// ---- Bloque 6 · Postventa ----
export * from './equipaje_pasajero.entity';
export * from './oferta_cambio_fecha.entity';
export * from './oferta_cambio_segmento.entity';
export * from './cotizacion_cancelacion.entity';
export * from './historial_cambio.entity';

// ---- Bloque 6 · Soporte: webhooks, idempotencia, rate limit, auditoría ----
export * from './suscripcion_webhook.entity';
export * from './evento_webhook.entity';
export * from './entrega_webhook.entity';
export * from './idempotencia.entity';
export * from './limite_dispositivo.entity';
export * from './codigo_error.entity';
export * from './evento_error.entity';
export * from './log_auditoria_vuelos.entity';
