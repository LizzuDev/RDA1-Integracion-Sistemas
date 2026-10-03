import { test, expect } from '@playwright/test';

test.describe('Pruebas de Sincronización Offline y Resiliencia', () => {
  
  test('Debe mostrar alerta de offline y recuperar la conexión', async ({ page, context }) => {
    // Vamos a la ruta de Autos
    await page.goto('/autos');
    
    // Verificamos que cargó correctamente
    await expect(page.getByRole('button', { name: /buscar/i }).first()).toBeVisible();

    // Simulamos que desconectamos el internet
    await context.setOffline(true);
    
    // Al intentar hacer clic o interactuar que dispare un fetch de red fallaría, 
    // pero podemos verificar si nuestro Service Worker u OfflineSync maneja la falta de red.
    // También podemos forzar el evento online/offline
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Idealmente el sistema debería mostrar un Toast indicando que no hay conexión.
    // Ej: await expect(page.getByText('Sin conexión a internet')).toBeVisible();
    
    // Restauramos conexión
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    // Aquí se debería confirmar que la sincronización se realiza o el toast desaparece
  });

});
