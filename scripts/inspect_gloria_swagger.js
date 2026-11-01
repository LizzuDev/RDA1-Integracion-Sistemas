const https = require('https');
const fs = require('fs');

async function getGloriaSwagger() {
  const url = 'https://ms-catalog.yellowsky-d7d7b363.brazilsouth.azurecontainerapps.io/api/docs-json';
  const res = await fetch(url);
  const json = await res.json();

  console.log('Title:', json.info?.title, 'Version:', json.info?.version);
  console.log('Servers:', json.servers);

  const pathsOfInterest = [
    '/api/v2/atracciones/reservas',
    '/api/v2/atracciones/{id}/booking',
    '/api/v2/atracciones/{id}/disponibilidad',
    '/api/v2/atracciones/search',
    '/api/v2/atracciones'
  ];

  for (const p of pathsOfInterest) {
    if (json.paths[p]) {
      console.log(`\n=== PATH: ${p} ===`);
      for (const [method, op] of Object.entries(json.paths[p])) {
        console.log(`Method: ${method.toUpperCase()}`);
        console.log('Summary:', op.summary || op.description);
        console.log('Parameters:', op.parameters);
        if (op.requestBody) {
          console.log('RequestBody Content Types:', Object.keys(op.requestBody.content || {}));
          const schema = op.requestBody.content?.['application/json']?.schema;
          console.log('RequestBody Schema Ref / Properties:', schema);
        }
      }
    }
  }

  // Also look at components.schemas
  fs.writeFileSync('scripts/gloria_swagger.json', JSON.stringify(json, null, 2));
  console.log('\nSaved full Gloria swagger to scripts/gloria_swagger.json');
}

getGloriaSwagger().catch(console.error);
