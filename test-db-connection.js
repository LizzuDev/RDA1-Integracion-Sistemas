const { Client } = require('pg');

async function testConnection() {
  const url = 'postgresql://postgres.owseuntgcgvflqpnmwcc:Semestre%402026@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true';
  const client = new Client({ connectionString: url });
  
  try {
    await client.connect();
    console.log('Connect 6543 success');
    await client.query('SELECT 1');
    console.log('Query 6543 success');
    await client.end();
  } catch (e) {
    console.error('6543 Error:', e.message);
  }

  const directUrl = 'postgresql://postgres:Semestre%402026@db.owseuntgcgvflqpnmwcc.supabase.co:5432/postgres';
  const directClient = new Client({ connectionString: directUrl });
  
  try {
    await directClient.connect();
    console.log('Connect direct 5432 success');
    await directClient.query('SELECT 1');
    console.log('Query direct 5432 success');
    await directClient.end();
  } catch (e) {
    console.error('Direct 5432 Error:', e.message);
  }
}

testConnection();
