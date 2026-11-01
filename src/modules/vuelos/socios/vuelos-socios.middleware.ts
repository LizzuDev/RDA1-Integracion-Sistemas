import { Injectable, Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { VuelosSociosService } from './vuelos-socios.service';
import { VuelosService } from '../vuelos.service';

const RUTA_VUELOS = /^\/api\/v\d+\/vuelos\/(.+)$/;

/**
 * Se monta en `main.ts` DESPUÉS de los body parsers (necesita `req.body`).
 *
 *  - `POST /api/vN/vuelos/search` → búsqueda agregada en las aerolíneas socias.
 *  - Cualquier ruta de vuelos cuyo id (ruta o cuerpo) lleve `<NODO>~` → se
 *    reenvía a esa aerolínea.
 *  - Todo lo demás sigue al controlador local, sin cambios.
 */
@Injectable()
export class VuelosSociosMiddleware {
  private readonly logger = new Logger(VuelosSociosMiddleware.name);

  constructor(
    private readonly socios: VuelosSociosService,
    private readonly vuelosLocal: VuelosService,
  ) {}

  handler() {
    return (req: Request, res: Response, next: NextFunction) => {
      this.manejar(req, res).then(
        (atendida) => (atendida ? undefined : next()),
        (e) => {
          this.logger.error(`[vuelos-socios] error inesperado: ${e?.message}`, e?.stack);
          next(e);
        },
      );
    };
  }

  private async manejar(req: Request, res: Response): Promise<boolean> {
    const fuente = this.socios.fuente();
    if (fuente === 'local') return false;

    const [ruta, query = ''] = (req.originalUrl || req.url).split('?');
    const m = RUTA_VUELOS.exec(ruta);
    if (!m) return false;
    const segmentos = m[1].split('/').filter(Boolean);
    const entrantes = req.headers as Record<string, any>;

    if (req.method === 'POST' && segmentos.length === 1 && segmentos[0] === 'search') {
      const { offers, sources } = await this.socios.buscar(req.body, entrantes, req.headers.host);
      let todas = offers;
      if (fuente === 'mixto') {
        try {
          const local: any = await this.vuelosLocal.searchFlights(req.body);
          todas = [...offers, ...(local?.offers ?? [])];
        } catch (e: any) {
          sources.push({ codigoNodo: 'BOOKING_LOCAL', nombre: 'Base local', ok: false, ms: 0, ofertas: 0, error: e?.message });
        }
      }
      res.status(200).json({
        totalOffers: todas.length,
        offers: todas,
        meta: {
          fuente,
          totalOffers: todas.length,
          airlinesQueried: sources.length,
          airlinesOk: sources.filter((s) => s.ok).length,
        },
        sources,
      });
      return true;
    }

    const nodo = VuelosSociosService.detectarNodo(segmentos, req.body);
    if (!nodo) return false;

    const r = await this.socios.reenviar(nodo, req.method, segmentos, query, req.body, entrantes);
    for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
    if (r.body === null || r.body === undefined || r.body === '') {
      res.status(r.status).end();
    } else if (typeof r.body === 'object') {
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(r.status).send(JSON.stringify(r.body));
    } else {
      res.status(r.status).send(r.body);
    }
    return true;
  }
}
