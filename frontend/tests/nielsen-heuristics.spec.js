import { test, expect } from '@playwright/test';
import { PlaywrightAgent } from '@midscene/web/playwright';

test.describe('Auditoría de Heurísticas de Nielsen con Midscene', () => {
  test.setTimeout(300000); // 5 minutos para permitir que llava procese las imagenes

  test('Evaluación visual de Vuelos con IA', async ({ page }) => {
    process.env.OPENAI_API_KEY = "ollama";
    process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
    process.env.MIDSCENE_MODEL_NAME = "llava";
    await page.goto('/vuelos');
    
    // Esperamos a que cargue la estructura básica
    await page.waitForLoadState('networkidle');

    // Inicializamos el agente IA de Midscene
    const ai = new PlaywrightAgent(page);

    await ai.aiAssert('Hay una barra de navegación en la parte superior');
  });

  test('Evaluación visual de Autos con IA', async ({ page }) => {
    process.env.OPENAI_API_KEY = "ollama";
    process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
    process.env.MIDSCENE_MODEL_NAME = "llava";
    await page.goto('/autos');
    await page.waitForLoadState('networkidle');
    const ai = new PlaywrightAgent(page);
    await ai.aiAssert('Hay un título claro que indica renta de autos');
  });

  test('Evaluación visual de Atracciones con IA', async ({ page }) => {
    process.env.OPENAI_API_KEY = "ollama";
    process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
    process.env.MIDSCENE_MODEL_NAME = "llava";
    await page.goto('/atracciones');
    await page.waitForLoadState('networkidle');
    const ai = new PlaywrightAgent(page);
    await ai.aiAssert('Hay contenido sobre atracciones visible');
  });

  test('Evaluación visual de Login con IA', async ({ page }) => {
    process.env.OPENAI_API_KEY = "ollama";
    process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
    process.env.MIDSCENE_MODEL_NAME = "llava";
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const ai = new PlaywrightAgent(page);
    await ai.aiAssert('Hay un formulario de inicio de sesión');
  });

  test('Evaluación visual de Registro con IA', async ({ page }) => {
    process.env.OPENAI_API_KEY = "ollama";
    process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
    process.env.MIDSCENE_MODEL_NAME = "llava";
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    const ai = new PlaywrightAgent(page);
    await ai.aiAssert('Hay un formulario de registro');
  });

  test('Evaluación visual de Detalle Auto con IA', async ({ page }) => {
    process.env.OPENAI_API_KEY = "ollama";
    process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
    process.env.MIDSCENE_MODEL_NAME = "llava";
    await page.goto('/autos/1');
    await page.waitForLoadState('networkidle');
    const ai = new PlaywrightAgent(page);
    await ai.aiAssert('Hay información del auto visible');
  });

  test('Evaluación visual de Detalle Atraccion con IA', async ({ page }) => {
    process.env.OPENAI_API_KEY = "ollama";
    process.env.OPENAI_BASE_URL = "http://localhost:11434/v1";
    process.env.MIDSCENE_MODEL_NAME = "llava";
    await page.goto('/atracciones/1');
    await page.waitForLoadState('networkidle');
    const ai = new PlaywrightAgent(page);
    await ai.aiAssert('Hay detalles de la atracción visibles');
  });

});
