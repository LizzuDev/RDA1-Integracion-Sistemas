import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SagaTransaccion, SagaPasoJournal } from '../entities';
import { PagosService } from '../../pagos/pagos.service';
import { FinanzasService } from '../../finanzas/finanzas.service';
import { AtraccionesService } from '../../atracciones/atracciones.service';
import { AutosService } from '../../autos/autos.service';
import { WinstonPhysicalLoggerService } from '../../../core/logger/winston-logger.service';
import * as crypto from 'crypto';

export interface CheckoutSagaInput {
  cliente_id?: string;
  cliente_email: string;
  cliente_nombre: string;
  metodo_pago?: string;
  numero_tarjeta?: string;
  items: Array<{
    vertical: 'ATRACCIONES' | 'AUTOS' | 'ALOJAMIENTOS' | 'VUELOS' | 'PAQUETES';
    item_id: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    detalles_reserva?: any;
  }>;
  simular_fallo_en_paso?: 'PAGO_RECHAZADO' | 'PAGO_TIMEOUT' | 'INVENTARIO_AGOTADO';
}

@Injectable()
export class SagaOrchestratorService {
  private readonly logger = new Logger(SagaOrchestratorService.name);

  constructor(
    @InjectRepository(SagaTransaccion)
    private readonly sagaRepo: Repository<SagaTransaccion>,
    @InjectRepository(SagaPasoJournal)
    private readonly journalRepo: Repository<SagaPasoJournal>,
    private readonly pagosService: PagosService,
    private readonly finanzasService: FinanzasService,
    private readonly atraccionesService: AtraccionesService,
    private readonly autosService: AutosService,
    private readonly winstonLogger: WinstonPhysicalLoggerService,
  ) {}

  /**
   * Orquestación Transaccional de Checkout Multidominio mediante el Patrón Saga (§8 Consideraciones).
   * Ejecuta transacciones distribuidas con bitácora relacional (`schema_auditoria`)
   * y compensación automática en orden inverso (LIFO) ante fallos.
   */
  async ejecutarCheckoutCompuesto(dto: CheckoutSagaInput, idempotencyKey: string): Promise<any> {
    const correlationId = `SAGA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const totalVenta = dto.items.reduce((acc, it) => acc + (it.precio_unitario * it.cantidad), 0);

    this.logger.log(`[SAGA ORCHESTRATOR] Iniciando Saga Checkout Compuesto [Correlation-ID: ${correlationId}] por $${totalVenta}`);

    // 1. Crear registro maestro de la Saga en schema_auditoria
    const saga = this.sagaRepo.create({
      correlationId,
      sagaNombre: 'SAGA_CHECKOUT_MULTIDOMINIO',
      estado: 'IN_PROGRESS',
      pasosTotales: dto.items.length + 2, // Items + Pago + Facturación
      pasoActual: 1,
    });
    const savedSaga = await this.sagaRepo.save(saga);

    const pasosEjecutadosConExito: Array<{
      paso_id: string;
      servicio: string;
      operacion: string;
      compensacion_fn: () => Promise<any>;
      datos: any;
    }> = [];

    try {
      // -----------------------------------------------------------------------
      // PASO 1 (HOLD / RESERVAS PREVIAS EN CADA VERTICAL)
      // -----------------------------------------------------------------------
      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        savedSaga.pasoActual = i + 1;
        await this.sagaRepo.save(savedSaga);

        if (dto.simular_fallo_en_paso === 'INVENTARIO_AGOTADO' && i === dto.items.length - 1) {
          throw new HttpException({
            status: HttpStatus.CONFLICT,
            error: 'Stock agotado en socio externo durante reserva compuesta.',
            code: 'OUT_OF_STOCK',
          }, HttpStatus.CONFLICT);
        }

        let reservaGenerada: any = null;

        if (item.vertical === 'ATRACCIONES') {
          reservaGenerada = await this.atraccionesService.reservar(
            item.item_id,
            {
              customer_name: dto.cliente_nombre,
              customer_email: dto.cliente_email,
              ticket_count: item.cantidad,
              date: item.detalles_reserva?.date || new Date().toISOString().split('T')[0],
              time: item.detalles_reserva?.time || '10:00 a.m.',
            },
            `idem-saga-${correlationId}-${i}`,
          );

          pasosEjecutadosConExito.push({
            paso_id: `paso-${i + 1}`,
            servicio: 'MS_ATR',
            operacion: 'RESERVAR_ATRACCION',
            datos: reservaGenerada,
            compensacion_fn: async () => {
              this.logger.warn(`[Compensación LIFO] Cancelando reserva de atracción ${reservaGenerada.reservation_id}`);
              return this.atraccionesService.cancelarReserva(
                reservaGenerada.reservation_id,
                { reason: 'Rollback compensatorio automático Saga' },
                `idem-comp-${correlationId}`,
                correlationId,
              );
            },
          });
        } else if (item.vertical === 'AUTOS') {
          reservaGenerada = await this.autosService.createOrder(
            {
              vehicle_id: item.item_id,
              conductor: { nombre: dto.cliente_nombre, email: dto.cliente_email },
              dias: item.cantidad || 1,
            },
            `idem-saga-${correlationId}-${i}`,
            correlationId,
          );

          pasosEjecutadosConExito.push({
            paso_id: `paso-${i + 1}`,
            servicio: 'MS_AUT',
            operacion: 'RESERVAR_AUTO',
            datos: reservaGenerada,
            compensacion_fn: async () => {
              this.logger.warn(`[Compensación LIFO] Cancelando renta de auto ${reservaGenerada.pnr}`);
              return this.autosService.cancelOrder(
                reservaGenerada.pnr,
                { reason: 'Rollback compensatorio automático Saga' },
                `idem-comp-${correlationId}`,
              );
            },
          });
        } else {
          // Reservas genéricas (Alojamientos / Vuelos)
          reservaGenerada = {
            reserva_id: `RES-${item.vertical.slice(0, 3)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
            vertical: item.vertical,
            total: item.precio_unitario * item.cantidad,
          };

          pasosEjecutadosConExito.push({
            paso_id: `paso-${i + 1}`,
            servicio: `MS_${item.vertical.slice(0, 3)}`,
            operacion: `RESERVAR_${item.vertical}`,
            datos: reservaGenerada,
            compensacion_fn: async () => {
              this.logger.warn(`[Compensación LIFO] Liberando cupo en vertical ${item.vertical} para reserva ${reservaGenerada.reserva_id}`);
              return { status: 'CANCELLED', reserva_id: reservaGenerada.reserva_id };
            },
          });
        }

        // Registrar paso exitoso en schema_auditoria.saga_pasos_journal
        await this.journalRepo.save(this.journalRepo.create({
          sagaId: savedSaga.id,
          ordenEjecucion: i + 1,
          servicioNombre: `MS_${item.vertical.slice(0, 3)}`,
          operacion: `RESERVA_${item.vertical}`,
          endpointInvocado: `/api/v2/${item.vertical.toLowerCase()}/reservas`,
          payloadEnviado: item,
          respuestaRecibida: reservaGenerada,
          estadoPaso: 'SUCCESS',
        }));
      }

      // -----------------------------------------------------------------------
      // PASO 2 (COBRO SÍNCRONO SOA EN MS_PAG)
      // -----------------------------------------------------------------------
      const pasoPagoNumero = dto.items.length + 1;
      savedSaga.pasoActual = pasoPagoNumero;
      await this.sagaRepo.save(savedSaga);

      let escenarioPago: any = 'NORMAL';
      if (dto.simular_fallo_en_paso === 'PAGO_RECHAZADO') escenarioPago = 'RECHAZO_FONDOS';
      if (dto.simular_fallo_en_paso === 'PAGO_TIMEOUT') escenarioPago = 'TIMEOUT_RED';

      const pagoResultado = await this.pagosService.procesarPago(
        {
          monto: totalVenta,
          metodo_pago: dto.metodo_pago || 'TARJETA_CREDITO',
          numero_tarjeta: dto.numero_tarjeta,
          cliente_id: dto.cliente_id,
          simular_escenario: escenarioPago,
        },
        `idem-pay-${correlationId}`,
      );

      pasosEjecutadosConExito.push({
        paso_id: `paso-${pasoPagoNumero}`,
        servicio: 'MS_PAG',
        operacion: 'PROCESAR_PAGO',
        datos: pagoResultado,
        compensacion_fn: async () => {
          this.logger.warn(`[Compensación LIFO] Emitiendo reembolso compensatorio de pago ${pagoResultado.transaccion_id}`);
          return this.pagosService.procesarReembolso(
            {
              transaccion_id: pagoResultado.transaccion_id,
              monto: totalVenta,
              motivo: 'Rollback compensatorio automático Saga LIFO',
            },
            `idem-ref-${correlationId}`,
          );
        },
      });

      await this.journalRepo.save(this.journalRepo.create({
        sagaId: savedSaga.id,
        ordenEjecucion: pasoPagoNumero,
        servicioNombre: 'MS_PAG',
        operacion: 'PROCESAR_PAGO',
        endpointInvocado: '/api/v2/pagos/procesar',
        payloadEnviado: { monto: totalVenta, cliente: dto.cliente_email },
        respuestaRecibida: pagoResultado,
        estadoPaso: 'SUCCESS',
      }));

      // -----------------------------------------------------------------------
      // PASO 3 (FINANZAS Y LIQUIDACIÓN DEL 10%)
      // -----------------------------------------------------------------------
      const pasoFinanzasNumero = dto.items.length + 2;
      savedSaga.pasoActual = pasoFinanzasNumero;
      await this.sagaRepo.save(savedSaga);

      await this.finanzasService.registrarVentaYCalcularComision({
        orden_id: correlationId,
        factura_id: crypto.randomUUID(),
        vertical: 'COMBO_MULTIDOMINIO',
        total_venta: totalVenta,
        proveedor_codigo: 'BOOKING_CENTRAL_COMMISSION',
      });

      // -----------------------------------------------------------------------
      // FINALIZACIÓN EXITOSA DE LA SAGA
      // -----------------------------------------------------------------------
      savedSaga.estado = 'COMPLETED';
      savedSaga.finalizadaAt = new Date();
      await this.sagaRepo.save(savedSaga);

      this.winstonLogger.logAudit('SAGA_CHECKOUT_COMPLETED', {
        correlation_id: correlationId,
        total_pasos: savedSaga.pasosTotales,
        total_venta: totalVenta,
        cliente: dto.cliente_email,
        estado: 'COMPLETED',
      }, correlationId);

      return {
        success: true,
        correlation_id: correlationId,
        estado: 'COMPLETED',
        total_pagado: totalVenta,
        pago: pagoResultado,
        items_confirmados: pasosEjecutadosConExito.map(p => ({
          servicio: p.servicio,
          operacion: p.operacion,
          datos: p.datos,
        })),
        mensaje: 'Checkout compuesto finalizado exitosamente. Saga completada al 100%.',
      };
    } catch (error) {
      // -----------------------------------------------------------------------
      // FASE DE COMPENSACIÓN AUTOMÁTICA EN ORDEN INVERSO (LIFO)
      // -----------------------------------------------------------------------
      this.logger.error(`[SAGA ERROR] Fallo detectado: ${error.message}. Iniciando Rollback Compensatorio LIFO.`);
      savedSaga.estado = 'COMPENSATING';
      savedSaga.errorDetalle = error.message || JSON.stringify(error);
      const codigoCompensacion = `REF-SAGA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      savedSaga.codigoCompensacion = codigoCompensacion;
      await this.sagaRepo.save(savedSaga);

      const resultadosCompensacion: any[] = [];

      // Ejecutar compensaciones en orden estrictamente inverso (LIFO)
      while (pasosEjecutadosConExito.length > 0) {
        const paso = pasosEjecutadosConExito.pop();
        if (paso && paso.compensacion_fn) {
          try {
            const resComp = await paso.compensacion_fn();
            resultadosCompensacion.push({
              servicio: paso.servicio,
              operacion: paso.operacion,
              estado: 'COMPENSATED',
              resultado: resComp,
            });
          } catch (compErr) {
            this.logger.error(`Error durante compensación del paso ${paso.servicio}: ${compErr.message}`);
          }
        }
      }

      savedSaga.estado = 'FAILED';
      savedSaga.finalizadaAt = new Date();
      await this.sagaRepo.save(savedSaga);

      this.winstonLogger.logAudit('SAGA_CHECKOUT_ROLLBACK_COMPENSADO', {
        correlation_id: correlationId,
        codigo_compensacion: codigoCompensacion,
        error_original: error.message,
        pasos_compensados: resultadosCompensacion.length,
        estado: 'FAILED_COMPENSATED',
      }, correlationId);

      throw new HttpException({
        type: 'https://booking.epn.edu.ec/errors/saga-rollback',
        title: 'Transacción Distribuida Cancelada y Compensada (Saga LIFO)',
        status: HttpStatus.CONFLICT,
        detail: `La compra no pudo completarse debido a un fallo en uno de los pasos (${error.message || 'Error transaccional'}). Se ejecutaron las acciones compensatorias automáticas (liberación de stock y reembolso).`,
        instance: '/api/v2/esb/checkout-saga',
        correlation_id: correlationId,
        codigo_compensacion: codigoCompensacion,
        compensaciones_ejecutadas: resultadosCompensacion,
        timestamp: new Date().toISOString(),
      }, HttpStatus.CONFLICT);
    }
  }

  async consultarEstadoSaga(correlationId: string): Promise<any> {
    const saga = await this.sagaRepo.findOne({ where: { correlationId } });
    if (!saga) {
      throw new HttpException(`Saga con Correlation-ID '${correlationId}' no encontrada`, HttpStatus.NOT_FOUND);
    }

    const journal = await this.journalRepo.find({
      where: { sagaId: saga.id },
      order: { ordenEjecucion: 'ASC' },
    });

    return {
      saga,
      journal,
    };
  }

  async listarSagasRecientes(limit = 20): Promise<any[]> {
    return this.sagaRepo.find({
      order: { iniciadaAt: 'DESC' },
      take: limit,
    });
  }
}
