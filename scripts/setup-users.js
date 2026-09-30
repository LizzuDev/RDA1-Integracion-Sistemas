const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar .env de la raiz
dotenv.config({ path: '.env' });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en el .env');
  process.exit(1);
}

// Usamos el SERVICE ROLE KEY para tener permisos de administrador
const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function crearUsuario(email, password, nombre, apellido, role = 'user') {
  console.log(`\nCreando usuario ${email} (${role})...`);
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre,
      apellido,
      role
    }
  });

  if (error) {
    if (error.message.includes('already registered')) {
        console.log(`✅ Usuario ${email} ya existe.`);
    } else {
        console.error('❌ Error al crear usuario:', error.message);
    }
  } else {
    console.log(`✅ Usuario creado exitosamente. ID: ${data.user.id}`);
  }
}

async function run() {
  console.log('Iniciando creacion de usuarios semilla...');
  
  // 1. Crear usuario Admin
  await crearUsuario('admin@booking.com', 'Admin123!', 'Super', 'Administrador', 'admin');
  
  // 2. Crear usuario de Prueba
  await crearUsuario('prueba@booking.com', 'Prueba123!', 'Usuario', 'Prueba', 'user');

  console.log('\n¡Proceso finalizado!');
}

run();
