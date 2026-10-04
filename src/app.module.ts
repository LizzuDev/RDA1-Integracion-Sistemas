import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CommonModule } from './common/common.module';
import { CoreModule } from './core/core.module';
import { AlojamientosModule } from './modules/alojamientos/alojamientos.module';
import { AutosModule } from './modules/autos/autos.module';
import { AtraccionesModule } from './modules/atracciones/atracciones.module';
import { VuelosModule } from './modules/vuelos/vuelos.module';
import { FacturasModule } from './modules/facturas/facturas.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { AdminModule } from './modules/admin/admin.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';

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
        synchronize: false,
        ssl: { rejectUnauthorized: false }, // Requerido por Supabase en producción
        extra: { max: 10 }, // Aumentado a 10 para evitar bloqueos en desarrollo
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
    AlojamientosModule,
    AutosModule,

    // Envío de la factura en PDF por correo (SMTP de Gmail)
    FacturasModule,

    // =========================================================================
    // Chatbot informativo (Groq + tool-calling sobre esta misma API)
    // =========================================================================
    // Consulta disponibilidad de vuelos, autos y atracciones. Es de SOLO
    // LECTURA: no expone ninguna ruta que reserve, pague ni cancele, y sus
    // herramientas se declaran en una lista cerrada (`chatbot.tools.ts`).
    ChatbotModule,

    // Panel de administración (stats, usuarios, reservas globales)
    AdminModule,

    // Telemetría (analítica y rendimiento)
    TelemetryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
