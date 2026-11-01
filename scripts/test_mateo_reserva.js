const crypto = require('crypto');

const base = 'https://maneja-de-una-autos-api.azurewebsites.net/api/v3';
const apiKey = 'Irsuf7pF+8E89Lrmo6w2no/uTODQDhm2k5EFXTF0jq0=';

async function testMateoReserva() {
  const vehicleId = '10000000-0000-4000-8000-000000000125';
  const idempotencyKey = crypto.randomUUID();

  const body = {
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

  const endpoints = [
    '/autos/orders/create',
    '/autos/orders',
    '/autos/reservas',
    '/reservas',
    '/orders/create'
  ];

  for (const ep of endpoints) {
    const res = await fetch(`${base}${ep}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'Idempotency-Key': idempotencyKey,
        'X-Correlation-Id': 'corr-' + Date.now()
      },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    console.log(ep, '->', res.status, text.slice(0, 300));
  }
}

testMateoReserva().catch(console.error);
