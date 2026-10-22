import { Injectable, Logger } from '@nestjs/common';
import { RabbitMqEventBusService } from '../rabbitmq/rabbitmq-event-bus.service';
import { KafkaEventBusService } from '../kafka/kafka-event-bus.service';
import { WinstonPhysicalLoggerService } from '../../../core/logger/winston-logger.service';

@Injectable()
export class KafkaRabbitBridgeService {
  private readonly logger = new Logger(KafkaRabbitBridgeService.name);

  constructor(
    private readonly rabbitService: RabbitMqEventBusService,
    private readonly kafkaService: KafkaEventBusService,
    private readonly winstonLogger: WinstonPhysicalLoggerService,
  ) {}

  /**
   * Enruta eventos del Topic Exchange de RabbitMQ hacia los tópicos de streaming B2B en Apache Kafka
   * (Cátedra Consideraciones RDA2 §7).
   */
  async bridgeEvent(tipoEvento: string, aggregateId: string, payload: any): Promise<void> {
    this.logger.log(`[Dual Event Bridge] Enrutando evento '${tipoEvento}' [ID: ${aggregateId}]`);

    // 1. Enviar a RabbitMQ para amortiguamiento y consumo interno
    let routingKey = 'general.event';
    if (tipoEvento.includes('SEARCH')) routingKey = 'search.query';
    if (tipoEvento.includes('STOCK')) routingKey = 'stock.updated';
    if (tipoEvento.includes('ORDER') || tipoEvento.includes('RESERVA')) routingKey = 'order.confirmed';
    if (tipoEvento.includes('SAGA') || tipoEvento.includes('COMPENSATE')) routingKey = 'saga.compensate';

    await this.rabbitService.publish(routingKey, payload);

    // 2. Replicar a Apache Kafka para streaming B2B y analítica histórica
    let kafkaTopic = this.kafkaService.TOPICS.AUDITORIA_SAGAS;
    if (tipoEvento.includes('STOCK') || tipoEvento.includes('CATALOGO')) {
      kafkaTopic = this.kafkaService.TOPICS.CATALOGO_SYNC;
    } else if (tipoEvento.includes('ORDER') || tipoEvento.includes('RESERVA') || tipoEvento.includes('PAGO')) {
      kafkaTopic = this.kafkaService.TOPICS.ORDENES_B2B;
    }

    await this.kafkaService.emitB2BEvent(kafkaTopic, aggregateId, payload);

    this.winstonLogger.logAudit('DUAL_EVENT_BUS_BRIDGED', {
      evento: tipoEvento,
      aggregate_id: aggregateId,
      rabbit_key: routingKey,
      kafka_topic: kafkaTopic,
    });
  }
}
