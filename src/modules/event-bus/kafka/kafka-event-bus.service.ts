import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, logLevel, Partitioners } from 'kafkajs';
import { WinstonPhysicalLoggerService } from '../../../core/logger/winston-logger.service';

@Injectable()
export class KafkaEventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaEventBusService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;

  public readonly TOPICS = {
    CATALOGO_SYNC: 'topic-catalogo-sync',
    ORDENES_B2B: 'topic-ordenes-b2b',
    AUDITORIA_SAGAS: 'topic-auditoria-sagas',
  };

  constructor(private readonly winstonLogger: WinstonPhysicalLoggerService) {}

  async onModuleInit() {
    process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
    await this.conectarKafka();
  }

  async onModuleDestroy() {
    try {
      if (this.producer) await this.producer.disconnect();
    } catch (e) {}
  }

  private async conectarKafka(): Promise<void> {
    const brokersStr = process.env.KAFKA_BROKERS || 'localhost:9092';
    const brokers = brokersStr.split(',').map(b => b.trim());

    try {
      this.logger.log(`[Apache Kafka] Inicializando cliente con brokers: ${brokers.join(', ')}`);
      this.kafka = new Kafka({
        clientId: 'booking-prototipo-aggregator',
        brokers,
        connectionTimeout: 1000,
        retry: { retries: 0 },
        logLevel: logLevel.NOTHING,
      });

      this.producer = this.kafka.producer({
        createPartitioner: Partitioners.LegacyPartitioner,
      });
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('✅ [Apache Kafka] Productor conectado exitosamente para streaming B2B.');
    } catch (err) {
      this.isConnected = false;
      this.logger.warn(`⚠️ [Apache Kafka] Broker no disponible en ${brokers.join(', ')} (${err.message}). Operando en modo Fallback en memoria.`);
    }
  }

  async emitB2BEvent(topic: string, key: string, payload: any): Promise<boolean> {
    const value = JSON.stringify({
      payload,
      emitted_at: new Date().toISOString(),
      source: 'booking-prototipo-central',
    });

    if (this.isConnected && this.producer) {
      try {
        await this.producer.send({
          topic,
          messages: [{ key, value }],
        });
        this.winstonLogger.logAudit('KAFKA_EVENTO_B2B_ENVIADO', {
          topic,
          key,
        });
        return true;
      } catch (err) {
        this.logger.warn(`Fallo al enviar a Kafka: ${err.message}.`);
      }
    }

    // Fallback de observabilidad
    this.winstonLogger.logAudit('KAFKA_EVENTO_B2B_IN_MEMORY', {
      topic,
      key,
      payload,
    });
    return true;
  }

  isBrokerActive(): boolean {
    return this.isConnected;
  }
}
