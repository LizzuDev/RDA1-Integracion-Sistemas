require('dotenv').config();
const { Client } = require('pg');
const c = new Client(process.env.DATABASE_URL);
c.connect().then(async () => {
  const r = await c.query("SELECT id, atraccion_id, date, time, status, cancel_code, created_at, ics_calendar_url FROM schema_atracciones.atracciones_reservas WHERE id LIKE 'DEC-%' ORDER BY created_at DESC LIMIT 5");
  console.log(r.rows);
  await c.end();
}).catch(console.error);
