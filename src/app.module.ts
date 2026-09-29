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

        /**
         * `synchronize: false` — OBLIGATORIO, no negociable.
         *
         * Antes era `synchronize: configService.get('NODE_ENV') !== 'production'`,
         * lo que lo activaba en desarrollo. Eso rompía el arranque de la
         * aplicación, y la causa merecía un comentario:
         *
         *   QueryFailedError: no existe la relación "typeorm_metadata"
         *
         * El esquema de esta base de datos lo crea `vuelos_schema.sql`, NO
         * TypeORM. Al conectar con `synchronize: true`, TypeORM asume que es
         * dueño del esquema e intenta tomar el control: busca su tabla interna
         * `typeorm_metadata`, no la encuentra, y el `DataSource` no llega a
         * inicializarse. La aplicación no levanta y no hay servidor al que
         * llamar.
         *
         * Y si la tabla existiera, el resultado sería peor: `synchronize: true`
         * reconcilia el esquema contra los decoradores de las entidades, que son
         * un espejo de LECTURA del DDL. Los triggers, las restricciones CHECK, las
         * políticas RLS, los índices parciales y las columnas GENERATED no son
         * expresables con decoradores, así que TypeORM los borraría. Un
         * `npm start` en desarrollo destruiría garantías del esquema que
         * `vuelos_schema.sql` define a mano.
         *
         * Para cambiar el esquema se edita `vuelos_schema.sql`, que es la fuente
         * de verdad, y se aplica a mano. Para levantar una base efímera de
         * pruebas se puede forzar con `SYNCHRONIZE=true` en el `.env`, asumiendo
         * que esa base se puede perder.
         */
        synchronize: configService.get<string>('SYNCHRONIZE') === 'true',
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
