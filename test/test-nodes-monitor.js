const http = require('http');
const fs = require('fs');
const path = require('path');

const HTTP_BASE = 'http://localhost:3000';
const ADMIN_HEADER = {
  'Content-Type': 'application/json',
  'x-admin-key': 'admin-secret',
};

function request(method, pathUrl, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, HTTP_BASE);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: ADMIN_HEADER,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  console.log('=== TEST FASE 3: MONITOR DE NODOS Y KILL-SWITCHES (ADMIN) ===\n');

  // 1. Consultar estado inicial de los nodos del ecosistema
  console.log('1. Consultando estado inicial de la red (GET /api/v2/admin/nodes/health)...');
  const initialHealth = await request('GET', '/api/v2/admin/nodes/health');
  console.log('   HTTP Status:', initialHealth.status);
  console.log('   Resumen:', initialHealth.data.summary);
  if (initialHealth.status !== 200) {
    throw new Error(`Error al consultar salud de nodos: status ${initialHealth.status}`);
  }

  const nodes = initialHealth.data.nodes;
  console.log(`   Nodos registrados (${nodes.length}):`);
  nodes.forEach(n => {
    console.log(`   - [${n.status}] ${n.nombre} (${n.vertical}) | Latencia: ${n.latency}ms | CB: ${n.circuitBreaker} | Switch: ${n.enabled ? 'ON' : 'OFF'}`);
  });

  if (nodes.length < 5) {
    throw new Error(`Se esperaban al menos 5 nodos registrados, encontrados: ${nodes.length}`);
  }
  console.log('   ✅ Monitor de nodos operativo con información de latencia y protocolos.');

  // 2. Probar Kill-Switch: Desconectar nodo de Atracciones
  console.log('\n2. Conmutando Kill-Switch para DESCONECTAR Atracciones (POST /api/v2/admin/nodes/atracciones/toggle)...');
  const toggleOff = await request('POST', '/api/v2/admin/nodes/atracciones/toggle', { enabled: false });
  console.log('   HTTP Status:', toggleOff.status);
  console.log('   Mensaje:', toggleOff.data.message);
  console.log('   Nodo:', toggleOff.data.node.id, '| Enabled:', toggleOff.data.node.enabled, '| Status:', toggleOff.data.node.status, '| CB:', toggleOff.data.node.circuitBreaker);

  if (!toggleOff.data.success || toggleOff.data.node.enabled !== false || toggleOff.data.node.status !== 'DISABLED') {
    throw new Error('Fallo al apagar nodo con Kill-Switch.');
  }
  console.log('   ✅ Kill-Switch desconectó exitosamente el conector externo.');

  // 3. Probar Ping hacia nodo
  console.log('\n3. Ejecutando ping directo hacia nodo (POST /api/v2/admin/nodes/grpc_inventory/ping)...');
  const pingRes = await request('POST', '/api/v2/admin/nodes/grpc_inventory/ping');
  console.log('   Ping Status:', pingRes.status);
  console.log('   Resultado Ping:', pingRes.data.node.nombre, '| Latencia:', pingRes.data.node.latency, 'ms | Estado:', pingRes.data.node.status);
  if (!pingRes.data.success || pingRes.data.node.status !== 'ONLINE') {
    throw new Error('Ping hacia socket gRPC Inbound falló.');
  }
  console.log('   ✅ Ping de red ejecutado exitosamente.');

  // 4. Reconectar nodo de Atracciones
  console.log('\n4. Reconectando nodo de Atracciones (POST /api/v2/admin/nodes/atracciones/toggle)...');
  const toggleOn = await request('POST', '/api/v2/admin/nodes/atracciones/toggle', { enabled: true });
  console.log('   HTTP Status:', toggleOn.status);
  console.log('   Mensaje:', toggleOn.data.message);
  console.log('   Nodo:', toggleOn.data.node.id, '| Enabled:', toggleOn.data.node.enabled, '| Status:', toggleOn.data.node.status, '| CB:', toggleOn.data.node.circuitBreaker);

  if (!toggleOn.data.success || toggleOn.data.node.enabled !== true || toggleOn.data.node.status !== 'ONLINE') {
    throw new Error('Fallo al reactivar nodo con Kill-Switch.');
  }
  console.log('   ✅ Conector reconectado al ecosistema.');

  // 5. Verificar persistencia física en disco (Winston)
  console.log('\n5. Verificando logs físicos de auditoría en disco...');
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.resolve(process.cwd(), 'logs', `audit-${today}.log`);
  if (!fs.existsSync(logFile)) throw new Error('Archivo físico de log no encontrado en ' + logFile);

  const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
  const switchEvents = lines.map(l => {
    try { return JSON.parse(l); } catch (e) { return null; }
  }).filter(e => e && e.event === 'NODE_KILL_SWITCH_TOGGLED');

  console.log(`   Total de eventos de conmutación de switches en disco: ${switchEvents.length}`);
  if (switchEvents.length < 2) {
    throw new Error('No se encontraron los eventos de switch en el log físico de auditoría.');
  }
  console.log('   Último evento auditado:', JSON.stringify(switchEvents[switchEvents.length - 1]));

  // 6. Verificación de NO REGRESIÓN en endpoints existentes
  console.log('\n6. Verificando NO REGRESIÓN en endpoints existentes...');
  const atraccionesRes = await request('GET', '/api/v2/atracciones');
  console.log(`   GET /api/v2/atracciones  -> HTTP ${atraccionesRes.status}`);
  if (atraccionesRes.status !== 200) throw new Error('Fallo de regresión en atracciones');

  const alojamientosRes = await request('GET', '/api/v2/alojamientos');
  console.log(`   GET /api/v2/alojamientos -> HTTP ${alojamientosRes.status}`);
  if (alojamientosRes.status !== 200) throw new Error('Fallo de regresión en alojamientos');

  const autosOrdersRes = await request('GET', '/api/v2/autos/orders');
  console.log(`   GET /api/v2/autos/orders -> HTTP ${autosOrdersRes.status}`);
  if (autosOrdersRes.status !== 200) throw new Error('Fallo de regresión en autos/orders');

  const invRes = await request('GET', '/api/v2/inventory/status');
  console.log(`   GET /api/v2/inventory/status -> HTTP ${invRes.status}`);
  if (invRes.status !== 200) throw new Error('Fallo de regresión en inventory/status');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA FASE 3 HAN PASADO SATISFACTORIAMENTE SIN NINGUNA REGRESIÓN!');
}

runTest().catch(err => {
  console.error('\n❌ ERROR EN PRUEBA FASE 3:', err.message);
  process.exit(1);
});
