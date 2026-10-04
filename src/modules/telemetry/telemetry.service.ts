import { Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly supabase;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder');
  }

  async trackEvent(data: any) {
    const { error } = await this.supabase
      .from('telemetry_events')
      .insert({
        event_name: data.event_name,
        session_id: data.session_id || 'anonymous',
        user_id: data.user_id,
        vertical: data.vertical,
        device: data.device,
        properties: data.properties || {},
      });
      
    if (error) this.logger.error('Error guardando evento de telemetría: ' + error.message);
    return { success: !error };
  }

  async trackApiCall(data: any) {
    const { error } = await this.supabase
      .from('provider_api_calls')
      .insert({
        provider: data.provider,
        vertical: data.vertical,
        operation: data.operation,
        status_code: data.status_code,
        latency_ms: data.latency_ms,
        success: data.success,
        error_type: data.error_type,
        error_message: data.error_message,
        session_id: data.session_id,
      });

    if (error) this.logger.error('Error guardando telemetría de API: ' + error.message);
  }
}
