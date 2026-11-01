const https = require('https');
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const BASE_URL = 'https://alisson-atracciones-api.azurewebsites.net/api/v3';
const API_KEY = 'atr-f575172d62a81d51e87fbc0a37952d984ce1c078';
const NODE_CODE = 'NODE_ATR_ALISSON';

async function run() {
  await client.connect();
  console.log('Conectado a PostgreSQL Supabase');

  // 1. Actualizar configuración de proveedor
  const updateQuery = `
    UPDATE schema_proveedores.config_proveedor
    SET base_url_rest = $1,
        api_key = $2,
        nombre_proveedor = 'Atracciones Turísticas del Ecuador (Alisson Basantes - Azure App Service)',
        health_status = 'HEALTHY',
        latencia_ms = 61,
        descripcion = '16 microservicios (3 gRPC + 13 REST), telemetría UP, catálogo y reservas en Azure App Service',
        updated_at = NOW()
    WHERE codigo_nodo = $3
    RETURNING *;
  `;

  let res = await client.query(updateQuery, [BASE_URL, API_KEY, NODE_CODE]);
  if (res.rows.length === 0) {
    console.log(`Nodo ${NODE_CODE} no existía, insertándolo...`);
    const insertQuery = `
      INSERT INTO schema_proveedores.config_proveedor (
        codigo_nodo, tipo_servicio, nombre_proveedor, base_url_rest, api_key, health_status, latencia_ms, descripcion
      ) VALUES ($1, 'ATRACCIONES', 'Atracciones Turísticas del Ecuador (Alisson Basantes - Azure App Service)', $2, $3, 'HEALTHY', 61, '16 microservicios (3 gRPC + 13 REST), telemetría UP en Azure App Service')
      RETURNING *;
    `;
    res = await client.query(insertQuery, [NODE_CODE, BASE_URL, API_KEY]);
  }

  const nodo = res.rows[0];
  console.log('Proveedor Alisson actualizado en BD:', {
    id: nodo.id,
    codigo_nodo: nodo.codigo_nodo,
    base_url_rest: nodo.base_url_rest,
    health_status: nodo.health_status
  });

  // 2. Obtener catálogo desde Azure de Alisson
  const fetchCatalog = () => new Promise((resolve, reject) => {
    https.get(`${BASE_URL}/atracciones?page=1&limit=50`, {
      headers: {
        'X-API-Key': API_KEY,
        'X-Correlation-Id': 'corr-sync-alisson-' + Date.now()
      }
    }, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });

  console.log('Consultando catálogo de Alisson en:', BASE_URL);
  const catalog = await fetchCatalog();
  const items = catalog.data || catalog || [];
  console.log(`Recibidas ${items.length} atracciones desde Alisson.`);

  let insertados = 0;
  for (const item of items) {
    const rawId = item.id;
    const slug = item.slug || (item.nombre ? item.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-') : rawId);
    const nombre = item.nombre || item.name;
    const precio = Number(item.precio?.adult || item.precio?.adulto || item.precio || 0);
    const fotos = item.fotos || (item.foto_url ? [item.foto_url] : (item.photos || []));
    const inclusiones = Array.isArray(item.incluye) ? item.incluye : ['Guía profesional', 'Voucher digital'];

    await client.query(`
      INSERT INTO schema_atracciones.atracciones_items (
        id, slug, nombre, ciudad, pais, descripcion_corta, duracion_estimada,
        precio_unitario_adulto, moneda, activo, proveedor_id, proveedor_codigo,
        fotos_urls, inclusiones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        precio_unitario_adulto = EXCLUDED.precio_unitario_adulto,
        fotos_urls = EXCLUDED.fotos_urls,
        proveedor_codigo = EXCLUDED.proveedor_codigo;
    `, [
      rawId, slug, nombre, item.ciudad || 'Ecuador', 'Ecuador',
      item.descripcion || item.descripcion_corta || '',
      item.duracion_horas ? `${item.duracion_horas} horas` : 'PT3H',
      precio, 'USD', true, nodo.id, NODE_CODE,
      fotos, inclusiones
    ]);
    insertados++;
  }

  console.log(`¡Sincronización completada! ${insertados} atracciones de Alisson registradas en Booking.`);
  await client.end();
}

run().catch(err => {
  console.error('Error al actualizar Alisson:', err);
  process.exit(1);
});
