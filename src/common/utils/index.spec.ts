import { aFechaIso, aImporte, minutosEntre, redondear, sha256 } from './index';

describe('Common Utils', () => {
  describe('minutosEntre', () => {
    it('debería calcular la diferencia correcta en minutos', () => {
      const desde = new Date('2026-09-28T10:00:00Z');
      const hasta = new Date('2026-09-28T11:30:00Z');
      expect(minutosEntre(desde, hasta)).toBe(90);
    });

    it('debería redondear los minutos al entero más cercano', () => {
      const desde = new Date('2026-09-28T10:00:00Z');
      const hasta = new Date('2026-09-28T10:00:30.100Z'); // 30.1s = ~0.5 min -> 1 min
      expect(minutosEntre(desde, hasta)).toBe(1);
    });
  });

  describe('aImporte', () => {
    it('debería formatear un entero con 2 decimales', () => {
      expect(aImporte(100)).toBe('100.00');
    });

    it('debería formatear un decimal limitándolo a 2 decimales', () => {
      expect(aImporte(100.1234)).toBe('100.12');
    });
  });

  describe('aFechaIso', () => {
    it('debería retornar el mismo string truncado si es un string', () => {
      expect(aFechaIso('2026-11-03T10:00:00Z')).toBe('2026-11-03');
    });

    it('debería retornar YYYY-MM-DD para un objeto Date local', () => {
      // Como Date depende de la zona horaria local donde corra el test, 
      // construimos los componentes manualmente para asegurar que no falle en CI.
      const localDate = new Date();
      localDate.setFullYear(2026);
      localDate.setMonth(10); // Noviembre (0-indexed)
      localDate.setDate(3);

      expect(aFechaIso(localDate)).toBe('2026-11-03');
    });
  });

  describe('redondear', () => {
    it('debería evitar el error de toFixed en números problemáticos', () => {
      expect(redondear(1.005)).toBe(1.01);
    });

    it('debería redondear correctamente hacia abajo', () => {
      expect(redondear(1.004)).toBe(1.00);
    });
  });

  describe('sha256', () => {
    it('debería devolver un hash hex válido', () => {
      const result = sha256('test');
      expect(result).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    });
  });
});
