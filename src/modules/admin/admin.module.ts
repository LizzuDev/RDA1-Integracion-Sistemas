import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AdminConfigService } from './admin-config.service';
import { AdminFinanzasService } from './admin-finanzas.service';
import { AdminAuditService } from './admin-audit.service';
import { PublicConfigController } from './public-config.controller';
import { Reserva } from '../vuelos/entities/reserva.entity';
import { OrderAuto } from '../autos/entities/order-auto.entity';
import { ReservaAtraccion } from '../atracciones/entities/reserva.entity';
import { CoreModule } from '../../core/core.module';

/**
 * Global para que otros módulos (p. ej. Facturas) puedan leer la configuración
 * de la plataforma (`AdminConfigService`) sin importar este módulo.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Reserva, OrderAuto, ReservaAtraccion]),
    CoreModule,
  ],
  controllers: [AdminController, PublicConfigController],
  providers: [AdminService, AdminConfigService, AdminFinanzasService, AdminAuditService],
  exports: [AdminConfigService, AdminAuditService],
})
export class AdminModule { }
