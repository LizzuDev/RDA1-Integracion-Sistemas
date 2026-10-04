import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(SupabaseAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'KPIs globales del sistema (requiere Auth)' })
  @ApiResponse({ status: 200, description: 'Estadísticas globales.' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Lista de usuarios registrados (requiere Auth)' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios.' })
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Get('reservas')
  @ApiOperation({ summary: 'Todas las reservas del sistema (requiere Auth)' })
  @ApiResponse({ status: 200, description: 'Reservas globales por tipo.' })
  async getReservasGlobales() {
    return this.adminService.getReservasGlobales();
  }

  @Put('users/:id/action')
  @ApiOperation({ summary: 'Acción sobre un usuario (bloquear, desbloquear, reset_password)' })
  async userAction(@Param('id') id: string, @Body() body: { action: string }) {
    return this.adminService.executeUserAction(id, body.action);
  }

  @Get('users/:id/historial')
  @ApiOperation({ summary: 'Ver historial de compras de un usuario' })
  async getUserHistorial(@Param('id') id: string) {
    return this.adminService.getUserHistorial(id);
  }

  @Put('reservas/:tipo/:id/cancelar')
  @ApiOperation({ summary: 'Cancelar una reserva' })
  async cancelarReserva(@Param('tipo') tipo: string, @Param('id') id: string) {
    return this.adminService.cancelarReserva(tipo, id);
  }

  @Get('reservas/:tipo/:id/detalles')
  @ApiOperation({ summary: 'Obtener detalles técnicos de una reserva' })
  async getReservaDetalles(@Param('tipo') tipo: string, @Param('id') id: string) {
    return this.adminService.getReservaDetalles(tipo, id);
  }

  @Put('reservas/:tipo/:id/reenviar')
  @ApiOperation({ summary: 'Reenviar comprobante al cliente' })
  async reenviarComprobante(@Param('tipo') tipo: string, @Param('id') id: string) {
    return this.adminService.reenviarComprobante(tipo, id);
  }
}
