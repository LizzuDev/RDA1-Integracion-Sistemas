import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanzasController } from './finanzas.controller';
import { FinanzasService } from './finanzas.service';
import { LiquidacionProveedor, LibroMayorComisiones } from './entities';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiquidacionProveedor, LibroMayorComisiones]),
  ],
  controllers: [FinanzasController],
  providers: [FinanzasService, WinstonPhysicalLoggerService, SupabaseAuthGuard, RolesGuard],
  exports: [FinanzasService],
})
export class FinanzasModule {}
