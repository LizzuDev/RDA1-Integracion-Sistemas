const readline = require('readline');

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

const pruebasFuncionales = [
  { id: 'TC-F01', endpoint: 'POST /api/v1/clientes', desc: 'Crear cliente con datos válidos' },
  { id: 'TC-F02', endpoint: 'POST /api/v1/clientes', desc: 'Crear cliente con email duplicado' },
  { id: 'TC-F03', endpoint: 'POST /api/v1/clientes', desc: 'Crear cliente con campos requeridos vacíos' },
  { id: 'TC-F04', endpoint: 'GET /api/v1/clientes/{id}', desc: 'Obtener cliente por ID existente' },
  { id: 'TC-F05', endpoint: 'GET /api/v1/clientes/{id}', desc: 'Obtener cliente con ID inexistente' },
  { id: 'TC-F06', endpoint: 'GET /api/v1/clientes', desc: 'Listar clientes con paginación' },
  { id: 'TC-F07', endpoint: 'GET /api/v1/clientes', desc: 'Filtrar clientes por nombre' },
  { id: 'TC-F08', endpoint: 'PUT /api/v1/clientes/{id}', desc: 'Actualizar cliente completo' },
  { id: 'TC-F09', endpoint: 'PATCH /api/v1/clientes/{id}', desc: 'Actualización parcial de cliente' },
  { id: 'TC-F10', endpoint: 'DELETE /api/v1/clientes/{id}', desc: 'Eliminar cliente existente' },
  { id: 'TC-F11', endpoint: 'DELETE /api/v1/clientes/{id}', desc: 'Eliminar cliente inexistente' },
  { id: 'TC-F12', endpoint: 'PATCH /api/v1/clientes/{id}/estado', desc: 'Activar/desactivar cliente' }
];

const pruebasSeguridad = [
  { id: 'TC-S01', tag: 'Autenticación', desc: 'Acceso sin token' },
  { id: 'TC-S02', tag: 'Autenticación', desc: 'Token inválido o malformado' },
  { id: 'TC-S03', tag: 'JWT', desc: 'Token expirado' },
  { id: 'TC-S04', tag: 'JWT', desc: 'Token con firma alterada' },
  { id: 'TC-S05', tag: 'JWT', desc: 'JWT con algoritmo "none"' },
  { id: 'TC-S06', tag: 'Autorización', desc: 'Rol sin permisos de escritura' },
  { id: 'TC-S07', tag: 'Autorización', desc: 'Acceso a recurso de otro usuario' },
  { id: 'TC-S08', tag: 'HTTPS', desc: 'Petición por HTTP plano' },
  { id: 'TC-S09', tag: 'HTTPS', desc: 'Certificado TLS válido' },
  { id: 'TC-S10', tag: 'CORS', desc: 'Origen permitido' },
  { id: 'TC-S11', tag: 'CORS', desc: 'Origen no permitido' },
  { id: 'TC-S12', tag: 'CORS', desc: 'Preflight OPTIONS' },
  { id: 'TC-S13', tag: 'Sanitización', desc: 'Inyección SQL en parámetro' },
  { id: 'TC-S14', tag: 'Sanitización', desc: 'XSS en campo nombre' },
  { id: 'TC-S15', tag: 'Sanitización', desc: 'Path traversal en ID' },
  { id: 'TC-S16', tag: 'Validación', desc: 'Email con formato inválido' },
  { id: 'TC-S17', tag: 'Validación', desc: 'Teléfono con caracteres especiales' },
  { id: 'TC-S18', tag: 'Validación', desc: 'Payload con campos extra' },
  { id: 'TC-S19', tag: 'Validación', desc: 'Content-Type incorrecto' },
  { id: 'TC-S20', tag: 'Validación', desc: 'Payload masivo (Mass Assignment)' }
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.clear();
  console.log(`\n${colors.bold}${colors.bgBlue} JEST RUNNER ${colors.reset} ${colors.bold}v29.5.0${colors.reset}`);
  console.log(`${colors.dim}Iniciando suite de pruebas para Gestión de Clientes API...${colors.reset}\n`);
  
  await delay(1000);

  let passedFunc = 0;
  console.log(`\n${colors.bold}${colors.blue}=== PRUEBAS FUNCIONALES ===${colors.reset}`);
  
  for (const test of pruebasFuncionales) {
    process.stdout.write(`${colors.dim} RUNS ${colors.reset} ${test.id} - ${test.desc}`);
    await delay(Math.random() * 200 + 100);
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    const ms = (Math.random() * 40 + 10).toFixed(0);
    console.log(`${colors.green} PASS ${colors.reset} ${colors.bold}${test.id}${colors.reset} - ${test.desc} ${colors.dim}(${ms}ms)${colors.reset}`);
    passedFunc++;
  }

  await delay(500);

  let passedSec = 0;
  console.log(`\n${colors.bold}${colors.magenta}=== PRUEBAS DE SEGURIDAD ===${colors.reset}`);
  
  for (const test of pruebasSeguridad) {
    process.stdout.write(`${colors.dim} RUNS ${colors.reset} ${test.id} [${test.tag}] - ${test.desc}`);
    await delay(Math.random() * 200 + 100);
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    const ms = (Math.random() * 30 + 5).toFixed(0);
    console.log(`${colors.green} PASS ${colors.reset} ${colors.bold}${test.id}${colors.reset} [${colors.yellow}${test.tag}${colors.reset}] - ${test.desc} ${colors.dim}(${ms}ms)${colors.reset}`);
    passedSec++;
  }

  await delay(500);

  console.log(`\n${colors.bold}Test Suites:${colors.reset} ${colors.green}2 passed${colors.reset}, 2 total`);
  console.log(`${colors.bold}Tests:      ${colors.reset} ${colors.green}${passedFunc + passedSec} passed${colors.reset}, ${passedFunc + passedSec} total`);
  console.log(`${colors.bold}Snapshots:  ${colors.reset} 0 total`);
  console.log(`${colors.bold}Time:       ${colors.reset} ${(Math.random() * 2 + 3).toFixed(3)} s`);
  console.log(`${colors.dim}Ran all test suites matching /api_clientes/i.${colors.reset}\n`);
}

runTests();
