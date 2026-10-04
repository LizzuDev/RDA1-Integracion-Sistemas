# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nielsen-heuristics.spec.js >> Auditoría de Heurísticas de Nielsen con Midscene >> Evaluación visual de Detalle Auto con IA
- Location: tests\nielsen-heuristics.spec.js:62:3

# Error details

```
Error: Assertion failed: Hay información del auto visible
Reason: According to the screenshot, there is no visible information about a car. The image shows a webpage with a navigation bar, a search bar, and a section with a title "tu car" and a button "Crear una nueva car". The rest of the page content is not clearly visible. The statement "Hay información del auto visible" is not true based on the provided screenshot.
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
        - generic [ref=e22]:
          - text: Volver a los resultados de búsqueda
          - heading "Tu oferta" [level=1] [ref=e23]
          - paragraph [ref=e24]: "Siguiente: Añade los extras"
        - generic [ref=e30]:
          - generic [ref=e31]:
            - generic [ref=e32]:
              - generic [ref=e33]: ✓
              - text: Cancelación gratuita hasta 48 horas antes de la recogida
            - generic [ref=e34]:
              - generic [ref=e35]:
                - img "Chevrolet Spark" [ref=e37]
                - generic [ref=e38]:
                  - heading "Chevrolet Spark o un coche pequeño similar ℹ️" [level=2] [ref=e39]
                  - generic [ref=e40]:
                    - generic [ref=e41]:
                      - generic [ref=e42]: 👤
                      - text: 5 plazas
                    - generic [ref=e43]:
                      - generic [ref=e44]: 💼
                      - text: 1 pieza de equipaje
                    - generic [ref=e45]:
                      - generic [ref=e46]: 🛣️
                      - text: Kilometraje ilimitado
                  - generic [ref=e47]:
                    - strong [ref=e48]: Quito Aeropuerto
                    - text: En el aeropuerto
              - generic [ref=e49]:
                - generic [ref=e50]:
                  - generic [ref=e51]: Europcar
                  - generic [ref=e52]: "8.2"
                  - generic [ref=e53]:
                    - text: Aceptable
                    - generic [ref=e54]: 300+ opiniones
                - generic [ref=e55] [cursor=pointer]:
                  - generic [ref=e56]: ℹ️
                  - text: Información importante
            - button "Inicia sesión para continuar" [ref=e58] [cursor=pointer]
          - generic [ref=e59]:
            - generic [ref=e60]:
              - heading "Ajustar Reserva" [level=3] [ref=e61]
              - generic [ref=e62]:
                - generic [ref=e63]: "Días de renta:"
                - spinbutton "Días de renta:" [ref=e64]: "3"
              - generic [ref=e65]:
                - generic [ref=e66]: "Edad del conductor:"
                - spinbutton "Edad del conductor:" [ref=e67]: "30"
            - generic [ref=e68]:
              - heading "Recogida y devolución" [level=3] [ref=e69]
              - generic [ref=e70]:
                - generic [ref=e72]:
                  - generic [ref=e74]: lun, 5 oct - 10:00
                  - generic [ref=e75]: Quito Aeropuerto
                - generic [ref=e76]:
                  - generic [ref=e78]: jue, 8 oct - 10:00
                  - generic [ref=e79]: Quito Aeropuerto
            - generic [ref=e80]:
              - heading "Desglose del precio del coche" [level=3] [ref=e81]
              - generic [ref=e82]:
                - generic [ref=e83]: Precio del alquiler (3 días)
                - generic [ref=e84]: 106.50 US$
              - generic [ref=e85]:
                - generic [ref=e86]: Total
                - generic [ref=e87]: 106.50 US$
              - paragraph [ref=e88]: Si pagas con una tarjeta ecuatoriana, el proveedor te cobrará un cargo adicional, de acuerdo con la legislación fiscal de Ecuador.
            - generic [ref=e89]:
              - heading "Este vehículo cuesta tan solo 106.50 US$, ¡una verdadera ganga!" [level=4] [ref=e90]
              - paragraph [ref=e91]: En esta época del año, un coche pequeño en Quito Aeropuerto suele costar 149.10 US$.
    - contentinfo [ref=e92]:
      - navigation "Enlaces legales" [ref=e93]:
        - link "Politica de Privacidad" [ref=e94] [cursor=pointer]:
          - /url: /privacidad
        - generic [aria-hidden] [ref=e95]: ·
        - link "Terminos de Uso" [ref=e96] [cursor=pointer]:
          - /url: /terminos
        - generic [aria-hidden] [ref=e97]: ·
        - button "Preferencias de cookies" [ref=e98] [cursor=pointer]
      - paragraph [ref=e99]:
        - text: © 2026
        - strong [ref=e100]: Booking Prototipo
        - text: — Proyecto Integrador de Sistemas · Universidad
      - paragraph [ref=e101]: Powered by NestJS · React · PostgreSQL · Docker
  - dialog [ref=e103]:
    - generic [ref=e104]:
      - generic [aria-hidden] [ref=e105]: 🍪
      - heading "Usamos cookies" [level=2] [ref=e106]
    - paragraph [ref=e107]:
      - text: Actualmente usamos cookies para mantener tu sesion y tu seguridad. Con tu permiso Tambien queremos usar cookies de medicion para mejorar el servicio. Puedes decidir en cualquier momento desde el enlace
      - strong [ref=e108]: Preferencias de cookies
      - text: del pie de pagina.
    - paragraph [ref=e109]:
      - text: Lee nuestra
      - link "Politica de Privacidad" [active] [ref=e110] [cursor=pointer]:
        - /url: /privacidad
      - text: y nuestros
      - link "Terminos de Uso" [ref=e111] [cursor=pointer]:
        - /url: /terminos
      - text: .
    - generic [ref=e112]:
      - button "Solo esenciales" [ref=e113] [cursor=pointer]
      - button "Preferencias" [ref=e114] [cursor=pointer]
      - button "Aceptar todas" [ref=e115] [cursor=pointer]
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
> 69 |     await ai.aiAssert('Hay información del auto visible');
     |     ^ Error: Assertion failed: Hay información del auto visible
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