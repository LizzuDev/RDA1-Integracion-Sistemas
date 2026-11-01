const https = require('https');
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncCatalog() {
  await client.connect();
  console.log('Conectado a BD Supabase');

  const nodoRes = await client.query(`
    SELECT * FROM schema_proveedores.config_proveedor WHERE codigo_nodo = 'NODE_ATR_DILAN'
  `);
  if (nodoRes.rows.length === 0) {
    console.error('No se encontró NODE_ATR_DILAN');
    return;
  }
  const nodo = nodoRes.rows[0];
  console.log('Consultando catálogo de:', nodo.base_url_rest);

  const fetchCatalog = () => new Promise((resolve, reject) => {
    https.get(`${nodo.base_url_rest}/atracciones?limit=50`, {
      headers: {
        'X-API-Key': nodo.api_key,
        'X-Correlation-Id': 'corr-sync-' + Date.now()
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });

  const catalog = await fetchCatalog();
  const items = catalog.data || catalog;
  console.log(`Recibidas ${items.length} atracciones desde Dilan.`);

  let insertados = 0;
  for (const item of items) {
    const rawId = item.id;
    const slug = item.slug || rawId;
    const nombre = item.name || item.nombre;
    const precio = Number(item.price?.adult || item.precio?.adulto || item.precio || 0);
    const fotos = item.photos || (item.image_url ? [item.image_url] : []);
    const inclusiones = item.inclusions ? Object.keys(item.inclusions).filter(k => item.inclusions[k] === true) : ['Guía'];

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
      rawId, slug, nombre, item.city || item.ciudad || 'Ecuador', 'Ecuador',
      item.short_description || item.descripcion_corta || '',
      item.duration || item.duracion || 'PT4H',
      precio, 'USD', true, nodo.id, 'NODE_ATR_DILAN',
      fotos, inclusiones
    ]);
    insertados++;
  }

  console.log(`¡Sincronización completada! ${insertados} atracciones registradas/actualizadas en Booking.`);
  await client.end();
}

syncCatalog().catch(err => {
  console.error('Error al sincronizar catálogo:', err);
  process.exit(1);
});
