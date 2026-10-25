import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { WinstonPhysicalLoggerService } from '../../../core/logger/winston-logger.service';
import { TraceContextService } from '../../../core/tracing/trace-context.service';

@Injectable()
export class RabbitMqEventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqEventBusService.name);
  private connection: any = null;
  private channel: any = null;

  public readonly EXCHANGE_NAME = 'booking.events';
  public readonly QUEUES = {
    BUSQUEDAS_MASIVAS: 'q.busquedas.masivas',
    ORDENES_CONFIRMADAS: 'q.ordenes.confirmadas',
    PAGOS_PROCESADOS: 'q.pagos.procesados',
    SAGAS_COMPENSACION: 'q.sagas.compensacion',
    STOCK_ACTUALIZADO: 'q.stock.actualizado',
    DEAD_LETTER: 'q.dead_letter',
  };

  private isConnected = false;

  constructor(
    private readonly winstonLogger: WinstonPhysicalLoggerService,
    private readonly traceContext: TraceContextService,
  ) {}

  async onModuleInit() {
    await this.conectarRabbitMQ();
  }

  async onModuleDestroy() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch (e) {}
  }

  private async conectarRabbitMQ(): Promise<void> {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    try {
      this.logger.log(`[RabbitMQ] Intentando conexión con broker en ${url}`);
      this.connection = await amqp.connect(url, { timeout: 1000 });
      this.channel = await this.connection.createChannel();

      // Declarar Topic Exchange
      await this.channel.assertExchange(this.EXCHANGE_NAME, 'topic', { durable: true });

      // Declarar colas y bindings
      await this.channel.assertQueue(this.QUEUES.BUSQUEDAS_MASIVAS, { durable: true });
      await this.channel.bindQueue(this.QUEUES.BUSQUEDAS_MASIVAS, this.EXCHANGE_NAME, 'search.*');

      await this.channel.assertQueue(this.QUEUES.ORDENES_CONFIRMADAS, { durable: true });
      await this.channel.bindQueue(this.QUEUES.ORDENES_CONFIRMADAS, this.EXCHANGE_NAME, 'order.confirmed');

      await this.channel.assertQueue(this.QUEUES.PAGOS_PROCESADOS, { durable: true });
      await this.channel.bindQueue(this.QUEUES.PAGOS_PROCESADOS, this.EXCHANGE_NAME, 'payment.completed');

      await this.channel.assertQueue(this.QUEUES.SAGAS_COMPENSACION, { durable: true });
      await this.channel.bindQueue(this.QUEUES.SAGAS_COMPENSACION, this.EXCHANGE_NAME, 'saga.compensate');
      await this.channel.bindQueue(this.QUEUES.SAGAS_COMPENSACION, this.EXCHANGE_NAME, 'payment.refunded');

      await this.channel.assertQueue(this.QUEUES.STOCK_ACTUALIZADO, { durable: true });
      await this.channel.bindQueue(this.QUEUES.STOCK_ACTUALIZADO, this.EXCHANGE_NAME, 'stock.updated');

      await this.channel.assertQueue(this.QUEUES.DEAD_LETTER, { durable: true });

      this.isConnected = true;
      this.logger.log('✅ [RabbitMQ] Conectado exitosamente y topologías declaradas (Topic Exchange: booking.events).');
    } catch (err) {
      this.isConnected = false;
      this.logger.warn(`⚠️ [RabbitMQ] Broker no disponible en ${url} (${err.message}). Operando en modo Fallback en memoria.`);
    }
  }

  async publish(routingKey: string, payload: any): Promise<boolean> {
    const event = this.traceContext.createCloudEvent(
      `com.booking.${routingKey}`,
      'booking-prototipo',
      payload,
    );
    const messageBuffer = Buffer.from(JSON.stringify({
      ...event,
      payload,
      timestamp: event.time,
      routing_key: routingKey,
    }));

    if (this.isConnected && this.channel) {
      try {
        const sent = this.channel.publish(this.EXCHANGE_NAME, routingKey, messageBuffer, {
          persistent: true,
          correlationId: event.correlationid,
          headers: {
            correlationid: event.correlationid,
            'x-correlation-id': event.correlationid,
            traceparent: event.traceparent,
            node_id: event.node_id,
          },
        });
        this.winstonLogger.logAudit('RABBITMQ_EVENTO_PUBLICADO', {
          routing_key: routingKey,
          exchange: this.EXCHANGE_NAME,
        });
        return sent;
      } catch (err) {
        this.logger.warn(`Fallo al publicar en RabbitMQ: ${err.message}. Guardando en log físico.`);
      }
    }

    // Fallback de observabilidad si el broker externo no está encendido
    this.winstonLogger.logAudit('RABBITMQ_EVENTO_EMITIDO_IN_MEMORY', {
      routing_key: routingKey,
      payload,
      cloud_event: event,
    });
    return true;
  }

  isBrokerActive(): boolean {
    return this.isConnected;
  }
}
