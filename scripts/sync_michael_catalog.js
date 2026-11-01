const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncMichaelCatalog() {
  await client.connect();
  console.log('Conectado a BD Supabase');

  // Asegurar registro del proveedor
  await client.query(`
    INSERT INTO schema_proveedores.config_proveedor (
      codigo_nodo, vertical, nombre_proveedor, base_url_rest, api_key, health_status, latencia_ms, descripcion
    ) VALUES (
      'NODE_ATR_MOLINA',
      'ATRACCIONES',
      'TourGirls (Michael Molina - Azure App Service)',
      'https://tourgirls-gateway-mm.azurewebsites.net/api/v3',
      'Bw_Y7_TsbB7DcETwoa-mw6xSunT_rP5nHf_ZitpfB2w',
      'HEALTHY',
      1486,
      'TourGirls en Azure App Service (18 tours de expedición y aventura sincronizados)'
    ) ON CONFLICT (codigo_nodo) DO UPDATE
    SET base_url_rest = EXCLUDED.base_url_rest,
        api_key = EXCLUDED.api_key,
        health_status = 'HEALTHY',
        latencia_ms = 1486,
        descripcion = EXCLUDED.descripcion;
  `);

  const nodoRes = await client.query(`
    SELECT * FROM schema_proveedores.config_proveedor WHERE codigo_nodo = 'NODE_ATR_MOLINA'
  `);
  const nodo = nodoRes.rows[0];

  console.log('Consultando catálogo de Michael en:', nodo.base_url_rest);
  const res = await fetch(`${nodo.base_url_rest}/atracciones?limit=50`, {
    headers: {
      'X-API-Key': nodo.api_key,
      'X-Correlation-Id': 'corr-sync-michael-' + Date.now()
    }
  });

  const items = await res.json();
  console.log(`Recibidas ${items.length} atracciones desde Michael.`);

  let insertados = 0;
  for (const item of items) {
    const rawId = item.id;
    const slug = (item.nombre || rawId).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const nombre = item.nombre || item.name;
    const precio = Number(item.precio?.adult || item.precio?.adulto || item.precio || 25);
    const fotos = item.fotos || (item.foto_url ? [item.foto_url] : ['https://images.unsplash.com/photo-1589308078059-be1415eab4c3']);
    const inclusiones = Array.isArray(item.incluye) ? item.incluye : ['Guía profesional', 'Entrada oficial'];

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
        proveedor_codigo = EXCLUDED.proveedor_codigo,
        activo = true;
    `, [
      rawId, slug, nombre, item.ciudad || 'Ecuador', 'Ecuador',
      item.duracion ? `${item.duracion} - Expedición TourGirls` : 'Expedición y aventura',
      item.duracion || '4 horas',
      precio, 'USD', true, nodo.id, 'NODE_ATR_MOLINA',
      fotos, inclusiones
    ]);
    insertados++;
  }

  console.log(`¡Sincronización completada! ${insertados} atracciones de TourGirls (Michael) registradas en Booking Supabase.`);
  await client.end();
}

syncMichaelCatalog().catch(err => {
  console.error('Error al sincronizar catálogo de Michael:', err);
  process.exit(1);
});
