# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nielsen-heuristics.spec.js >> Auditoría de Heurísticas de Nielsen con Midscene >> Evaluación visual de Detalle Atraccion con IA
- Location: tests\nielsen-heuristics.spec.js:72:3

# Error details

```
Error: Assertion failed: Hay detalles de la atracción visibles
Reason: According to the screenshot, there are no visible details of an attraction.
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Saltar al contenido" [ref=e3] [cursor=pointer]:
    - /url: "#contenido-principal"
  - generic [ref=e4]:
    - navigation [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7] [cursor=pointer]: Booking.com
        - generic [ref=e8]:
          - generic [ref=e9] [cursor=pointer]: USD
          - generic [ref=e10] [cursor=pointer]: 🇪🇨
          - generic [ref=e11] [cursor=pointer]: "?"
          - link "Regístrate" [ref=e12] [cursor=pointer]:
            - /url: /register
          - link "Iniciar sesión" [ref=e13] [cursor=pointer]:
            - /url: /login
      - generic [ref=e15]:
        - link "🛏️ Hospedajes" [ref=e16] [cursor=pointer]:
          - /url: /
        - link "✈️ Vuelos" [ref=e17] [cursor=pointer]:
          - /url: /vuelos
        - link "🚗 Renta de autos" [ref=e18] [cursor=pointer]:
          - /url: /autos
        - link "🎡 Atracciones" [ref=e19] [cursor=pointer]:
          - /url: /
    - main [ref=e20]:
      - heading "Error al cargar atracción" [level=1] [ref=e21]
      - generic [ref=e22]: ⚠️
      - paragraph [ref=e23]: No se pudo cargar la atracción.
      - button "Volver" [ref=e24]
    - contentinfo [ref=e25]:
      - navigation "Enlaces legales" [ref=e26]:
        - link "Politica de Privacidad" [ref=e27] [cursor=pointer]:
          - /url: /privacidad
        - generic [aria-hidden] [ref=e28]: ·
        - link "Terminos de Uso" [ref=e29] [cursor=pointer]:
          - /url: /terminos
        - generic [aria-hidden] [ref=e30]: ·
        - button "Preferencias de cookies" [ref=e31] [cursor=pointer]
      - paragraph [ref=e32]:
        - text: © 2026
        - strong [ref=e33]: Booking Prototipo
        - text: — Proyecto Integrador de Sistemas · Universidad
      - paragraph [ref=e34]: Powered by NestJS · React · PostgreSQL · Docker
  - dialog [ref=e36]:
    - generic [ref=e37]:
      - generic [aria-hidden] [ref=e38]: 🍪
      - heading "Usamos cookies" [level=2] [ref=e39]
    - paragraph [ref=e40]:
      - text: Actualmente usamos cookies para mantener tu sesion y tu seguridad. Con tu permiso Tambien queremos usar cookies de medicion para mejorar el servicio. Puedes decidir en cualquier momento desde el enlace
      - strong [ref=e41]: Preferencias de cookies
      - text: del pie de pagina.
    - paragraph [ref=e42]:
      - text: Lee nuestra
      - link "Politica de Privacidad" [active] [ref=e43] [cursor=pointer]:
        - /url: /privacidad
      - text: y nuestros
      - link "Terminos de Uso" [ref=e44] [cursor=pointer]:
        - /url: /terminos
      - text: .
    - generic [ref=e45]:
      - button "Solo esenciales" [ref=e46] [cursor=pointer]
      - button "Preferencias" [ref=e47] [cursor=pointer]
      - button "Aceptar todas" [ref=e48] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { PlaywrightAgent } from '@midscene/web/playwright';
  3  | 
  4  | test.describe('Auditoría de Heurísticas de Nielsen con Midscene', () => {
  5  |   test.setTimeout(300000); // 5 minutos para permitir que llava procese las imagenes
  6  | 
  7  |   test('Evaluación visual de Vuelos con IA', async ({ page }) => {
  8  |     process.env.OPENAI_API_KEY = "ollama";
  9  |     process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
  10 |     process.env.MIDSCENE_MODEL_NAME = "llava";
  11 |     await page.goto('/vuelos');
  12 |     
  13 |     // Esperamos a que cargue la estructura básica
  14 |     await page.waitForLoadState('networkidle');
  15 | 
  16 |     // Inicializamos el agente IA de Midscene
  17 |     const ai = new PlaywrightAgent(page);
  18 | 
  19 |     await ai.aiAssert('Hay una barra de navegación en la parte superior');
  20 |   });
  21 | 
  22 |   test('Evaluación visual de Autos con IA', async ({ page }) => {
  23 |     process.env.OPENAI_API_KEY = "ollama";
  24 |     process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
  25 |     process.env.MIDSCENE_MODEL_NAME = "llava";
  26 |     await page.goto('/autos');
  27 |     await page.waitForLoadState('networkidle');
  28 |     const ai = new PlaywrightAgent(page);
  29 |     await ai.aiAssert('Hay un título claro que indica renta de autos');
  30 |   });
  31 | 
  32 |   test('Evaluación visual de Atracciones con IA', async ({ page }) => {
  33 |     process.env.OPENAI_API_KEY = "ollama";
  34 |     process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
  35 |     process.env.MIDSCENE_MODEL_NAME = "llava";
  36 |     await page.goto('/atracciones');
  37 |     await page.waitForLoadState('networkidle');
  38 |     const ai = new PlaywrightAgent(page);
  39 |     await ai.aiAssert('Hay contenido sobre atracciones visible');
  40 |   });
  41 | 
  42 |   test('Evaluación visual de Login con IA', async ({ page }) => {
  43 |     process.env.OPENAI_API_KEY = "ollama";
  44 |     process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
  45 |     process.env.MIDSCENE_MODEL_NAME = "llava";
  46 |     await page.goto('/login');
  47 |     await page.waitForLoadState('networkidle');
  48 |     const ai = new PlaywrightAgent(page);
  49 |     await ai.aiAssert('Hay un formulario de inicio de sesión');
  50 |   });
  51 | 
  52 |   test('Evaluación visual de Registro con IA', async ({ page }) => {
  53 |     process.env.OPENAI_API_KEY = "ollama";
  54 |     process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
  55 |     process.env.MIDSCENE_MODEL_NAME = "llava";
  56 |     await page.goto('/register');
  57 |     await page.waitForLoadState('networkidle');
  58 |     const ai = new PlaywrightAgent(page);
  59 |     await ai.aiAssert('Hay un formulario de registro');
  60 |   });
  61 | 
  62 |   test('Evaluación visual de Detalle Auto con IA', async ({ page }) => {
  63 |     process.env.OPENAI_API_KEY = "ollama";
  64 |     process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
  65 |     process.env.MIDSCENE_MODEL_NAME = "llava";
  66 |     await page.goto('/autos/1');
  67 |     await page.waitForLoadState('networkidle');
  68 |     const ai = new PlaywrightAgent(page);
  69 |     await ai.aiAssert('Hay información del auto visible');
  70 |   });
  71 | 
  72 |   test('Evaluación visual de Detalle Atraccion con IA', async ({ page }) => {
  73 |     process.env.OPENAI_API_KEY = "ollama";
  74 |     process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
  75 |     process.env.MIDSCENE_MODEL_NAME = "llava";
  76 |     await page.goto('/atracciones/1');
  77 |     await page.waitForLoadState('networkidle');
  78 |     const ai = new PlaywrightAgent(page);
> 79 |     await ai.aiAssert('Hay detalles de la atracción visibles');
     |     ^ Error: Assertion failed: Hay detalles de la atracción visibles
  80 |   });
  81 | 
  82 | });
  83 | 
```