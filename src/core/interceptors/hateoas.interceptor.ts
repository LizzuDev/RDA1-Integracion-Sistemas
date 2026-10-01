import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class HateoasInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const baseUrl = `${request.protocol}://${request.get('host')}/api/v1`;

    return next.handle().pipe(
      map(data => {
        if (!data) return data;

        // Si es una lista de atracciones
        if (data.items && Array.isArray(data.items)) {
          data.items = data.items.map(item => this.addLinks(item, baseUrl));
          // Añadir links de paginación
          data._links = {
            self: { href: `${baseUrl}${request.url}` },
            next: data.nextCursor ? { href: `${baseUrl}${request.path}?cursor=${data.nextCursor}` } : null
          };
        } else {
          data = this.addLinks(data, baseUrl);
        }

        return data;
      })
    );
  }

  private addLinks(item: any, baseUrl: string) {
    if (typeof item !== 'object' || item === null) return item;

    // Detectar si es una Atracción
    if (item.product_type || item.operator) {
      item._links = {
        self: { href: `${baseUrl}/atracciones/${item.id}`, method: 'GET' },
        reservar: { href: `${baseUrl}/atracciones/${item.id}/reservations`, method: 'POST' }
      };
    }

    // Detectar si es un Vuelo / Oferta
    if (item.offerId && item.itineraries) {
      item._links = {
        self: { href: `${baseUrl}/vuelos/search`, method: 'POST' },
        hold: { href: `${baseUrl}/vuelos/offers/hold`, method: 'POST' }
      };
    }

    // Detectar si es una Reserva
    if (item.bookingId && item.pnr !== undefined) {
      item._links = {
        self: { href: `${baseUrl}/vuelos/bookings/${item.bookingId}`, method: 'GET' },
        tickets: { href: `${baseUrl}/vuelos/bookings/${item.bookingId}/tickets`, method: 'GET' },
        cancel: { href: `${baseUrl}/vuelos/bookings/${item.bookingId}/cancel`, method: 'POST' },
        checkin: { href: `${baseUrl}/vuelos/bookings/${item.bookingId}/check-in`, method: 'POST' }
      };
    }

    return item;
  }
}
