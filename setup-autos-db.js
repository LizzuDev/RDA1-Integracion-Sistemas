const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const queries = [
  `CREATE TABLE IF NOT EXISTS autos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name VARCHAR NOT NULL,
    price DECIMAL NOT NULL,
    vehicle_info JSONB NOT NULL,
    images JSONB NOT NULL,
    available BOOLEAN NOT NULL DEFAULT true
  );`,
  `CREATE TABLE IF NOT EXISTS orders_autos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "idempotencyKey" VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    "autoId" VARCHAR NOT NULL,
    "totalPrice" JSONB NOT NULL,
    "diasRenta" INTEGER NOT NULL,
    booker JSONB NOT NULL,
    driver JSONB,
    route JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
  );`
];

client.connect().then(async () => {
  for (const q of queries) {
    await client.query(q);
  }
  console.log('Tables created');
  client.end();
}).catch(console.error);
