async function testGloriaFullReserva() {
  const url = 'https://ms-catalog.yellowsky-d7d7b363.brazilsouth.azurecontainerapps.io/api/v3/atracciones/reservas';

  let body = {
    atraccion_id: 1,
    fecha: '2026-11-15',
    personas: 2,
    cliente_nombre: 'Paúl Rosero',
    cliente_email: 'paul.rosero@puce.edu.ec',
    cliente_telefono: '+593991234567',
    cliente_documento: '1710034065'
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-correlation-id': 'corr-' + Date.now()
    },
    body: JSON.stringify(body)
  });

  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}

testGloriaFullReserva();
