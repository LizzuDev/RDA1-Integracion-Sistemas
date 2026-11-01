const https = require('https');
const http = require('http');
const crypto = require('crypto');

function requestUrl(rawUrl, options = {}, body = null) {
  return new Promise((resolve) => {
    try {
      const url = new URL(rawUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const reqOptions = {
        method: options.method || 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BookingCentral-IntegrationTester/3.0',
          'X-Correlation-Id': 'corr-test-' + Date.now(),
          ...(options.headers || {})
        },
        timeout: 10000
      };

      if (body) {
        if (!reqOptions.headers['Content-Type']) {
          reqOptions.headers['Content-Type'] = 'application/json';
        }
      }

      const req = client.request(url, reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch (e) {}
          resolve({
            ok: true,
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'TIMEOUT (10s)' });
      });

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });

      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });
}

async function testGloria() {
  console.log('\n==================================================');
  console.log('--- TEST 1: GLORIA CHUSHIG (NODE_ATR_GLORIA) ---');
  console.log('==================================================');
  const base = 'https://ms-catalog.yellowsky-d7d7b363.brazilsouth.azurecontainerapps.io/api/v3';

  // 1. Health
  console.log('1. Health check: /atracciones/health');
  let res = await requestUrl(`${base}/atracciones/health`);
  console.log('Status /atracciones/health:', res.status, res.error || '', JSON.stringify(res.data).slice(0, 300));

  res = await requestUrl(`${base}/health`);
  console.log('Status /health:', res.status, res.error || '', JSON.stringify(res.data).slice(0, 300));

  // 2. Catálogo
  console.log('2. Catálogo: GET /atracciones?page=1&limit=10');
  res = await requestUrl(`${base}/atracciones?page=1&limit=10`);
  console.log('Status /atracciones:', res.status, res.error || '');
  let sampleItem = null;
  if (res.ok && res.status === 200) {
    const items = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
    console.log(`Atracciones encontradas: ${items.length}`);
    if (items.length > 0) {
      sampleItem = items[0];
      console.log('Item muestra:', {
        id: sampleItem.id,
        nombre: sampleItem.nombre || sampleItem.name,
        precio: sampleItem.precio || sampleItem.precio_base || sampleItem.price
      });
    }
  } else {
    console.log('Respuesta catálogo:', JSON.stringify(res.data || res.error).slice(0, 300));
  }

  // 3. Search
  console.log('3. Búsqueda: POST /atracciones/search');
  res = await requestUrl(`${base}/atracciones/search`, { method: 'POST' }, { ciudad: 'Quito', limite: 5 });
  console.log('Status /atracciones/search:', res.status, JSON.stringify(res.data).slice(0, 300));

  // 4. Disponibilidad
  if (sampleItem && sampleItem.id) {
    console.log(`4. Disponibilidad: GET /atracciones/${sampleItem.id}/disponibilidad?fecha=2026-11-15`);
    res = await requestUrl(`${base}/atracciones/${sampleItem.id}/disponibilidad?fecha=2026-11-15`);
    console.log('Status disponibilidad:', res.status, JSON.stringify(res.data).slice(0, 300));
  }

  // 5. Reservas
  console.log('5. Reserva: POST /reservas');
  const payloadReserva = {
    idempotency_key: crypto.randomUUID(),
    atraccion_id: sampleItem?.id || 'atr-sample-01',
    slot_id: 'slot-20261115-0900',
    date: '2026-11-15',
    fecha: '2026-11-15',
    time: '09:00:00',
    adult_count: 1,
    customer: {
      full_name: 'Paúl Rosero',
      email: 'paul.rosero@puce.edu.ec',
      phone: '+593991234567',
      document_type: 'CEDULA',
      document_id: '1710034065'
    },
    payment_method: { method: 'CREDIT_CARD' }
  };
  res = await requestUrl(`${base}/reservas`, { method: 'POST' }, payloadReserva);
  console.log('Status /reservas:', res.status, JSON.stringify(res.data).slice(0, 300));
  if (res.status === 404) {
    res = await requestUrl(`${base}/atracciones/reservas`, { method: 'POST' }, payloadReserva);
    console.log('Status /atracciones/reservas:', res.status, JSON.stringify(res.data).slice(0, 300));
  }
}

async function testMateo() {
  console.log('\n==================================================');
  console.log('--- TEST 2: MATEO MORALES (NODE_AUT_MDU) ---');
  console.log('==================================================');
  const base = 'https://maneja-de-una-autos-api.azurewebsites.net/api/v3';
  const apiKey = 'Irsuf7pF+8E89Lrmo6w2no/uTODQDhm2k5EFXTF0jq0=';
  const headers = { 'X-API-Key': apiKey };

  // 1. Health
  console.log('1. Health check: GET /health');
  let res = await requestUrl(`${base}/health`, { headers });
  console.log('Status /health:', res.status, res.error || '', JSON.stringify(res.data).slice(0, 300));

  // 2. Catálogo
  console.log('2. Catálogo: GET /autos');
  res = await requestUrl(`${base}/autos`, { headers });
  console.log('Status /autos:', res.status, res.error || '');
  let sampleAuto = null;
  if (res.ok && res.status === 200) {
    const items = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
    console.log(`Vehículos encontrados: ${items.length}`);
    if (items.length > 0) {
      sampleAuto = items[0];
      console.log('Auto muestra:', {
        id: sampleAuto.id || sampleAuto.auto_id,
        marca: sampleAuto.marca || sampleAuto.brand,
        modelo: sampleAuto.modelo || sampleAuto.model,
        precio_diario: sampleAuto.precio_por_dia || sampleAuto.precio_diario || sampleAuto.daily_rate
      });
    }
  } else {
    console.log('Respuesta catálogo:', JSON.stringify(res.data || res.error).slice(0, 300));
  }

  // 3. Search
  console.log('3. Búsqueda: POST /autos/search');
  res = await requestUrl(`${base}/autos/search`, { method: 'POST', headers }, {
    ciudad_retiro: 'Quito',
    fecha_inicio: '2026-11-15T10:00:00Z',
    fecha_fin: '2026-11-18T10:00:00Z'
  });
  console.log('Status /autos/search:', res.status, JSON.stringify(res.data).slice(0, 300));

  // 4. Reserva
  console.log('4. Reserva: POST /reservas');
  const autoId = sampleAuto?.id || sampleAuto?.auto_id || 'MDU-AUTO-01';
  const payloadReserva = {
    idempotency_key: crypto.randomUUID(),
    auto_id: autoId,
    fecha_inicio: '2026-11-15T10:00:00Z',
    fecha_fin: '2026-11-18T10:00:00Z',
    lugar_retiro: 'Aeropuerto Tababela (Quito)',
    lugar_devolucion: 'Aeropuerto Tababela (Quito)',
    conductor: {
      nombre: 'Paúl',
      apellido: 'Rosero',
      email: 'paul.rosero@puce.edu.ec',
      telefono: '+593991234567',
      documento_identidad: '1710034065',
      licencia_conducir: 'LIC-1710034065'
    },
    payment_method: { method: 'CREDIT_CARD' }
  };
  res = await requestUrl(`${base}/reservas`, { method: 'POST', headers }, payloadReserva);
  console.log('Status /reservas:', res.status, JSON.stringify(res.data).slice(0, 300));
  if (res.status === 404) {
    res = await requestUrl(`${base}/autos/reservas`, { method: 'POST', headers }, payloadReserva);
    console.log('Status /autos/reservas:', res.status, JSON.stringify(res.data).slice(0, 300));
  }

  let reservaId = res.data?.reserva_id || res.data?.id || res.data?.reservation_id || res.data?.data?.reserva_id;
  if (reservaId) {
    console.log(`5. Cancelar reserva: POST /reservas/${reservaId}/cancel`);
    let resCancel = await requestUrl(`${base}/reservas/${reservaId}/cancel`, { method: 'POST', headers }, {
      motivo: 'Prueba de integración Booking Central'
    });
    console.log('Status cancelación:', resCancel.status, JSON.stringify(resCancel.data).slice(0, 300));
    if (resCancel.status === 404) {
      resCancel = await requestUrl(`${base}/autos/reservas/${reservaId}/cancel`, { method: 'POST', headers }, {
        motivo: 'Prueba de integración Booking Central'
      });
      console.log('Status cancelación /autos/reservas/.../cancel:', resCancel.status, JSON.stringify(resCancel.data).slice(0, 300));
    }
  }
}

async function testMichael() {
  console.log('\n==================================================');
  console.log('--- TEST 3: MICHAEL MOLINA (NODE_ATR_MOLINA) ---');
  console.log('==================================================');
  const base = 'https://tourgirls-gateway-mm.azurewebsites.net/api/v3';
  const apiKey = 'Bw_Y7_TsbB7DcETwoa-mw6xSunT_rP5nHf_ZitpfB2w';
  const headers = { 'X-API-Key': apiKey };

  // 1. Health
  console.log('1. Health check: /atracciones/health');
  let res = await requestUrl(`${base}/atracciones/health`, { headers });
  console.log('Status /atracciones/health:', res.status, res.error || '', JSON.stringify(res.data).slice(0, 300));

  res = await requestUrl(`${base}/health`, { headers });
  console.log('Status /health:', res.status, res.error || '', JSON.stringify(res.data).slice(0, 300));

  // 2. Catálogo
  console.log('2. Catálogo: GET /atracciones?page=1&limit=10');
  res = await requestUrl(`${base}/atracciones?page=1&limit=10`, { headers });
  console.log('Status /atracciones:', res.status, res.error || '');
  let sampleItem = null;
  if (res.ok && res.status === 200) {
    const items = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
    console.log(`Atracciones encontradas: ${items.length}`);
    if (items.length > 0) {
      sampleItem = items[0];
      console.log('Item muestra:', {
        id: sampleItem.id,
        nombre: sampleItem.nombre || sampleItem.name,
        precio: sampleItem.precio || sampleItem.precio_base || sampleItem.price
      });
    }
  } else {
    console.log('Respuesta catálogo:', JSON.stringify(res.data || res.error).slice(0, 300));
  }

  // 3. Search
  console.log('3. Búsqueda: POST /atracciones/search');
  res = await requestUrl(`${base}/atracciones/search`, { method: 'POST', headers }, { ciudad: 'Quito', limite: 5 });
  console.log('Status /atracciones/search:', res.status, JSON.stringify(res.data).slice(0, 300));

  // 4. Disponibilidad
  if (sampleItem && sampleItem.id) {
    console.log(`4. Disponibilidad: GET /atracciones/${sampleItem.id}/disponibilidad?fecha=2026-11-15`);
    res = await requestUrl(`${base}/atracciones/${sampleItem.id}/disponibilidad?fecha=2026-11-15`, { headers });
    console.log('Status disponibilidad:', res.status, JSON.stringify(res.data).slice(0, 300));
  }

  // 5. Reservas
  console.log('5. Reserva: POST /reservas');
  const payloadReserva = {
    idempotency_key: crypto.randomUUID(),
    atraccion_id: sampleItem?.id || 'atr-sample-01',
    slot_id: 'slot-20261115-0900',
    date: '2026-11-15',
    fecha: '2026-11-15',
    time: '09:00:00',
    adult_count: 1,
    customer: {
      full_name: 'Paúl Rosero',
      email: 'paul.rosero@puce.edu.ec',
      phone: '+593991234567',
      document_type: 'CEDULA',
      document_id: '1710034065'
    },
    payment_method: { method: 'CREDIT_CARD' }
  };
  res = await requestUrl(`${base}/reservas`, { method: 'POST', headers }, payloadReserva);
  console.log('Status /reservas:', res.status, JSON.stringify(res.data).slice(0, 300));
  if (res.status === 404) {
    res = await requestUrl(`${base}/atracciones/reservas`, { method: 'POST', headers }, payloadReserva);
    console.log('Status /atracciones/reservas:', res.status, JSON.stringify(res.data).slice(0, 300));
  }
}

async function main() {
  await testGloria();
  await testMateo();
  await testMichael();
}

main().catch(console.error);
