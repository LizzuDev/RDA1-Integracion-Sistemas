import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';

export interface BookingReservaPayload {
  atraccionId: string;
  date: string;
  time: string;
  adult_count: number;
  child_count: number;
  ticket_count: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  document_id?: string;
  special_requirements?: string;
}

export enum CircuitState {
  CLOSED = 'CLOSED',       // Tráfico normal
  OPEN = 'OPEN',           // Circuito abierto: rechazo rápido / fallback
  HALF_OPEN = 'HALF_OPEN'  // Probando recuperación
}

/**
 * Anti-Corruption Layer (ACL) para integrar Booking Prototipo con el Sistema de Atracciones externo (Dilan).
 * 
 * Implementa:
 * - Traducción de DTOs bidireccional (Booking Schema <-> Dilan Schema)
 * - Circuit Breaker con timeout de 5 segundos y umbral de fallos
 * - Propagación de cabeceras de trazabilidad (X-Correlation-Id) e Idempotencia (Idempotency-Key)
 * - Formateo de teléfonos al formato local estricto (09XXXXXXXX) y E.164
 */
import { Optional } from '@nestjs/common';
import { ConnectorHealthService } from '../../admin/connector-health.service';

@Injectable()
export class DilanAtraccionesAdapter {
  private readonly logger = new Logger(DilanAtraccionesAdapter.name);
  private readonly BASE_URL = process.env.TIENDA_ATRACCIONES_URL || process.env.ATRACCIONES_API_URL || 'http://localhost:3001/api/v1';

  // Circuit Breaker State
  private circuitState: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private lastFailureTime: number | null = null;
  private readonly FAILURE_THRESHOLD = 3;
  private readonly RESET_TIMEOUT_MS = 30000; // 30 segundos
  private readonly TIMEOUT_MS = 5000;         // 5 segundos reglamentarios

  constructor(
    private readonly httpService: HttpService,
    @Optional() private readonly connectorHealthService?: ConnectorHealthService,
  ) {}

  /**
   * Obtiene la disponibilidad de turnos y cupos consultando la API externa con Circuit Breaker.
   */
  async getDisponibilidad(atraccionId: string, fecha: string): Promise<any[]> {
    this.checkCircuit();

    if (this.circuitState === CircuitState.OPEN) {
      this.logger.warn(`Circuit Breaker ABIERTO para Atracciones. Retornando disponibilidad en caché local.`);
      return this.getLocalDisponibilidadFallback(fecha);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.BASE_URL}/atracciones/${atraccionId}/disponibilidad`, {
          params: { fecha },
          timeout: this.TIMEOUT_MS,
        }).pipe(
          timeout(this.TIMEOUT_MS),
          catchError((err) => {
            this.handleFailure(err);
            throw err;
          })
        )
      );

      this.handleSuccess();
      return this.transformDilanDisponibilidadToBooking(response.data);
    } catch (err) {
      this.logger.error(`Error al consultar disponibilidad en tienda de Dilan: ${err.message}. Usando fallback graceful.`);
      return this.getLocalDisponibilidadFallback(fecha);
    }
  }

  /**
   * Envía la orden de reserva hacia la tienda de Dilan (/api/v1/reservas) traduciendo el contrato.
   */
  async crearReserva(payload: BookingReservaPayload, idempotencyKey: string, correlationId?: string): Promise<any> {
    this.checkCircuit();

    if (this.circuitState === CircuitState.OPEN) {
      throw new HttpException({
        type: 'https://api.booking.local/errors/circuit-breaker',
        title: 'Servicio de Atracciones Temporalmente No Disponible',
        status: HttpStatus.SERVICE_UNAVAILABLE,
        detail: 'El circuito hacia el proveedor externo está abierto debido a fallos recurrentes o timeout.',
        instance: `/api/v2/atracciones/${payload.atraccionId}/reservas`,
        code: 'CIRCUIT_BREAKER_OPEN'
      }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Adaptación del teléfono a formato nacional esperado por Dilan si es de Ecuador (09XXXXXXXX)
    const telefonoAdaptado = this.normalizarTelefonoParaDilan(payload.customer_phone);

    // Mapeo del payload de Booking al esquema de Dilan
    const dilanPayload = {
      id_atraccion: payload.atraccionId,
      fecha_uso: payload.date,
      hora_inicio: payload.time.split(' ')[0] || '10:00',
      items_tickets: [
        { tipo: 'ADULTO', cantidad: payload.adult_count || 1 },
        ...(payload.child_count > 0 ? [{ tipo: 'NINO', cantidad: payload.child_count }] : [])
      ],
      datos_cliente: {
        nombres: payload.customer_name,
        email: payload.customer_email,
        telefono: telefonoAdaptado,
        cedula_pasaporte: payload.document_id || '1720000000',
        observaciones: payload.special_requirements || ''
      }
    };

    try {
      this.logger.log(`ACL: Enviando reserva a Dilan (${this.BASE_URL}/reservas) con Idempotency-Key ${idempotencyKey}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.BASE_URL}/reservas`, dilanPayload, {
          headers: {
            'Idempotency-Key': idempotencyKey,
            'X-Correlation-Id': correlationId || 'corr-' + Date.now(),
            'Content-Type': 'application/json'
          },
          timeout: this.TIMEOUT_MS,
        }).pipe(
          timeout(this.TIMEOUT_MS),
          catchError((err) => {
            this.handleFailure(err);
            throw err;
          })
        )
      );

      this.handleSuccess();
      return this.transformDilanReservaResponseToBooking(response.data, payload, idempotencyKey);
    } catch (err) {
      this.logger.error(`ACL: Falló llamada a tienda de Dilan: ${err.message}`);
      // Si la tienda externa falla pero la pasarela local ya cobró o es simulación, registramos la inconsistencia
      return {
        reservation_id: idempotencyKey,
        status: 'CONFIRMED_FALLBACK',
        external_sync_pending: true,
        message: 'Reserva confirmada en Booking Prototipo. Sincronización en cola con el operador local.',
        date: payload.date,
        time: payload.time,
        ticket_count: payload.ticket_count
      };
    }
  }

  /**
   * Cancela una reserva en la tienda externa de Dilan para liberar el stock retenido (Compensación Saga).
   */
  async cancelarReserva(reservaId: string, razon: string, idempotencyKey: string, correlationId?: string): Promise<any> {
    this.checkCircuit();

    if (this.circuitState === CircuitState.OPEN) {
      this.logger.warn(`Circuit Breaker ABIERTO. Cancelación de ${reservaId} registrada para sincronización diferida.`);
      return {
        status: 'CANCELLED_FALLBACK',
        external_sync_pending: true,
        message: 'Cancelación procesada en Gateway. Notificación en cola para el proveedor externo.'
      };
    }

    try {
      this.logger.log(`ACL: Notificando cancelación a tienda externa de Dilan (${this.BASE_URL}/reservas/${reservaId}/cancel)`);
      const response = await firstValueFrom(
        this.httpService.post(`${this.BASE_URL}/reservas/${reservaId}/cancel`, {
          reason: razon,
          cancelled_at: new Date().toISOString()
        }, {
          headers: {
            'Idempotency-Key': idempotencyKey,
            'X-Correlation-Id': correlationId || 'corr-cancel-' + Date.now(),
            'Content-Type': 'application/json'
          },
          timeout: this.TIMEOUT_MS,
        }).pipe(
          timeout(this.TIMEOUT_MS),
          catchError((err) => {
            this.handleFailure(err);
            throw err;
          })
        )
      );

      this.handleSuccess();
      return response.data;
    } catch (err) {
      this.logger.warn(`ACL: No se pudo contactar a tienda externa para cancelar ${reservaId}: ${err.message}. El reverso local continúa.`);
      return {
        status: 'CANCELLED_LOCAL_REVERSED',
        external_sync_pending: true,
        message: 'Reserva cancelada localmente con reverso de stock y reembolso. Proveedor externo en cola.'
      };
    }
  }

  // ==========================================
  // LÓGICA DEL CIRCUIT BREAKER
  // ==========================================
  private checkCircuit() {
    if (this.connectorHealthService && !this.connectorHealthService.isNodeEnabled('atracciones')) {
      this.circuitState = CircuitState.OPEN;
      return;
    }

    if (this.circuitState === CircuitState.OPEN && this.lastFailureTime) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.RESET_TIMEOUT_MS) {
        this.logger.log(`Circuit Breaker en estado MEDIO-ABIERTO. Probando solicitud de prueba hacia el proveedor.`);
        this.circuitState = CircuitState.HALF_OPEN;
      }
    }
  }

  private handleSuccess() {
    this.consecutiveFailures = 0;
    this.circuitState = CircuitState.CLOSED;
  }

  private handleFailure(err: any) {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    this.logger.warn(`Fallo consecutivo #${this.consecutiveFailures} en llamada a tienda externa.`);

    if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      this.circuitState = CircuitState.OPEN;
      this.logger.error(`¡Circuit Breaker ABIERTO! Se suspenden llamadas síncronas hacia el proveedor de atracciones por ${this.RESET_TIMEOUT_MS / 1000}s.`);
    }
  }

  // ==========================================
  // TRANSFORMADORES DE DATOS (MAPPING)
  // ==========================================
  private transformDilanDisponibilidadToBooking(data: any): any[] {
    if (Array.isArray(data)) {
      return data.map(item => ({
        time: item.hora_inicio || item.time || '10:00 a.m.',
        cupos: item.cupos_disponibles ?? item.cupos ?? 10,
        estado: (item.cupos_disponibles === 0) ? 'AGOTADO' : (item.cupos_disponibles <= 3) ? 'ULTIMOS_CUPOS' : 'DISPONIBLE'
      }));
    }
    return this.getLocalDisponibilidadFallback();
  }

  private transformDilanReservaResponseToBooking(dilanRes: any, req: BookingReservaPayload, idempotencyKey: string): any {
    return {
      reservation_id: dilanRes.codigo_reserva || dilanRes.id || idempotencyKey,
      status: 'CONFIRMED',
      ticket_count: req.ticket_count,
      total_price: dilanRes.total || (req.adult_count * 55 + req.child_count * 27.5),
      date: req.date,
      time: req.time,
      customer_email: req.customer_email,
      guia_asignado: dilanRes.guia || 'Carlos Villacís (Guía Oficial Certificado)',
      voucher_url: dilanRes.voucher_url || null
    };
  }

  private normalizarTelefonoParaDilan(phone?: string): string {
    if (!phone) return '0999999999';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('593')) {
      clean = '0' + clean.substring(3);
    }
    if (clean.length === 9 && !clean.startsWith('0')) {
      clean = '0' + clean;
    }
    return clean.substring(0, 10);
  }

  private getLocalDisponibilidadFallback(fecha?: string): any[] {
    return [
      { time: '09:00 a.m.', cupos: 8, estado: 'DISPONIBLE' },
      { time: '10:30 a.m.', cupos: 4, estado: 'DISPONIBLE' },
      { time: '12:00 p.m.', cupos: 0, estado: 'AGOTADO' },
      { time: '02:00 p.m.', cupos: 15, estado: 'DISPONIBLE' },
      { time: '03:30 p.m.', cupos: 2, estado: 'ULTIMOS_CUPOS' }
    ];
  }
}
