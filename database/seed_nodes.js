const { Client } = require('pg');
// Usa DATABASE_URL (p. ej. la base de `supabase start`); nunca credenciales en el código.
if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}
const esLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL);
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: esLocal ? false : { rejectUnauthorized: false }
});

async function seed() {
  await client.connect();
  const sql = `
    INSERT INTO schema_proveedores.config_proveedor (
      codigo_nodo, nombre_proveedor, vertical, base_url_rest, endpoint_grpc, health_status, latencia_ms, kill_switch_activo, circuit_breaker_estado, tasa_fallos_pct, ultimo_ping_at
    ) VALUES
    ('NODE_AUT_LOCAL', 'Renta Autos Ecuador (Flota Partner)', 'AUTOS', 'http://localhost:3000/api/v2/autos', 'grpc://localhost:50051', 'HEALTHY', 25, false, 'CLOSED', 0.00, NOW()),
    ('NODE_ALO_LOCAL', 'Hoteles & Hospedajes Ecuador', 'ALOJAMIENTOS', 'http://localhost:3000/api/v2/alojamientos', 'grpc://localhost:50051', 'HEALTHY', 20, false, 'CLOSED', 0.00, NOW()),
    ('NODE_VUE_LOCAL', 'AeroEcuador Gateway (Vuelos Partner)', 'VUELOS', 'http://localhost:3000/api/v2/vuelos', 'grpc://localhost:50051', 'HEALTHY', 45, false, 'CLOSED', 0.00, NOW()),
    ('NODE_STK_GRPC', 'Servidor Inbound de Inventario gRPC', 'INVENTARIO_CORE', 'http://localhost:3000/api/v2/inventory', 'localhost:50051', 'HEALTHY', 12, false, 'CLOSED', 0.00, NOW())
    ON CONFLICT (codigo_nodo) DO NOTHING;
  `;
  await client.query(sql);
  console.log('Seeded remaining nodes in config_proveedor successfully');
}
seed().catch(console.error).finally(() => client.end());
