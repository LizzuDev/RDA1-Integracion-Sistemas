const base = 'https://maneja-de-una-autos-api.azurewebsites.net/api/v3/autos/promociones/contrato';

const keys = [
  'Irsuf7pF+8E89Lrmo6w2no/uTODQDhm2k5EFXTF0jq0=',
  'Irsuf7pF 8E89Lrmo6w2no/uTODQDhm2k5EFXTF0jq0=',
  '"Irsuf7pF+8E89Lrmo6w2no/uTODQDhm2k5EFXTF0jq0="',
  "'Irsuf7pF+8E89Lrmo6w2no/uTODQDhm2k5EFXTF0jq0='",
  'Irsuf7pF%2B8E89Lrmo6w2no%2FuTODQDhm2k5EFXTF0jq0%3D',
  'NODE_AUT_MDU',
  'MDU-BEAB8F0B',
  'maneja-de-una',
  'BOOKING_API_KEY',
  'booking',
  'admin',
  '123456',
  'secret'
];

async function run() {
  for (const k of keys) {
    try {
      const r = await fetch(base, {
        headers: { 'X-API-Key': k, 'x-correlation-id': 'corr-check' }
      });
      if (r.status !== 401) {
        console.log(`✅ MATCH! Key: [${k}] -> Status: ${r.status}`);
        const text = await r.text();
        console.log('Response:', text);
        return;
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
  console.log('❌ None of the test keys matched.');
}

run();
