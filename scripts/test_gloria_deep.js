const base = 'https://ms-catalog.yellowsky-d7d7b363.brazilsouth.azurecontainerapps.io/api/v3';

async function testGloriaReserva() {
  const atrId = '1bb26d24-f79d-4833-b9da-a35b8d5ef44d';
  console.log('Testing Gloria reserva with ID:', atrId);

  // Check GET /atracciones/:id
  const resItem = await fetch(`${base}/atracciones/${atrId}`, {
    headers: { 'x-correlation-id': 'corr-123' }
  });
  console.log('GET /atracciones/:id ->', resItem.status);
  const itemData = await resItem.json();
  console.log('Item Data:', JSON.stringify(itemData).slice(0, 300));

  // Try different payloads on /atracciones/reservas
  const payloads = [
    { atraccion_id: atrId, fecha: '2026-11-15', hora: '10:00:00', cupos: 1, usuario: { email: 'test@puce.edu.ec' } },
    { atraccion_id: atrId, date: '2026-11-15', time: '10:00:00', quantity: 1, customer: { email: 'test@puce.edu.ec' } },
    { attraction_id: atrId, date: '2026-11-15', time: '10:00:00', adult_count: 1 },
    { id: atrId, fecha: '2026-11-15' },
    {}
  ];

  for (let i = 0; i < payloads.length; i++) {
    const res = await fetch(`${base}/atracciones/reservas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': 'corr-' + Date.now()
      },
      body: JSON.stringify(payloads[i])
    });
    const text = await res.text();
    console.log(`Payload #${i} -> ${res.status}: ${text}`);
  }
}

testGloriaReserva().catch(console.error);
