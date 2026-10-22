import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { GraphqlBffResolver } from './graphql-bff.resolver';
import { GraphqlBffService } from './graphql-bff.service';
import { ReservasDataLoader } from './dataloaders/reservas.dataloader';
import { GqlThrottlerGuard } from './security/gql-throttler.guard';

import { CoreModule } from '../../core/core.module';
import { EsbModule } from '../esb/esb.module';
import { PaquetesModule } from '../paquetes/paquetes.module';
import { AtraccionesModule } from '../atracciones/atracciones.module';
import { AutosModule } from '../autos/autos.module';
import { AlojamientosModule } from '../alojamientos/alojamientos.module';
import { VuelosModule } from '../vuelos/vuelos.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      path: '/graphql',
      playground: true,
      context: ({ req, res }) => ({ req, res }),
    }),
    CoreModule,
    EsbModule,
    PaquetesModule,
    AtraccionesModule,
    AutosModule,
    AlojamientosModule,
    VuelosModule,
  ],
  providers: [
    ReservasDataLoader,
    GraphqlBffService,
    GraphqlBffResolver,
    GqlThrottlerGuard,
  ],
  exports: [GraphqlBffService],
})
export class GraphqlBffModule {}
