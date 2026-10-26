import { Injectable, Logger, HttpException, HttpStatus, BadRequestException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LiquidacionProveedor, LibroMayorComisiones } from './entities';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';
import { AdminConfigService } from '../admin/admin-config.service';
import { Reserva } from '../vuelos/entities/reserva.entity';
import { OrderAuto } from '../autos/entities/order-auto.entity';
import { ReservaAtraccion } from '../atracciones/entities/reserva.entity';
import { ReservaAlojamiento } from '../alojamientos/entities/reserva.entity';

@Injectable()
export class FinanzasService {
  private readonly logger = new Logger(FinanzasService.name);

  constructor(
    @InjectRepository(LiquidacionProveedor)
    private readonly liquidacionRepo: Repository<LiquidacionProveedor>,
    @InjectRepository(LibroMayorComisiones)
    private readonly libroMayorRepo: Repository<LibroMayorComisiones>,
    private readonly winstonLogger: WinstonPhysicalLoggerService,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly configService?: AdminConfigService,
    @Optional() @InjectRepository(Reserva) private readonly reservaRepo?: Repository<Reserva>,
    @Optional() @InjectRepository(OrderAuto) private readonly orderAutoRepo?: Repository<OrderAuto>,
    @Optional() @InjectRepository(ReservaAtraccion) private readonly reservaAtraccionRepo?: Repository<ReservaAtraccion>,
    @Optional() @InjectRepository(ReservaAlojamiento) private readonly reservaAlojamientoRepo?: Repository<ReservaAlojamiento>,
  ) {}

  /**
   * Registra un asiento contable formal: 10% de comisión para Booking Prototipo
   * y 90% neto a liquidar para el proveedor externo (Rúbrica RDA2 CE05).
   */
  async registrarVentaYCalcularComision(params: {
    orden_id: string;
    factura_id: string;
    vertical: string;
    total_venta: number;
    proveedor_codigo?: string;
  }): Promise<any> {
    const total = Number(params.total_venta || 0);
    const comision10 = Number((total * 0.10).toFixed(2));
    const neto90 = Number((total * 0.90).toFixed(2));
    const proveedor = params.proveedor_codigo || `NODE_${params.vertical.slice(0, 3).toUpperCase()}_PARTNER`;

    this.logger.log(`[Finanzas] Registrando comisión 10% ($${comision10}) para orden ${params.orden_id} (Total: $${total})`);

    // 1. Asiento en Libro Mayor
    const asiento = this.libroMayorRepo.create({
      ordenId: params.orden_id,
      facturaId: params.factura_id,
      vertical: params.vertical,
      totalVenta: total,
      comisionBooking10pct: comision10,
      netoSocio90pct: neto90,
    });
    const savedAsiento = await this.libroMayorRepo.save(asiento);

    // 2. Acumular o crear período de liquidación quincenal
    const now = new Date();
    const dia = now.getDate();
    const quincena = dia <= 15 ? 'Q1' : 'Q2';
    const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${quincena}`;

    let liquidacion = await this.liquidacionRepo.findOne({
      where: { proveedorCodigo: proveedor, periodo, estado: 'PENDIENTE' },
    });

    if (liquidacion) {
      liquidacion.totalRecaudado = Number(liquidacion.totalRecaudado) + total;
      liquidacion.comisionBooking10pct = Number(liquidacion.comisionBooking10pct) + comision10;
      liquidacion.montoLiquidarSocio90pct = Number(liquidacion.montoLiquidarSocio90pct) + neto90;
      await this.liquidacionRepo.save(liquidacion);
    } else {
      liquidacion = this.liquidacionRepo.create({
        proveedorCodigo: proveedor,
        vertical: params.vertical,
        periodo,
        totalRecaudado: total,
        comisionBooking10pct: comision10,
        montoLiquidarSocio90pct: neto90,
        estado: 'PENDIENTE',
      });
      await this.liquidacionRepo.save(liquidacion);
    }

    // 3. Trazabilidad física Winston
    this.winstonLogger.logAudit('COMISION_FINANCIERA_LIQUIDADA', {
      orden_id: params.orden_id,
      factura_id: params.factura_id,
      vertical: params.vertical,
      proveedor: proveedor,
      total_venta: total,
      comision_booking_10pct: comision10,
      neto_socio_90pct: neto90,
      periodo_liquidacion: periodo,
    });

    return {
      asiento_id: savedAsiento.id,
      orden_id: params.orden_id,
      total_venta: total,
      comision_booking_10pct: comision10,
      neto_socio_90pct: neto90,
      periodo_liquidacion: periodo,
    };
  }

  async getLiquidaciones(periodo?: string, estado?: string): Promise<any[]> {
    const whereClause: any = {};
    if (periodo) whereClause.periodo = periodo;
    if (estado) whereClause.estado = estado;

    const list = await this.liquidacionRepo.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });

    return list.map((l: LiquidacionProveedor) => ({
      id: l.id,
      proveedor_codigo: l.proveedorCodigo,
      vertical: l.vertical,
      periodo: l.periodo,
      total_recaudado: Number(l.totalRecaudado),
      comision_booking_10pct: Number(l.comisionBooking10pct),
      monto_liquidar_socio_90pct: Number(l.montoLiquidarSocio90pct),
      estado: l.estado,
      comprobante_transferencia_url: l.comprobanteTransferenciaUrl,
      fecha_pago: l.fechaPago,
      created_at: l.createdAt,
    }));
  }

  async marcarLiquidacionPagada(id: string, dto: { comprobante_url: string; notas?: string }): Promise<any> {
    const liquidacion = await this.liquidacionRepo.findOne({ where: { id } });
    if (!liquidacion) {
      throw new HttpException('Liquidación no encontrada', HttpStatus.NOT_FOUND);
    }

    if (liquidacion.estado === 'PAGADO') {
      return {
        success: true,
        idempotent_replayed: true,
        mensaje: `La liquidación ${liquidacion.periodo} para ${liquidacion.proveedorCodigo} ya había sido pagada previamente.`,
        liquidacion,
      };
    }

    liquidacion.estado = 'PAGADO';
    liquidacion.comprobanteTransferenciaUrl = dto.comprobante_url || `https://banco.local/transferencias/TRX-${Date.now()}.pdf`;
    liquidacion.fechaPago = new Date();
    const updated = await this.liquidacionRepo.save(liquidacion);

    this.winstonLogger.logAudit('LIQUIDACION_SOCIO_PAGADA', {
      liquidacion_id: liquidacion.id,
      proveedor: liquidacion.proveedorCodigo,
      monto_pagado: Number(liquidacion.montoLiquidarSocio90pct),
      comprobante_url: liquidacion.comprobanteTransferenciaUrl,
      fecha_pago: liquidacion.fechaPago.toISOString(),
    });

    return {
      success: true,
      mensaje: `Liquidación ${liquidacion.periodo} para ${liquidacion.proveedorCodigo} marcada como PAGADA.`,
      liquidacion: updated,
    };
  }

  async getResumenFinanciero(): Promise<any> {
    const all = await this.liquidacionRepo.find();
    let totalRecaudadoGlobal = 0;
    let totalComisionesBooking = 0;
    let totalLiquidadoPagado = 0;
    let totalPendienteLiquidar = 0;

    all.forEach((l: LiquidacionProveedor) => {
      const rec = Number(l.totalRecaudado || 0);
      const com = Number(l.comisionBooking10pct || 0);
      const socio = Number(l.montoLiquidarSocio90pct || 0);
      totalRecaudadoGlobal += rec;
      totalComisionesBooking += com;
      if (l.estado === 'PAGADO') {
        totalLiquidadoPagado += socio;
      } else {
        totalPendienteLiquidar += socio;
      }
    });

    return {
      total_recaudado_global: Number(totalRecaudadoGlobal.toFixed(2)),
      total_comisiones_booking_10pct: Number(totalComisionesBooking.toFixed(2)),
      total_liquidado_a_socios: Number(totalLiquidadoPagado.toFixed(2)),
      total_pendiente_de_pago: Number(totalPendienteLiquidar.toFixed(2)),
      moneda: 'USD',
      regla_comision: '10% Booking Prototipo / 90% Socio Externo',
      fecha_corte: new Date().toISOString(),
    };
  }

  async getLibroMayor(limit = 20): Promise<any[]> {
    return this.libroMayorRepo.find({
      order: { fechaAsiento: 'DESC' },
      take: limit,
    });
  }

  /**
   * Aprueba formalmente el payout a un socio / vertical (RDA2 I10).
   * Consolida la lógica contable en un único motor centralizado.
   */
  async aprobarPayout(
    body: { vertical: string; periodo: string; referencia?: string; bruto?: number; reservas?: number; comprobante_url?: string },
    actor: string | null,
  ): Promise<any> {
    const { vertical, periodo } = body || ({} as any);
    if (!vertical) throw new BadRequestException('Vertical es obligatoria');
    if (!periodo) throw new BadRequestException('Periodo es obligatorio (ej. YYYY-MM o YYYY-MM-Q1)');

    const vertNorm = vertical.toLowerCase();
    const vertUpper = vertical.toUpperCase();

    // 1. Verificar si existe liquidación en schema_finanzas.liquidaciones_proveedores
    let liquidacion = await this.liquidacionRepo.findOne({
      where: [
        { vertical: vertUpper, periodo },
        { vertical: vertNorm, periodo },
      ],
    });

    // Idempotencia: si ya fue pagada, devolver respuesta sin duplicar
    if (liquidacion && liquidacion.estado === 'PAGADO') {
      return {
        success: true,
        idempotent_replayed: true,
        id: liquidacion.id,
        referencia: body.referencia || `PAYOUT-${vertUpper}-${periodo}`,
        vertical: vertNorm,
        periodo,
        montoPagado: Number(liquidacion.montoLiquidarSocio90pct),
        aprobadoEn: liquidacion.fechaPago ? liquidacion.fechaPago.toISOString() : new Date().toISOString(),
        message: `Payout para ${vertUpper} (${periodo}) ya liquidado previamente.`,
      };
    }

    const montoNeto = Number(body.bruto ? body.bruto * 0.90 : (liquidacion?.montoLiquidarSocio90pct || 500));
    const referencia = (body.referencia || `PAYOUT-${vertUpper}-${periodo}-${Date.now().toString(36).toUpperCase()}`).slice(0, 120);

    let rowId = liquidacion?.id || `liq-${Date.now()}`;
    let aprobadoEn = new Date();

    if (this.dataSource) {
      try {
        if (this.configService?.asegurarEsquema) {
          await this.configService.asegurarEsquema();
        }
        const rows = await this.dataSource.query(
          `INSERT INTO panel_liquidaciones (vertical, periodo, reservas, monto_bruto, comision_pct, comision, monto_pagado, referencia, aprobado_por)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, aprobado_en`,
          [vertNorm, periodo, body.reservas || 1, body.bruto || (montoNeto / 0.9), 10, montoNeto * 0.1, montoNeto, referencia, actor],
        );
        if (rows && rows[0]?.id) rowId = rows[0].id;
        if (rows && rows[0]?.aprobado_en) aprobadoEn = rows[0].aprobado_en;
      } catch (err: any) {
        this.logger.warn(`Registro en panel_liquidaciones SQL no disponible: ${err.message}`);
      }
    }

    if (liquidacion) {
      liquidacion.estado = 'PAGADO';
      liquidacion.comprobanteTransferenciaUrl = body.comprobante_url || `https://banco.local/transferencias/${referencia}.pdf`;
      liquidacion.fechaPago = aprobadoEn;
      await this.liquidacionRepo.save(liquidacion);
    }

    this.winstonLogger.logAudit('PAYOUT_APROBADO', {
      vertical: vertNorm,
      periodo,
      referencia,
      monto_pagado: montoNeto,
      aprobado_por: actor,
      aprobado_en: aprobadoEn.toISOString(),
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      id: rowId,
      referencia,
      vertical: vertNorm,
      periodo,
      montoPagado: montoNeto,
      aprobadoEn: aprobadoEn.toISOString(),
      message: `Payout de $${montoNeto.toFixed(2)} aprobado para ${vertNorm} (${periodo}).`,
    };
  }

  async historialPayouts(): Promise<any[]> {
    if (this.dataSource) {
      try {
        if (this.configService?.asegurarEsquema) {
          await this.configService.asegurarEsquema();
        }
        const rows = await this.dataSource.query(
          `SELECT id, vertical, periodo, reservas, monto_bruto::float AS bruto, comision_pct::float AS "comisionPct",
                  comision::float AS comision, monto_pagado::float AS pagado, referencia, aprobado_por AS "aprobadoPor", aprobado_en AS "aprobadoEn"
           FROM panel_liquidaciones ORDER BY aprobado_en DESC LIMIT 100`,
        );
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({ ...r, proveedor: r.vertical }));
        }
      } catch (err: any) {
        this.logger.warn(`Lectura panel_liquidaciones no disponible: ${err.message}`);
      }
    }

    const liqs = await this.liquidacionRepo.find({
      where: { estado: 'PAGADO' },
      order: { fechaPago: 'DESC' },
      take: 100,
    });
    return liqs.map((l: LiquidacionProveedor) => ({
      id: l.id,
      vertical: l.vertical.toLowerCase(),
      periodo: l.periodo,
      reservas: 1,
      bruto: Number(l.totalRecaudado),
      comisionPct: 10,
      comision: Number(l.comisionBooking10pct),
      pagado: Number(l.montoLiquidarSocio90pct),
      referencia: l.comprobanteTransferenciaUrl || `PAYOUT-${l.vertical}-${l.periodo}`,
      aprobadoPor: 'admin@epn.edu.ec',
      aprobadoEn: l.fechaPago ? l.fechaPago.toISOString() : l.createdAt.toISOString(),
      proveedor: l.proveedorCodigo,
    }));
  }

  async getFinanzas(): Promise<any> {
    const pct = 10;
    const iva = 15;
    const liquidaciones = await this.getLiquidaciones();
    const resumen = await this.getResumenFinanciero();

    return {
      generadoEn: new Date().toISOString(),
      config: { comisionBase: pct, tasaImpuestos: iva },
      resumen: {
        cobrado: resumen.total_recaudado_global,
        porCobrar: resumen.total_pendiente_de_pago,
        anulado: 0,
        comisiones: resumen.total_comisiones_booking_10pct,
        ivaIncluido: Number((resumen.total_recaudado_global * 0.15 / 1.15).toFixed(2)),
        netoProveedores: resumen.total_liquidado_a_socios,
        pagadoProveedores: resumen.total_liquidado_a_socios,
        pendientePago: resumen.total_pendiente_de_pago,
        reservasPagadas: liquidaciones.filter((l: any) => l.estado === 'PAGADO').length,
        reservasTotales: liquidaciones.length,
        ticketPromedio: liquidaciones.length > 0 ? Number((resumen.total_recaudado_global / liquidaciones.length).toFixed(2)) : 0,
      },
      porVertical: [
        { vertical: 'atracciones', proveedor: 'Operadores (Atracciones)', cobrado: 0, comision: 0, neto: 0, porCobrar: 0, anulado: 0 },
        { vertical: 'autos', proveedor: 'Rentadoras (Autos)', cobrado: 0, comision: 0, neto: 0, porCobrar: 0, anulado: 0 },
        { vertical: 'alojamientos', proveedor: 'Hoteles (Hospedaje)', cobrado: 0, comision: 0, neto: 0, porCobrar: 0, anulado: 0 },
        { vertical: 'vuelos', proveedor: 'Aerolíneas (Vuelos)', cobrado: 0, comision: 0, neto: 0, porCobrar: 0, anulado: 0 },
      ],
      porMes: [],
      liquidaciones,
      ultimosMovimientos: [],
    };
  }
}

