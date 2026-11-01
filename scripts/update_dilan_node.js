const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Conectado a PostgreSQL exitosamente');
  
  const query = `
    UPDATE schema_proveedores.config_proveedor
    SET base_url_rest = 'https://descubre-gateway.livelymoss-5ea81cc6.chilecentral.azurecontainerapps.io/api/v3',
        api_key = '40f8a31375e24536bf1dd8f48dd48a94c7187e498b5df568',
        nombre_proveedor = 'Descubre EC (Dilan Mendoza - Azure Container Apps)',
        descripcion = 'Catálogo de 24 tours y atracciones en Ecuador (Azure Container Apps 11 microservicios)'
    WHERE codigo_nodo = 'NODE_ATR_DILAN'
    RETURNING *;
  `;

  const res = await client.query(query);
  console.log('Filas actualizadas:', res.rowCount);
  if (res.rows.length > 0) {
    console.log('Nodo Dilan actualizado:', {
      codigo_nodo: res.rows[0].codigo_nodo,
      base_url_rest: res.rows[0].base_url_rest,
      api_key: res.rows[0].api_key,
      nombre_proveedor: res.rows[0].nombre_proveedor
    });
  }
  await client.end();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
