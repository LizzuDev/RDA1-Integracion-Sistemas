import { Injectable, Scope } from '@nestjs/common';
import * as DataLoader from 'dataloader';
import { DataSource } from 'typeorm';
import { ReservaUnificadaModel } from '../models/reserva.model';

@Injectable({ scope: Scope.REQUEST })
export class ReservasDataLoader {
  public readonly clienteReservasLoader: DataLoader<string, ReservaUnificadaModel[]>;

  constructor(private readonly dataSource: DataSource) {
    this.clienteReservasLoader = new DataLoader<string, ReservaUnificadaModel[]>(
      async (clienteIds: readonly string[]) => {
        return this.batchLoadReservas(clienteIds);
      },
    );
  }

  private async batchLoadReservas(clienteIds: readonly string[]): Promise<ReservaUnificadaModel[][]> {
    const ids = Array.from(clienteIds);

    // Consulta en lote paralelizada a las 4 verticales usando ANY($1) para prevenir N+1
    const [atracciones, autos, alojamientos, vuelos] = await Promise.all([
      this.dataSource.query(
        `SELECT id, status, total_price, date, time, customer_name, customer_email, cliente_id, voucher_qr_payload, created_at 
         FROM schema_atracciones.atracciones_reservas 
         WHERE cliente_id::text = ANY($1) OR customer_email = ANY($1)`,
        [ids],
      ).catch(() => []),

      this.dataSource.query(
        `SELECT id, estado, total, fecha_recogida, fecha_devolucion, nombre_conductor, cliente_id, km_salida, km_retorno, created_at 
         FROM schema_autos.autos_reservas 
         WHERE cliente_id::text = ANY($1)`,
        [ids],
      ).catch(() => []),

      this.dataSource.query(
        `SELECT id, estado, precio_total, fecha_checkin, fecha_checkout, nombre_titular, email_titular, cliente_id, habitacion_asignada, clave_acceso_digital, creado_en 
         FROM schema_alojamientos.alojamientos_reservas 
         WHERE cliente_id::text = ANY($1) OR email_titular = ANY($1)`,
        [ids],
      ).catch(() => []),

      this.dataSource.query(
        `SELECT id, estado, precio_total, pasajero_nombre, cliente_id, asiento_asignado, checkin_at, created_at 
         FROM schema_vuelos.vuelos_reservas 
         WHERE cliente_id::text = ANY($1)`,
        [ids],
      ).catch(() => []),
    ]);

    // Agrupar por ID/Email de cliente
    const agrupado = new Map<string, ReservaUnificadaModel[]>();
    for (const id of ids) {
      agrupado.set(id, []);
    }

    const pushItem = (matchKey: string, item: ReservaUnificadaModel) => {
      if (matchKey && agrupado.has(matchKey)) {
        agrupado.get(matchKey)!.push(item);
      }
    };

    atracciones.forEach((r: any) => {
      const model: ReservaUnificadaModel = {
        id: r.id,
        vertical: 'ATRACCIONES',
        estado: r.status,
        total: Number(r.total_price),
        fecha: r.date,
        hora: r.time,
        titular_nombre: r.customer_name,
        titular_email: r.customer_email,
        voucher_qr_payload: r.voucher_qr_payload,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      };
      if (r.cliente_id) pushItem(String(r.cliente_id), model);
      if (r.customer_email) pushItem(r.customer_email, model);
    });

    autos.forEach((r: any) => {
      const model: ReservaUnificadaModel = {
        id: r.id,
        vertical: 'AUTOS',
        estado: r.estado,
        total: Number(r.total),
        fecha: r.fecha_recogida,
        titular_nombre: r.nombre_conductor,
        km_salida: r.km_salida ? Number(r.km_salida) : undefined,
        km_retorno: r.km_retorno ? Number(r.km_retorno) : undefined,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      };
      if (r.cliente_id) pushItem(String(r.cliente_id), model);
    });

    alojamientos.forEach((r: any) => {
      const model: ReservaUnificadaModel = {
        id: r.id,
        vertical: 'ALOJAMIENTOS',
        estado: r.estado,
        total: Number(r.precio_total),
        fecha: r.fecha_checkin,
        titular_nombre: r.nombre_titular,
        titular_email: r.email_titular,
        habitacion_asignada: r.habitacion_asignada,
        clave_acceso_digital: r.clave_acceso_digital,
        created_at: r.creado_en ? new Date(r.creado_en).toISOString() : undefined,
      };
      if (r.cliente_id) pushItem(String(r.cliente_id), model);
      if (r.email_titular) pushItem(r.email_titular, model);
    });

    vuelos.forEach((r: any) => {
      const model: ReservaUnificadaModel = {
        id: r.id,
        vertical: 'VUELOS',
        estado: r.estado,
        total: Number(r.precio_total),
        titular_nombre: r.pasajero_nombre,
        asiento_asignado: r.asiento_asignado,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      };
      if (r.cliente_id) pushItem(String(r.cliente_id), model);
    });

    return ids.map((id) => agrupado.get(id) || []);
  }
}
