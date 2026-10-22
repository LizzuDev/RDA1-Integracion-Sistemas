import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlBffService } from './graphql-bff.service';
import { CatalogoItemModel } from './models/catalogo.model';
import { AggregateBookingResponseModel } from './models/reserva.model';
import { FacturaCompletaModel } from './models/factura.model';
import { PaqueteComboModel } from './models/paquete.model';
import { CheckoutSagaInputGql, CheckoutResultModel } from './models/checkout.model';
import { CheckInInputGql, CheckInResultModel } from './models/checkin.model';
import { GqlThrottlerGuard } from './security/gql-throttler.guard';
import { sanitizeObject, sanitizeString } from './security/gql-sanitizer';

@Resolver()
export class GraphqlBffResolver {
  constructor(private readonly bffService: GraphqlBffService) {}

  @Query(() => [CatalogoItemModel], {
    name: 'catalogoUnificado',
    description: 'Catálogo agregado multivertical (Atracciones, Autos, Alojamientos, Vuelos) sin joins cross-schema',
  })
  async catalogoUnificado(
    @Args('destino', { type: () => String, nullable: true }) destino?: string,
    @Args('vertical', { type: () => String, nullable: true }) vertical?: string,
  ): Promise<CatalogoItemModel[]> {
    return this.bffService.getCatalogoUnificado(
      destino ? sanitizeString(destino, 80) : undefined,
      vertical ? sanitizeString(vertical, 40) : undefined,
    );
  }

  @Query(() => AggregateBookingResponseModel, {
    name: 'misReservas',
    description: 'Consulta unificada de reservas del cliente con resolución batch y protección anti-N+1 vía DataLoader',
  })
  async misReservas(
    @Args('clienteId', { type: () => String }) clienteId: string,
  ): Promise<AggregateBookingResponseModel> {
    return this.bffService.getMisReservas(sanitizeString(clienteId, 120));
  }

  @Query(() => FacturaCompletaModel, {
    name: 'obtenerFacturaCompleta',
    description: 'Consulta de factura con encabezado, detalle de líneas y datos fiscales del cliente',
  })
  async obtenerFacturaCompleta(
    @Args('numeroFactura', { type: () => String }) numeroFactura: string,
  ): Promise<FacturaCompletaModel> {
    return this.bffService.getFacturaCompleta(sanitizeString(numeroFactura, 60));
  }

  @Query(() => [PaqueteComboModel], {
    name: 'obtenerPaquetesDisponibles',
    description: 'Consulta de combos multivertical con contratos de descuento B2B respetados',
  })
  async obtenerPaquetesDisponibles(): Promise<PaqueteComboModel[]> {
    return this.bffService.getPaquetesDisponibles();
  }

  @Mutation(() => CheckoutResultModel, {
    name: 'checkoutOrquestado',
    description: 'Orquestación de compra compuesta mediante Patrón Saga LIFO y compensación automática (Throttling & Sanitización activos)',
  })
  @UseGuards(GqlThrottlerGuard)
  async checkoutOrquestado(
    @Args('input') input: CheckoutSagaInputGql,
  ): Promise<CheckoutResultModel> {
    const sanitizedInput = sanitizeObject(input);
    return this.bffService.checkoutOrquestado(sanitizedInput);
  }

  @Mutation(() => Boolean, {
    name: 'cancelarReservaConSaga',
    description: 'Cancelación de reserva con compensación automática y restitución de aforo (Throttling & Sanitización activos)',
  })
  @UseGuards(GqlThrottlerGuard)
  async cancelarReservaConSaga(
    @Args('reservaId', { type: () => String }) reservaId: string,
    @Args('vertical', { type: () => String }) vertical: string,
    @Args('motivo', { type: () => String, defaultValue: 'Cancelación solicitada por el usuario en marketplace' }) motivo: string,
  ): Promise<boolean> {
    const sanitizedReservaId = sanitizeString(reservaId, 80);
    const sanitizedVertical = sanitizeString(vertical, 40);
    const sanitizedMotivo = sanitizeString(motivo, 500);
    return this.bffService.cancelarReservaConSaga(sanitizedReservaId, sanitizedVertical, sanitizedMotivo);
  }

  @Mutation(() => CheckInResultModel, {
    name: 'realizarCheckInDigital',
    description: 'Check-in multivertical (QR para atracciones, km para autos, 14:00 para alojamientos, boarding pass para vuelos) (Throttling & Sanitización activos)',
  })
  @UseGuards(GqlThrottlerGuard)
  async realizarCheckInDigital(
    @Args('input') input: CheckInInputGql,
  ): Promise<CheckInResultModel> {
    const sanitizedInput = sanitizeObject(input);
    return this.bffService.realizarCheckInDigital(sanitizedInput);
  }
}
