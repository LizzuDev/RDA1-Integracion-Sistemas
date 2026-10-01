const { Client } = require('pg');
require('dotenv').config();

async function test() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Connected!');
    
    // First, let's see if the table exists
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    console.log('Tables:', tables.rows.map(r => r.tablename));

    if (tables.rows.some(r => r.tablename === 'atracciones')) {
      const columns = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'atracciones'");
      console.log('Columns in atracciones:', columns.rows);
      
      const count = await client.query('SELECT COUNT(*) FROM atracciones');
      console.log('Row count:', count.rows[0].count);
      
      const res = await client.query('SELECT * FROM atracciones LIMIT 1');
      if(res.rows.length > 0) {
        console.log('First row:', res.rows[0]);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

test();
