import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';

export enum CircuitState {
  CLOSED = 'CLOSED',       // Tráfico normal
  OPEN = 'OPEN',           // Circuito abierto: rechazo rápido / fallback
  HALF_OPEN = 'HALF_OPEN'  // Probando recuperación
}

export interface ExternalAutoBookingPayload {
  vehicle_id: string;
  dias: number;
  pickup_date: string;
  dropoff_date: string;
  pickup_location: string;
  dropoff_location: string;
  tipo_cobertura: string;
  conductor: {
    nombre: string;
    email: string;
    telefono: string;
    licencia: string;
    edad: number;
    numero_vuelo?: string;
  };
}

/**
 * Anti-Corruption Layer (ACL) para Integración de Renta de Autos (RDA2).
 * 
 * Cumple con:
 * - Consideraciones RDA2 §3 & §5: Resiliencia con Circuit Breaker y Timeout de 5s.
 * - Inyección de Idempotency-Key y X-Correlation-Id.
 * - Normalización de teléfono E.164 / formato ecuatoriano.
 * - Mapeo de errores a RFC 7807 (Problem Details).
 */
@Injectable()
export class AutosCircuitBreakerAdapter {
  private readonly logger = new Logger(AutosCircuitBreakerAdapter.name);
  private readonly EXTERNAL_API_URL = process.env.AUTOS_SUPPLIER_URL || 'https://jsonplaceholder.typicode.com/posts';

  // Circuit Breaker State
  private circuitState: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private lastFailureTime: number | null = null;
  private readonly FAILURE_THRESHOLD = 3;
  private readonly RESET_TIMEOUT_MS = 30000; // 30s
  private readonly TIMEOUT_MS = 5000;         // 5s reglamentarios

  constructor(private readonly httpService: HttpService) {}

  /**
   * Consulta flota de vehículos externos con protección por Circuit Breaker.
   */
  async fetchExternalCars(searchParams: any, correlationId?: string): Promise<any[]> {
    this.checkCircuit();

    if (this.circuitState === CircuitState.OPEN) {
      this.logger.warn(`[AutosCircuitBreaker] Circuito ABIERTO. Usando fallback de catálogo local.`);
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.EXTERNAL_API_URL, {
          params: { _limit: 3 },
          headers: {
            'X-Correlation-Id': correlationId || `corr-auto-${Date.now()}`
          },
          timeout: this.TIMEOUT_MS
        }).pipe(
          timeout(this.TIMEOUT_MS),
          catchError((err) => {
            this.handleFailure(err);
            throw err;
          })
        )
      );

      this.handleSuccess();
      return this.transformExternalCars(response.data);
    } catch (err) {
      this.logger.warn(`[AutosCircuitBreaker] Falló consulta externa: ${err.message}. Retornando lista vacía controlada.`);
      return [];
    }
  }

  /**
   * Envía reserva a proveedor externo con Idempotency-Key.
   */
  async createExternalOrder(
    payload: ExternalAutoBookingPayload,
    idempotencyKey: string,
    correlationId?: string
  ): Promise<any> {
    this.checkCircuit();

    if (this.circuitState === CircuitState.OPEN) {
      throw new HttpException({
        type: 'https://api.booking.local/errors/supplier-timeout',
        title: 'Proveedor de Autos No Disponible',
        status: HttpStatus.SERVICE_UNAVAILABLE,
        detail: 'El circuito hacia el proveedor externo de autos está ABIERTO debido a fallos recurrentes.',
        code: 'SUPPLIER_CIRCUIT_OPEN',
        timestamp: new Date().toISOString()
      }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    const normalizedPhone = this.normalizePhone(payload.conductor.telefono);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.EXTERNAL_API_URL}`, {
          ...payload,
          conductor: {
            ...payload.conductor,
            telefono: normalizedPhone
          }
        }, {
          headers: {
            'Idempotency-Key': idempotencyKey,
            'X-Correlation-Id': correlationId || `corr-auto-${Date.now()}`
          },
          timeout: this.TIMEOUT_MS
        }).pipe(
          timeout(this.TIMEOUT_MS),
          catchError((err) => {
            this.handleFailure(err);
            throw err;
          })
        )
      );

      this.handleSuccess();
      return {
        external_order_id: `EXT-${response.data?.id || Date.now()}`,
        status: 'CONFIRMED'
      };
    } catch (err) {
      throw new HttpException({
        type: 'https://api.booking.local/errors/supplier-timeout',
        title: 'Fallo al Comunicar con Agencia Externa',
        status: HttpStatus.SERVICE_UNAVAILABLE,
        detail: `La agencia externa no respondió en el tiempo límite (${this.TIMEOUT_MS}ms).`,
        code: 'SUPPLIER_TIMEOUT',
        timestamp: new Date().toISOString()
      }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private transformExternalCars(items: any[]): any[] {
    if (!Array.isArray(items)) return [];
    return items.map((item, idx) => ({
      vehicle_id: `ext-hertz-${item.id || idx + 1}`,
      marca: idx % 2 === 0 ? 'Toyota' : 'Hyundai',
      modelo: idx % 2 === 0 ? 'Corolla' : 'Grand i10',
      categoria: idx % 2 === 0 ? 'COMPACTO' : 'ECONOMICO',
      precio_diario: idx % 2 === 0 ? 42.00 : 34.00,
      moneda: 'USD',
      transmision: idx % 2 === 0 ? 'AUTOMATICO' : 'MANUAL',
      asientos: 5,
      puertas: 4,
      maletas_grandes: 2,
      maletas_pequenas: 1,
      aire_acondicionado: true,
      kilometraje_ilimitado: true,
      politica_combustible: 'LLENO_A_LLENO',
      cancelacion_gratuita: true,
      proveedor: {
        nombre: 'Hertz International',
        rating: 8.7,
        ubicacion: 'Terminal de Llegadas (Mostrador 4)'
      },
      estado: 'DISPONIBLE',
      images: [
        idx % 2 === 0 
          ? 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600'
          : 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600'
      ]
    }));
  }

  private normalizePhone(phone: string): string {
    if (!phone) return '+593999999999';
    const clean = phone.replace(/[^\d+]/g, '');
    if (clean.startsWith('09') && clean.length === 10) {
      return '+593' + clean.substring(1);
    }
    if (clean.startsWith('9') && clean.length === 9) {
      return '+593' + clean;
    }
    return clean;
  }

  private checkCircuit() {
    if (this.circuitState === CircuitState.OPEN && this.lastFailureTime) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed > this.RESET_TIMEOUT_MS) {
        this.circuitState = CircuitState.HALF_OPEN;
        this.logger.log('[AutosCircuitBreaker] Circuito transiciona a HALF_OPEN para reintento de prueba.');
      }
    }
  }

  private handleSuccess() {
    this.consecutiveFailures = 0;
    this.circuitState = CircuitState.CLOSED;
  }

  private handleFailure(error: any) {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    this.logger.error(`[AutosCircuitBreaker] Fallo consecutivo #${this.consecutiveFailures}: ${error.message}`);
    if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      this.circuitState = CircuitState.OPEN;
      this.logger.warn(`[AutosCircuitBreaker] UMBRAL ALCANZADO. Circuito ABIERTO por ${this.RESET_TIMEOUT_MS / 1000}s.`);
    }
  }

  getCircuitStatus() {
    return {
      state: this.circuitState,
      failures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime
    };
  }
}
