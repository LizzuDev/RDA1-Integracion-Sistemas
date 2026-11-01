const base = 'https://ms-catalog.yellowsky-d7d7b363.brazilsouth.azurecontainerapps.io/api/v3';

async function testTypes() {
  const tests = [
    { atraccion_id: 1 },
    { atraccion_id: '1' },
    { atraccion_id: 101 },
    { atraccion_id: '1bb26d24-f79d-4833-b9da-a35b8d5ef44d' },
    { atraccion_id: 'mitad-del-mundo-quito' },
    { atraccion_id: 'PRhu4UBTWPBC' },
    { atraccionId: '1bb26d24-f79d-4833-b9da-a35b8d5ef44d' },
    { atraccion_id: null },
    { atraccion_id: '' }
  ];

  for (const t of tests) {
    const res = await fetch(`${base}/atracciones/reservas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': 'corr-' + Date.now()
      },
      body: JSON.stringify(t)
    });
    const text = await res.text();
    console.log(JSON.stringify(t), '->', res.status, text.slice(0, 150));
  }
}

testTypes();
