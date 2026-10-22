import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaquetesController } from './paquetes.controller';
import { PaquetesService } from './paquetes.service';
import { Paquete, PaqueteItem, ContratoPromociones } from './entities';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Paquete, PaqueteItem, ContratoPromociones]),
  ],
  controllers: [PaquetesController],
  providers: [PaquetesService, WinstonPhysicalLoggerService],
  exports: [PaquetesService],
})
export class PaquetesModule {}
