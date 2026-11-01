const crypto = require('crypto');

async function testMateo() {
  console.log('==============================================');
  console.log('--- RE-EVALUACIÓN MATEO (NODE_AUT_MDU) ---');
  console.log('==============================================');
  const base = 'https://maneja-de-una-autos-api.azurewebsites.net/api/v3';
  const apiKey = 'Irsuf7pF+8E89Lrmo6w2no/uTODQDhm2k5EFXTF0jq0=';
  const vehicleId = '10000000-0000-4000-8000-000000000118';

  // 1. Health
  console.log('1. Healthcheck...');
  const resHealth = await fetch(`${base}/health`);
  console.log('GET /health ->', resHealth.status);
  console.log(await resHealth.json());

  // 2. Promociones Contrato
  console.log('\n2. Promociones Contrato con X-API-Key...');
  const resPromo = await fetch(`${base}/autos/promociones/contrato`, {
    headers: { 'X-API-Key': apiKey, 'X-Correlation-Id': 'corr-promo-' + Date.now() }
  });
  console.log('GET /autos/promociones/contrato ->', resPromo.status);
  console.log(await resPromo.text());

  // 3. Crear Reserva
  console.log(`\n3. Crear Reserva para vehículo ${vehicleId}...`);
  const idempotencyKey = crypto.randomUUID();
  const createPayload = {
    vehicle_id: vehicleId,
    pickup_date: '2026-11-15',
    dropoff_date: '2026-11-18',
    pickup_location: 'UIO',
    dropoff_location: 'UIO',
    dias: 3,
    tipo_cobertura: 'BASICA',
    driver: {
      full_name: 'Paúl Rosero',
      email: 'paul.rosero@puce.edu.ec',
      phone: '+593991234567',
      license_number: 'LIC-1710034065',
      age: 28,
      document_id: '1710034065'
    },
    conductor: {
      full_name: 'Paúl Rosero',
      email: 'paul.rosero@puce.edu.ec',
      phone: '+593991234567',
      license_number: 'LIC-1710034065',
      age: 28
    }
  };

  const resOrder = await fetch(`${base}/autos/orders/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'Idempotency-Key': idempotencyKey,
      'X-Correlation-Id': 'corr-order-' + Date.now()
    },
    body: JSON.stringify(createPayload)
  });
  console.log('POST /autos/orders/create ->', resOrder.status);
  const orderDataText = await resOrder.text();
  console.log('Order Response:', orderDataText);

  let orderData = {};
  try {
    orderData = JSON.parse(orderDataText);
  } catch (e) {}

  const orderId = orderData.order_id || orderData.orderId || orderData.reserva_id || orderData.id || orderData.codigo_reserva;

  // 4. Cancelar Reserva
  if (orderId) {
    console.log(`\n4. Cancelando orden ${orderId}...`);
    const cancelUrls = [
      `${base}/autos/orders/${orderId}/cancel`,
      `${base}/autos/reservas/${orderId}/cancel`
    ];
    for (const cUrl of cancelUrls) {
      const resCancel = await fetch(cUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'X-Correlation-Id': 'corr-cancel-' + Date.now()
        },
        body: JSON.stringify({ motivo: 'Prueba de integración Booking Central' })
      });
      console.log(`POST ${cUrl} ->`, resCancel.status);
      console.log(await resCancel.text());
      if (resCancel.status === 200) break;
    }
  }
}

async function testGloria() {
  console.log('\n==============================================');
  console.log('--- RE-EVALUACIÓN GLORIA (NODE_ATR_GLORIA) ---');
  console.log('==============================================');
  const base = 'https://ms-catalog.yellowsky-d7d7b363.brazilsouth.azurecontainerapps.io/api/v3';
  const atrId = '1bb26d24-f79d-4833-b9da-a35b8d5ef44d';

  // 1. Health raíz
  console.log('1. Healthcheck raíz GET /health...');
  const resHealth = await fetch(`${base}/health`);
  console.log('GET /health ->', resHealth.status);
  console.log(await resHealth.text());

  // 2. Disponibilidad
  console.log(`\n2. Disponibilidad para ${atrId}...`);
  const resDisp = await fetch(`${base}/atracciones/${atrId}/disponibilidad?fecha=2026-11-15&personas=2`, {
    headers: { 'x-correlation-id': 'corr-disp-' + Date.now() }
  });
  console.log(`GET /atracciones/${atrId}/disponibilidad ->`, resDisp.status);
  console.log(await resDisp.text());

  // 3. Crear Reserva con UUID
  console.log('\n3. Crear Reserva con UUID...');
  const reservaPayload = {
    atraccion_id: atrId,
    fecha: '2026-11-15',
    hora: '10:00',
    personas: 2,
    cliente_nombre: 'Paúl Rosero',
    cliente_email: 'paul.rosero@puce.edu.ec',
    cliente_telefono: '+593991234567',
    cliente_documento: '1710034065'
  };

  const resReserva = await fetch(`${base}/atracciones/reservas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-correlation-id': 'corr-reserva-' + Date.now()
    },
    body: JSON.stringify(reservaPayload)
  });
  console.log('POST /atracciones/reservas ->', resReserva.status);
  const reservaText = await resReserva.text();
  console.log('Reserva Response:', reservaText);

  let reservaData = {};
  try {
    reservaData = JSON.parse(reservaText);
  } catch (e) {}

  const reservaId = reservaData.reserva_id || reservaData.id;

  // 4. Cancelar Reserva
  if (reservaId) {
    console.log(`\n4. Cancelando reserva ${reservaId}...`);
    const resCancel = await fetch(`${base}/atracciones/reservas/${reservaId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': 'corr-cancel-' + Date.now()
      },
      body: JSON.stringify({ motivo: 'Prueba de integración Booking Central' })
    });
    console.log(`POST /atracciones/reservas/${reservaId}/cancel ->`, resCancel.status);
    console.log(await resCancel.text());
  }
}

async function main() {
  await testMateo();
  await testGloria();
}

main().catch(console.error);
