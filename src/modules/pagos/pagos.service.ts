import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransaccionPago } from './entities';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';
import * as crypto from 'crypto';

export type ModoSimuladorPago = 'NORMAL' | 'RECHAZO_FONDOS' | 'TIMEOUT_RED' | 'ERROR_INTERNO';

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  // Configuración en vivo para inyección de fallos controlada (Panel 6 - Simulador SOA)
  private modoSimulador: ModoSimuladorPago = 'NORMAL';
  private latenciaSimuladaMs = 250;

  constructor(
    @InjectRepository(TransaccionPago)
    private readonly transaccionRepo: Repository<TransaccionPago>,
    private readonly winstonLogger: WinstonPhysicalLoggerService,
  ) {}

  async procesarPago(dto: {
    monto: number;
    metodo_pago?: string;
    numero_tarjeta?: string;
    cliente_id?: string;
    factura_id?: string;
    carrito_id?: string;
    simular_escenario?: ModoSimuladorPago;
  }, idempotencyKey: string): Promise<any> {
    const safeKey = idempotencyKey || `idem-pay-${Date.now()}`;
    this.logger.log(`[PagosService] Procesando cobro por $${dto.monto} [Idempotency-Key: ${safeKey}]`);

    // 1. Verificación de Idempotencia
    const existente = await this.transaccionRepo.findOne({ where: { idempotencyKey: safeKey } });
    if (existente) {
      this.logger.warn(`Transacción previa localizada para idempotency key ${safeKey}`);
      return {
        transaccion_id: existente.id,
        codigo_autorizacion: existente.codigoAutorizacion,
        estado: existente.estado,
        monto: Number(existente.montoTotal),
        moneda: existente.moneda,
        mensaje: 'Transacción recuperada exitosamente (Idempotente).',
        es_idempotente: true,
      };
    }

    const escenario = dto.simular_escenario || this.modoSimulador;

    // 2. Inyección de Fallos Simulados (Cátedra Consideraciones RDA2 §7)
    if (escenario === 'TIMEOUT_RED') {
      this.logger.error(`[Simulador Pagos SOA] Inyectando TIMEOUT DE RED (5.5 segundos de retardo)`);
      await new Promise(resolve => setTimeout(resolve, 5500));
      this.winstonLogger.logAudit('PAGO_FALLO_TIMEOUT_SIMULADO', {
        monto: dto.monto,
        idempotency_key: safeKey,
        escenario: 'TIMEOUT_RED',
      });
      throw new HttpException({
        status: HttpStatus.GATEWAY_TIMEOUT,
        error: 'Gateway Timeout: La pasarela de pagos no respondió dentro del límite reglamentario (Circuit Breaker activado).',
        code: 'PAYMENT_GATEWAY_TIMEOUT',
      }, HttpStatus.GATEWAY_TIMEOUT);
    }

    if (escenario === 'RECHAZO_FONDOS') {
      this.logger.warn(`[Simulador Pagos SOA] Inyectando RECHAZO POR FONDOS INSUFICIENTES`);
      const transaccionRechazada = this.transaccionRepo.create({
        idempotencyKey: safeKey,
        clienteId: dto.cliente_id,
        facturaId: dto.factura_id,
        carritoId: dto.carrito_id,
        montoTotal: Number(dto.monto),
        moneda: 'USD',
        metodoPago: dto.metodo_pago || 'TARJETA_CREDITO',
        numeroTarjetaEnmascarado: this.enmascararTarjeta(dto.numero_tarjeta),
        estado: 'RECHAZADO',
        mensajePasarela: 'Transacción denegada: Fondos insuficientes en la cuenta emisora.',
      });
      await this.transaccionRepo.save(transaccionRechazada);

      this.winstonLogger.logAudit('PAGO_RECHAZADO_FONDOS', {
        monto: dto.monto,
        idempotency_key: safeKey,
        estado: 'RECHAZADO',
      });

      throw new HttpException({
        status: HttpStatus.PAYMENT_REQUIRED,
        error: 'Transacción denegada: Fondos insuficientes en la tarjeta proporcionada.',
        code: 'INSUFFICIENT_FUNDS',
      }, HttpStatus.PAYMENT_REQUIRED);
    }

    // 3. Simulación de procesamiento exitoso con latencia de pasarela bancaria
    if (this.latenciaSimuladaMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latenciaSimuladaMs));
    }

    const authCode = `AUTH-PAG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const nuevaTransaccion = this.transaccionRepo.create({
      idempotencyKey: safeKey,
      clienteId: dto.cliente_id,
      facturaId: dto.factura_id,
      carritoId: dto.carrito_id,
      montoTotal: Number(dto.monto),
      moneda: 'USD',
      metodoPago: dto.metodo_pago || 'TARJETA_CREDITO',
      numeroTarjetaEnmascarado: this.enmascararTarjeta(dto.numero_tarjeta),
      estado: 'APROBADO',
      codigoAutorizacion: authCode,
      mensajePasarela: 'Cobro aprobado por la red adquirente.',
    });

    const guardada = await this.transaccionRepo.save(nuevaTransaccion);

    this.winstonLogger.logAudit('PAGO_APROBADO_EXITOSAMENTE', {
      transaccion_id: guardada.id,
      codigo_autorizacion: authCode,
      monto: Number(guardada.montoTotal),
      metodo_pago: guardada.metodoPago,
      idempotency_key: safeKey,
    });

    return {
      transaccion_id: guardada.id,
      codigo_autorizacion: authCode,
      estado: 'APROBADO',
      monto: Number(guardada.montoTotal),
      moneda: 'USD',
      fecha_procesamiento: guardada.createdAt,
      mensaje: 'Pago procesado exitosamente. Código de autorización generado.',
    };
  }

  async procesarReembolso(dto: {
    transaccion_id?: string;
    codigo_autorizacion?: string;
    monto?: number;
    motivo?: string;
  }, idempotencyKey: string): Promise<any> {
    const safeKey = idempotencyKey || `idem-ref-${Date.now()}`;
    this.logger.log(`[PagosService] Procesando reembolso Saga [Idempotency-Key: ${safeKey}]`);

    let tx = null;
    if (dto.transaccion_id) {
      tx = await this.transaccionRepo.findOne({ where: { id: dto.transaccion_id } });
    } else if (dto.codigo_autorizacion) {
      tx = await this.transaccionRepo.findOne({ where: { codigoAutorizacion: dto.codigo_autorizacion } });
    }

    if (tx && tx.estado === 'REEMBOLSADO') {
      return {
        transaccion_id: tx.id,
        codigo_reembolso: tx.codigoReembolso,
        estado: 'REEMBOLSADO',
        monto: Number(tx.montoTotal),
        mensaje: 'Reembolso ya emitido previamente (Idempotente).',
      };
    }

    const refCode = `REF-PAG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const montoReembolsado = dto.monto ? Number(dto.monto) : (tx ? Number(tx.montoTotal) : 0);

    if (tx) {
      tx.estado = 'REEMBOLSADO';
      tx.codigoReembolso = refCode;
      tx.mensajePasarela = `Reembolso compensatorio emitido: ${dto.motivo || 'Compensación Saga LIFO'}`;
      await this.transaccionRepo.save(tx);
    }

    this.winstonLogger.logAudit('PAGO_REEMBOLSADO_COMPENSADO', {
      transaccion_id: tx?.id,
      codigo_reembolso: refCode,
      monto: montoReembolsado,
      motivo: dto.motivo || 'Compensación distribuida Saga',
      idempotency_key: safeKey,
    });

    return {
      success: true,
      codigo_reembolso: refCode,
      estado: 'REEMBOLSADO',
      monto_reembolsado: montoReembolsado,
      fecha_reembolso: new Date().toISOString(),
      mensaje: 'Reembolso compensatorio ejecutado exitosamente dentro del flujo Saga.',
    };
  }

  getConfigSimulador(): any {
    return {
      modo_actual: this.modoSimulador,
      latencia_ms: this.latenciaSimuladaMs,
      modos_disponibles: ['NORMAL', 'RECHAZO_FONDOS', 'TIMEOUT_RED', 'ERROR_INTERNO'],
    };
  }

  updateConfigSimulador(dto: { modo: ModoSimuladorPago; latencia_ms?: number }): any {
    if (dto.modo) {
      this.modoSimulador = dto.modo;
    }
    if (dto.latencia_ms !== undefined) {
      this.latenciaSimuladaMs = Math.max(0, Number(dto.latencia_ms));
    }
    this.logger.log(`[Simulador Pagos SOA] Configuración actualizada: modo=${this.modoSimulador}, latencia=${this.latenciaSimuladaMs}ms`);
    return this.getConfigSimulador();
  }

  async getHistorialTransacciones(limit = 20): Promise<any[]> {
    return this.transaccionRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private enmascararTarjeta(num?: string): string {
    if (!num) return '•••• •••• •••• 4242';
    const clean = num.replace(/\D/g, '');
    if (clean.length >= 4) {
      return `•••• •••• •••• ${clean.slice(-4)}`;
    }
    return '•••• •••• •••• 4242';
  }
}
