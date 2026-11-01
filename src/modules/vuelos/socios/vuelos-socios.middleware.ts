import { Injectable, Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { RespuestaProxy, VuelosSociosService } from './vuelos-socios.service';
import { VuelosSociosReservasService } from './vuelos-socios-reservas.service';
import { VuelosService } from '../vuelos.service';
import { propietarioDesde } from '../vuelos.controller';

const RUTA_VUELOS = /^\/api\/v\d+\/vuelos\/(.+)$/;

/**
 * Se monta en `main.ts` DESPUÉS de los body parsers (necesita `req.body`).
 *
 *  - `POST   /vuelos/search`               → búsqueda agregada en las aerolíneas.
 *  - `POST   /vuelos/bookings` (hold socio) → cobra en MS_PAG, reserva en la
 *    aerolínea, guarda la copia para Mis Reservas; si la aerolínea falla,
 *    reembolsa (SAGA).
 *  - `GET    /vuelos/bookings`             → Mis Reservas con las reservas de socios.
 *  - `/vuelos/bookings/<NODO>~id/...`      → solo el dueño; se reenvía al socio.
 *    Al cancelar, Booking ejecuta el reembolso que calcula la aerolínea.
 *  - `GET    /vuelos/flights/{n}/status`   → pregunta a todas las aerolíneas.
 *  - Otras rutas con `<NODO>~` (hold, seatmap...) → se reenvían al socio.
 *  - Todo lo demás sigue al controlador local.
 */
@Injectable()
export class VuelosSociosMiddleware {
  private readonly logger = new Logger(VuelosSociosMiddleware.name);

  constructor(
    private readonly socios: VuelosSociosService,
    private readonly vuelosLocal: VuelosService,
    private readonly reservas: VuelosSociosReservasService,
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
    const metodo = req.method.toUpperCase();

    // ── Búsqueda ──
    if (metodo === 'POST' && segmentos.length === 1 && segmentos[0] === 'search') {
      await this.buscar(req, res, fuente, entrantes);
      return true;
    }

    // ── Mis Reservas ──
    if (metodo === 'GET' && segmentos.length === 1 && segmentos[0] === 'bookings') {
      await this.listar(req, res, fuente);
      return true;
    }

    // ── Estado de vuelo ──
    if (metodo === 'GET' && segmentos[0] === 'flights' && segmentos[2] === 'status') {
      const r = await this.socios.primeraRespuesta('GET', segmentos, query, entrantes, req.headers.host);
      if (fuente === 'mixto' && (r.status < 200 || r.status >= 300)) return false; // que responda la base local
      this.enviar(res, r);
      return true;
    }

    const nodo = VuelosSociosService.detectarNodo(segmentos, req.body);
    if (!nodo) return false;

    // ── Crear reserva en la aerolínea ──
    if (metodo === 'POST' && segmentos.length === 1 && segmentos[0] === 'bookings') {
      await this.reservar(req, res, nodo, entrantes);
      return true;
    }

    // ── Rutas de una reserva existente: solo el dueño ──
    if (segmentos[0] === 'bookings' && segmentos[1]) {
      const bookingId = decodeURIComponent(segmentos[1]);
      const copia = await this.reservas.obtener(bookingId);
      const propietario = propietarioDesde(entrantes['x-device-fingerprint'], entrantes['authorization']);
      if (!copia || copia.propietarioId !== propietario) {
        this.enviar(res, problema(404, 'Reserva no encontrada', 'La reserva no existe o no pertenece a este usuario.'));
        return true;
      }
      const r = await this.socios.reenviar(nodo, metodo, segmentos, query, req.body, entrantes);
      await this.despuesDeReserva(metodo, segmentos, bookingId, copia, r);
      this.enviar(res, r);
      return true;
    }

    this.enviar(res, await this.socios.reenviar(nodo, metodo, segmentos, query, req.body, entrantes));
    return true;
  }

  // ───────────────────────────── Búsqueda ─────────────────────────────

  private async buscar(req: Request, res: Response, fuente: string, entrantes: Record<string, any>) {
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
  }

  // ───────────────────────────── Reservar + pagar ─────────────────────────────

  private async reservar(req: Request, res: Response, nodo: string, entrantes: Record<string, any>) {
    const propietario = propietarioDesde(entrantes['x-device-fingerprint'], entrantes['authorization']);
    const idem = String(entrantes['idempotency-key'] || '').trim();
    if (!idem) {
      this.enviar(res, problema(400, 'Falta Idempotency-Key', 'La cabecera Idempotency-Key es obligatoria para reservar.'));
      return;
    }
    const holdId = String(req.body?.holdId || '');

    // 1) Monto: se toma del hold de la aerolínea (precio congelado), no del cliente.
    const hold = await this.socios.reenviar(nodo, 'GET', ['offers', 'hold', holdId], '', null, entrantes);
    const monto = parseFloat(String(hold.body?.lockedPrice?.total ?? hold.body?.price?.total ?? hold.body?.grandTotal?.total ?? ''));
    if (hold.status < 200 || hold.status >= 300 || !Number.isFinite(monto) || monto <= 0) {
      this.enviar(
        res,
        hold.status >= 400
          ? hold
          : problema(409, 'Hold sin precio', 'La aerolínea no devolvió el precio congelado del hold (lockedPrice.total).'),
      );
      return;
    }

    // 2) Cobro en MS_PAG (idempotente con la misma clave del cliente).
    const cobro = await this.reservas.cobrar(monto, idem, propietario);
    if (!cobro.ok) {
      this.enviar(res, problema(cobro.status === 402 ? 402 : cobro.status ?? 502, 'Pago no aprobado', cobro.detalle ?? 'El cobro fue rechazado.'));
      return;
    }

    // 3) Reserva en la aerolínea con la referencia de pago real.
    const cuerpo = { ...(req.body ?? {}), payment: { ...(req.body?.payment ?? {}), paymentReference: cobro.paymentReference } };
    const r = await this.socios.reenviar(nodo, 'POST', ['bookings'], '', cuerpo, entrantes);

    // 4) SAGA: si la aerolínea no confirmó, se devuelve el dinero.
    if (r.status < 200 || r.status >= 300 || !r.body?.bookingId) {
      if (cobro.transaccionId) {
        await this.reservas.reembolsar(cobro.transaccionId, monto, `Aerolínea ${nodo} rechazó la reserva (HTTP ${r.status})`);
      }
      this.enviar(res, r.status >= 400 ? withDetalle(r, 'Se reembolsó el cobro.') : problema(502, 'Reserva no confirmada', 'La aerolínea no devolvió bookingId. Se reembolsó el cobro.'));
      return;
    }

    // 5) Copia para Mis Reservas.
    try {
      await this.reservas.registrar({ bookingId: r.body.bookingId, codigoNodo: nodo, propietarioId: propietario, reserva: r.body, montoCobrado: monto, cobro });
    } catch (e: any) {
      this.logger.error(`[vuelos-socios] No se guardó la copia de ${r.body.bookingId}: ${e?.message}`);
    }
    r.body = { ...r.body, payment: { ...(r.body.payment ?? {}), paymentReference: cobro.paymentReference } };
    this.enviar(res, r);
  }

  private async despuesDeReserva(metodo: string, segmentos: string[], bookingId: string, copia: any, r: RespuestaProxy) {
    if (r.status < 200 || r.status >= 300 || !r.body || typeof r.body !== 'object') return;
    try {
      if (metodo === 'GET' && segmentos.length === 2) {
        await this.reservas.actualizarDesdeSocio(bookingId, r.body);
      } else if (metodo === 'POST' && segmentos[2] === 'cancel') {
        // Contrato v2: "La aerolínea calcula; Booking ejecuta el reembolso al cliente."
        const monto = parseFloat(String(r.body?.refund?.amount ?? r.body?.refundAmount ?? ''));
        let devuelto = 0;
        if (copia.transaccionId && Number.isFinite(monto) && monto > 0) {
          devuelto = await this.reservas.reembolsar(copia.transaccionId, monto, `Cancelación ${bookingId}`);
        }
        await this.reservas.marcarEstado(bookingId, String(r.body.status || 'CANCELLED'), devuelto);
        if (devuelto > 0) r.body = { ...r.body, refund: { ...(r.body.refund ?? {}), executedByBooking: true, executedAmount: devuelto.toFixed(2) } };
      }
    } catch (e: any) {
      this.logger.error(`[vuelos-socios] post-proceso ${metodo} ${bookingId}: ${e?.message}`);
    }
  }

  // ───────────────────────────── Mis Reservas ─────────────────────────────

  private async listar(req: Request, res: Response, fuente: string) {
    const q = req.query as Record<string, string | undefined>;
    const limite = Math.min(Math.max(Number(q.limit) || 10, 1), 50);
    const propietario = propietarioDesde(req.headers['x-device-fingerprint'] as string, req.headers['authorization'] as string);

    // Paginación: las reservas de socios van en la primera página; las páginas
    // siguientes (cursor) solo existen para la base local en modo mixto.
    if (q.cursor) {
      if (fuente === 'mixto') {
        res.status(200).json(await this.vuelosLocal.listarReservas(q as any, propietario));
      } else {
        res.status(200).json({ items: [], nextCursor: null });
      }
      return;
    }

    const deSocios = await this.reservas.listar(propietario, { status: q.status, pnr: q.pnr, limit: limite });
    let items: any[] = deSocios.map((r) => ({
      bookingId: r.bookingId,
      pnr: r.pnr,
      status: r.status,
      origin: r.origin,
      destination: r.destination,
      departureDate: r.departureDate,
      grandTotal: { currency: r.currency, total: r.grandTotal.toFixed(2) },
      createdAt: r.createdAt,
      provider: { nodeCode: r.codigoNodo },
    }));
    let nextCursor: string | null = null;
    if (fuente === 'mixto') {
      try {
        const local: any = await this.vuelosLocal.listarReservas({ ...q, limit: limite } as any, propietario);
        items = [...items, ...(local?.items ?? [])];
        nextCursor = local?.nextCursor ?? null;
      } catch (e: any) {
        this.logger.warn(`[vuelos-socios] listado local falló: ${e?.message}`);
      }
    }
    items.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
    res.status(200).json({ items: items.slice(0, limite), nextCursor });
  }

  // ───────────────────────────── Util ─────────────────────────────

  private enviar(res: Response, r: RespuestaProxy) {
    for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
    if (r.body === null || r.body === undefined || r.body === '') {
      res.status(r.status).end();
    } else if (typeof r.body === 'object') {
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(r.status).send(JSON.stringify(r.body));
    } else {
      res.status(r.status).send(r.body);
    }
  }
}

function problema(status: number, title: string, detail: string): RespuestaProxy {
  return {
    status,
    body: { type: `https://httpstatuses.com/${status}`, title, status, detail, correlation_id: `corr-${randomUUID()}` },
    headers: { 'Content-Type': 'application/problem+json' },
  };
}

function withDetalle(r: RespuestaProxy, extra: string): RespuestaProxy {
  if (r.body && typeof r.body === 'object') {
    return { ...r, body: { ...r.body, detail: [r.body.detail, extra].filter(Boolean).join(' ') } };
  }
  return r;
}
