import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminConfigService } from './admin-config.service';

/**
 * Ajustes que el frontend público necesita conocer SIN sesión:
 * modo mantenimiento y si la pasarela de pagos está activa.
 * No expone nada sensible.
 */
@ApiTags('Config')
@Controller('config')
export class PublicConfigController {
  constructor(private readonly configService: AdminConfigService) {}

  @Get('public')
  @ApiOperation({ summary: 'Estado público de la plataforma (mantenimiento, pagos)' })
  async getPublic() {
    try {
      const c = await this.configService.getConfig();
      return { maintenanceMode: c.maintenanceMode, paymentsEnabled: c.stripeEnabled, emailsEnabled: c.emailsEnabled, tasaImpuestos: c.tasaImpuestos };
    } catch {
      return { maintenanceMode: false, paymentsEnabled: true, emailsEnabled: true, tasaImpuestos: 15 };
    }
  }
}
