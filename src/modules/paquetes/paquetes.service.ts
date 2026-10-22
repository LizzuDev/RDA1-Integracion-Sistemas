import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paquete, PaqueteItem, ContratoPromociones } from './entities';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';
import * as crypto from 'crypto';

@Injectable()
export class PaquetesService {
  private readonly logger = new Logger(PaquetesService.name);

  constructor(
    @InjectRepository(Paquete)
    private readonly paqueteRepo: Repository<Paquete>,
    @InjectRepository(PaqueteItem)
    private readonly itemRepo: Repository<PaqueteItem>,
    @InjectRepository(ContratoPromociones)
    private readonly contratoRepo: Repository<ContratoPromociones>,
    private readonly winstonLogger: WinstonPhysicalLoggerService,
  ) {}

  async findAll(): Promise<any[]> {
    this.logger.log('Consultando paquetes turísticos activos en schema_paquetes');
    const paquetes = await this.paqueteRepo.find({
      where: { activo: true },
      order: { createdAt: 'DESC' },
    });

    const results = [];
    for (const pkg of paquetes) {
      const items = await this.itemRepo.find({ where: { paqueteId: pkg.id } });
      results.push({
        ...pkg,
        items,
        precio_base_total: Number(pkg.precioBaseTotal),
        precio_final_paquete: Number(pkg.precioFinalPaquete),
        descuento_combo_pct: Number(pkg.descuentoComboPct),
      });
    }

    return results;
  }

  async findById(id: string): Promise<any> {
    const pkg = await this.paqueteRepo.findOne({
      where: [{ id }, { codigoPaquete: id }],
    });

    if (!pkg) {
      throw new HttpException('Paquete turístico no encontrado', HttpStatus.NOT_FOUND);
    }

    const items = await this.itemRepo.find({ where: { paqueteId: pkg.id } });
    return {
      ...pkg,
      items,
      precio_base_total: Number(pkg.precioBaseTotal),
      precio_final_paquete: Number(pkg.precioFinalPaquete),
      descuento_combo_pct: Number(pkg.descuentoComboPct),
    };
  }

  async crearPaqueteDinamico(dto: {
    nombre: string;
    descripcion?: string;
    ciudad_destino: string;
    descuento_solicitado_pct?: number;
    items: Array<{
      vertical: string;
      item_referencia_id: string;
      nombre_item: string;
      precio_individual: number;
      proveedor_codigo?: string;
      detalles_json?: any;
    }>;
  }): Promise<any> {
    this.logger.log(`Creando paquete dinámico para destino ${dto.ciudad_destino} con ${dto.items?.length || 0} ítems`);

    if (!dto.items || dto.items.length < 2) {
      throw new HttpException('Un paquete o combo debe contener al menos 2 ítems de diferentes verticales', HttpStatus.BAD_REQUEST);
    }

    // Validar topes de descuento acordados en contratos B2B (§9 Consideraciones)
    const contratos = await this.contratoRepo.find();
    let maxDescuentoPermitido = 20.0; // Límite de seguridad global

    for (const item of dto.items) {
      if (item.proveedor_codigo) {
        const contrato = contratos.find(c => c.proveedorCodigo === item.proveedor_codigo);
        if (contrato) {
          if (!contrato.permitePromociones) {
            throw new HttpException(
              `El proveedor '${item.proveedor_codigo}' ha declarado en su contrato que no participa en promociones o combos`,
              HttpStatus.CONFLICT
            );
          }
          if (contrato.descuentoMaximoPct < maxDescuentoPermitido) {
            maxDescuentoPermitido = Number(contrato.descuentoMaximoPct);
          }
        }
      }
    }

    const descuentoAplicado = Math.min(
      Number(dto.descuento_solicitado_pct || 10.0),
      maxDescuentoPermitido
    );

    let precioBaseTotal = 0;
    dto.items.forEach(it => {
      precioBaseTotal += Number(it.precio_individual || 0);
    });

    const precioFinalPaquete = Number((precioBaseTotal * (1 - descuentoAplicado / 100)).toFixed(2));
    const codigoPaquete = `PKG-${dto.ciudad_destino.slice(0, 3).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const nuevoPaquete = this.paqueteRepo.create({
      codigoPaquete,
      nombre: dto.nombre || `Combo Escapada a ${dto.ciudad_destino}`,
      descripcion: dto.descripcion || `Paquete turístico combinado con descuento especial del ${descuentoAplicado}%`,
      ciudadDestino: dto.ciudad_destino,
      precioBaseTotal,
      descuentoComboPct: descuentoAplicado,
      precioFinalPaquete,
      activo: true,
    });

    const savedPkg = await this.paqueteRepo.save(nuevoPaquete);

    const savedItems = [];
    for (const it of dto.items) {
      const precioConDesc = Number((Number(it.precio_individual) * (1 - descuentoAplicado / 100)).toFixed(2));
      const pItem = this.itemRepo.create({
        paqueteId: savedPkg.id,
        vertical: it.vertical,
        itemReferenciaId: it.item_referencia_id,
        nombreItem: it.nombre_item,
        precioIndividual: Number(it.precio_individual),
        descuentoAplicadoPct: descuentoAplicado,
        precioConDescuento: precioConDesc,
        detallesJson: it.detalles_json || {},
      });
      savedItems.push(await this.itemRepo.save(pItem));
    }

    this.winstonLogger.logAudit('PAQUETE_DINAMICO_CREADO', {
      paquete_id: savedPkg.id,
      codigo: codigoPaquete,
      destino: dto.ciudad_destino,
      total_items: dto.items.length,
      descuento_pct: descuentoAplicado,
      total_original: precioBaseTotal,
      total_final: precioFinalPaquete,
    });

    return {
      ...savedPkg,
      items: savedItems,
      precio_base_total: precioBaseTotal,
      precio_final_paquete: precioFinalPaquete,
      descuento_combo_pct: descuentoAplicado,
      mensaje: `¡Paquete dinámico creado con éxito! Se aplicó un ${descuentoAplicado}% de descuento dentro de los límites autorizados por los socios.`,
    };
  }

  async getContratosPromociones(): Promise<any[]> {
    return this.contratoRepo.find();
  }
}
