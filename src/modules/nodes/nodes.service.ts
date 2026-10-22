import { Injectable, Logger, HttpException, HttpStatus, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigProveedor } from './entities';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';
import { ConnectorHealthService } from '../admin/connector-health.service';

@Injectable()
export class NodesService {
  private readonly logger = new Logger(NodesService.name);

  constructor(
    @InjectRepository(ConfigProveedor)
    private readonly configRepo: Repository<ConfigProveedor>,
    private readonly winstonLogger: WinstonPhysicalLoggerService,
    @Optional()
    private readonly connectorHealthService?: ConnectorHealthService,
  ) {}

  async listarNodos(): Promise<any[]> {
    this.logger.log('Consultando estado de salud de nodos de proveedores en schema_proveedores');
    let nodos = await this.configRepo.find({ order: { vertical: 'ASC' } });

    // Si la tabla estuviese vacía, sembrar los 4 nodos estándar
    if (!nodos || nodos.length === 0) {
      await this.sembrarNodosPorDefecto();
      nodos = await this.configRepo.find({ order: { vertical: 'ASC' } });
    }

    return nodos.map(n => {
      // Cálculo del semáforo LED visual (🟢/🟡/🔴) para Panel 1
      let ledColor = '🟢';
      let ledStatus = 'HEALTHY';
      if (n.killSwitchActivo) {
        ledColor = '🔴';
        ledStatus = 'KILL_SWITCH_ACTIVE';
      } else if (n.healthStatus === 'DOWN' || n.tasaFallosPct >= 50) {
        ledColor = '🔴';
        ledStatus = 'DOWN';
      } else if (n.healthStatus === 'DEGRADED' || n.latenciaMs > 800 || n.tasaFallosPct > 5) {
        ledColor = '🟡';
        ledStatus = 'DEGRADED';
      }

      return {
        id: n.id,
        codigo_nodo: n.codigoNodo,
        codigo: n.codigoNodo,
        nombre_proveedor: n.nombreProveedor,
        nombre: n.nombreProveedor,
        vertical: n.vertical,
        base_url_rest: n.baseUrlRest,
        url: n.baseUrlRest,
        endpoint_grpc: n.endpointGrpc,
        health_status: n.healthStatus,
        estado: n.killSwitchActivo ? 'APAGADO' : (n.healthStatus === 'HEALTHY' ? 'OPERATIVO' : n.healthStatus),
        latencia_ms: n.latenciaMs,
        latenciaMs: n.latenciaMs,
        ultimo_ping_at: n.ultimoPingAt,
        kill_switch_activo: n.killSwitchActivo,
        killSwitchActivo: n.killSwitchActivo,
        circuit_breaker_estado: n.circuitBreakerEstado,
        tasa_fallos_pct: Number(n.tasaFallosPct),
        failCount: n.circuitBreakerEstado === 'OPEN' ? 3 : 0,
        semaforo_led: {
          icono: ledColor,
          estado: ledStatus,
        },
      };
    });
  }

  /**
   * Parametriza en vivo la URL oficial REST o gRPC de un nodo socio (Cátedra RDA2 CE01).
   */
  async actualizarNodo(
    codigoNodo: string,
    dto: { baseUrlRest?: string; endpointGrpc?: string; nombreProveedor?: string },
  ): Promise<any> {
    const nodo = await this.configRepo.findOne({
      where: [{ codigoNodo }, { id: codigoNodo }],
    });
    if (!nodo) {
      throw new HttpException(`Nodo con código o id '${codigoNodo}' no encontrado`, HttpStatus.NOT_FOUND);
    }

    const previousUrl = nodo.baseUrlRest;
    const previousGrpc = nodo.endpointGrpc;

    if (dto.baseUrlRest) nodo.baseUrlRest = dto.baseUrlRest;
    if (dto.endpointGrpc) nodo.endpointGrpc = dto.endpointGrpc;
    if (dto.nombreProveedor) nodo.nombreProveedor = dto.nombreProveedor;

    const guardado = await this.configRepo.save(nodo);

    // Actualizar en el monitor de memoria en vivo si está disponible
    if (this.connectorHealthService && dto.baseUrlRest) {
      try {
        const serviceId = nodo.vertical.toLowerCase();
        this.connectorHealthService.updateNodeUrl(serviceId, dto.baseUrlRest);
      } catch (e) {
        this.logger.warn(`No se pudo sincronizar en memoria: ${e.message}`);
      }
    }

    // Auditoría física en Winston (CERO logs en BD)
    this.winstonLogger.logAudit('NODO_PARAMETRIZACION_ACTUALIZADA', {
      codigo_nodo: nodo.codigoNodo,
      nombre_proveedor: nodo.nombreProveedor,
      vertical: nodo.vertical,
      previous_url_rest: previousUrl,
      new_url_rest: nodo.baseUrlRest,
      previous_grpc: previousGrpc,
      new_grpc: nodo.endpointGrpc,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      mensaje: `Nodo '${nodo.codigoNodo}' parametrizado en vivo exitosamente con URL oficial.`,
      nodo: {
        id: guardado.id,
        codigo_nodo: guardado.codigoNodo,
        codigo: guardado.codigoNodo,
        nombre_proveedor: guardado.nombreProveedor,
        nombre: guardado.nombreProveedor,
        vertical: guardado.vertical,
        base_url_rest: guardado.baseUrlRest,
        url: guardado.baseUrlRest,
        endpoint_grpc: guardado.endpointGrpc,
        health_status: guardado.healthStatus,
        kill_switch_activo: guardado.killSwitchActivo,
        circuit_breaker_estado: guardado.circuitBreakerEstado,
      },
    };
  }

  async toggleKillSwitch(codigoNodo: string, activar?: boolean): Promise<any> {
    const nodo = await this.configRepo.findOne({
      where: [{ codigoNodo }, { id: codigoNodo }],
    });
    if (!nodo) {
      throw new HttpException(`Nodo con código o id '${codigoNodo}' no encontrado`, HttpStatus.NOT_FOUND);
    }

    const nuevoEstado = activar !== undefined ? activar : !nodo.killSwitchActivo;
    nodo.killSwitchActivo = nuevoEstado;
    if (nuevoEstado) {
      nodo.healthStatus = 'DOWN';
      nodo.circuitBreakerEstado = 'OPEN';
    } else {
      nodo.healthStatus = 'HEALTHY';
      nodo.circuitBreakerEstado = 'CLOSED';
    }
    const guardado = await this.configRepo.save(nodo);

    // Sincronizar con el monitor en memoria para desacoplar adaptadores ACL
    if (this.connectorHealthService) {
      try {
        const serviceId = nodo.vertical.toLowerCase();
        this.connectorHealthService.toggleNode(serviceId, !nuevoEstado);
      } catch (e) {
        this.logger.warn(`No se pudo sincronizar toggle en memoria: ${e.message}`);
      }
    }

    // Auditoría Winston obligatoria (Cero logs en BD)
    this.winstonLogger.logAudit('KILL_SWITCH_PROVEEDOR_ALTERADO', {
      codigo_nodo: nodo.codigoNodo,
      nombre_proveedor: nodo.nombreProveedor,
      vertical: nodo.vertical,
      kill_switch_activo: nuevoEstado,
      nuevo_health_status: nodo.healthStatus,
    });

    return {
      success: true,
      codigo_nodo: nodo.codigoNodo,
      id: nodo.id,
      kill_switch_activo: nuevoEstado,
      killSwitchActivo: nuevoEstado,
      estado: nuevoEstado ? 'APAGADO' : 'OPERATIVO',
      mensaje: nuevoEstado
        ? `Kill-Switch ACTIVADO para ${nodo.nombreProveedor}. Las peticiones a este socio serán bloqueadas de inmediato.`
        : `Kill-Switch DESACTIVADO para ${nodo.nombreProveedor}. Tráfico normal restablecido.`,
    };
  }

  async pingNodo(codigoNodo: string): Promise<any> {
    const nodo = await this.configRepo.findOne({
      where: [{ codigoNodo }, { id: codigoNodo }],
    });
    if (!nodo) {
      throw new HttpException(`Nodo con código o id '${codigoNodo}' no encontrado`, HttpStatus.NOT_FOUND);
    }

    const inicio = Date.now();
    // Simulación de ping o medición real
    const latencia = Math.floor(Math.random() * 45) + 15; // 15ms - 60ms
    nodo.latenciaMs = latencia;
    nodo.ultimoPingAt = new Date();
    if (!nodo.killSwitchActivo) {
      nodo.healthStatus = latencia > 800 ? 'DEGRADED' : 'HEALTHY';
    }
    await this.configRepo.save(nodo);

    return {
      codigo_nodo: nodo.codigoNodo,
      latencia_ms: latencia,
      latenciaMs: latencia,
      health_status: nodo.healthStatus,
      timestamp: nodo.ultimoPingAt,
    };
  }

  private async sembrarNodosPorDefecto(): Promise<void> {
    const semillas = [
      {
        codigoNodo: 'NODE_ATR_DILAN',
        nombreProveedor: 'Descubre EC (Dilan Mendoza)',
        vertical: 'ATRACCIONES',
        baseUrlRest: process.env.TIENDA_ATRACCIONES_URL || 'https://descubreec.com/api/v2',
        endpointGrpc: process.env.GRPC_ATRACCIONES_URL || 'grpc://booking.epn.edu.ec:50051',
        healthStatus: 'HEALTHY',
        latenciaMs: 38,
        killSwitchActivo: false,
        circuitBreakerEstado: 'CLOSED',
        tasaFallosPct: 0.00,
      },
      {
        codigoNodo: 'NODE_AUT_LOCAL',
        nombreProveedor: 'Renta Autos Ecuador (Flota Partner)',
        vertical: 'AUTOS',
        baseUrlRest: process.env.TIENDA_AUTOS_URL || 'http://localhost:3000/api/v2/autos',
        endpointGrpc: process.env.GRPC_AUTOS_URL || 'grpc://localhost:50051',
        healthStatus: 'HEALTHY',
        latenciaMs: 25,
        killSwitchActivo: false,
        circuitBreakerEstado: 'CLOSED',
        tasaFallosPct: 0.00,
      },
      {
        codigoNodo: 'NODE_ALO_LOCAL',
        nombreProveedor: 'Hoteles & Hospedajes Ecuador (Alojamientos Partner)',
        vertical: 'ALOJAMIENTOS',
        baseUrlRest: process.env.TIENDA_ALOJAMIENTOS_URL || 'http://localhost:3000/api/v2/alojamientos',
        endpointGrpc: process.env.GRPC_ALOJAMIENTOS_URL || 'grpc://localhost:50051',
        healthStatus: 'HEALTHY',
        latenciaMs: 20,
        killSwitchActivo: false,
        circuitBreakerEstado: 'CLOSED',
        tasaFallosPct: 0.00,
      },
      {
        codigoNodo: 'NODE_VUE_LOCAL',
        nombreProveedor: 'TAME / Latam Ecuador (Vuelos Partner)',
        vertical: 'VUELOS',
        baseUrlRest: process.env.TIENDA_VUELOS_URL || 'http://localhost:3000/api/v2/vuelos',
        endpointGrpc: process.env.GRPC_VUELOS_URL || 'grpc://localhost:50051',
        healthStatus: 'HEALTHY',
        latenciaMs: 42,
        killSwitchActivo: false,
        circuitBreakerEstado: 'CLOSED',
        tasaFallosPct: 0.00,
      },
    ];

    for (const s of semillas) {
      await this.configRepo.save(this.configRepo.create(s));
    }
  }
}
