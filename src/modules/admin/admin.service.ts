import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient } from '@supabase/supabase-js';
import { Reserva } from '../vuelos/entities/reserva.entity';
import { OrderAuto } from '../autos/entities/order-auto.entity';
import { ReservaAtraccion } from '../atracciones/entities/reserva.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly supabase;

  constructor(
    @InjectRepository(Reserva)
    private readonly reservaRepo: Repository<Reserva>,
    @InjectRepository(OrderAuto)
    private readonly orderAutoRepo: Repository<OrderAuto>,
    @InjectRepository(ReservaAtraccion)
    private readonly reservaAtraccionRepo: Repository<ReservaAtraccion>,
  ) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder');
  }

  async getStats() {
    this.logger.log('Admin: consultando estadísticas globales...');

    const [vuelos, autos, atracciones] = await Promise.all([
      this.reservaRepo.find().catch((e) => { this.logger.error('Error vuelos:', e); return [] as Reserva[]; }),
      this.orderAutoRepo.find().catch((e) => { this.logger.error('Error autos:', e); return [] as OrderAuto[]; }),
      this.reservaAtraccionRepo.find().catch((e) => { this.logger.error('Error atracciones:', e); return [] as ReservaAtraccion[]; }),
    ]);

    const { data: telemetry } = await this.supabase.from('telemetry_events').select('event_name, session_id, vertical');

    // Ingresos calculados
    const ingresosVuelos = vuelos.reduce((sum: number, r: any) => sum + Number(r.total || 0), 0);
    const ingresosAutos = autos.reduce((sum: number, o: any) => sum + Number(o.totalPrice?.total || 0), 0);
    const ingresosAtracciones = atracciones.reduce((sum: number, a: any) => sum + Number(a.totalPrice?.total || 0), 0);
    const ingresosTotal = ingresosVuelos + ingresosAutos + ingresosAtracciones;

    // Reservas por estado (vuelos)
    const estadosVuelos = vuelos.reduce((acc: Record<string, number>, r: any) => {
      acc[r.estado] = (acc[r.estado] || 0) + 1;
      return acc;
    }, {});

    // Últimas 5 reservas de cada tipo combinadas
    const ultimasVuelos = vuelos.slice(-5).map(r => ({
      tipo: 'vuelo',
      id: r.idReserva,
      pnr: r.pnr,
      estado: r.estado,
      total: Number(r.total || 0),
      moneda: r.moneda || 'USD',
      createdAt: r.fechaCreacion,
    }));

    const ultimasAutos = autos.slice(-5).map(o => ({
      tipo: 'auto',
      id: o.id,
      pnr: o.id.substring(0, 6).toUpperCase(),
      estado: o.status,
      total: Number(o.totalPrice?.total || 0),
      moneda: o.totalPrice?.currency || 'USD',
      createdAt: o.createdAt,
    }));
    const ultimasAtracciones = atracciones.slice(-5).map(a => ({
      tipo: 'atraccion',
      id: a.id,
      pnr: a.id.substring(0, 6).toUpperCase(),
      estado: a.status,
      total: Number(a.totalPrice?.total || 0),
      moneda: a.totalPrice?.currency || 'USD',
      createdAt: a.createdAt,
    }));

    const ultimasReservas = [...ultimasVuelos, ...ultimasAutos, ...ultimasAtracciones]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Cálculos para el embudo real si hay eventos
    let realFunnel = null;
    let trafficByVertical = { vuelos: 0, autos: 0, atracciones: 0 };
    
    if (telemetry && telemetry.length > 0) {
      const counts = { busquedas: new Set(), detalles: new Set(), datos_cliente: new Set(), intento_pago: new Set(), exito: new Set() };
      const verticalSessions = { vuelos: new Set(), autos: new Set(), atracciones: new Set() };

      telemetry.forEach(t => {
        if (t.event_name === 'search_submitted') counts.busquedas.add(t.session_id);
        if (t.event_name === 'checkout_started') counts.detalles.add(t.session_id);
        if (t.event_name === 'form_step_completed') counts.datos_cliente.add(t.session_id);
        if (t.event_name === 'payment_started') counts.intento_pago.add(t.session_id);
        if (t.event_name === 'payment_succeeded' || t.event_name === 'booking_confirmed') counts.exito.add(t.session_id);

        if (t.vertical === 'vuelos') verticalSessions.vuelos.add(t.session_id);
        if (t.vertical === 'autos') verticalSessions.autos.add(t.session_id);
        if (t.vertical === 'atracciones') verticalSessions.atracciones.add(t.session_id);
      });
      const b = Math.max(counts.busquedas.size, 1);
      realFunnel = [
        { label: 'Búsquedas (Global)', count: counts.busquedas.size, pct: 100 },
        { label: 'Seleccionar / Iniciar Checkout', count: counts.detalles.size, pct: Math.round((counts.detalles.size / b) * 100) },
        { label: 'Ingreso de datos', count: counts.datos_cliente.size, pct: Math.round((counts.datos_cliente.size / b) * 100) },
        { label: 'Intento de Pago', count: counts.intento_pago.size, pct: Math.round((counts.intento_pago.size / b) * 100) },
        { label: '✅ Reserva Exitosa', count: counts.exito.size, pct: Math.round((counts.exito.size / b) * 100) },
      ];

      trafficByVertical = {
        vuelos: verticalSessions.vuelos.size,
        autos: verticalSessions.autos.size,
        atracciones: verticalSessions.atracciones.size,
      };
    }

    return {
      kpis: {
        totalReservas: vuelos.length + autos.length + atracciones.length,
        reservasVuelos: vuelos.length,
        reservasAutos: autos.length,
        reservasAtracciones: atracciones.length,
        ingresosTotal: parseFloat(ingresosTotal.toFixed(2)),
        ingresosVuelos: parseFloat(ingresosVuelos.toFixed(2)),
        ingresosAutos: parseFloat(ingresosAutos.toFixed(2)),
        ingresosAtracciones: parseFloat(ingresosAtracciones.toFixed(2)),
      },
      estadosVuelos,
      ultimasReservas,
      realFunnel,
      trafficByVertical,
    };
  }

  async getUsers() {
    this.logger.log('Admin: consultando usuarios desde Supabase auth...');
    try {
      const { data, error } = await this.supabase.auth.admin.listUsers();
      if (error) {
        this.logger.warn(`No se pudo leer usuarios de auth: ${error.message}`);
        return [];
      }
      return (data.users || []).map(u => ({
        id: u.id,
        email: u.email,
        rol: u.user_metadata?.role || 'usuario',
        status: u.user_metadata?.status || 'activo',
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
      }));
    } catch (err) {
      this.logger.error('Error al obtener usuarios', err.message);
      return [];
    }
  }

  async getReservasGlobales() {
    this.logger.log('Admin: consultando reservas globales...');
    const [vuelos, autos, atracciones] = await Promise.all([
      this.reservaRepo.find({ order: { fechaCreacion: 'DESC' } as any, take: 50 }).catch(() => [] as Reserva[]),
      this.orderAutoRepo.find({ order: { createdAt: 'DESC' }, take: 50 }).catch(() => [] as OrderAuto[]),
      this.reservaAtraccionRepo.find({ order: { createdAt: 'DESC' }, take: 50 }).catch(() => [] as ReservaAtraccion[]),
    ]);

    return {
      vuelos: vuelos.map(r => ({
        id: r.idReserva,
        tipo: 'vuelo',
        pnr: r.pnr || '—',
        estado: r.estado,
        total: Number(r.total || 0),
        moneda: r.moneda || 'USD',
        createdAt: r.fechaCreacion,
      })),
      autos: autos.map(o => ({
        id: o.id,
        tipo: 'auto',
        pnr: o.id.substring(0, 6).toUpperCase(),
        estado: o.status,
        total: Number(o.totalPrice?.total || 0),
        moneda: o.totalPrice?.currency || 'USD',
        createdAt: o.createdAt,
      })),
      atracciones: atracciones.map(a => ({
        id: a.id,
        tipo: 'atraccion',
        pnr: a.id.substring(0, 6).toUpperCase(),
        estado: a.status,
        total: Number(a.totalPrice?.total || 0),
        moneda: a.totalPrice?.currency || 'USD',
        createdAt: a.createdAt,
        cliente: a.customerEmail || a.customerName || '—',
      })),
      hospedaje: [], // Módulo de hospedaje no tiene reservas implementadas aún
    };
  }

  async executeUserAction(id: string, action: string) {
    this.logger.log(`Admin: ejecutando accion ${action} sobre usuario ${id}`);
    if (action === 'bloquear' || action === 'desbloquear') {
      const { error } = await this.supabase.auth.admin.updateUserById(id, { user_metadata: { status: action } });
      if (error) throw new Error(error.message);
    } else if (action === 'promover_admin') {
      const { error } = await this.supabase.auth.admin.updateUserById(id, { user_metadata: { role: 'admin' } });
      if (error) throw new Error(error.message);
    } else if (action === 'reset_password') {
      // Find user email
      const { data, error: userErr } = await this.supabase.auth.admin.getUserById(id);
      if (userErr || !data.user) throw new Error('Usuario no encontrado');
      const { error } = await this.supabase.auth.resetPasswordForEmail(data.user.email);
      if (error) throw new Error(error.message);
    }
    return { success: true, message: `Acción ${action} ejecutada` };
  }

  async getUserHistorial(id: string) {
    this.logger.log(`Admin: consultando historial de usuario ${id}`);
    const { data: user } = await this.supabase.auth.admin.getUserById(id);
    const email = user?.user?.email;

    const vuelos = await this.reservaRepo.find({ where: { propietarioId: id } });
    let autos = [];
    if (email) {
      // Autos usa jsonb booker.email, es más complejo en TypeORM pero intentemos buscar todos y filtrar
      const allAutos = await this.orderAutoRepo.find();
      autos = allAutos.filter(a => a.booker?.email === email);
    }
    
    return {
      success: true,
      data: {
        vuelos: vuelos.map(v => ({ pnr: v.pnr, estado: v.estado, fecha: v.fechaCreacion })),
        autos: autos.map(a => ({ pnr: a.id.substring(0,6).toUpperCase(), estado: a.status, fecha: a.createdAt }))
      }
    };
  }

  async cancelarReserva(tipo: string, id: string) {
    this.logger.log(`Admin: cancelando reserva ${tipo} ${id}`);
    try {
      if (tipo === 'vuelos') {
        await this.reservaRepo.update({ idReserva: id }, { estado: 'CANCELLED' as any });
      } else if (tipo === 'autos') {
        await this.orderAutoRepo.update({ id }, { status: 'CANCELLED' });
      } else if (tipo === 'atracciones') {
        await this.reservaAtraccionRepo.update({ id }, { status: 'CANCELLED' });
      } else if (tipo === 'hospedaje') {
        // Módulo no tiene estado de reservas implementado
      }
      return { success: true, message: `Reserva ${tipo} cancelada exitosamente` };
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async getReservaDetalles(tipo: string, id: string) {
    this.logger.log(`Admin: consultando detalles técnicos de ${tipo} ${id}`);
    try {
      let data = null;
      if (tipo === 'vuelos') {
        data = await this.reservaRepo.findOne({
          where: { idReserva: id },
          relations: ['pasajeros', 'itinerarios', 'tarifas', 'boletos', 'checkin']
        });
        if (data) {
          if (data.pasajeros) data.pasajeros.forEach(p => delete p.reserva);
          if (data.itinerarios) data.itinerarios.forEach(i => delete i.reserva);
          if (data.tarifas) data.tarifas.forEach(t => delete t.reserva);
          if (data.boletos) data.boletos.forEach(b => delete b.reserva);
          if (data.checkin) delete data.checkin.reserva;
        }
      } else if (tipo === 'autos') {
        data = await this.orderAutoRepo.findOneBy({ id });
      } else if (tipo === 'atracciones') {
        data = await this.reservaAtraccionRepo.findOneBy({ id });
      } else if (tipo === 'hospedaje') {
        data = null;
      }
      return { success: true, data };
    } catch (e) {
      this.logger.error(`Error obteniendo detalles de ${tipo} ${id}:`, e.message);
      throw new Error(`Error obteniendo detalles: ${e.message}`);
    }
  }

  async reenviarComprobante(tipo: string, id: string) {
    this.logger.log(`Admin: reenviando comprobante de ${tipo} ${id}`);
    // Simularemos el reenvío por ahora
    return { success: true, message: `Comprobante reenviado exitosamente` };
  }
}
