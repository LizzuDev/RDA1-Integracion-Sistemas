const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function createTable() {
  try {
    await client.connect();
    console.log('Connected to DB');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id VARCHAR(50) PRIMARY KEY,
        client_name VARCHAR(255),
        email VARCHAR(255),
        entity_name VARCHAR(255),
        pnr_or_id VARCHAR(100),
        type VARCHAR(50),
        subject VARCHAR(255),
        priority VARCHAR(20),
        description TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Table support_tickets created successfully!');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await client.end();
  }
}

createTable();
