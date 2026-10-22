import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Guard de Throttling / Rate-Limiting para Mutaciones Críticas de GraphQL BFF.
 * 
 * Implementa una ventana deslizante en memoria para proteger Sagas y transacciones
 * de saturación, ataques de denegación de servicio (DoS) o repeticiones maliciosas.
 */
@Injectable()
export class GqlThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(GqlThrottlerGuard.name);
  private readonly limits = new Map<string, RateLimitRecord>();

  // Configuración predeterminada: Máximo 30 mutaciones por minuto por IP/Cliente
  private readonly MAX_REQUESTS = 30;
  private readonly WINDOW_MS = 60 * 1000;

  canActivate(context: ExecutionContext): boolean {
    const gqlCtx = GqlExecutionContext.create(context);
    const { req } = gqlCtx.getContext() || {};

    const clientIdentifier =
      req?.headers?.['x-forwarded-for'] ||
      req?.headers?.['x-client-ip'] ||
      req?.ip ||
      req?.connection?.remoteAddress ||
      'anonymous-client';

    const now = Date.now();
    const current = this.limits.get(clientIdentifier);

    if (!current || now > current.resetAt) {
      this.limits.set(clientIdentifier, {
        count: 1,
        resetAt: now + this.WINDOW_MS,
      });
      return true;
    }

    if (current.count >= this.MAX_REQUESTS) {
      const waitSeconds = Math.ceil((current.resetAt - now) / 1000);
      this.logger.warn(`[GqlThrottler] Cliente ${clientIdentifier} excedió límite de mutaciones. Esperar ${waitSeconds}s.`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Límite de tasa excedido en mutaciones GraphQL BFF. Por favor espere ${waitSeconds} segundos antes de reintentar.`,
          error: 'Too Many Requests',
          retry_after_seconds: waitSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count++;
    return true;
  }
}
