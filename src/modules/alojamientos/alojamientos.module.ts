import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlojamientosService } from './alojamientos.service';
import { AlojamientosController } from './alojamientos.controller';
import { Alojamiento } from './entities/alojamiento.entity';
import { ReservaAlojamiento } from './entities/reserva.entity';
import { ResenaAlojamiento } from './entities/resena.entity';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { SesionSupabaseService } from '../../core/auth/sesion-supabase.service';
import { GestionAlojamientosGuard, ClienteAutenticadoGuard } from './guards/gestion-alojamientos.guard';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({ ttl: 60000 }),
    TypeOrmModule.forFeature([
      Alojamiento,
      ReservaAlojamiento,
      ResenaAlojamiento,
    ]),
    TelemetryModule,
  ],
  controllers: [AlojamientosController],
  providers: [AlojamientosService, SesionSupabaseService, GestionAlojamientosGuard, ClienteAutenticadoGuard],
  exports: [AlojamientosService],
})
export class AlojamientosModule {}

