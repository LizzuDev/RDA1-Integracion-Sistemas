const { WinstonPhysicalLoggerService } = require('../dist/core/logger/winston-logger.service');
const { AtraccionesService } = require('../dist/modules/atracciones/atracciones.service');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('=== TEST FASE 1: SAGAS, COMPENSACIONES Y REVERSOS ===\n');

  // Mocks para simular repositorios TypeORM y adaptadores
  const mockReservas = new Map();
  const mockReservaRepo = {
    findOne: async (opts) => mockReservas.get(opts?.where?.id) || null,
    findOneBy: async ({ id }) => mockReservas.get(id) || null,
    find: async () => Array.from(mockReservas.values()),
    save: async (reserva) => {
      mockReservas.set(reserva.id, reserva);
      return reserva;
    },
    create: (dto) => ({ id: dto.id || 'res-test-1', ...dto })
  };

  const mockTurnos = new Map();
  mockTurnos.set('turno-777', { id: 'turno-777', cuposDisponibles: 10, estado: 'DISPONIBLE' });
  const mockTurnoRepo = {
    findOne: async (opts) => mockTurnos.get(opts?.where?.id) || null,
    save: async (turno) => {
      mockTurnos.set(turno.id, turno);
      return turno;
    },
    create: (dto) => dto,
  };

  const mockAtraccionRepo = {
    findOneBy: async () => ({ id: 'PRhu4UBTWPBC', name: 'Tour Centro Histórico' }),
    find: async () => []
  };

  const mockCategoriaRepo = {
    find: async () => []
  };

  const mockResenaRepo = {
    find: async () => [],
    create: (d) => d,
    save: async (d) => d
  };

  const mockOutboxRepo = {
    save: async (e) => e
  };

  const mockDataSource = {};

  const mockHttp = {
    get: () => ({ pipe: () => ({ toPromise: async () => ({ data: [] }) }) }),
    post: () => ({ pipe: () => ({ toPromise: async () => ({ data: { status: 'CANCELLED_EXTERNAL_OK' } }) }) })
  };

  const mockPagoService = {
    procesarPago: async () => ({ status: 'APPROVED' })
  };

  const mockSoapWrapper = {
    translateToSoap: async () => '<xml></xml>',
    sendSimulatedSoapRequest: async () => ({ status: 'SUCCESS' })
  };

  const mockDilanAdapter = {
    getDisponibilidad: async () => [{ time: '10:00 a.m.', cupos: 8, estado: 'DISPONIBLE' }],
    crearReserva: async () => ({ codigo_reserva: 'DEC-9821' }),
    cancelarReserva: async (id, reason) => ({
      status: 'CANCELLED_DILAN_OK',
      released_stock: 2,
      reservation_id: id,
      provider_message: 'Cupos reincorporados a disponibilidad en SistemaAtracciones'
    })
  };

  const winstonLogger = new WinstonPhysicalLoggerService();

  const service = new AtraccionesService(
    mockHttp,
    mockPagoService,
    mockSoapWrapper,
    mockDilanAdapter,
    winstonLogger,
    mockDataSource,
    mockAtraccionRepo,
    mockCategoriaRepo,
    mockTurnoRepo,
    mockReservaRepo,
    mockResenaRepo,
    mockOutboxRepo
  );

  // Pre-cargar una reserva confirmada
  const reservaInicial = {
    id: 'RES-SAGA-ATR-777',
    ticketCount: 3,
    totalAmount: 165.00,
    totalPrice: { currency: 'USD', total: 165.00 },
    customerName: 'Carlos Mendoza',
    customerEmail: 'carlos.mendoza@email.com',
    date: '2026-10-25',
    time: '10:30',
    status: 'CONFIRMED',
    atraccionId: 'PRhu4UBTWPBC',
    turnoId: 'turno-777',
  };
  mockReservas.set(reservaInicial.id, reservaInicial);

  console.log('1. Reserva inicial en sistema:');
  console.log('   ID:', reservaInicial.id);
  console.log('   Estado inicial:', reservaInicial.status);
  console.log('   Tickets ocupados:', reservaInicial.ticketCount);
  console.log('   Total pagado: USD', reservaInicial.totalAmount);

  console.log('\n2. Ejecutando cancelarReserva() [Saga Compensatoria]...');
  const cancelResult = await service.cancelarReserva(
    reservaInicial.id,
    { reason: 'Cancelación solicitada por imprevisto de viaje' },
    'idem-cancel-key-999',
    'corr-saga-test-001'
  );

  console.log('\n3. Respuesta de Cancelación Recibida:');
  console.log('   Nuevo Estado:', cancelResult.status);
  console.log('   Código Cancelación:', cancelResult.cancel_code);
  console.log('   Reembolso Emitido:', cancelResult.refund);

  // Aserciones
  if (cancelResult.status !== 'CANCELLED') throw new Error('Falló: El estado no cambió a CANCELLED');
  if (cancelResult.refund?.status !== 'PROCESSED') throw new Error('Falló: El reembolso no fue procesado');
  if (cancelResult.refund?.amount !== 165.00) throw new Error('Falló: El monto reembolsado no coincide con el 100%');
  if (mockTurnos.get('turno-777').cuposDisponibles !== 13) throw new Error('Falló: Cupos en Turno no fueron restituidos (+3)');

  console.log('\n4. Verificando Idempotencia (segunda llamada):');
  const resIdempotente = await service.cancelarReserva(
    reservaInicial.id,
    { reason: 'Llamada duplicada' },
    'idem-cancel-key-999',
    'corr-saga-test-001'
  );
  console.log('   Mensaje Idempotente:', resIdempotente.message);
  if (resIdempotente.status !== 'CANCELLED') throw new Error('Falló: Idempotencia no detectada');

  console.log('\n5. Verificando Persistencia en Archivo Físico Winston (logs/audit-YYYY-MM-DD.log)...');
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.resolve(process.cwd(), 'logs', `audit-${today}.log`);
  if (!fs.existsSync(logFile)) throw new Error('No se generó el archivo físico en ' + logFile);

  const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
  const cancelEvents = lines.map(l => {
    try { return JSON.parse(l); } catch(e) { return null; }
  }).filter(e => e && e.event === 'RESERVA_ATRACCION_CANCELADA_COMPENSADA');

  console.log(`   Total de eventos de compensación en disco: ${cancelEvents.length}`);
  const lastEvent = cancelEvents[cancelEvents.length - 1];
  console.log('   Último evento auditado:', JSON.stringify(lastEvent, null, 2));

  if (!lastEvent || lastEvent.payload.monto_reembolsado !== 165.00) {
    throw new Error('El evento de log físico no coincide con el payload esperado');
  }

  console.log('\n✅ ¡TODAS LAS ASIGNACIONES DE LA FASE 1 HAN SIDO VERIFICADAS EXITOSAMENTE!');
}

runTest().catch(err => {
  console.error('\n❌ ERROR EN VALIDACIÓN:', err.message);
  process.exit(1);
});
