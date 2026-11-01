const https = require('https');
const crypto = require('crypto');

const BASE_URL = 'https://alisson-atracciones-api.azurewebsites.net/api/v3';
const API_KEY = 'atr-f575172d62a81d51e87fbc0a37952d984ce1c078';

function request(method, path, body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const headers = {
      'Accept': 'application/json',
      'X-API-Key': API_KEY,
      'X-Correlation-Id': 'corr-audit-' + Date.now(),
      ...extraHeaders
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const req = https.request(url, {
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function auditAlisson() {
  console.log('=== INICIANDO AUDITORÍA INTEGRACIÓN ALISSON BASANTES (NODE_ATR_ALISSON) ===');
  console.log(`URL Base: ${BASE_URL}\n`);

  // 1. Health General
  console.log('1. Probando GET /health...');
  try {
    const t0 = Date.now();
    const resHealth = await request('GET', '/health');
    const latencia = Date.now() - t0;
    console.log(`Status: ${resHealth.statusCode} (${latencia} ms)`);
    console.log('Respuesta:', JSON.stringify(resHealth.data, null, 2));
  } catch (err) {
    console.error('Error en /health:', err.message);
  }

  // 2. Health Microservicios
  console.log('\n2. Probando GET /ms/health...');
  try {
    const resMs = await request('GET', '/ms/health');
    console.log(`Status: ${resMs.statusCode}`);
    console.log('Respuesta:', JSON.stringify(resMs.data, null, 2));
  } catch (err) {
    console.error('Error en /ms/health:', err.message);
  }

  // 3. Catálogo de Atracciones
  console.log('\n3. Probando GET /atracciones?page=1&limit=20...');
  let sampleItem = null;
  try {
    const resCat = await request('GET', '/atracciones?page=1&limit=20');
    console.log(`Status: ${resCat.statusCode}`);
    const items = resCat.data?.data || resCat.data || [];
    console.log(`Atracciones encontradas: ${Array.isArray(items) ? items.length : 'Formato inesperado'}`);
    if (Array.isArray(items) && items.length > 0) {
      sampleItem = items[0];
      console.log('Muestra de atracción:', {
        id: sampleItem.id,
        nombre: sampleItem.nombre || sampleItem.name,
        ciudad: sampleItem.ciudad || sampleItem.city,
        precio: sampleItem.precio || sampleItem.precio_base || sampleItem.price
      });
    } else {
      console.log('Respuesta raw:', resCat.data);
    }
  } catch (err) {
    console.error('Error en /atracciones:', err.message);
  }

  // 4. Búsqueda
  console.log('\n4. Probando POST /atracciones/search...');
  try {
    const resSearch = await request('POST', '/atracciones/search', {
      ciudad: 'Quito',
      limite: 5
    });
    console.log(`Status: ${resSearch.statusCode}`);
    console.log('Resultados búsqueda:', typeof resSearch.data === 'object' ? Object.keys(resSearch.data) : resSearch.data);
  } catch (err) {
    console.error('Error en /atracciones/search:', err.message);
  }

  // 5. Disponibilidad
  if (sampleItem && sampleItem.id) {
    console.log(`\n5. Probando disponibilidad para item ${sampleItem.id}...`);
    try {
      const resDisp = await request('GET', `/atracciones/${sampleItem.id}/disponibilidad?fecha=2026-11-15`);
      console.log(`Status: ${resDisp.statusCode}`);
      console.log('Disponibilidad:', JSON.stringify(resDisp.data, null, 2));
    } catch (err) {
      console.error('Error en disponibilidad:', err.message);
    }
  }

  // 6. Probar reserva
  console.log('\n6. Probando creación de reserva POST /reservas...');
  let createdReservaId = null;
  const idempotencyKey = crypto.randomUUID();
  const testPayload = {
    idempotency_key: idempotencyKey,
    atraccion_id: sampleItem ? sampleItem.id : 'PRhu4UBTWPBC',
    slot_id: 'slot-20261115-0900',
    time: '09:00:00',
    date: '2026-11-15',
    fecha: '2026-11-15',
    adult_count: 1,
    child_count: 0,
    customer: {
      full_name: 'Paúl Rosero',
      email: 'paul.rosero@puce.edu.ec',
      phone: '+593991234567',
      document_type: 'CEDULA',
      document_id: '1710034065'
    },
    payment_method: {
      method: 'CREDIT_CARD'
    }
  };

  try {
    let resReserva = await request('POST', '/reservas', testPayload, {
      'Idempotency-Key': idempotencyKey
    });
    console.log(`Status en /reservas: ${resReserva.statusCode}`);
    console.log('Respuesta reserva:', JSON.stringify(resReserva.data, null, 2));
    
    // Si da 404, intentar en /atracciones/reservas
    if (resReserva.statusCode === 404) {
      console.log('Intentando en /atracciones/reservas...');
      resReserva = await request('POST', '/atracciones/reservas', testPayload, {
        'Idempotency-Key': idempotencyKey
      });
      console.log(`Status en /atracciones/reservas: ${resReserva.statusCode}`);
      console.log('Respuesta reserva:', JSON.stringify(resReserva.data, null, 2));
    }

    if (resReserva.statusCode === 200 || resReserva.statusCode === 201) {
      createdReservaId = resReserva.data?.reserva_id || resReserva.data?.id || resReserva.data?.data?.id || resReserva.data?.codigo_reserva;
    }
  } catch (err) {
    console.error('Error en /reservas:', err.message);
  }

  // 7. Probar cancelación / reembolso
  if (createdReservaId) {
    console.log(`\n7. Probando cancelación de reserva ${createdReservaId}...`);
    try {
      let resCancel = await request('POST', `/reservas/${createdReservaId}/cancel`, {
        motivo: 'Prueba de integración automatizada Booking Central',
        correlation_id: 'corr-cancel-' + Date.now()
      });
      console.log(`Status cancelación /reservas/${createdReservaId}/cancel: ${resCancel.statusCode}`);
      console.log('Respuesta cancelación:', JSON.stringify(resCancel.data, null, 2));

      if (resCancel.statusCode === 404) {
        resCancel = await request('POST', `/atracciones/reservas/${createdReservaId}/cancel`, {
          motivo: 'Prueba de integración automatizada Booking Central',
          correlation_id: 'corr-cancel-' + Date.now()
        });
        console.log(`Status cancelación /atracciones/reservas/${createdReservaId}/cancel: ${resCancel.statusCode}`);
        console.log('Respuesta cancelación:', JSON.stringify(resCancel.data, null, 2));
      }
    } catch (err) {
      console.error('Error en cancelación:', err.message);
    }
  }

  console.log('\n=== AUDITORÍA FINALIZADA ===');
}

auditAlisson().catch(console.error);
