/**
 * Enumeraciones del módulo de Vuelos.
 *
 * Los valores son LITERALES EXACTOS del script `vuelos_schema.sql`, que a su vez
 * replica los `enum` de `contracts/vuelos-openapi.yaml`. No deben traducirse:
 * la base de datos ya los restringe con `CHECK (... IN (...))`, de modo que
 * cualquier divergencia entre este archivo y el `.sql` produciría un error en
 * runtime en la primera fila insertada.
 *
 * Bloques cubiertos: 1 (Catálogo e Inventario), 2 (Ofertas y Tarifas),
 * 3 (Bloqueo de Cupos) y 4 (Reservas y Emisión). Los enums de Boleto, Check-in
 * y Postventa se añadirán junto con sus entidades.
 */

/**
 * `vuelo.vue_estado` y `oferta_segmento.osg_estado`
 * → CHECK (... IN ('SCHEDULED','BOARDING','DEPARTED','DELAYED','ARRIVED','CANCELLED','DIVERTED'))
 *
 * Contrato: `FlightSegment.status` y `FlightStatus.status`.
 */
export enum EstadoVuelo {
  SCHEDULED = 'SCHEDULED',
  BOARDING = 'BOARDING',
  DEPARTED = 'DEPARTED',
  DELAYED = 'DELAYED',
  ARRIVED = 'ARRIVED',
  CANCELLED = 'CANCELLED',
  DIVERTED = 'DIVERTED',
}

/**
 * `asiento_vuelo.asi_claseCabina` y `tarifa_cabina.tca_claseCabina`
 * → CHECK (... IN ('ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST'))
 *
 * Contrato: `CabinPricing.cabinClass`.
 */
export enum ClaseCabina {
  ECONOMY = 'ECONOMY',
  PREMIUM_ECONOMY = 'PREMIUM_ECONOMY',
  BUSINESS = 'BUSINESS',
  FIRST = 'FIRST',
}

/**
 * Elementos admitidos en el array `asiento_vuelo.asi_caracteristicas`.
 * No existe `CHECK` de elemento en el SQL (PostgreSQL no valida el contenido de
 * un array con `IN` sin una función auxiliar), por lo que este enum es la
 * ÚNICA barrera de validación a nivel de aplicación.
 *
 * Contrato: `SeatMapResponse.seats[].characteristics`.
 */
export enum CaracteristicaAsiento {
  WINDOW = 'WINDOW',
  AISLE = 'AISLE',
  EXTRA_LEGROOM = 'EXTRA_LEGROOM',
  EMERGENCY_EXIT = 'EMERGENCY_EXIT',
}

/**
 * `tarifa_precio_pasajero.tpp_tipoPasajero`
 * → CHECK (... IN ('ADULT','YOUTH','CHILD','INFANT'))
 *
 * Contrato: `PassengerItem.passengerType` y `PassengerBreakdown`.
 */
export enum TipoPasajero {
  ADULT = 'ADULT',
  YOUTH = 'YOUTH',
  CHILD = 'CHILD',
  INFANT = 'INFANT',
}

/**
 * `bloqueo_cupo.blo_estado`
 * → CHECK (... IN ('HELD','RELEASED','EXPIRED','CONSUMED'))
 *
 * Contrato: `HoldStatusResponse.status`.
 *
 * `HOLDResponse.status` solo declara `HELD` porque un hold recién creado
 * siempre nace retenido; el enum completo refleja los cuatro estados que la
 * vista `vista_hold_estado` puede devolver. Las transiciones válidas las
 * controla el trigger de la máquina de estados (§4.3 del plan).
 */
export enum EstadoHold {
  HELD = 'HELD',
  RELEASED = 'RELEASED',
  EXPIRED = 'EXPIRED',
  CONSUMED = 'CONSUMED',
}

/**
 * `reserva.res_estado`
 * → CHECK (... IN ('PENDING','PENDING_PAYMENT','TICKET_ISSUING','CONFIRMED',
 *                   'FAILED','CHANGE_PENDING','CANCELLATION_PENDING','CANCELLED'))
 *
 * Contrato: `BookingDetail.status`. Los 8 estados son obligatorios: el borrador 3
 * del plan solo contemplaba 4 y hacía imposible el flujo asíncrono `202`.
 *
 * Las transiciones permitidas las valida el trigger `trg_reserva_transicion`
 * (§4.3 del plan), no TypeORM.
 */
export enum EstadoReserva {
  PENDING = 'PENDING',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  TICKET_ISSUING = 'TICKET_ISSUING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CHANGE_PENDING = 'CHANGE_PENDING',
  CANCELLATION_PENDING = 'CANCELLATION_PENDING',
  CANCELLED = 'CANCELLED',
}

/**
 * `pasajero.pas_tipoDocumento`
 * → CHECK (... IN ('PASSPORT','NATIONAL_ID'))
 *
 * Contrato: `PassengerItem.documentType`.
 */
export enum TipoDocumento {
  PASSPORT = 'PASSPORT',
  NATIONAL_ID = 'NATIONAL_ID',
}

/**
 * `pasajero.pas_genero`
 * → CHECK (... IN ('M','F','X'))
 *
 * Contrato: `PassengerItem.gender`. `X` es el valor neutro que el contrato
 * admite explícitamente.
 */
export enum Genero {
  M = 'M',
  F = 'F',
  X = 'X',
}

// ===========================================================================
// BLOQUE 5 — Boletos, Check-in, Pases de abordar
// ===========================================================================

/**
 * `boleto.bol_estado`
 * → CHECK (... IN ('PENDING','ISSUING','ISSUED','FAILED','VOIDED','REFUNDED'))
 *
 * Contrato: `TicketStatus`. `VOIDED` y `REFUNDED` son terminales; el
 * `TICKET_ALREADY_ISSUED` lo impide la máquina de estados del trigger
 * `trg_ticket_idempotente` (§4.5 del plan).
 */
export enum EstadoTicket {
  PENDING = 'PENDING',
  ISSUING = 'ISSUING',
  ISSUED = 'ISSUED',
  FAILED = 'FAILED',
  VOIDED = 'VOIDED',
  REFUNDED = 'REFUNDED',
}

/**
 * `boleto_segmento.bse_estado`
 * → CHECK (... IN ('PENDING','ISSUED','FAILED'))
 *
 * Contrato: `TicketSegmentStatus`. Un boleto puede estar `ISSUED` globalmente
 * y tener un segmento suelto en `FAILED`: por eso el estado vive también a
 * nivel de segmento, con su propio `bse_numeroCupon`.
 */
export enum EstadoTicketSegmento {
  PENDING = 'PENDING',
  ISSUED = 'ISSUED',
  FAILED = 'FAILED',
}

/**
 * `checkin.chi_estado`
 * → CHECK (... IN ('NOT_ELIGIBLE','AVAILABLE','IN_PROGRESS','COMPLETED','FAILED'))
 *
 * Contrato: `CheckInStatus`. El paso a `COMPLETED` es lo que habilita emitir
 * pases de abordaje; de lo contrario `BOARDING_PASS_NOT_AVAILABLE`.
 */
export enum EstadoCheckIn {
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * `checkin_pasajero.cpa_estado` y `checkin_segmento.cse_estado`
 * → CHECK (... IN ('CHECKED_IN','NOT_CHECKED_IN','FAILED'))
 *
 * Contrato: `CheckInResponse.checkedInPassengers[].status` y
 * `...segments[].status`.
 */
export enum EstadoCheckInItem {
  CHECKED_IN = 'CHECKED_IN',
  NOT_CHECKED_IN = 'NOT_CHECKED_IN',
  FAILED = 'FAILED',
}

/**
 * `pase_abordar.pab_tipoCodigoBarras`
 * → CHECK (... IN ('AZTEC','PDF417','QR'))
 *
 * Contrato: `BoardingPass.barcodeType`. El DDL añade además un `CHECK` que
 * cruza el tipo con la longitud de `pab_codigoBarras`.
 */
export enum TipoCodigoBarras {
  AZTEC = 'AZTEC',
  PDF417 = 'PDF417',
  QR = 'QR',
}

// ===========================================================================
// BLOQUE 6 — Postventa
// ===========================================================================

/**
 * `oferta_cambio_fecha.ocf_estado`
 * → CHECK (... IN ('VALID','ACCEPTED','EXPIRED','REJECTED'))
 *
 * Contrato: implícito en `DateChangeSearchResponse` / `DateChangeRequest`.
 * Una oferta `VALID` y no expirada es lo único que permite aceptar el cambio;
 * en caso contrario `CHANGE_OFFER_EXPIRED` (HTTP 410).
 */
export enum EstadoOfertaCambioFecha {
  VALID = 'VALID',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
}

/**
 * `cotizacion_cancelacion.cco_estado`
 * → CHECK (... IN ('VALID','CONSUMED','EXPIRED'))
 *
 * Contrato: implícito en `CancellationQuoteResponse` / `CancelBookingRequest`.
 * El consumo es de un solo uso: al cancelar se marca `CONSUMED` y un reintento
 * produce `ALREADY_CANCELLED`.
 */
export enum EstadoCotizacionCancelacion {
  VALID = 'VALID',
  CONSUMED = 'CONSUMED',
  EXPIRED = 'EXPIRED',
}

// ===========================================================================
// BLOQUE 6 — Soporte: idempotencia, webhooks y auditoría
// ===========================================================================

/**
 * `idempotencia.idm_estado`
 * → CHECK (... IN ('IN_PROGRESS','COMPLETED','FAILED'))
 *
 * No está en el contrato: es una decisión de diseño. `IN_PROGRESS` es la fila
 * de candado que se inserta en la MISMA transacción que la operación, y es lo
 * que impide que un reintento concurrente con el mismo `Idempotency-Key`
 * duplique un cobro o una emisión de ticket.
 */
export enum EstadoIdempotencia {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * `log_auditoria_vuelos.log_accion`
 * → CHECK (... IN ('CREATED','UPDATED','STATUS_CHANGED','DELETED','ACCESS'))
 *
 * La tabla tiene un trigger append-only (`tg_auditoria_no_borrar`) que
 * rechaza DELETE, UPDATE y TRUNCATE.
 */
export enum AccionAuditoria {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  DELETED = 'DELETED',
  ACCESS = 'ACCESS',
}

/**
 * Eventos de webhook: `suscripcion_webhook.swb_eventos` (array) y
 * `evento_webhook.evw_tipoEvento`.
 *
 * Contrato: `WebhookSubscription.events[].enum` (12 valores).
 *
 * Se modela como **union type + array de constantes**, y no como `enum`, por
 * una razón concreta: el DDL NO define un `CHECK` sobre estos valores (solo
 * `cardinality(swb_eventos) BETWEEN 1 AND 12`), a diferencia de los demás
 * catálogos del módulo. Al ser un dominio abierto y versionado junto con la
 * API, un `enum` de TypeScript obligaría a recompilar y redesplegar para
 * añadir un evento, mientras que una union type solo obliga a actualizar el
 * sitio que lo consume. El array permite además validarlo con
 * `@IsIn(TIPOS_EVENTO_WEBHOOK)` en los DTO.
 */
export const TIPOS_EVENTO_WEBHOOK = [
  'booking.confirmed',
  'booking.failed',
  'booking.changed',
  'booking.cancelled',
  'booking.baggage_added',
  'hold.expired',
  'flight.schedule_changed',
  'flight.cancelled',
  'booking.ticket_issuing',
  'booking.ticket_issued',
  'booking.ticket_failed',
  'booking.checked_in',
] as const;

export type TipoEventoWebhook = (typeof TIPOS_EVENTO_WEBHOOK)[number];
