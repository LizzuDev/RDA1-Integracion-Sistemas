const https = require('https');

const BASE_URL = 'https://alisson-atracciones-api.azurewebsites.net/api/v3';
const API_KEY = 'atr-f575172d62a81d51e87fbc0a37952d984ce1c078';
const RESERVATION_ID = 'e0c19b7e-6e94-4ed4-a321-95698cfa0d37';

function cancelReserva(id) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/atracciones/reservas/${id}/cancel`);
    const body = JSON.stringify({
      motivo: 'Prueba de integración compensación Saga Booking Central',
      correlation_id: 'corr-cancel-' + Date.now()
    });

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': API_KEY,
        'X-Correlation-Id': 'corr-cancel-' + Date.now()
      }
    }, (res) => {
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
    req.write(body);
    req.end();
  });
}

cancelReserva(RESERVATION_ID)
  .then(res => {
    console.log('Status Cancelación:', res.status);
    console.log('Data:', JSON.stringify(res.data || res.raw, null, 2));
  })
  .catch(console.error);
