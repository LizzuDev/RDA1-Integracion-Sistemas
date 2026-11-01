const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Conectado a PostgreSQL');

  const query = `
    UPDATE schema_proveedores.config_proveedor
    SET base_url_rest = 'https://ecuatravel-atracciones-api.azurewebsites.net/api/v3',
        api_key = 'atr-ariel-ecua-travel-2026',
        nombre_proveedor = 'Ecuatravel (Ariel Chacha - Azure App Service)',
        health_status = 'HEALTHY',
        latencia_ms = 15,
        descripcion = 'Catálogo de 33 tours y experiencias turísticas Ecuatravel v3 (Azure App Service)'
    WHERE codigo_nodo = 'NODE_ATR_ARIEL'
    RETURNING *;
  `;

  const res = await client.query(query);
  console.log('Filas actualizadas:', res.rowCount);
  if (res.rows.length > 0) {
    console.log('Ariel actualizado en DB:', {
      codigo_nodo: res.rows[0].codigo_nodo,
      base_url_rest: res.rows[0].base_url_rest,
      api_key: res.rows[0].api_key,
      health_status: res.rows[0].health_status
    });
  }
  await client.end();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
