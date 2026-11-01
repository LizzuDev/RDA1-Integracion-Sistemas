const https = require('https');
const crypto = require('crypto');

const reservationId = '5a310ca6-a3a3-474d-80be-2a36f317ea17';
const url = `https://descubre-gateway.livelymoss-5ea81cc6.chilecentral.azurecontainerapps.io/api/v3/reservas/${reservationId}/cancel`;
const apiKey = '40f8a31375e24536bf1dd8f48dd48a94c7187e498b5df568';
const idempotencyKey = crypto.randomUUID();

const payload = {
  reason: 'Prueba de compensación Saga desde Booking Prototipo',
};

const data = JSON.stringify(payload);

const req = https.request(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'Idempotency-Key': idempotencyKey,
    'X-Correlation-Id': crypto.randomUUID(),
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', body);
  });
});

req.on('error', console.error);
req.write(data);
req.end();
