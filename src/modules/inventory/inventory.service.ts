import { Injectable, Logger, Optional } from '@nestjs/common';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';
import { KafkaRabbitBridgeService } from '../event-bus/bridge/kafka-rabbit-bridge.service';

export interface StockUpdateMessage {
  service_id: string;
  item_id: string;
  date: string;
  time_slot: string;
  available_units: number;
  timestamp: number | string;
}

export interface StockUpdateAck {
  success: boolean;
  message: string;
  processed_at: number;
}

export interface StockChangeEvent {
  event_id: string;
  service_id: string;
  item_id: string;
  date: string;
  time_slot: string;
  delta: number;
  timestamp: number | string;
}

export interface StreamSummary {
  total_events_processed: number;
  is_synchronized: boolean;
  last_sync_hash: string;
}

export interface InventoryRecord {
  service_id: string;
  item_id: string;
  date: string;
  time_slot: string;
  available_units: number;
  last_updated: string;
  source: string;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  // Almacén en memoria sincronizado del inventario recibido por gRPC
  private readonly stockRegistry = new Map<string, InventoryRecord>();

  constructor(
    private readonly winstonLogger: WinstonPhysicalLoggerService,
    @Optional() private readonly eventBridge?: KafkaRabbitBridgeService,
  ) {
    // Sembrar registros de ejemplo para arrancar sincronizado
    this.stockRegistry.set('PRhu4UBTWPBC_2026-10-25_10:00', {
      service_id: 'atracciones-dilan',
      item_id: 'PRhu4UBTWPBC',
      date: '2026-10-25',
      time_slot: '10:00',
      available_units: 12,
      last_updated: new Date().toISOString(),
      source: 'SEED_INITIAL'
    });
  }

  private buildKey(itemId: string, date: string, timeSlot: string): string {
    return `${itemId}_${date}_${timeSlot || 'DEFAULT'}`;
  }

  /**
   * Procesa la actualización de stock puntual enviada por una tienda externa vía gRPC.
   */
  processPushStockUpdate(msg: any): any {
    const itemId = msg.item_id || msg.itemId;
    const serviceId = msg.service_id || msg.serviceId;
    const date = msg.date;
    const timeSlot = msg.time_slot || msg.timeSlot || 'DEFAULT';
    const availableUnits = msg.available_units !== undefined ? msg.available_units : msg.availableUnits;
    const timestamp = msg.timestamp;

    const key = this.buildKey(itemId, date, timeSlot);
    const prevUnits = this.stockRegistry.get(key)?.available_units ?? null;

    const record: InventoryRecord = {
      service_id: serviceId,
      item_id: itemId,
      date,
      time_slot: timeSlot,
      available_units: availableUnits,
      last_updated: new Date().toISOString(),
      source: 'GRPC_PUSH'
    };

    this.stockRegistry.set(key, record);

    this.logger.log(
      `[gRPC Inbound] Stock actualizado para ${itemId} (${date} ${timeSlot}): ${prevUnits ?? 'N/A'} -> ${availableUnits} cupos [Origen: ${serviceId}]`
    );

    // Auditoría física en archivo .log rotativo (Consideraciones RDA2 §2)
    this.winstonLogger.logAudit('GRPC_STOCK_UPDATE_RECEIVED', {
      service_id: serviceId,
      item_id: itemId,
      date,
      time_slot: timeSlot,
      previous_units: prevUnits,
      new_available_units: availableUnits,
      timestamp
    });

    // Emisión hacia Broker Dual (RabbitMQ 'stock.updated' + Apache Kafka 'topic-catalogo-sync')
    if (this.eventBridge) {
      this.eventBridge.bridgeEvent('STOCK_UPDATED', itemId, record).catch(err => {
        this.logger.warn(`Error al propagar evento de stock a bus dual: ${err.message}`);
      });
    }

    const now = Date.now();
    return {
      success: true,
      message: `Stock sincronizado exitosamente en Booking Prototipo para ${itemId}: ${availableUnits} unidades disponibles.`,
      processed_at: now,
      processedAt: now,
    };
  }

  /**
   * Aplica un evento de delta (+/-) recibido a través de un stream de gRPC.
   */
  applyStockDelta(event: any): void {
    const eventId = event.event_id || event.eventId;
    const itemId = event.item_id || event.itemId;
    const serviceId = event.service_id || event.serviceId;
    const date = event.date;
    const timeSlot = event.time_slot || event.timeSlot || 'DEFAULT';
    const delta = event.delta;

    const key = this.buildKey(itemId, date, timeSlot);
    const current = this.stockRegistry.get(key);

    const currentUnits = current ? current.available_units : 10;
    const newUnits = Math.max(0, currentUnits + delta);

    this.stockRegistry.set(key, {
      service_id: serviceId,
      item_id: itemId,
      date,
      time_slot: timeSlot,
      available_units: newUnits,
      last_updated: new Date().toISOString(),
      source: 'GRPC_STREAM_DELTA'
    });

    this.logger.log(
      `[gRPC Stream Delta] Evento ${eventId}: delta ${delta} sobre ${itemId} -> Nuevo stock: ${newUnits}`
    );

    this.winstonLogger.logAudit('GRPC_STOCK_DELTA_STREAMED', {
      event_id: eventId,
      service_id: serviceId,
      item_id: itemId,
      delta,
      new_units: newUnits
    });

    if (this.eventBridge) {
      this.eventBridge.bridgeEvent('STOCK_DELTA_UPDATED', itemId, {
        service_id: serviceId,
        item_id: itemId,
        date,
        time_slot: timeSlot,
        new_units: newUnits,
        delta,
      }).catch(err => {
        this.logger.warn(`Error al propagar delta de stock a bus dual: ${err.message}`);
      });
    }
  }

  /**
   * Consulta el stock sincronizado actual para consulta REST o integración.
   */
  getInventory(itemId?: string, date?: string): InventoryRecord[] {
    const records = Array.from(this.stockRegistry.values());
    return records.filter(r => {
      if (itemId && r.item_id !== itemId) return false;
      if (date && r.date !== date) return false;
      return true;
    });
  }

  /**
   * Métricas y estado del servicio de inventario para monitoreo.
   */
  getStatus() {
    return {
      status: 'OPERATIONAL',
      protocol: 'gRPC / HTTP/2 Multiplexed',
      port: 50051,
      total_items_in_registry: this.stockRegistry.size,
      last_sync: new Date().toISOString(),
      sample_records: Array.from(this.stockRegistry.values()).slice(-5)
    };
  }
}
