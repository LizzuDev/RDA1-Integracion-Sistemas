import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EsbController } from './esb.controller';
import { SagaOrchestratorService } from './interna/saga-orchestrator.service';
import { EsbInternalRouterService } from './interna/esb-internal-router.service';
import { SagaTransaccion, SagaPasoJournal } from './entities';
import { PagosModule } from '../pagos/pagos.module';
import { FinanzasModule } from '../finanzas/finanzas.module';
import { AtraccionesModule } from '../atracciones/atracciones.module';
import { AutosModule } from '../autos/autos.module';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SagaTransaccion, SagaPasoJournal]),
    PagosModule,
    FinanzasModule,
    AtraccionesModule,
    AutosModule,
  ],
  controllers: [EsbController],
  providers: [
    SagaOrchestratorService,
    EsbInternalRouterService,
    WinstonPhysicalLoggerService,
  ],
  exports: [
    SagaOrchestratorService,
    EsbInternalRouterService,
  ],
})
export class EsbModule {}
