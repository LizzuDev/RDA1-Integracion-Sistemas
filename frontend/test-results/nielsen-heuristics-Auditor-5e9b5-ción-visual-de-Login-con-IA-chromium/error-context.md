# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nielsen-heuristics.spec.js >> Auditoría de Heurísticas de Nielsen con Midscene >> Evaluación visual de Login con IA
- Location: tests\nielsen-heuristics.spec.js:42:3

# Error details

```
Error: Assertion failed: Hay un formulario de inicio de sesión
Reason: According to the screenshot, there is no visible formulario de inicio de sesión.
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
      - generic [ref=e21]:
        - heading "Iniciar sesión" [level=1] [ref=e22]
        - generic [ref=e23]:
          - generic [ref=e24]:
            - generic [ref=e25]: Correo electrónico
            - textbox "Correo electrónico" [ref=e26]
          - generic [ref=e27]:
            - generic [ref=e28]: Contraseña
            - textbox "Contraseña" [ref=e29]
          - button "Iniciar sesión" [ref=e30] [cursor=pointer]
        - paragraph [ref=e31]:
          - text: ¿No tienes cuenta?
          - link "Regístrate aquí" [ref=e32] [cursor=pointer]:
            - /url: /register
    - contentinfo [ref=e33]:
      - navigation "Enlaces legales" [ref=e34]:
        - link "Politica de Privacidad" [ref=e35] [cursor=pointer]:
          - /url: /privacidad
        - generic [aria-hidden] [ref=e36]: ·
        - link "Terminos de Uso" [ref=e37] [cursor=pointer]:
          - /url: /terminos
        - generic [aria-hidden] [ref=e38]: ·
        - button "Preferencias de cookies" [ref=e39] [cursor=pointer]
      - paragraph [ref=e40]:
        - text: © 2026
        - strong [ref=e41]: Booking Prototipo
        - text: — Proyecto Integrador de Sistemas · Universidad
      - paragraph [ref=e42]: Powered by NestJS · React · PostgreSQL · Docker
  - dialog [ref=e44]:
    - generic [ref=e45]:
      - generic [aria-hidden] [ref=e46]: 🍪
      - heading "Usamos cookies" [level=2] [ref=e47]
    - paragraph [ref=e48]:
      - text: Actualmente usamos cookies para mantener tu sesion y tu seguridad. Con tu permiso Tambien queremos usar cookies de medicion para mejorar el servicio. Puedes decidir en cualquier momento desde el enlace
      - strong [ref=e49]: Preferencias de cookies
      - text: del pie de pagina.
    - paragraph [ref=e50]:
      - text: Lee nuestra
      - link "Politica de Privacidad" [active] [ref=e51] [cursor=pointer]:
        - /url: /privacidad
      - text: y nuestros
      - link "Terminos de Uso" [ref=e52] [cursor=pointer]:
        - /url: /terminos
      - text: .
    - generic [ref=e53]:
      - button "Solo esenciales" [ref=e54] [cursor=pointer]
      - button "Preferencias" [ref=e55] [cursor=pointer]
      - button "Aceptar todas" [ref=e56] [cursor=pointer]
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
> 49 |     await ai.aiAssert('Hay un formulario de inicio de sesión');
     |     ^ Error: Assertion failed: Hay un formulario de inicio de sesión
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
  79 |     await ai.aiAssert('Hay detalles de la atracción visibles');
  80 |   });
  81 | 
  82 | });
  83 | 
```