const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PROTO_PATH = path.resolve(__dirname, '../src/proto/inventory.proto');
const GRPC_SERVER = 'localhost:50051';
const HTTP_BASE = 'http://localhost:3000';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function runGrpcTest() {
  console.log('=== TEST FASE 2: SERVIDOR gRPC INBOUND (INVENTORY STOCK SERVICE) ===\n');

  console.log('1. Cargando definición Protocol Buffers desde:', PROTO_PATH);
  if (!fs.existsSync(PROTO_PATH)) {
    throw new Error(`Archivo proto no encontrado en: ${PROTO_PATH}`);
  }

  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
  const inventoryProto = protoDescriptor.inventory;

  const client = new inventoryProto.InventoryStockService(
    GRPC_SERVER,
    grpc.credentials.createInsecure()
  );

  console.log('2. Conectando al socket gRPC en:', GRPC_SERVER);

  // Test 1: PushStockUpdate
  console.log('\n3. Ejecutando RPC unaria: PushStockUpdate...');
  const pushPayload = {
    service_id: 'atracciones-dilan',
    item_id: 'PRhu4UBTWPBC',
    date: '2026-10-25',
    time_slot: '10:00',
    available_units: 18,
    timestamp: Date.now(),
  };

  const pushAck = await new Promise((resolve, reject) => {
    client.PushStockUpdate(pushPayload, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });

  console.log('   Respuesta recibida:', pushAck);
  if (!pushAck.success) throw new Error('PushStockUpdate no retornó success: true');
  console.log('   ✅ RPC PushStockUpdate ejecutada con éxito.');

  // Test 2: StreamInventoryChanges
  console.log('\n4. Ejecutando RPC con streaming del cliente: StreamInventoryChanges...');
  const streamSummary = await new Promise((resolve, reject) => {
    const call = client.StreamInventoryChanges((err, response) => {
      if (err) return reject(err);
      resolve(response);
    });

    const events = [
      {
        event_id: 'evt-delta-001',
        service_id: 'atracciones-dilan',
        item_id: 'PRhu4UBTWPBC',
        date: '2026-10-25',
        time_slot: '10:00',
        delta: -3,
        timestamp: Date.now(),
      },
      {
        event_id: 'evt-delta-002',
        service_id: 'atracciones-dilan',
        item_id: 'PRhu4UBTWPBC',
        date: '2026-10-25',
        time_slot: '10:00',
        delta: 2,
        timestamp: Date.now(),
      },
      {
        event_id: 'evt-delta-003',
        service_id: 'autos-store-partner',
        item_id: 'AUTO-SUV-001',
        date: '2026-10-25',
        time_slot: 'DEFAULT',
        delta: -1,
        timestamp: Date.now(),
      }
    ];

    for (const evt of events) {
      console.log(`   -> Enviando stream event: ${evt.event_id} (delta: ${evt.delta} sobre ${evt.item_id})`);
      call.write(evt);
    }
    call.end();
  });

  console.log('   Resumen de streaming recibido:', streamSummary);
  if (!streamSummary.is_synchronized || streamSummary.total_events_processed !== 3) {
    throw new Error('StreamInventoryChanges no procesó los 3 eventos esperados');
  }
  console.log('   ✅ RPC StreamInventoryChanges ejecutada con éxito.');

  // Test 3: HTTP REST Observability (Verificar no regresión en HTTP/1.1 y ver el inventario)
  console.log('\n5. Verificando observabilidad REST (GET /api/v2/inventory/status)...');
  const statusRes = await httpGet(`${HTTP_BASE}/api/v2/inventory/status`);
  console.log('   HTTP Status:', statusRes.status);
  console.log('   Payload:', statusRes.data);
  if (statusRes.status !== 200 || statusRes.data.status !== 'OPERATIONAL') {
    throw new Error('Endpoint /api/v2/inventory/status no retornó OPERATIONAL');
  }

  console.log('\n6. Consultando inventario sincronizado (GET /api/v2/inventory)...');
  const invRes = await httpGet(`${HTTP_BASE}/api/v2/inventory`);
  console.log('   Total de ítems sincronizados:', invRes.data.total);
  console.log('   Ítems:', invRes.data.data);
  const updatedItem = invRes.data.data.find(i => i.item_id === 'PRhu4UBTWPBC');
  // Recordemos: inicial 18 (push) - 3 + 2 = 17 cupos
  if (!updatedItem || updatedItem.available_units !== 17) {
    throw new Error(`Stock esperado 17 para PRhu4UBTWPBC, pero se obtuvo: ${updatedItem ? updatedItem.available_units : 'no encontrado'}`);
  }
  console.log(`   ✅ Stock calculado correctamente tras deltas en stream: ${updatedItem.available_units} cupos.`);

  // Test 4: Verificación de NO REGRESIÓN en endpoints existentes
  console.log('\n7. Verificando NO REGRESIÓN en endpoints existentes...');
  const atraccionesRes = await httpGet(`${HTTP_BASE}/api/v2/atracciones`);
  console.log(`   GET /api/v2/atracciones -> HTTP ${atraccionesRes.status} (Total: ${Array.isArray(atraccionesRes.data) ? atraccionesRes.data.length : (atraccionesRes.data.data ? atraccionesRes.data.data.length : 'OK')})`);
  if (atraccionesRes.status !== 200) {
    throw new Error('Fallo de regresión: /api/v2/atracciones retornó status ' + atraccionesRes.status);
  }

  const alojamientosRes = await httpGet(`${HTTP_BASE}/api/v2/alojamientos`);
  console.log(`   GET /api/v2/alojamientos -> HTTP ${alojamientosRes.status} (Alojamientos listados: ${alojamientosRes.data ? (alojamientosRes.data.data ? alojamientosRes.data.data.length : alojamientosRes.data.length) : 'OK'})`);
  if (alojamientosRes.status !== 200) {
    throw new Error('Fallo de regresión: /api/v2/alojamientos retornó status ' + alojamientosRes.status);
  }

  const autosOrdersRes = await httpGet(`${HTTP_BASE}/api/v2/autos/orders`);
  console.log(`   GET /api/v2/autos/orders -> HTTP ${autosOrdersRes.status} (Historial de órdenes de autos operativo)`);
  if (autosOrdersRes.status !== 200) {
    throw new Error('Fallo de regresión: /api/v2/autos/orders retornó status ' + autosOrdersRes.status);
  }

  // Test 5: Auditoría Física Winston
  console.log('\n8. Verificando logs físicos de auditoría en disco...');
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.resolve(process.cwd(), 'logs', `audit-${today}.log`);
  if (!fs.existsSync(logFile)) throw new Error('Archivo físico de log no encontrado en ' + logFile);

  const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
  const grpcEvents = lines.map(l => {
    try { return JSON.parse(l); } catch (e) { return null; }
  }).filter(e => e && (e.event === 'GRPC_STOCK_UPDATE_RECEIVED' || e.event === 'GRPC_STOCK_DELTA_STREAMED'));

  console.log(`   Total de eventos gRPC auditados físicamente en disco: ${grpcEvents.length}`);
  if (grpcEvents.length < 4) {
    throw new Error(`Se esperaban al menos 4 eventos gRPC en el log de auditoría físico, encontrados: ${grpcEvents.length}`);
  }
  console.log('   Último evento auditado:', JSON.stringify(grpcEvents[grpcEvents.length - 1]));

  client.close();
  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA FASE 2 HAN PASADO SATISFACTORIAMENTE SIN NINGUNA REGRESIÓN!');
}

runGrpcTest().catch(err => {
  console.error('\n❌ ERROR EN PRUEBA gRPC:', err);
  process.exit(1);
});
