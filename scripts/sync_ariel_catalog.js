const https = require('https');
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncArielCatalog() {
  await client.connect();
  console.log('Conectado a BD Supabase');

  const nodoRes = await client.query(`
    SELECT * FROM schema_proveedores.config_proveedor WHERE codigo_nodo = 'NODE_ATR_ARIEL'
  `);
  if (nodoRes.rows.length === 0) {
    console.error('No se encontró NODE_ATR_ARIEL');
    return;
  }
  const nodo = nodoRes.rows[0];
  console.log('Consultando catálogo de Ariel en:', nodo.base_url_rest);

  const fetchCatalog = () => new Promise((resolve, reject) => {
    https.get(`${nodo.base_url_rest}/atracciones?page=1&limit=50`, {
      headers: {
        'X-API-Key': nodo.api_key,
        'X-Correlation-Id': 'corr-sync-ariel-' + Date.now()
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
  console.log(`Recibidas ${items.length} atracciones desde Ariel.`);

  let insertados = 0;
  for (const item of items) {
    const rawId = item.id;
    const slug = item.slug || (item.nombre ? item.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-') : rawId);
    const nombre = item.nombre || item.name;
    const precio = Number(item.precio || item.precio_base || item.price?.adult || 0);
    const fotos = item.foto_url ? [item.foto_url] : (item.photos || []);
    const inclusiones = Array.isArray(item.incluye) ? item.incluye : ['Guía profesional'];

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
      precio, 'USD', true, nodo.id, 'NODE_ATR_ARIEL',
      fotos, inclusiones
    ]);
    insertados++;
  }

  console.log(`¡Sincronización completada! ${insertados} atracciones de Ariel registradas/actualizadas en Booking.`);
  await client.end();
}

syncArielCatalog().catch((err) => {
  console.error('Error al sincronizar catálogo de Ariel:', err);
  process.exit(1);
});
