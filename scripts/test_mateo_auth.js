const crypto = require('crypto');

const base = 'https://maneja-de-una-autos-api.azurewebsites.net/api/v3';
const apiKey = 'Irsuf7pF+8E89Lrmo6w2no/uTODQDhm2k5EFXTF0jq0=';

async function testAuthVariations() {
  const vehicleId = '10000000-0000-4000-8000-000000000125';
  const idempotencyKey = crypto.randomUUID();

  const body = {
    vehicle_id: vehicleId,
    pickup_date: '2026-11-15',
    dropoff_date: '2026-11-18',
    pickup_location: 'UIO',
    dropoff_location: 'UIO',
    dias: 3,
    driver: {
      full_name: 'Paúl Rosero',
      email: 'paul.rosero@puce.edu.ec',
      phone: '+593991234567',
      license_number: 'LIC-1710034065',
      age: 28
    }
  };

  const headersList = [
    { 'X-API-Key': apiKey },
    { 'x-api-key': apiKey },
    { 'Authorization': `Bearer ${apiKey}` },
    { 'Authorization': `ApiKey ${apiKey}` },
    { 'Authorization': apiKey },
    { 'api-key': apiKey },
    { 'X-Auth-Key': apiKey },
    { 'X-Partner-Key': apiKey },
    { 'X-API-Key': apiKey, 'Authorization': `Bearer ${apiKey}` }
  ];

  for (let i = 0; i < headersList.length; i++) {
    const h = {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'X-Correlation-Id': 'corr-' + Date.now(),
      ...headersList[i]
    };

    const res = await fetch(`${base}/autos/orders/create`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify(body)
    });
    const text = await res.text();
    console.log(`Variation #${i}:`, Object.keys(headersList[i]), '->', res.status, text.slice(0, 180));
  }
}

testAuthVariations();
