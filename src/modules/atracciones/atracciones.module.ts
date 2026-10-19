import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AtraccionesService } from './atracciones.service';
import { AtraccionesController } from './atracciones.controller';
import { PagoService } from './pago.service';
import { SoapWrapperService } from './soap-wrapper.service';
import { CommonModule } from '../../common/common.module';
import { Atraccion } from './entities/atraccion.entity';
import { ReservaAtraccion } from './entities/reserva.entity';
import { ResenaAtraccion } from './entities/resena.entity';

import { DilanAtraccionesAdapter } from './acl/dilan-atracciones.adapter';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';

@Module({
  imports: [
    CommonModule, 
    HttpModule,
    TypeOrmModule.forFeature([Atraccion, ReservaAtraccion, ResenaAtraccion]),
    CacheModule.register({ ttl: 60 * 1000 }) // Caché en memoria de 60 segundos
  ],
  controllers: [AtraccionesController],
  providers: [AtraccionesService, PagoService, SoapWrapperService, DilanAtraccionesAdapter, WinstonPhysicalLoggerService],
  exports: [AtraccionesService, DilanAtraccionesAdapter, WinstonPhysicalLoggerService]
})
export class AtraccionesModule {}
