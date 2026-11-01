const base = 'https://maneja-de-una-autos-api.azurewebsites.net/api/v3';
const apiKey = 'Irsuf7pF+8E89Lrmo6w2no/uTODQDhm2k5EFXTF0jq0=';

async function testMateoSearch() {
  const payloads = [
    { ciudad: 'Quito' },
    { ciudad_retiro: 'Quito' },
    { location: 'Quito' },
    { city: 'Quito' },
    { fecha_inicio: '2026-11-15', fecha_fin: '2026-11-18' },
    { start_date: '2026-11-15', end_date: '2026-11-18' },
    { pickup_city: 'Quito' },
    { ciudad_retiro: 'Quito', fecha_inicio: '2026-11-15', fecha_fin: '2026-11-18' },
    { ciudad: 'Quito', fecha_inicio: '2026-11-15', fecha_fin: '2026-11-18' },
    { search: 'Quito' },
    {}
  ];

  for (let i = 0; i < payloads.length; i++) {
    const res = await fetch(`${base}/autos/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'x-correlation-id': 'corr-' + Date.now()
      },
      body: JSON.stringify(payloads[i])
    });
    const text = await res.text();
    console.log(`Payload #${i}`, JSON.stringify(payloads[i]), '->', res.status, text.slice(0, 200));
  }
}

testMateoSearch().catch(console.error);
