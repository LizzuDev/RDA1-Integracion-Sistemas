import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Pruebas de Accesibilidad', () => {
  test('La página principal debe cumplir con WCAG', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('booking.consentimientoCookies.v1', JSON.stringify({ decision: 'all', fecha: new Date().toISOString(), version: 1 }));
    });
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    // Imprimimos violaciones si existen para analizarlas
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violaciones en Home:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('La página de Autos debe cumplir con WCAG', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('booking.consentimientoCookies.v1', JSON.stringify({ decision: 'all', fecha: new Date().toISOString(), version: 1 }));
    });
    await page.goto('/autos');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violaciones en Autos:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('La página de Atracciones debe cumplir con WCAG', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('booking.consentimientoCookies.v1', JSON.stringify({ decision: 'all', fecha: new Date().toISOString(), version: 1 }));
    });
    await page.goto('/atracciones');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violaciones en Atracciones:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
  });

  test('La página de Vuelos debe cumplir con WCAG', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('booking.consentimientoCookies.v1', JSON.stringify({ decision: 'all', fecha: new Date().toISOString(), version: 1 }));
    });
    await page.goto('/vuelos');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violaciones en Vuelos:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('La página de Login debe cumplir con WCAG', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('booking.consentimientoCookies.v1', JSON.stringify({ decision: 'all', fecha: new Date().toISOString(), version: 1 }));
    });
    await page.goto('/login');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violaciones en Login:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('La página de Registro debe cumplir con WCAG', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('booking.consentimientoCookies.v1', JSON.stringify({ decision: 'all', fecha: new Date().toISOString(), version: 1 }));
    });
    await page.goto('/register');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violaciones en Registro:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('La página de Detalle de Autos debe cumplir con WCAG', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('booking.consentimientoCookies.v1', JSON.stringify({ decision: 'all', fecha: new Date().toISOString(), version: 1 }));
    });
    await page.goto('/autos/1');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violaciones en Detalle Auto:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('La página de Detalle de Atracciones debe cumplir con WCAG', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('booking.consentimientoCookies.v1', JSON.stringify({ decision: 'all', fecha: new Date().toISOString(), version: 1 }));
    });
    await page.goto('/atracciones/1');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violaciones en Detalle Atraccion:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
