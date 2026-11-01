const crypto = require('crypto');

const base = 'https://tourgirls-gateway-mm.azurewebsites.net/api/v3';
const apiKey = 'Bw_Y7_TsbB7DcETwoa-mw6xSunT_rP5nHf_ZitpfB2w';

async function testMichaelDeep() {
  console.log('Testing Michael catalog with different filters or pages...');
  const resCat = await fetch(`${base}/atracciones?limit=100`, {
    headers: { 'X-API-Key': apiKey, 'x-correlation-id': 'corr-cat' }
  });
  console.log('Catálogo limit=100 status:', resCat.status);
  const catData = await resCat.json();
  console.log('Catálogo Data:', JSON.stringify(catData).slice(0, 300));

  // Check /atracciones/categorias or /atracciones/categorias/arbol
  const resCatArbol = await fetch(`${base}/atracciones/categorias/arbol`, {
    headers: { 'X-API-Key': apiKey, 'x-correlation-id': 'corr-arbol' }
  });
  console.log('/categorias/arbol status:', resCatArbol.status);
  if (resCatArbol.status === 200) {
    console.log('Arbol:', JSON.stringify(await resCatArbol.json()).slice(0, 300));
  }

  // Check /atracciones/promociones/contrato
  const resPromo = await fetch(`${base}/atracciones/promociones/contrato`, {
    headers: { 'X-API-Key': apiKey, 'x-correlation-id': 'corr-promo' }
  });
  console.log('/promociones/contrato status:', resPromo.status);

  // Test reservation with Idempotency-Key header
  const idempotencyKey = crypto.randomUUID();
  const resReserva = await fetch(`${base}/atracciones/reservas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'Idempotency-Key': idempotencyKey,
      'x-correlation-id': 'corr-reserva'
    },
    body: JSON.stringify({
      atraccion_id: 'PRhu4UBTWPBC',
      slot_id: 'slot-20261115-0900',
      date: '2026-11-15',
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
    })
  });
  console.log('Reserva status with Idempotency-Key:', resReserva.status);
  console.log('Reserva response:', await resReserva.text());
}

testMichaelDeep().catch(console.error);
