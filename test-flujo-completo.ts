/**
 * SCRIPT DE PRUEBAS COMPLETO - Flujo de Vuelos
 * 
 * Este script simula un usuario real que:
 * 1. Busca vuelos
 * 2. Crea un hold
 * 3. Crea una reserva
 * 4. Emitir boletos
 * 5. Hace check-in
 * 6. Agrega maletas
 * 7. Verifica que todo funcione
 * 
 * EJECUCIÓN:
 *   npx ts-node test-flujo-completo.ts
 * 
 * O si prefieres compilar primero:
 *   npx tsc test-flujo-completo.ts
 *   node test-flujo-completo.js
 */

import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const API_BASE = 'http://localhost:3000/api/v1';
const DEVICE_FINGERPRINT = randomUUID();

// ============================================================================
// CLIENTE HTTP
// ============================================================================
const client: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'X-Device-Fingerprint': DEVICE_FINGERPRINT,
  },
  timeout: 30000,
});

// ============================================================================
// UTILIDADES
// ============================================================================
function log(mensaje: string, datos?: unknown): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${mensaje}`);
  if (datos !== undefined) {
    console.log(JSON.stringify(datos, null, 2));
  }
}

function logError(mensaje: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ${mensaje}`);
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
}

function generarIdempotencyKey(): string {
  return randomUUID();
}

// ============================================================================
// TIPOS
// ============================================================================
interface Vuelo {
  offerId: string;
  airline: { code: string; name: string };
  itineraries: Array<{
    itineraryId: string;
    segments: Array<{
      segmentId: string;
      flightNumber: string;
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
    }>;
  }>;
  grandTotal: { currency: string; baseFare: string; taxes: string; total: string };
}

interface Hold {
  holdId: string;
  status: string;
  expiresAt: string;
  lockedPrice: { currency: string; baseFare: string; taxes: string; total: string };
}

interface Reserva {
  bookingId: string;
  pnr: string;
  status: string;
  passengers: Array<{ passengerId: string; passengerType: string }>;
  itineraries: Array<{ itineraryId: string; segments: Array<{ segmentId: string }> }>;
}

// ============================================================================
// PRUEBAS
// ============================================================================

/**
 * PRUEBA 1: Buscar vuelos (1 adulto)
 */
async function prueba1BuscarVuelos1Adulto(): Promise<Vuelo | null> {
  log('=== PRUEBA 1: Buscar vuelos (1 adulto) ===');
  
  try {
    const response = await client.post('/vuelos/search', {
      itineraries: [
        {
          origin: 'GYE',
          destination: 'UIO',
          departureDate: '2026-10-01',
        },
      ],
      passengers: {
        adults: 1,
        youths: 0,
        children: 0,
        infants: 0,
      },
    });

    log(`✅ Status: ${response.status}`);
    log(`Total ofertas: ${response.data.totalOffers}`);
    
    if (response.data.offers && response.data.offers.length > 0) {
      const oferta = response.data.offers[0];
      log('Primera oferta:', {
        offerId: oferta.offerId,
        airline: oferta.airline,
        grandTotal: oferta.grandTotal,
      });
      return oferta;
    }
    
    return null;
  } catch (error) {
    logError('Error en búsqueda', error);
    return null;
  }
}

/**
 * PRUEBA 2: Buscar vuelos (2 adultos + 1 niño)
 */
async function prueba2BuscarVuelosFamilia(): Promise<Vuelo | null> {
  log('=== PRUEBA 2: Buscar vuelos (2 adultos + 1 niño) ===');
  
  try {
    const response = await client.post('/vuelos/search', {
      itineraries: [
        {
          origin: 'UIO',
          destination: 'GYE',
          departureDate: '2026-10-02',
        },
      ],
      passengers: {
        adults: 2,
        youths: 0,
        children: 1,
        infants: 0,
      },
    });

    log(`✅ Status: ${response.status}`);
    log(`Total ofertas: ${response.data.totalOffers}`);
    
    if (response.data.offers && response.data.offers.length > 0) {
      const oferta = response.data.offers[0];
      log('Primera oferta:', {
        offerId: oferta.offerId,
        airline: oferta.airline,
        grandTotal: oferta.grandTotal,
      });
      return oferta;
    }
    
    return null;
  } catch (error) {
    logError('Error en búsqueda', error);
    return null;
  }
}

/**
 * PRUEBA 3: Buscar vuelos (1 adulto + 1 infante)
 */
async function prueba3BuscarVuelosConInfante(): Promise<Vuelo | null> {
  log('=== PRUEBA 3: Buscar vuelos (1 adulto + 1 infante) ===');
  
  try {
    const response = await client.post('/vuelos/search', {
      itineraries: [
        {
          origin: 'GYE',
          destination: 'MIA',
          departureDate: '2026-10-03',
        },
      ],
      passengers: {
        adults: 1,
        youths: 0,
        children: 0,
        infants: 1,
      },
    });

    log(`✅ Status: ${response.status}`);
    log(`Total ofertas: ${response.data.totalOffers}`);
    
    if (response.data.offers && response.data.offers.length > 0) {
      const oferta = response.data.offers[0];
      log('Primera oferta:', {
        offerId: oferta.offerId,
        airline: oferta.airline,
        grandTotal: oferta.grandTotal,
      });
      return oferta;
    }
    
    return null;
  } catch (error) {
    logError('Error en búsqueda', error);
    return null;
  }
}

/**
 * PRUEBA 4: Crear hold
 */
async function prueba4CrearHold(oferta: Vuelo): Promise<Hold | null> {
  log('=== PRUEBA 4: Crear hold ===');
  
  try {
    const response = await client.post(
      '/vuelos/offers/hold',
      {
        offerId: oferta.offerId,
        itinerarySelections: [
          {
            itineraryId: oferta.itineraries[0].itineraryId,
            cabinClass: 'ECONOMY',
            fareBrand: 'BASIC',
          },
        ],
        passengersBreakdown: {
          adults: 1,
          youths: 0,
          children: 0,
          infants: 0,
        },
      },
      {
        headers: {
          'Idempotency-Key': generarIdempotencyKey(),
        },
      }
    );

    log(`✅ Status: ${response.status}`);
    log('Hold creado:', response.data);
    return response.data;
  } catch (error) {
    logError('Error al crear hold', error);
    return null;
  }
}

/**
 * PRUEBA 5: Crear reserva
 */
async function prueba5CrearReserva(hold: Hold, oferta: Vuelo): Promise<Reserva | null> {
  log('=== PRUEBA 5: Crear reserva ===');
  
  try {
    const response = await client.post(
      '/vuelos/bookings',
      {
        holdId: hold.holdId,
        passengers: [
          {
            passengerId: 'pax-1',
            passengerType: 'ADULT',
            firstName: 'Juan',
            lastName: 'Pérez',
            documentType: 'NATIONAL_ID',
            documentNumber: '1712345678',
            nationality: 'ECU',
            birthDate: '1990-05-15',
            gender: 'M',
            contact: {
              email: 'juan.perez@example.com',
              phone: '+593991234567',
            },
            assignedSeats: [
              {
                segmentId: oferta.itineraries[0].segments[0].segmentId,
                seatNumber: '1A',
              },
            ],
          },
        ],
        payment: {
          paymentReference: 'pay_' + randomUUID().replace(/-/g, '').substring(0, 16),
        },
      },
      {
        headers: {
          'Idempotency-Key': generarIdempotencyKey(),
        },
      }
    );

    log(`✅ Status: ${response.status}`);
    log('Reserva creada:', {
      bookingId: response.data.bookingId,
      pnr: response.data.pnr,
      status: response.data.status,
    });
    return response.data;
  } catch (error) {
    logError('Error al crear reserva', error);
    return null;
  }
}

/**
 * PRUEBA 6: Emitir boletos
 */
async function prueba6EmitirBoletos(reserva: Reserva): Promise<boolean> {
  log('=== PRUEBA 6: Emitir boletos ===');
  
  try {
    const response = await client.post(`/vuelos/bookings/${reserva.bookingId}/tickets`);
    
    log(`✅ Status: ${response.status}`);
    log('Boletos emitidos:', response.data);
    return true;
  } catch (error) {
    logError('Error al emitir boletos', error);
    return false;
  }
}

/**
 * PRUEBA 7: Hacer check-in
 */
async function prueba7CheckIn(reserva: Reserva): Promise<boolean> {
  log('=== PRUEBA 7: Hacer check-in ===');
  
  try {
    const response = await client.post(`/vuelos/bookings/${reserva.bookingId}/check-in`);
    
    log(`✅ Status: ${response.status}`);
    log('Check-in:', response.data);
    return true;
  } catch (error) {
    logError('Error en check-in', error);
    return false;
  }
}

/**
 * PRUEBA 8: Agregar maletas
 */
async function prueba8AgregarMaletas(reserva: Reserva): Promise<boolean> {
  log('=== PRUEBA 8: Agregar maletas ===');
  
  try {
    const response = await client.post(
      `/vuelos/bookings/${reserva.bookingId}/baggage`,
      {
        passengerId: 'pax-1',
        itineraryId: reserva.itineraries[0].itineraryId,
        quantity: 2,
        payment: {
          paymentReference: 'pay_' + randomUUID().replace(/-/g, '').substring(0, 16),
        },
      },
      {
        headers: {
          'Idempotency-Key': generarIdempotencyKey(),
        },
      }
    );

    log(`✅ Status: ${response.status}`);
    log('Maletas agregadas:', response.data);
    return true;
  } catch (error) {
    logError('Error al agregar maletas', error);
    return false;
  }
}

/**
 * PRUEBA 9: Obtener detalle de reserva
 */
async function prueba9ObtenerReserva(reserva: Reserva): Promise<boolean> {
  log('=== PRUEBA 9: Obtener detalle de reserva ===');
  
  try {
    const response = await client.get(`/vuelos/bookings/${reserva.bookingId}`);
    
    log(`✅ Status: ${response.status}`);
    log('Reserva:', {
      bookingId: response.data.bookingId,
      pnr: response.data.pnr,
      status: response.data.status,
      passengers: response.data.passengers?.length,
      itineraries: response.data.itineraries?.length,
    });
    return true;
  } catch (error) {
    logError('Error al obtener reserva', error);
    return false;
  }
}

/**
 * PRUEBA 10: Listar reservas
 */
async function prueba10ListarReservas(): Promise<boolean> {
  log('=== PRUEBA 10: Listar reservas ===');
  
  try {
    const response = await client.get('/vuelos/bookings', {
      params: {
        limit: 10,
      },
    });

    log(`✅ Status: ${response.status}`);
    log('Reservas:', {
      total: response.data.items?.length,
      nextCursor: response.data.nextCursor,
    });
    return true;
  } catch (error) {
    logError('Error al listar reservas', error);
    return false;
  }
}

// ============================================================================
// EJECUCIÓN DE TODAS LAS PRUEBAS
// ============================================================================
async function ejecutarPruebas(): Promise<void> {
  log('========================================');
  log('INICIANDO PRUEBAS DE FLUJO COMPLETO');
  log('========================================');
  log(`API: ${API_BASE}`);
  log(`Device Fingerprint: ${DEVICE_FINGERPRINT}`);
  log('');

  const resultados: Array<{ nombre: string; exito: boolean }> = [];

  // Prueba 1: Buscar vuelos (1 adulto)
  const oferta1 = await prueba1BuscarVuelos1Adulto();
  resultados.push({ nombre: 'Búsqueda 1 adulto', exito: oferta1 !== null });

  // Prueba 2: Buscar vuelos (familia)
  const oferta2 = await prueba2BuscarVuelosFamilia();
  resultados.push({ nombre: 'Búsqueda familia', exito: oferta2 !== null });

  // Prueba 3: Buscar vuelos (con infante)
  const oferta3 = await prueba3BuscarVuelosConInfante();
  resultados.push({ nombre: 'Búsqueda con infante', exito: oferta3 !== null });

  // Prueba 4: Crear hold
  let hold: Hold | null = null;
  if (oferta1) {
    hold = await prueba4CrearHold(oferta1);
    resultados.push({ nombre: 'Crear hold', exito: hold !== null });
  }

  // Prueba 5: Crear reserva
  let reserva: Reserva | null = null;
  if (hold && oferta1) {
    reserva = await prueba5CrearReserva(hold, oferta1);
    resultados.push({ nombre: 'Crear reserva', exito: reserva !== null });
  }

  // Prueba 6: Emitir boletos
  if (reserva) {
    const exito = await prueba6EmitirBoletos(reserva);
    resultados.push({ nombre: 'Emitir boletos', exito });
  }

  // Prueba 7: Check-in
  if (reserva) {
    const exito = await prueba7CheckIn(reserva);
    resultados.push({ nombre: 'Check-in', exito });
  }

  // Prueba 8: Agregar maletas
  if (reserva) {
    const exito = await prueba8AgregarMaletas(reserva);
    resultados.push({ nombre: 'Agregar maletas', exito });
  }

  // Prueba 9: Obtener reserva
  if (reserva) {
    const exito = await prueba9ObtenerReserva(reserva);
    resultados.push({ nombre: 'Obtener reserva', exito });
  }

  // Prueba 10: Listar reservas
  const exitoListar = await prueba10ListarReservas();
  resultados.push({ nombre: 'Listar reservas', exito: exitoListar });

  // Resumen
  log('');
  log('========================================');
  log('RESUMEN DE PRUEBAS');
  log('========================================');
  
  const exitosas = resultados.filter((r) => r.exito).length;
  const fallidas = resultados.filter((r) => !r.exito).length;
  
  for (const r of resultados) {
    const icono = r.exito ? '✅' : '❌';
    log(`${icono} ${r.nombre}`);
  }
  
  log('');
  log(`Total: ${resultados.length} | Exitosas: ${exitosas} | Fallidas: ${fallidas}`);
  log('========================================');
}

// ============================================================================
// EJECUCIÓN
// ============================================================================
ejecutarPruebas().catch((error) => {
  logError('Error fatal en pruebas', error);
  process.exit(1);
});
