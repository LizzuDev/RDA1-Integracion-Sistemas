const base = 'https://maneja-de-una-autos-api.azurewebsites.net/api/v3';
const apiKey = 'Irsuf7pF+8E89Lrmo6w2no/uTODQDhm2k5EFXTF0jq0=';
const crypto = require('crypto');
const vehicleId = '10000000-0000-4000-8000-000000000118';

async function testPayloads() {
  const payloads = [
    // Payload A: con auto_id y fechas v2
    {
      auto_id: vehicleId,
      vehicle_id: vehicleId,
      dias: 2,
      tipo_cobertura: 'TOTAL',
      pickup_date: '2026-11-20',
      dropoff_date: '2026-11-22',
      conductor: {
        nombre: 'Paúl Rosero',
        full_name: 'Paúl Rosero',
        email: 'paul.rosero@puce.edu.ec',
        telefono: '+593991234567',
        phone: '+593991234567',
        numero_licencia: 'LIC-1710034065',
        license_number: 'LIC-1710034065',
        edad: 28,
        age: 28
      }
    },
    // Payload B: con fecha_inicio / fecha_fin
    {
      auto_id: vehicleId,
      vehicle_id: vehicleId,
      fecha_inicio: '2026-11-20T10:00:00Z',
      fecha_fin: '2026-11-22T10:00:00Z',
      tipo_cobertura: 'TOTAL',
      conductor: {
        nombre: 'Paúl Rosero',
        email: 'paul.rosero@puce.edu.ec',
        telefono: '+593991234567',
        licencia: 'LIC-1710034065',
        edad: 28
      }
    },
    // Payload C: con CreateAutoOrderDto tradicional
    {
      autoId: vehicleId,
      auto_id: vehicleId,
      vehicle_id: vehicleId,
      dias: 2,
      tipoCobertura: 'TOTAL',
      tipo_cobertura: 'TOTAL',
      conductor: {
        nombre: 'Paúl Rosero',
        email: 'paul.rosero@puce.edu.ec',
        telefono: '+593991234567',
        licencia: 'LIC-1710034065'
      }
    }
  ];

  for (let i = 0; i < payloads.length; i++) {
    for (const ep of ['/autos/orders/create', '/autos/reservas']) {
      const res = await fetch(base + ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Idempotency-Key': crypto.randomUUID(),
          'X-Correlation-Id': 'corr-test-' + Date.now()
        },
        body: JSON.stringify(payloads[i])
      });
      console.log(`Payload #${i} on ${ep} ->`, res.status);
      const text = await res.text();
      console.log('   Response:', text.slice(0, 200));
    }
  }
}

testPayloads();
