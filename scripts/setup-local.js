/**
 * Deja el proyecto listo para correr en local contra `supabase start`.
 *
 *   npx supabase start      (una vez, con Docker Desktop abierto)
 *   npm run setup:local
 *
 * Hace, en orden:
 *   1. Lee URL, claves y DB de `npx supabase status -o env`.
 *   2. Escribe `.env` (backend) y `frontend/.env` con esos valores.
 *   3. Carga todos los SQL de `database/` y `vuelos_schema.sql` en la base local.
 *   4. Ejecuta `migrate_alojamientos.js` y `seed_nodes.js`.
 *   5. Crea el usuario admin@booking.com / Admin123!.
 *
 * Se puede repetir sin romper nada: los SQL usan IF NOT EXISTS / ON CONFLICT.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ADMIN = { email: 'admin@booking.com', password: 'Admin123!' };

// Orden de carga: cada archivo depende de tablas creadas por los anteriores.
const SQL_FILES = [
  'database/01_master_migration_12_schemas.sql',
  'database/admin_schema.sql',
  'database/atracciones_schema_v2.sql',
  'database/autos_schema_v2.sql',
  'database/supabase_hospitality_schema.sql',
  ...listar('database/migraciones'),
  ...listar('database/semillas'),
  'src/modules/vuelos/vuelos_schema.sql',
  ...listar('database/migrations'),
];

function listar(dir) {
  return fs
    .readdirSync(path.join(ROOT, dir))
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => `${dir}/${f}`);
}

function ejecutar(cmd, args, opciones = {}) {
  // shell: true para que `npx` funcione también en Windows (npx.cmd).
  return spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32', ...opciones });
}

function leerStatusSupabase() {
  const r = ejecutar('npx', ['supabase', 'status', '-o', 'env']);
  const vars = {};
  for (const linea of (r.stdout || '').split(/\r?\n/)) {
    const m = linea.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (m) vars[m[1]] = m[2];
  }
  if (!vars.API_URL || !vars.DB_URL) {
    console.error('❌ No se pudo leer `npx supabase status`. ¿Está corriendo `npx supabase start`?');
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  return {
    apiUrl: vars.API_URL,
    dbUrl: vars.DB_URL,
    anonKey: vars.PUBLISHABLE_KEY || vars.ANON_KEY,
    secretKey: vars.SECRET_KEY || vars.SERVICE_ROLE_KEY,
  };
}

/** Reemplaza `CLAVE=...` en el archivo o lo agrega al final. */
function fijarVariables(archivo, valores) {
  let texto = fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8') : '';
  for (const [clave, valor] of Object.entries(valores)) {
    const linea = `${clave}=${valor}`;
    const re = new RegExp(`^${clave}=.*$`, 'm');
    texto = re.test(texto) ? texto.replace(re, linea) : `${texto.replace(/\n?$/, '\n')}${linea}\n`;
  }
  fs.writeFileSync(archivo, texto);
}

function escribirEnv(sb) {
  const envBack = path.join(ROOT, '.env');
  if (!fs.existsSync(envBack)) {
    fs.copyFileSync(path.join(ROOT, '.env.demo.example'), envBack);
    // La demo usa RabbitMQ + Kafka; en local basta el bus en memoria.
    fijarVariables(envBack, { EVENT_BUS_MODE: 'memory' });
    console.log('   .env creado a partir de .env.demo.example');
  }
  fijarVariables(envBack, {
    DATABASE_URL: sb.dbUrl,
    SUPABASE_URL: sb.apiUrl,
    SUPABASE_ANON_KEY: sb.anonKey,
    SUPABASE_SECRET_KEY: sb.secretKey,
    SUPABASE_SERVICE_ROLE_KEY: sb.secretKey,
  });

  fijarVariables(path.join(ROOT, 'frontend', '.env'), {
    VITE_API_URL: 'http://localhost:3000/api/v1',
    VITE_SUPABASE_URL: sb.apiUrl,
    VITE_SUPABASE_ANON_KEY: sb.anonKey,
  });
  console.log('✅ .env y frontend/.env actualizados');
}

/**
 * psql del contenedor de Supabase (así no hace falta instalar psql en Windows);
 * si no hay contenedor, el psql local.
 */
function comandoPsql(dbUrl) {
  const r = ejecutar('docker', ['ps', '--filter', 'name=supabase_db_', '--format', '{{.Names}}']);
  const contenedor = (r.stdout || '').trim().split(/\r?\n/)[0];
  if (contenedor) return ['docker', ['exec', '-i', contenedor, 'psql', '-U', 'postgres', '-d', 'postgres']];
  return ['psql', [dbUrl]];
}

function cargarSql(dbUrl) {
  const [cmd, args] = comandoPsql(dbUrl);
  let conErrores = 0;
  for (const archivo of SQL_FILES) {
    const r = ejecutar(cmd, [...args, '-q', '-v', 'ON_ERROR_STOP=0'], {
      input: fs.readFileSync(path.join(ROOT, archivo), 'utf8'),
    });
    // Con ON_ERROR_STOP=0 psql sale con 0 aunque falle un INSERT; un código
    // distinto de 0 significa que ni siquiera pudo conectarse.
    if (r.error || r.status !== 0) {
      console.error(`❌ No se pudo ejecutar ${cmd}: ${r.error ? r.error.message : (r.stderr || '').trim()}`);
      process.exit(1);
    }
    const errores = (r.stderr || '').split(/\r?\n/).filter((l) => l.includes('ERROR'));
    if (errores.length) {
      conErrores++;
      console.log(`   ⚠️  ${archivo}: ${errores.length} error(es), p. ej. ${errores[0].replace(/^.*ERROR:\s*/, '')}`);
    } else {
      console.log(`   ✓ ${archivo}`);
    }
  }
  console.log(`✅ SQL cargado (${SQL_FILES.length} archivos, ${conErrores} con avisos)`);
  console.log('   Al repetir el script, los avisos "already exists" son normales.');
}

function correrScriptNode(archivo, dbUrl) {
  const r = ejecutar('node', [archivo], { env: { ...process.env, DATABASE_URL: dbUrl }, shell: false });
  // Estos scripts capturan sus errores con console.error y salen con 0.
  const error = (r.stderr || '').trim();
  if (r.status !== 0 || error) {
    console.log(`   ⚠️  ${archivo}: ${error.split(/\r?\n/)[0]}`);
  } else {
    console.log(`   ✓ ${archivo}: ${(r.stdout || '').trim().split(/\r?\n/).pop()}`);
  }
}

async function crearAdmin(sb) {
  const { createClient } = require('@supabase/supabase-js');
  const admin = createClient(sb.apiUrl, sb.secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await admin.auth.admin.createUser({
    email: ADMIN.email,
    password: ADMIN.password,
    email_confirm: true,
    user_metadata: { nombre: 'Admin', full_name: 'Admin Local' },
  });
  if (error && !/already/i.test(error.message)) {
    console.log(`   ⚠️  No se pudo crear el admin: ${error.message}`);
  } else {
    console.log(`✅ Usuario admin listo: ${ADMIN.email} / ${ADMIN.password}`);
  }
}

async function main() {
  console.log('1/4 Leyendo `supabase status`...');
  const sb = leerStatusSupabase();

  console.log('2/4 Escribiendo variables de entorno...');
  escribirEnv(sb);

  console.log('3/4 Cargando esquemas y datos...');
  cargarSql(sb.dbUrl);
  correrScriptNode('database/migrate_alojamientos.js', sb.dbUrl);
  correrScriptNode('database/seed_nodes.js', sb.dbUrl);

  console.log('4/4 Creando usuario admin...');
  await crearAdmin(sb);

  console.log('\nListo. Ahora en dos terminales:\n   npm run start:dev\n   cd frontend && npm run dev');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
