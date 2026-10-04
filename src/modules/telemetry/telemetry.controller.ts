import { Controller, Post, Body } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('events')
  async trackEvent(@Body() body: any) {
    return this.telemetryService.trackEvent(body);
  }
}
