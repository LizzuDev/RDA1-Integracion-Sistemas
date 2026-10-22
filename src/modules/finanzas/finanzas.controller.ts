import { Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { FinanzasService } from './finanzas.service';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { Rol } from '../../core/auth/roles.enum';

@ApiTags('Finanzas y Liquidaciones a Proveedores (MS_FIN)')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Admin-Key', description: 'Clave de administración para pruebas automáticas', required: false })
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('finanzas')
export class FinanzasController {
  constructor(private readonly finanzasService: FinanzasService) {}

  @Get('resumen')
  @ApiOperation({ summary: 'Consultar balance financiero global (10% comisiones Booking vs 90% socios)' })
  @ApiResponse({ status: 200, description: 'Resumen consolidado de comisiones y saldos por liquidar.' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso restringido (requiere rol ADMIN)' })
  async getResumen() {
    return this.finanzasService.getResumenFinanciero();
  }

  @Get('liquidaciones')
  @ApiOperation({ summary: 'Listar liquidaciones quincenales a proveedores turísticos (Panel 4)' })
  @ApiResponse({ status: 200, description: 'Tabla de liquidaciones pendientes y pagadas.' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso restringido (requiere rol ADMIN)' })
  async getLiquidaciones(
    @Query('periodo') periodo?: string,
    @Query('estado') estado?: string,
  ) {
    return this.finanzasService.getLiquidaciones(periodo, estado);
  }

  @Post('liquidaciones/:id/pagar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Asentar pago de liquidación a socio con comprobante bancario (Panel 4 RDA2)' })
  @ApiParam({ name: 'id', description: 'UUID de la liquidación' })
  @ApiResponse({ status: 200, description: 'Liquidación marcada como pagada con comprobante adjunto.' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso restringido (requiere rol ADMIN)' })
  async marcarPagada(
    @Param('id') id: string,
    @Body() dto: { comprobante_url: string; notas?: string },
  ) {
    return this.finanzasService.marcarLiquidacionPagada(id, dto);
  }

  @Get('libro-mayor')
  @ApiOperation({ summary: 'Consultar libro mayor con desglose del 10% por cada orden confirmada' })
  @ApiResponse({ status: 200, description: 'Asientos contables correlativos de ventas y comisiones.' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso restringido (requiere rol ADMIN)' })
  async getLibroMayor(@Query('limit') limit: number) {
    return this.finanzasService.getLibroMayor(Number(limit) || 20);
  }
}
