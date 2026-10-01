import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CommonModule } from './common/common.module';
import { CoreModule } from './core/core.module';
// import { AlojamientosModule } from './modules/alojamientos/alojamientos.module';
// import { AutosModule } from './modules/autos/autos.module';
import { AtraccionesModule } from './modules/atracciones/atracciones.module';
import { VuelosModule } from './modules/vuelos/vuelos.module';

@Module({
  imports: [
    // Carga de variables de entorno globales
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Configuración centralizada de TypeORM usando DATABASE_URL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false, // Desactivado para evitar conflictos con vuelos_schema.sql y PgBouncer
      }),
    }),

    // Módulos Compartidos
    CommonModule,

    // =========================================================================
    // Módulo Core del Integrador (Booking Prototipo)
    // =========================================================================
    CoreModule,
    
    // =========================================================================
    // Módulos de Integración (Tus endpoints BFF)
    // =========================================================================
    AtraccionesModule,
    VuelosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
