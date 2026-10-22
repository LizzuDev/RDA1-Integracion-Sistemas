import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { TransaccionPago } from './entities';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransaccionPago]),
  ],
  controllers: [PagosController],
  providers: [PagosService, WinstonPhysicalLoggerService],
  exports: [PagosService],
})
export class PagosModule {}
