export const BUSINESS_RULES = {
  /** 15 minutos es el tiempo estándar que un pasajero tiene para pagar antes de liberar el cupo */
  TTL_POR_DEFECTO: 15,

  /** Versión semántica del payload del evento */
  VERSION_EVENTO: '1.0',

  /** 120 caracteres es el límite estándar IATA BCBP para códigos M1 */
  BOARDING_PASS_BARCODE_LENGTH: 120,

  /** 0.18 = 18% IVA/IGV estándar de la aerolínea */
  TASA_IMPUESTO: 0.18,

  /** La mayoría de aerolíneas abren check-in 48h antes */
  HORAS_APERTURA_CHECKIN: 48,

  /** Tiempo de validez de una cotización de cancelación */
  MINUTOS_VIGENCIA_COTIZACION: 15,

  /** Excluye I, O, U para evitar ambigüedades y palabras malsonantes */
  PNR_LETRAS: 'ABCDEFGHJKLMNPQRSTUVWXYZ',

  BASE_PRICE_BY_CABIN: {
    ECONOMY: 68.00,
    PREMIUM_ECONOMY: 95.00,
    BUSINESS: 268.00,
    FIRST: 500.00,
  } as Record<string, number>,

  PASSENGER_FACTOR: {
    ADULT: 1.00,
    YOUTH: 0.82,
    CHILD: 0.68,
    INFANT: 0.12,
  } as Record<string, number>,

  FARE_BRAND_BY_CABIN: {
    ECONOMY: 'BASIC',
    PREMIUM_ECONOMY: 'FLEX',
    BUSINESS: 'CORPORATE',
    FIRST: 'LUXURY',
  } as Record<string, string>,

  EXTRA_BAGGAGE_PRICE: {
    ECONOMY: 35.00,
    PREMIUM_ECONOMY: 0.00,
    BUSINESS: 0.00,
    FIRST: 0.00,
  } as Record<string, number>,

  PENALIZACION: [
    { horasMinimas: 72, porcentaje: 0 },
    { horasMinimas: 48, porcentaje: 25 },
    { horasMinimas: 24, porcentaje: 50 },
    { horasMinimas: 0, porcentaje: 100 },
  ],

  FARE_RULES: {
    ECONOMY: { isRefundable: false, isChangeable: false },
    PREMIUM_ECONOMY: { isRefundable: true, isChangeable: true },
    BUSINESS: { isRefundable: true, isChangeable: true },
    FIRST: { isRefundable: true, isChangeable: true },
  } as Record<string, { isRefundable: boolean; isChangeable: boolean }>,

  BAGGAGE_ALLOWANCE: {
    ECONOMY: { carryOnIncluded: 0, checkedBaggageIncluded: 0 },
    PREMIUM_ECONOMY: { carryOnIncluded: 1, checkedBaggageIncluded: 2 },
    BUSINESS: { carryOnIncluded: 1, checkedBaggageIncluded: 2 },
    FIRST: { carryOnIncluded: 1, checkedBaggageIncluded: 2 },
  } as Record<string, { carryOnIncluded: number; checkedBaggageIncluded: number }>,
};
