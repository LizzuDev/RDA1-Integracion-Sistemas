import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminConfigService } from './admin-config.service';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';

export interface AuditActor {
  id?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditEntry {
  id: string;
  fecha: string;
  origen: 'ADMIN' | 'SISTEMA';
  categoria: string;
  actor: string;
  accion: string;
  entidad: string;
  detalle: string;
  ip: string | null;
}

/** Extrae actor + IP real (Render/Vercel van detrás de proxy) de la request. */
export function actorDesdeRequest(req: any): AuditActor {
  const fwd = (req?.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return {
    id: req?.user?.id ?? null,
    email: req?.user?.email ?? null,
    ip: fwd || req?.ip || req?.socket?.remoteAddress || null,
    userAgent: req?.headers?.['user-agent'] ?? null,
  };
}

function texto(detalle: any): string {
  if (detalle === null || detalle === undefined) return '';
  if (typeof detalle === 'string') return detalle;
  if (Array.isArray(detalle?.cambios)) {
    return detalle.cambios.map((c: any) => `${c.campo}: ${c.antes} → ${c.despues}`).join(' · ');
  }
  return Object.entries(detalle)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
}

/**
 * Auditoría Física Rotativa (Mandato Cátedra RDA2 §2):
 * - Cero logs en base de datos.
 * - Toda la auditoría se persiste en logs/audit-YYYY-MM-DD.log y se lee en streaming.
 */
@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: AdminConfigService,
    private readonly winstonLogger: WinstonPhysicalLoggerService,
  ) {}

  /** Registra en archivo físico plano rotativo (logs/audit-YYYY-MM-DD.log) */
  async registrar(actor: AuditActor, accion: string, entidadTipo: string, entidadId: string | null, detalle?: any) {
    try {
      this.winstonLogger.logAudit(accion, {
        actor_id: actor.id ?? null,
        actor_email: actor.email ?? null,
        accion: accion.slice(0, 80),
        entidad_tipo: entidadTipo?.slice(0, 60) ?? null,
        entidad_id: entidadId ? String(entidadId).slice(0, 160) : null,
        detalle: detalle === undefined ? null : detalle,
        ip: actor.ip ?? null,
        user_agent: actor.userAgent ?? null,
      });
    } catch (e) {
      this.logger.error(`No se pudo registrar auditoría física "${accion}": ${e.message}`);
    }
  }

  private async q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      return await this.dataSource.query(sql, params);
    } catch (e) {
      this.logger.warn(`Auditoría: consulta omitida (${e.message})`);
      return [];
    }
  }

  async listar(limit = 300): Promise<{ items: AuditEntry[]; resumen: Record<string, number> }> {
    const lim = Math.min(Math.max(Number(limit) || 300, 1), 1000);

    // 1. Leer auditoría administrativa desde archivos planos físicos (logs/audit-*.log)
    const physicalLogs = this.winstonLogger.getRecentAuditLogs(lim);
    const admin = physicalLogs.map((p, idx) => ({
      id: `phys-${p.timestamp}-${idx}`,
      created_at: p.timestamp,
      actor_email: p.payload?.actor_email || p.payload?.actor?.email || 'admin@booking.com',
      accion: p.event || p.payload?.accion || 'Acción Administrativa',
      entidad_tipo: p.payload?.entidad_tipo || 'sistema',
      entidad_id: p.payload?.entidad_id || null,
      detalle: p.payload?.detalle || p.payload,
      ip: p.payload?.ip || null,
    }));

    // 2. Consultar eventos de negocio activos de los esquemas sin bloquear
    const [usuarios, tickets, proveedores, vuelos, autos, atracciones, hospedaje] = await Promise.all([
      this.q(`SELECT id, email, created_at FROM schema_clientes.clientes ORDER BY created_at DESC LIMIT $1`, [lim]),
      this.q(`SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT $1`, [lim]),
      this.q(`SELECT id, created_at, empresa, tipo, email, ip FROM panel_solicitudes_proveedor ORDER BY created_at DESC LIMIT $1`, [lim]),
      this.q(`SELECT id, created_at AS fecha, id AS pnr, estado, precio_total AS total FROM schema_vuelos.vuelos_reservas ORDER BY created_at DESC LIMIT $1`, [lim]),
      this.q(`SELECT id, created_at AS fecha, estado, total, nombre_conductor AS booker FROM schema_autos.autos_reservas ORDER BY created_at DESC LIMIT $1`, [lim]),
      this.q(`SELECT id, created_at AS fecha, status AS estado, total_price AS precio, customer_name AS nombre, customer_email AS email FROM schema_atracciones.atracciones_reservas ORDER BY created_at DESC LIMIT $1`, [lim]),
      this.q(`SELECT id, created_at AS fecha, estado, precio_total AS total, nombre_titular AS nombre, email_titular AS email FROM schema_alojamientos.alojamientos_reservas ORDER BY created_at DESC LIMIT $1`, [lim]),
    ]);

    const items: AuditEntry[] = [];

    for (const a of admin) {
      items.push({
        id: `adm-${a.id}`,
        fecha: new Date(a.created_at).toISOString(),
        origen: 'ADMIN',
        categoria: a.entidad_tipo || 'admin',
        actor: a.actor_email || 'admin (sin email)',
        accion: a.accion,
        entidad: [a.entidad_tipo, a.entidad_id].filter(Boolean).join(' · ') || '—',
        detalle: texto(a.detalle),
        ip: a.ip,
      });
    }

    for (const u of usuarios) {
      items.push({
        id: `usr-new-${u.id}`, fecha: new Date(u.created_at).toISOString(), origen: 'SISTEMA', categoria: 'usuario',
        actor: u.email, accion: 'Registro de usuario', entidad: `usuario · ${u.email}`, detalle: '', ip: null,
      });
      if (u.last_sign_in_at) {
        items.push({
          id: `usr-login-${u.id}`, fecha: new Date(u.last_sign_in_at).toISOString(), origen: 'SISTEMA', categoria: 'sesion',
          actor: u.email, accion: 'Inicio de sesión', entidad: `usuario · ${u.email}`, detalle: 'Último acceso registrado', ip: null,
        });
      }
    }

    for (const v of vuelos) {
      items.push({
        id: `vue-${v.id}`, fecha: new Date(v.fecha).toISOString(), origen: 'SISTEMA', categoria: 'reserva',
        actor: 'cliente', accion: 'Reserva de vuelo creada', entidad: `vuelo · PNR ${v.pnr || String(v.id).slice(0, 6).toUpperCase()}`,
        detalle: `estado: ${v.estado} · total: $${Number(v.total || 0).toFixed(2)}`, ip: null,
      });
    }
    for (const a of autos) {
      items.push({
        id: `aut-${a.id}`, fecha: new Date(a.fecha).toISOString(), origen: 'SISTEMA', categoria: 'reserva',
        actor: a.booker?.email || a.booker?.name || 'cliente', accion: 'Renta de auto creada',
        entidad: `auto · ${String(a.id).slice(0, 6).toUpperCase()}`,
        detalle: `estado: ${a.estado} · total: $${Number(a.precio?.total || 0).toFixed(2)}`, ip: null,
      });
    }
    for (const a of atracciones) {
      items.push({
        id: `atr-${a.id}`, fecha: new Date(a.fecha).toISOString(), origen: 'SISTEMA', categoria: 'reserva',
        actor: a.email || a.nombre || 'cliente', accion: 'Reserva de atracción creada',
        entidad: `atracción · ${String(a.id).slice(0, 6).toUpperCase()}`,
        detalle: `estado: ${a.estado} · total: $${Number(a.precio?.total || 0).toFixed(2)}`, ip: null,
      });
    }
    for (const h of hospedaje) {
      items.push({
        id: `hos-${h.id}`, fecha: new Date(h.fecha).toISOString(), origen: 'SISTEMA', categoria: 'reserva',
        actor: h.email || h.nombre || 'cliente', accion: 'Reserva de hospedaje creada',
        entidad: `hospedaje · ${h.codigo || String(h.id).slice(0, 6).toUpperCase()}`,
        detalle: `estado: ${h.estado} · total: $${Number(h.total || 0).toFixed(2)}`, ip: null,
      });
    }
    for (const p of proveedores) {
      items.push({
        id: `prv-${p.id}`, fecha: new Date(p.created_at).toISOString(), origen: 'SISTEMA', categoria: 'proveedor',
        actor: p.email, accion: 'Solicitud de proveedor recibida',
        entidad: `proveedor · PRV-${String(p.id).padStart(5, '0')} · ${p.empresa}`, detalle: `tipo: ${p.tipo}`, ip: p.ip || null,
      });
    }

    for (const t of tickets) {
      if (t.created_at) {
        items.push({
          id: `tkt-${t.id}`, fecha: new Date(t.created_at).toISOString(), origen: 'SISTEMA', categoria: 'soporte',
          actor: t.email || t.client_name || 'cliente', accion: 'Ticket de soporte creado',
          entidad: `ticket · #${t.id}`, detalle: [t.subject, t.priority && `prioridad: ${t.priority}`].filter(Boolean).join(' · '), ip: null,
        });
      }
      if (t.resolved_at) {
        items.push({
          id: `tkt-res-${t.id}`, fecha: new Date(t.resolved_at).toISOString(), origen: 'ADMIN', categoria: 'soporte',
          actor: t.resolved_by || 'admin', accion: t.status === 'REJECTED' ? 'Ticket rechazado' : 'Ticket resuelto',
          entidad: `ticket · #${t.id}`, detalle: t.resolution || '', ip: null,
        });
      }
    }

    items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const recortados = items.slice(0, lim);

    const resumen = recortados.reduce(
      (acc, i) => {
        acc.total++;
        acc[i.origen === 'ADMIN' ? 'admin' : 'sistema']++;
        acc[i.categoria] = (acc[i.categoria] || 0) + 1;
        return acc;
      },
      { total: 0, admin: 0, sistema: 0 } as Record<string, number>,
    );

    return { items: recortados, resumen };
  }
}
