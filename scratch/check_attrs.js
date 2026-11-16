require('dotenv').config();
const { Client } = require('pg');
const c = new Client(process.env.DATABASE_URL);
c.connect().then(async () => {
  const r = await c.query("SELECT id, nombre, proveedor_codigo FROM schema_atracciones.atracciones_items WHERE id IN ('AsM3HitC5wbZ', '673bc075-0cc3-4f85-a274-4875c7a8025b', 'b10a69e0-44e0-44eb-9ce5-c8939a259ce2')");
  console.log(r.rows);
  await c.end();
}).catch(console.error);
