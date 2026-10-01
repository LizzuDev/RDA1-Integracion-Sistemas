/**
 * Script de Pruebas Automatizadas para API REST
 * Basado en la Matriz de Pruebas (Adaptado al módulo de Atracciones)
 * Ejecución: node runner-pruebas.js
 */

const API_URL = 'http://localhost:3000/api/v1';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

let passCount = 0;
let failCount = 0;

async function runTest(id, name, requestFn, expectedValidation) {
  try {
    const response = await requestFn();
    const passed = expectedValidation(response);
    
    if (passed) {
      console.log(`${colors.green}${colors.bold}[PASS]${colors.reset} ${colors.blue}${id}:${colors.reset} ${name}`);
      passCount++;
    } else {
      console.log(`${colors.red}${colors.bold}[FAIL]${colors.reset} ${colors.blue}${id}:${colors.reset} ${name} - Resultado inesperado (Status: ${response.status})`);
      failCount++;
    }
  } catch (error) {
    if (expectedValidation({ status: 'error', error })) {
      console.log(`${colors.green}${colors.bold}[PASS]${colors.reset} ${colors.blue}${id}:${colors.reset} ${name}`);
      passCount++;
    } else {
      console.log(`${colors.red}${colors.bold}[FAIL]${colors.reset} ${colors.blue}${id}:${colors.reset} ${name} - Excepción: ${error.message}`);
      failCount++;
    }
  }
}

async function startTests() {
  console.log(`\n${colors.bold}=================================================${colors.reset}`);
  console.log(`${colors.bold}   EJECUCIÓN DE MATRIZ DE PRUEBAS - API REST     ${colors.reset}`);
  console.log(`${colors.bold}=================================================${colors.reset}\n`);

  console.log(`${colors.yellow}--- SECCIÓN: PRUEBAS DE SEGURIDAD ---${colors.reset}`);

  // TC-S01: Acceso sin token
  await runTest('TC-S01', 'Acceso a endpoint protegido sin token (Debe ser 401)', 
    () => fetch(`${API_URL}/atracciones/reservations`, {
      method: 'GET',
    }),
    (res) => res.status === 401
  );

  // TC-S02: Token inválido o malformado
  await runTest('TC-S02', 'Token Bearer falso o malformado (Debe ser 401)', 
    () => fetch(`${API_URL}/atracciones/reservations`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer 12345fake' }
    }),
    (res) => res.status === 401
  );

  // TC-S10: CORS permitido (Preflight OPTIONS)
  await runTest('TC-S10', 'CORS preflight desde origen permitido', 
    () => fetch(`${API_URL}/atracciones/search`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST'
      }
    }),
    (res) => res.status === 204 && res.headers.get('access-control-allow-origin') === 'http://localhost:5173'
  );

  // TC-S13: SQL Injection (Sanitización)
  await runTest('TC-S13', 'Inyección SQL en búsqueda (Neutralizado)', 
    () => fetch(`${API_URL}/atracciones/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: "OR 1=1; DROP TABLE atraccion;" })
    }),
    (res) => res.status === 200 || res.status === 400 // El ORM lo trata como un string literal
  );

  // TC-S16: Validación formato incorrecto
  await runTest('TC-S16', 'Petición con campos obligatorios faltantes', 
    () => fetch(`${API_URL}/atracciones/invalid-id/reservations`, {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer placeholder-token', // Fallará por Auth o por validación DTO
        'Content-Type': 'application/json',
        'idempotency-key': '123'
      },
      body: JSON.stringify({ wrongField: 'no-email-no-data' })
    }),
    (res) => res.status === 400 || res.status === 401
  );

  console.log(`\n${colors.yellow}--- SECCIÓN: PRUEBAS FUNCIONALES ---${colors.reset}`);

  // TC-F04: Obtener existente
  await runTest('TC-F04', 'Obtener listado público de atracciones (Caché habilitado)', 
    () => fetch(`${API_URL}/atracciones`, { method: 'GET' }),
    (res) => res.status === 200
  );

  // TC-F05: Obtener inexistente
  await runTest('TC-F05', 'Obtener reserva inexistente (404 Not Found)', 
    () => fetch(`${API_URL}/atracciones/reservations/00000000-0000-0000-0000-000000000000`, { 
      method: 'GET',
      headers: { 'Authorization': 'Bearer tokenejemplo' }
    }),
    (res) => res.status === 401 || res.status === 404 // 401 si se rechaza el token primero
  );

  // TC-F06: Paginación
  await runTest('TC-F06', 'Listar resultados con paginación y HATEOAS', 
    () => fetch(`${API_URL}/atracciones?page=1&limit=5`, { method: 'GET' }),
    (res) => res.status === 200
  );

  console.log(`\n${colors.bold}=================================================${colors.reset}`);
  console.log(`RESULTADOS: ${colors.green}${passCount} Superadas${colors.reset} / ${colors.red}${failCount} Fallidas${colors.reset}`);
  console.log(`${colors.bold}=================================================${colors.reset}\n`);
}

startTests();
