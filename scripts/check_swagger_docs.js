const https = require('https');

const partners = {
  gloria: 'https://ms-catalog.yellowsky-d7d7b363.brazilsouth.azurecontainerapps.io',
  mateo: 'https://maneja-de-una-autos-api.azurewebsites.net',
  michael: 'https://tourgirls-gateway-mm.azurewebsites.net'
};

const paths = [
  '/api/docs-json',
  '/api/docs-yaml',
  '/api/docs',
  '/api/v3/docs',
  '/api/v3/docs-json',
  '/docs',
  '/docs-json',
  '/openapi.json',
  '/api/v3/openapi.json',
  '/swagger.json',
  '/api/v3/swagger.json'
];

async function checkDoc(partner, baseUrl) {
  console.log(`\n=== CHECKING DOCS FOR ${partner.toUpperCase()} ===`);
  for (const p of paths) {
    try {
      const url = baseUrl + p;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.status === 200) {
        const text = await res.text();
        console.log(`✅ [${res.status}] ${url}`);
        if (text.startsWith('{')) {
          const json = JSON.parse(text);
          console.log('   Paths:', Object.keys(json.paths || {}));
        } else {
          console.log('   Snippet:', text.slice(0, 150));
        }
      } else {
        // console.log(`❌ [${res.status}] ${url}`);
      }
    } catch (e) {
      // ignore timeout
    }
  }
}

async function run() {
  for (const [k, v] of Object.entries(partners)) {
    await checkDoc(k, v);
  }
}

run();
