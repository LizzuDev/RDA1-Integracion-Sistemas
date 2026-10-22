import { Controller, Get, Post, Put, Body, Param, Query, Headers, UseInterceptors, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { AutosService, SearchAutosDto } from './autos.service';
import { CreateAutoOrderDto } from './dto/create-auto-order.dto';
import { CheckinAutoDto } from './dto/checkin-auto.dto';
import { RegistroMantenimientoDto } from './dto/registro-mantenimiento.dto';
import { ApiTags, ApiOperation, ApiHeader, ApiParam, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { Rol } from '../../core/auth/roles.enum';

@ApiTags('Autos (BFF Integrador v2)')
@Controller('autos')
export class AutosController {
  constructor(private readonly autosService: AutosService) {}

  @Get('health')
  @ApiOperation({ summary: 'Healthcheck y telemetría de nodo de Autos (Semáforo 🟢/🔴 RDA2 CE01)' })
  @ApiResponse({ status: 200, description: 'Estado de salud operativo y telemetría de nodo' })
  getHealth() {
    return this.autosService.getHealth();
  }

  @Get('promociones/contrato')
  @ApiOperation({ summary: 'Consultar acuerdo comercial B2B para combos y promociones (Cátedra RDA2 §9)' })
  @ApiResponse({ status: 200, description: 'Acuerdo comercial vigente de promociones y combos' })
  getPromocionesContrato() {
    return this.autosService.getPromocionesContrato();
  }

  @Put('promociones/contrato')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar o formalizar acuerdo B2B de promociones y combos (Cátedra RDA2 §9)' })
  @ApiResponse({ status: 200, description: 'Acuerdo de promociones actualizado exitosamente' })
  updatePromocionesContrato(@Body() dto: any) {
    return this.autosService.updatePromocionesContrato(dto);
  }

  @Get('eventos')
  @ApiOperation({ summary: 'Feed Outbox de eventos asíncronos para streaming EDA (RabbitMQ / Kafka)' })
  @ApiResponse({ status: 200, description: 'Lista de eventos asíncronos CloudEvents' })
  getEventos(@Query('limit') limit?: number) {
    return this.autosService.getEventos({ limit });
  }

  @Get()
  @ApiOperation({ summary: 'Listar catálogo general de vehículos disponibles' })
  @ApiResponse({ status: 200, description: 'Catálogo de vehículos disponibles (excluye autos en limpieza)' })
  getCatalog(@Query() query: any) {
    return this.autosService.getCatalog(query);
  }

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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar una orden de renta' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  cancelOrder(
    @Param('orderId') orderId: string,
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() cancelData: any
  ) {
    return this.autosService.cancelOrder(orderId, cancelData, idempotencyKey);
  }

  @Get('flota')
  @ApiOperation({ summary: 'Consultar estado operativo de toda la flota con cronómetro de cooldown en vivo (Panel 2)' })
  @ApiResponse({ status: 200, description: 'Flota completa con conteo regresivo de 2 horas y alertas de kilometraje.' })
  getFlota() {
    return this.autosService.getFlota();
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

  @Post('orders/:id/checkin-entrega')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check-in de Entrega en mostrador (Licencia y Odómetro Inicial) (Cátedra RDA2 §5)' })
  checkinEntrega(
    @Param('id') id: string,
    @Body() dto: { licencia_conducir: string; km_salida: number; tecnico_entrega?: string }
  ) {
    return this.autosService.checkinEntrega(id, dto);
  }

  @Post('orders/:id/checkin-devolucion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check-in de Retorno y activación inmediata de Cooldown de Limpieza de 2h (Cátedra RDA2 §5)' })
  checkinDevolucion(
    @Param('id') id: string,
    @Body() dto: { km_retorno: number; nivel_combustible?: number; observaciones?: string }
  ) {
    return this.autosService.checkinDevolucion(id, dto);
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
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(Rol.MANTENIMIENTO, Rol.ADMIN)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Role', description: 'Rol técnico para evaluación (MANTENIMIENTO o ADMIN)', required: false })
  @ApiOperation({ summary: 'Registro técnico de odómetro y alerta preventiva de kilometraje (Rol MANTENIMIENTO / ADMIN RDA2 §5)' })
  @ApiParam({ name: 'id', description: 'ID del vehículo' })
  @ApiResponse({ status: 200, description: 'Registro asentado con algoritmo de alerta preventiva' })
  @ApiResponse({ status: 401, description: 'No autenticado o credencial ausente' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente (requiere MANTENIMIENTO o ADMIN)' })
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
