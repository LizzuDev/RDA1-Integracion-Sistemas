import { Controller, Get, Post, Body, Param, Headers, UseInterceptors, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AutosService, SearchAutosDto } from './autos.service';
import { CreateAutoOrderDto } from './dto/create-auto-order.dto';
import { CheckinAutoDto } from './dto/checkin-auto.dto';
import { RegistroMantenimientoDto } from './dto/registro-mantenimiento.dto';
import { ApiTags, ApiOperation, ApiHeader, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';

@ApiTags('Autos (BFF Integrador v2)')
@Controller('autos')
export class AutosController {
  constructor(private readonly autosService: AutosService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Búsqueda avanzada de vehículos (Catálogo Híbrido v2 con Cooldown de 2h)' })
  @ApiResponse({ status: 200, description: 'Catálogo de vehículos disponibles (excluye autos en limpieza/cooldown)' })
  search(
    @Body() dto: SearchAutosDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.autosService.search(dto, correlationId);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Obtener historial de órdenes (Admin)' })
  getOrders() {
    return this.autosService.getOrders();
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Obtener detalles de la orden' })
  @ApiParam({ name: 'orderId', description: 'ID o PNR de la orden' })
  getOrderById(@Param('orderId') orderId: string) {
    return this.autosService.getOrderById(orderId);
  }

  @Post('orders/:orderId/cancel')
  @ApiOperation({ summary: 'Cancelar una orden de renta' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  cancelOrder(
    @Param('orderId') orderId: string,
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() cancelData: any
  ) {
    return this.autosService.cancelOrder(orderId, cancelData, idempotencyKey);
  }

  @Get(':id/coberturas')
  @ApiOperation({ summary: 'Consultar opciones de cobertura (Protección Básica vs Cobertura Total RDA2)' })
  @ApiParam({ name: 'id', description: 'ID del vehículo' })
  @ApiResponse({ status: 200, description: 'Desglose de franquicias, depósitos y coberturas' })
  getCoberturas(@Param('id') id: string) {
    return this.autosService.getCoberturas(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar detalle técnico de un vehículo por ID' })
  @ApiParam({ name: 'id', description: 'ID del vehículo' })
  @ApiResponse({ status: 200, description: 'Detalle técnico y especificaciones del vehículo' })
  getAutoById(@Param('id') id: string) {
    return this.autosService.getAutoById(id);
  }

  @Post('orders/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear orden/reserva de vehículo con Idempotency-Key y Voucher Digital QR' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'X-Correlation-Id', required: false })
  createOrder(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Headers('x-correlation-id') correlationId: string,
    @Body() orderData: CreateAutoOrderDto
  ) {
    const key = idempotencyKey || orderData.idempotency_key || `idem-${Date.now()}`;
    return this.autosService.createOrder(orderData, key, correlationId);
  }

  @Post('reservas')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear reserva de vehículo (Alias v2)' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createReserva(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Headers('x-correlation-id') correlationId: string,
    @Body() orderData: CreateAutoOrderDto
  ) {
    const key = idempotencyKey || orderData.idempotency_key || `idem-${Date.now()}`;
    return this.autosService.createOrder(orderData, key, correlationId);
  }

  @Post('reservas/:id/checkin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check-in digital anticipado para retiro express de llaves (RDA2)' })
  @ApiParam({ name: 'id', description: 'ID o PNR de la reserva' })
  @ApiResponse({ status: 200, description: 'Check-in confirmado con voucher QR para mostrador' })
  checkin(
    @Param('id') id: string,
    @Body() dto: CheckinAutoDto
  ) {
    return this.autosService.checkin(id, dto);
  }

  @Post(':id/devolucion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar devolución del auto e iniciar Cooldown de Limpieza de 2 Horas (RDA2 §5)' })
  @ApiParam({ name: 'id', description: 'ID del vehículo devuelto' })
  @ApiResponse({ status: 200, description: 'Estado cambiado a EN_LIMPIEZA con timestamp de 2 horas' })
  registrarDevolucion(@Param('id') id: string) {
    return this.autosService.registrarDevolucion(id);
  }

  @Post(':id/mantenimiento/registro')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registro técnico de odómetro y alerta preventiva de kilometraje (Rol Técnico RDA2 §5)' })
  @ApiParam({ name: 'id', description: 'ID del vehículo' })
  @ApiResponse({ status: 200, description: 'Registro asentado con algoritmo de alerta preventiva' })
  registrarMantenimiento(
    @Param('id') id: string,
    @Body() dto: RegistroMantenimientoDto
  ) {
    return this.autosService.registrarMantenimiento(id, dto);
  }

  // --- Endpoints de Catálogo y Compatibilidad Legacy --- //

  @Post('depots')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Consultar lista de agencias de renta' })
  getDepots() {
    return this.autosService.getDepots();
  }

  @Post('constants')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Consultar constantes del sistema' })
  getConstants() {
    return this.autosService.getConstants();
  }

  @Post('suppliers')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Listar proveedores de renta de autos' })
  getSuppliers() {
    return this.autosService.getSuppliers();
  }


  // --- Endpoints Administrativos para CRUD de Autos Locales --- //
  
  @Post()
  @ApiOperation({ summary: 'Crear auto local (Admin)' })
  createAutoLocal(@Body() autoData: any) {
    return this.autosService.createAutoLocal(autoData);
  }

  @Post(':id/delete')
  @ApiOperation({ summary: 'Eliminar auto local (Admin)' })
  deleteAutoLocal(@Param('id') id: string) {
    return this.autosService.deleteAutoLocal(id);
  }
}
