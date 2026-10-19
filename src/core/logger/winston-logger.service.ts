import { Injectable, LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Servicio de Logging Físico Rotativo (Winston Standard / Cátedra Integración de Sistemas)
 * 
 * POLÍTICA DE ORO OBLIGATORIA (Consideraciones RDA2 §2):
 * - PROHIBIDO guardar logs de auditoría en PostgreSQL o bases de datos relacionales.
 * - Todos los eventos deben persistirse exclusivamente en archivos planos rotativos en disco:
 *   - logs/audit-YYYY-MM-DD.log
 *   - logs/integration-YYYY-MM-DD.log
 */
@Injectable()
export class WinstonPhysicalLoggerService implements LoggerService {
  private readonly logsDir = path.resolve(process.cwd(), 'logs');

  constructor() {
    this.ensureLogsDirectory();
  }

  private ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private getTodayDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  private writeToFile(filename: string, entry: object) {
    try {
      this.ensureLogsDirectory();
      const filePath = path.join(this.logsDir, filename);
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(filePath, logLine, 'utf8');
    } catch (err) {
      console.error(`[WinstonPhysicalLogger] Error al escribir en ${filename}:`, err);
    }
  }

  /**
   * Registra eventos de auditoría (búsqueda, reserva, cancelaciones, check-in, cambios de estado).
   */
  logAudit(event: string, payload: any, correlationId?: string) {
    const filename = `audit-${this.getTodayDateString()}.log`;
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'AUDIT',
      event,
      correlation_id: correlationId || 'auto-' + Date.now(),
      payload
    };
    this.writeToFile(filename, entry);
  }

  /**
   * Registra llamadas a servicios de integración externos (tiendas de compañeros).
   */
  logIntegration(serviceName: string, operation: string, status: number, latencyMs: number, details?: any) {
    const filename = `integration-${this.getTodayDateString()}.log`;
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'INTEGRATION',
      service: serviceName,
      operation,
      status_code: status,
      latency_ms: latencyMs,
      details: details || {}
    };
    this.writeToFile(filename, entry);
  }

  // Métodos estándar de NestJS LoggerService
  log(message: any, ...optionalParams: any[]) {
    this.logAudit('INFO', { message, params: optionalParams });
  }

  error(message: any, ...optionalParams: any[]) {
    this.logAudit('ERROR', { message, params: optionalParams });
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logAudit('WARN', { message, params: optionalParams });
  }

  debug?(message: any, ...optionalParams: any[]) {
    this.logAudit('DEBUG', { message, params: optionalParams });
  }

  verbose?(message: any, ...optionalParams: any[]) {
    this.logAudit('VERBOSE', { message, params: optionalParams });
  }
}
