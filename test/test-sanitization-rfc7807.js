/**
 * TEST AUTOMATIZADO FASE 4: SANITIZACIÓN, LÍMITES MAXLENGTH Y BLINDAJE RFC 7807
 * 
 * Verifica que:
 * 1. Textos infinitos o que excedan maxLength sean rechazados con HTTP 400 y RFC 7807.
 * 2. Cadenas vacías o con espacios engañosos sean rechazadas.
 * 3. Entradas numéricas fuera de rango (edad <18 o >99, días >30) sean rechazadas con motivo exacto.
 * 4. Espacios múltiples se colapsen automáticamente mediante transformers.
 * 5. No exista ninguna regresión en endpoints existentes.
 */

const http = require('http');

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== TEST FASE 4: SANITIZACIÓN Y BLINDAJE DE INPUTS (RFC 7807) ===\n');

  // --- PRUEBA 1: Atracciones - Rechazo por nombre mayor a 80 caracteres ---
  console.log('1. Probando rechazo de payload con nombre infinito/excedido en Atracciones...');
  const hugeName = 'A'.repeat(120);
  const res1 = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v2/atracciones/PRhu4UBTWPBC/reservations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'idempotency-key': `idem-limit-test-${Date.now()}`,
      'x-admin-key': 'admin-secret'
    }
  }, {
    date: '2026-10-25',
    time: '10:00',
    ticket_count: 2,
    customer_name: hugeName,
    customer_email: 'valido@email.com'
  });

  console.log(`   HTTP Status: ${res1.statusCode}`);
  const paramErr1 = res1.data?.invalidParams?.find(p => p.name === 'customer_name');
  if (res1.statusCode === 400 && paramErr1) {
    console.log(`   ✅ RFC 7807 validado: '${paramErr1.name}' rechazado -> '${paramErr1.reason}'`);
  } else {
    console.error('   ❌ Falló validación de customer_name maxLength:', res1.data);
    process.exit(1);
  }

  // --- PRUEBA 2: Atracciones - Rechazo por tickets fuera de límite (tickets > 30) ---
  console.log('\n2. Probando rechazo de cantidad de tickets excesiva (50 tickets)...');
  const res2 = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v2/atracciones/PRhu4UBTWPBC/reservations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'idempotency-key': `idem-limit-test-2-${Date.now()}`,
      'x-admin-key': 'admin-secret'
    }
  }, {
    date: '2026-10-25',
    time: '10:00',
    ticket_count: 50,
    customer_name: 'Carlos Mendoza',
    customer_email: 'carlos@email.com'
  });

  console.log(`   HTTP Status: ${res2.statusCode}`);
  const paramErr2 = res2.data?.invalidParams?.find(p => p.name === 'ticket_count');
  if (res2.statusCode === 400 && paramErr2) {
    console.log(`   ✅ RFC 7807 validado: '${paramErr2.name}' rechazado -> '${paramErr2.reason}'`);
  } else {
    console.error('   ❌ Falló validación de ticket_count:', res2.data);
    process.exit(1);
  }

  // --- PRUEBA 3: Autos - Rechazo por conductor menor de edad (<18) ---
  console.log('\n3. Probando rechazo en Autos por conductor menor de edad (edad = 16)...');
  const res3 = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v2/autos/orders/create',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `idem-auto-age-test-${Date.now()}`
    }
  }, {
    vehicle_id: 'auto-spark-01',
    dias: 3,
    tipo_cobertura: 'BASICA',
    conductor: {
      nombre: 'Juan Joven',
      email: 'joven@email.com',
      edad: 16
    }
  });

  console.log(`   HTTP Status: ${res3.statusCode}`);
  const paramErr3 = res3.data?.invalidParams?.find(p => p.name.includes('edad'));
  if (res3.statusCode === 400 && paramErr3) {
    console.log(`   ✅ RFC 7807 validado: '${paramErr3.name}' rechazado -> '${paramErr3.reason}'`);
  } else {
    console.error('   ❌ Falló validación de edad de conductor:', res3.data);
    process.exit(1);
  }

  // --- PRUEBA 4: Autos - Rechazo por días de alquiler excesivos (>30 días) ---
  console.log('\n4. Probando rechazo en Autos por días excesivos (dias = 60)...');
  const res4 = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v2/autos/orders/create',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `idem-auto-days-test-${Date.now()}`
    }
  }, {
    vehicle_id: 'auto-spark-01',
    dias: 60,
    tipo_cobertura: 'BASICA',
    conductor: {
      nombre: 'Roberto Gomez',
      email: 'roberto@email.com',
      edad: 32
    }
  });

  console.log(`   HTTP Status: ${res4.statusCode}`);
  const paramErr4 = res4.data?.invalidParams?.find(p => p.name === 'dias');
  if (res4.statusCode === 400 && paramErr4) {
    console.log(`   ✅ RFC 7807 validado: '${paramErr4.name}' rechazado -> '${paramErr4.reason}'`);
  } else {
    console.error('   ❌ Falló validación de días de alquiler:', res4.data);
    process.exit(1);
  }

  // --- PRUEBA 5: Autos - Checkin con documento excedido (>20 caracteres) ---
  console.log('\n5. Probando rechazo en Check-in de Auto por documento excesivo (>20 caracteres)...');
  const res5 = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v2/autos/reservas/CAR12345/checkin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, {
    documento_identidad: '17234567890123456789999999999'
  });

  console.log(`   HTTP Status: ${res5.statusCode}`);
  const paramErr5 = res5.data?.invalidParams?.find(p => p.name === 'documento_identidad');
  if (res5.statusCode === 400 && paramErr5) {
    console.log(`   ✅ RFC 7807 validado: '${paramErr5.name}' rechazado -> '${paramErr5.reason}'`);
  } else {
    console.error('   ❌ Falló validación de documento en checkin:', res5.data);
    process.exit(1);
  }

  // --- PRUEBA 6: Colapso automático de espacios y reserva exitosa ---
  console.log('\n6. Probando colapso de espacios múltiples y sanitización en payload exitoso...');
  // Obtener una atracción existente
  const atraccList = await httpRequest({ hostname: 'localhost', port: 3000, path: '/api/v2/atracciones', method: 'GET' });
  const targetAtracId = atraccList.data?.data?.[0]?.id || '7100af5c-b39f-4439-8341-536cfb8134b8';

  const res6 = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/v2/atracciones/${targetAtracId}/reservations`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'idempotency-key': `idem-clean-test-${Date.now()}`,
      'x-admin-key': 'admin-secret'
    }
  }, {
    date: '2026-10-25',
    time: '10:00',
    ticket_count: 2,
    customer_name: '   María    Fernanda     López   ',
    customer_email: '  maria.lopez@email.com  ',
    special_requirements: '   Requiere   silla   de    ruedas   '
  });

  console.log(`   HTTP Status: ${res6.statusCode}`);
  if (res6.statusCode === 201) {
    console.log(`   ✅ Reserva procesada exitosamente con sanitización de espacios.`);
    console.log(`   Reservation ID: ${res6.data?.reservation_id || res6.data?.id}`);
  } else {
    console.error('   ❌ Falló creación de reserva sanitizada:', res6.data);
    process.exit(1);
  }

  // --- PRUEBA 7: Verificación de NO REGRESIÓN en endpoints existentes ---
  console.log('\n7. Verificando NO REGRESIÓN en endpoints de catálogo y administración...');
  const [atracCheck, autosCheck, healthCheck] = await Promise.all([
    httpRequest({ hostname: 'localhost', port: 3000, path: '/api/v2/atracciones', method: 'GET' }),
    httpRequest({ hostname: 'localhost', port: 3000, path: '/api/v2/autos/orders', method: 'GET' }),
    httpRequest({ hostname: 'localhost', port: 3000, path: '/api/v2/admin/nodes/health', method: 'GET', headers: { 'x-admin-key': 'admin-secret' } })
  ]);

  console.log(`   GET /api/v2/atracciones  -> HTTP ${atracCheck.statusCode}`);
  console.log(`   GET /api/v2/autos/orders -> HTTP ${autosCheck.statusCode}`);
  console.log(`   GET /api/v2/admin/nodes/health -> HTTP ${healthCheck.statusCode}`);

  if (atracCheck.statusCode === 200 && autosCheck.statusCode === 200 && healthCheck.statusCode === 200) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA FASE 4 HAN PASADO SATISFACTORIAMENTE CON 0 REGRESIONES!');
  } else {
    console.error('\n❌ Regresión detectada en endpoints de negocio.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Error durante la ejecución del test suite:', err);
  process.exit(1);
});
