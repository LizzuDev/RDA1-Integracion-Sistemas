import { VuelosService } from './vuelos.service';

describe('VuelosService (Métodos Privados)', () => {
  describe('Métodos Privados de Pricing', () => {
    it('_calcularPrecioAgrupado debería calcular correctamente para un ADULT en ECONOMY', () => {
      const p = { adults: 1 };
      // Llamamos al prototipo directamente porque el método no usa estado ni dependencias inyectadas
      const result = (VuelosService.prototype as any)._calcularPrecioAgrupado('ECONOMY', p);
      
      // BASE: ECONOMY = 68. ADULT = 1.0. TASA = 0.18.
      // Total Base = 68. Tax = 68 * 0.18 = 12.24. Total = 80.24.
      expect(result.base).toBe(68);
      expect(result.tax).toBeCloseTo(12.24);
      expect(result.total).toBeCloseTo(80.24);
    });

    it('_calcularPrecioAgrupado debería calcular correctamente para varios pasajeros', () => {
      const p = { adults: 2, children: 1 };
      // ECONOMY = 68. ADULT = 1.0. CHILD = 0.68.
      // ADULTS = 68 * 1 * 2 = 136
      // CHILD = 68 * 0.68 * 1 = 46.24
      // Total Base = 182.24
      const result = (VuelosService.prototype as any)._calcularPrecioAgrupado('ECONOMY', p);
      
      expect(result.base).toBeCloseTo(182.24);
      expect(result.tax).toBeCloseTo(182.24 * 0.18);
    });
  });
});
