const https = require('https');
const crypto = require('crypto');

const url = 'https://descubre-gateway.livelymoss-5ea81cc6.chilecentral.azurecontainerapps.io/api/v3/reservas';
const apiKey = '40f8a31375e24536bf1dd8f48dd48a94c7187e498b5df568';
const idempotencyKey = crypto.randomUUID();

const payload = {
  atraccion_id: '4fcd5948-9325-4833-9eae-feaafe9c0e41',
  fecha: '2026-11-05',
  slot_id: 'slot-20261105-0730',
  hora: '07:30 a.m.',
  adult_count: 1,
  payment_method: 'SOA_BOOKING_GATEWAY',
  customer: {
    full_name: 'Paul Rosero',
    email: 'paul.rosero@epn.edu.ec',
    phone: '0991234567',
    document_id: '1710034065' // Cédula ecuatoriana válida con módulo 10
  }
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
