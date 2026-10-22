import { Controller, Post, Get, Body, Headers, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PagosService, ModoSimuladorPago } from './pagos.service';

@ApiTags('Pagos SOA y Simulación (MS_PAG)')
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post('procesar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Procesar cobro transaccional con Idempotency-Key e inyección de fallos (Cátedra §7)' })
  @ApiHeader({ name: 'idempotency-key', required: false, description: 'Clave única para garantizar idempotencia del cobro' })
  @ApiResponse({ status: 200, description: 'Pago aprobado con código de autorización.' })
  @ApiResponse({ status: 402, description: 'Fondos insuficientes (Simulación de fallo).' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout (Simulación de fallo para Circuit Breakers).' })
  async procesarPago(
    @Body() dto: any,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    const key = idempotencyKey || dto.idempotency_key || `idem-pay-${Date.now()}`;
    return this.pagosService.procesarPago(dto, key);
  }

  @Post('reembolsos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Emitir reembolso compensatorio para el patrón Saga LIFO (Cátedra §8)' })
  @ApiHeader({ name: 'idempotency-key', required: false })
  @ApiResponse({ status: 200, description: 'Reembolso procesado con código REF-PAG-...' })
  async procesarReembolso(
    @Body() dto: any,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    const key = idempotencyKey || dto.idempotency_key || `idem-ref-${Date.now()}`;
    return this.pagosService.procesarReembolso(dto, key);
  }

  @Get('simulador/config')
  @ApiOperation({ summary: 'Consultar configuración del simulador de fallos de pagos SOA (Panel 6)' })
  @ApiResponse({ status: 200, description: 'Modo actual y latencia de pasarela bancaria.' })
  getConfigSimulador() {
    return this.pagosService.getConfigSimulador();
  }

  @Post('simulador/config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ajustar en caliente el modo de inyección de fallos (NORMAL, RECHAZO_FONDOS, TIMEOUT_RED)' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada.' })
  updateConfigSimulador(@Body() dto: { modo: ModoSimuladorPago; latencia_ms?: number }) {
    return this.pagosService.updateConfigSimulador(dto);
  }

  @Get('transacciones')
  @ApiOperation({ summary: 'Listar historial de transacciones de pago para el Panel de Control' })
  @ApiResponse({ status: 200, description: 'Historial de pagos aprobados, rechazados y reembolsados.' })
  async getTransacciones(@Query('limit') limit: number) {
    return this.pagosService.getHistorialTransacciones(Number(limit) || 20);
  }
}
