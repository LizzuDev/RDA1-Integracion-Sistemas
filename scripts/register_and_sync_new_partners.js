const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL');

  // 1. Mateo Morales (NODE_AUT_MDU / MANEJA DE UNA)
  console.log('\n--- Registrando Mateo Morales (NODE_AUT_MDU) ---');
  await client.query(`
    INSERT INTO schema_proveedores.config_proveedor (
      codigo_nodo, vertical, nombre_proveedor, base_url_rest, api_key, health_status, latencia_ms, descripcion
    ) VALUES (
      'NODE_AUT_MDU',
      'AUTOS',
      'MANEJA DE UNA (Mateo Morales - Azure App Service)',
      'https://maneja-de-una-autos-api.azurewebsites.net/api/v3',
      'Irsuf7pF+8E89Lrmo6w2no/uTODQDhm2k5EFXTF0jq0=',
      'HEALTHY',
      257,
      'Flota de 27 vehículos en Azure App Service (circuit_breaker CLOSED, cooldown 2h activo)'
    )
    ON CONFLICT (codigo_nodo) DO UPDATE SET
      nombre_proveedor = EXCLUDED.nombre_proveedor,
      base_url_rest = EXCLUDED.base_url_rest,
      api_key = EXCLUDED.api_key,
      health_status = EXCLUDED.health_status,
      latencia_ms = EXCLUDED.latencia_ms,
      descripcion = EXCLUDED.descripcion;
  `);

  await client.query(`
    UPDATE schema_proveedores.config_proveedor
    SET base_url_rest = 'https://maneja-de-una-autos-api.azurewebsites.net/api/v3',
        health_status = 'HEALTHY',
        latencia_ms = 257,
        descripcion = 'Migrado a Azure App Service (NODE_AUT_MDU)'
    WHERE codigo_nodo = 'NODE_AUT_MATEO';
  `);
  console.log('Mateo registrado en schema_proveedores.');

  // Sincronizar catálogo de Mateo en schema_autos.autos_catalogo
  try {
    const resAutos = await fetch('https://maneja-de-una-autos-api.azurewebsites.net/api/v3/autos');
    const autosData = await resAutos.json();
    const autos = autosData.data || (Array.isArray(autosData) ? autosData : []);
    console.log(`Recibidos ${autos.length} vehículos de Mateo.`);

    let countAutos = 0;
    for (const car of autos) {
      const id = car.vehicle_id || car.auto_id || car.id;
      if (!id) continue;
      const marca = car.marca || car.brand || 'Suzuki';
      const modelo = car.modelo || car.model || 'Swift';
      const precio = Number(car.precio_diario || car.daily_price || 31);
      const ciudad = car.ciudad || car.location || 'Quito';

      let rawCat = (car.categoria || car.category || 'COMPACTO').toUpperCase();
      let categoria = 'ECONOMICO';
      if (rawCat.includes('COMPACT')) categoria = 'COMPACTO';
      else if (rawCat.includes('SUV')) categoria = 'SUV';
      else if (rawCat.includes('VAN')) categoria = 'VAN';

      let rawTrans = (car.transmision || car.transmission || 'MANUAL').toUpperCase();
      let transmision = rawTrans.includes('AUTO') ? 'AUTOMATICA' : 'MANUAL';

      await client.query(`
        INSERT INTO schema_autos.autos_catalogo (
          id, marca, modelo, anio, categoria, transmision, capacidad_pasajeros,
          precio_diario, kilometraje_actual, umbral_mantenimiento_km,
          alerta_mantenimiento_activa, estado_operativo, ciudad, activo, proveedor_codigo
        ) VALUES (
          $1, $2, $3, 2024, $4, $5, $6, $7, $8, 15000, false, 'DISPONIBLE', $9, true, 'NODE_AUT_MDU'
        )
        ON CONFLICT (id) DO UPDATE SET
          marca = EXCLUDED.marca,
          modelo = EXCLUDED.modelo,
          categoria = EXCLUDED.categoria,
          transmision = EXCLUDED.transmision,
          precio_diario = EXCLUDED.precio_diario,
          proveedor_codigo = EXCLUDED.proveedor_codigo,
          activo = true;
      `, [
        id, marca, modelo, categoria, transmision,
        car.asientos || 5, precio, car.kilometraje_actual || 14000, ciudad
      ]);
      countAutos++;
    }
    console.log(`¡${countAutos} vehículos de Mateo sincronizados en schema_autos.autos_catalogo!`);
  } catch (err) {
    console.error('Error sincronizando autos de Mateo:', err.message);
  }

  // 2. Gloria Chushig (NODE_ATR_GLORIA / Vívelo Ecuador)
  console.log('\n--- Registrando Gloria Chushig (NODE_ATR_GLORIA) ---');
  await client.query(`
    INSERT INTO schema_proveedores.config_proveedor (
      codigo_nodo, vertical, nombre_proveedor, base_url_rest, api_key, health_status, latencia_ms, descripcion
    ) VALUES (
      'NODE_ATR_GLORIA',
      'ATRACCIONES',
      'Vívelo Ecuador (Gloria Chushig - Azure Container Apps)',
      'https://ms-catalog.yellowsky-d7d7b363.brazilsouth.azurecontainerapps.io/api/v3',
      'N/A',
      'HEALTHY',
      45,
      'Catálogo de 10 atracciones en Azure Container Apps (ms-catalog)'
    )
    ON CONFLICT (codigo_nodo) DO UPDATE SET
      nombre_proveedor = EXCLUDED.nombre_proveedor,
      base_url_rest = EXCLUDED.base_url_rest,
      health_status = EXCLUDED.health_status,
      latencia_ms = EXCLUDED.latencia_ms,
      descripcion = EXCLUDED.descripcion;
  `);
  console.log('Gloria registrada en schema_proveedores.');

  // Sincronizar catálogo de Gloria en schema_atracciones.atracciones_items
  try {
    const resAtr = await fetch('https://ms-catalog.yellowsky-d7d7b363.brazilsouth.azurecontainerapps.io/api/v3/atracciones?limit=50', {
      headers: { 'x-correlation-id': 'corr-sync-gloria' }
    });
    const atrData = await resAtr.json();
    const atrs = atrData.data || (Array.isArray(atrData) ? atrData : []);
    console.log(`Recibidas ${atrs.length} atracciones de Gloria.`);

    const nodoGloria = (await client.query("SELECT id FROM schema_proveedores.config_proveedor WHERE codigo_nodo = 'NODE_ATR_GLORIA'")).rows[0];

    let countAtr = 0;
    for (const a of atrs) {
      const id = a.id;
      if (!id) continue;
      const nombre = a.nombre || a.name || 'Atracción';
      const rawSlug = a.slug || (nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      const slug = `${rawSlug}-${id.slice(0, 8)}`;
      const ciudad = a.ciudad || a.city || 'Ecuador';
      const precio = Number(a.precio?.adult || a.precio_adulto || 25);
      const fotos = a.fotos || (a.foto_url ? [a.foto_url] : []);
      const inclusiones = Array.isArray(a.incluye) ? a.incluye : ['Guía turístico acreditado'];

      await client.query(`
        INSERT INTO schema_atracciones.atracciones_items (
          id, slug, nombre, ciudad, pais, descripcion_corta, duracion_estimada,
          precio_unitario_adulto, moneda, activo, proveedor_id, proveedor_codigo,
          fotos_urls, inclusiones
        ) VALUES ($1, $2, $3, $4, 'Ecuador', $5, 'PT3H', $6, 'USD', true, $7, 'NODE_ATR_GLORIA', $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          precio_unitario_adulto = EXCLUDED.precio_unitario_adulto,
          fotos_urls = EXCLUDED.fotos_urls,
          proveedor_codigo = EXCLUDED.proveedor_codigo;
      `, [id, slug, nombre, ciudad, a.short_description || a.descripcion || '', precio, nodoGloria.id, fotos, inclusiones]);
      countAtr++;
    }
    console.log(`¡${countAtr} atracciones de Gloria sincronizadas en schema_atracciones!`);
  } catch (err) {
    console.error('Error sincronizando atracciones de Gloria:', err.message);
  }

  // 3. Michael Molina (NODE_ATR_MOLINA / TourGirls)
  console.log('\n--- Registrando Michael Molina (NODE_ATR_MOLINA) ---');
  await client.query(`
    INSERT INTO schema_proveedores.config_proveedor (
      codigo_nodo, vertical, nombre_proveedor, base_url_rest, api_key, health_status, latencia_ms, descripcion
    ) VALUES (
      'NODE_ATR_MOLINA',
      'ATRACCIONES',
      'TourGirls (Michael Molina - Azure App Service)',
      'https://tourgirls-gateway-mm.azurewebsites.net/api/v3',
      'Bw_Y7_TsbB7DcETwoa-mw6xSunT_rP5nHf_ZitpfB2w',
      'DEGRADED',
      1662,
      'TourGirls en Azure App Service (Base de datos sin seeders / catálogo vacío)'
    )
    ON CONFLICT (codigo_nodo) DO UPDATE SET
      nombre_proveedor = EXCLUDED.nombre_proveedor,
      base_url_rest = EXCLUDED.base_url_rest,
      api_key = EXCLUDED.api_key,
      health_status = EXCLUDED.health_status,
      latencia_ms = EXCLUDED.latencia_ms,
      descripcion = EXCLUDED.descripcion;
  `);

  await client.query(`
    UPDATE schema_proveedores.config_proveedor
    SET base_url_rest = 'https://tourgirls-gateway-mm.azurewebsites.net/api/v3',
        health_status = 'DEGRADED',
        latencia_ms = 1662
    WHERE codigo_nodo = 'NODE_ATR_MICHAEL';
  `);
  console.log('Michael registrado en schema_proveedores.');

  await client.end();
  console.log('\n=== REGISTRO EN SUPABASE COMPLETADO CON ÉXITO ===');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
