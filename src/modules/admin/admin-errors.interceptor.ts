import { CallHandler, ExecutionContext, HttpException, Injectable, InternalServerErrorException, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';

/**
 * El filtro RFC 7807 global responde "Error interno del servidor" para
 * cualquier excepción que no sea HttpException, y así el panel nunca ve la
 * causa real (tabla inexistente, permiso denegado, etc.). Para las rutas del
 * panel de administración se convierte el error en un 500 que SÍ lleva el
 * mensaje original, de modo que se muestre en pantalla.
 */
@Injectable()
export class AdminErrorsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AdminErrors');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    return next.handle().pipe(
      catchError((err) => {
        if (err instanceof HttpException) return throwError(() => err);
        const msg = err?.message || String(err);
        this.logger.error(`${req?.method} ${req?.url}: ${msg}`, err?.stack);
        return throwError(() => new InternalServerErrorException(`Error del servidor en ${req?.path || 'admin'}: ${msg}`));
      }),
    );
  }
}
