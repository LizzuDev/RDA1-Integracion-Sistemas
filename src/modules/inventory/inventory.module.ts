import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryGrpcController } from './inventory-grpc.controller';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';

@Module({
  controllers: [InventoryGrpcController],
  providers: [InventoryService, WinstonPhysicalLoggerService],
  exports: [InventoryService],
})
export class InventoryModule {}
