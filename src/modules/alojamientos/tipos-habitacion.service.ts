import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Alojamiento } from './entities/alojamiento.entity';
import { TipoHabitacion } from './entities/tipo-habitacion.entity';
import { ReservaAlojamiento } from './entities/reserva.entity';
import { CreateTipoHabitacionDto, UpdateTipoHabitacionDto } from './dto/tipo-habitacion.dto';
import { ReservationStatus } from './dto/reservation.dto';
import { validacion } from '../../core/errors/codigo-error';

/** Código del tipo que se crea automáticamente para un alojamiento sin tipos. */
export const CODIGO_TIPO_BASE = 'estandar';

export const NOMBRE_REGIMEN: Record<string, string> = {
  SOLO_ALOJAMIENTO: 'Solo alojamiento',
  DESAYUNO: 'Desayuno incluido',
  MEDIA_PENSION: 'Media pensión',
  PENSION_COMPLETA: 'Pensión completa',
  TODO_INCLUIDO: 'Todo incluido',
};

/** "Suite Vista al Mar" → "suite-vista-al-mar" (sin tildes, máx. 60). */
export function codigoDesdeNombre(nombre: string): string {
  const base = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'habitacion';
}

export function textoCancelacion(horas: number | null | undefined): string {
  if (horas === null || horas === undefined) return 'No reembolsable';
  if (horas === 0) return 'Cancelación gratuita hasta el día de llegada';
  return `Cancelación gratuita hasta ${horas} horas antes`;
}

/** Ocupación de un tipo de habitación en un rango de fechas. */
export interface OcupacionTipo {
  tipo: TipoHabitacion;
  total: number;
  reservadas: number;
  libres: number;
}

@Injectable()
export class TiposHabitacionService {
  constructor(
    @InjectRepository(TipoHabitacion) private readonly tipoRepo: Repository<TipoHabitacion>,
    @InjectRepository(Alojamiento) private readonly alojamientoRepo: Repository<Alojamiento>,
    @InjectRepository(ReservaAlojamiento) private readonly reservaRepo: Repository<ReservaAlojamiento>,
  ) {}

  /** Tipos de un alojamiento, ordenados como en la ficha (orden, precio). */
  async listar(alojamientoId: string, incluirInactivos = false): Promise<TipoHabitacion[]> {
    const tipos = await this.tipoRepo.find({ where: { alojamientoId } as any });
    return tipos
      .filter((t) => incluirInactivos || t.activo)
      .sort((a, b) => (a.orden ?? 1) - (b.orden ?? 1) || Number(a.precioNoche) - Number(b.precioNoche));
  }

  /** Tipos de varios alojamientos de una vez (catálogo del panel). */
  async listarDe(alojamientoIds: string[]): Promise<Map<string, TipoHabitacion[]>> {
    const mapa = new Map<string, TipoHabitacion[]>();
    if (alojamientoIds.length === 0) return mapa;
    const tipos = await this.tipoRepo.find({ where: alojamientoIds.map((id) => ({ alojamientoId: id })) as any });
    for (const t of tipos.sort((a, b) => (a.orden ?? 1) - (b.orden ?? 1) || Number(a.precioNoche) - Number(b.precioNoche))) {
      mapa.set(t.alojamientoId, [...(mapa.get(t.alojamientoId) ?? []), t]);
    }
    return mapa;
  }

  /** Tipos por id (también inactivos): para mostrar el tipo de reservas antiguas. */
  async listarPorIds(ids: string[]): Promise<TipoHabitacion[]> {
    if (ids.length === 0) return [];
    return this.tipoRepo.find({ where: ids.map((id) => ({ id })) as any });
  }

  /** Tipo al que se asignan las reservas sin tipo (anteriores a los tipos). */
  async tipoPorDefecto(alojamiento: Alojamiento): Promise<TipoHabitacion | undefined> {
    await this.asegurarTipoBase(alojamiento);
    const todos = await this.listar(alojamiento.id, true);
    return todos.find((t) => t.codigo === CODIGO_TIPO_BASE) ?? todos[0];
  }

  /**
   * Garantiza que el alojamiento tenga al menos un tipo de habitación. Uno dado
   * de alta sin tipos (o insertado a mano en la BD) recibe un tipo "estándar" con
   * su precio, capacidad y número de habitaciones.
   */
  async asegurarTipoBase(alojamiento: Alojamiento): Promise<TipoHabitacion[]> {
    const tipos = await this.listar(alojamiento.id, true);
    if (tipos.length > 0) return tipos.filter((t) => t.activo);
    const base = await this.tipoRepo.save(
      this.tipoRepo.create({
        alojamientoId: alojamiento.id,
        codigo: CODIGO_TIPO_BASE,
        nombre: alojamiento.tipoAlojamiento?.trim() || 'Habitación estándar',
        capacidadAdultos: Math.min(Math.max(alojamiento.capacidadAdultos || 2, 1), 30),
        capacidadNinos: Math.min(Math.max(alojamiento.capacidadNinos ?? 0, 0), 20),
        camas: Math.min(Math.max(alojamiento.camas || 1, 1), 50),
        precioNoche: Number(alojamiento.precioPorNoche),
        cantidad: Math.min(Math.max(alojamiento.habitaciones || 1, 1), 1000),
        regimen: (alojamiento.amenidades || []).some((a) => /desayuno/i.test(a)) ? 'DESAYUNO' : 'SOLO_ALOJAMIENTO',
        cancelacionGratuitaHoras: 48,
        amenidades: [],
        photos: [],
        activo: true,
        orden: 1,
      }),
    );
    return [base];
  }

  async porId(alojamientoId: string, tipoId: string): Promise<TipoHabitacion> {
    const tipo = await this.buscar(alojamientoId, tipoId, true);
    if (!tipo) throw new NotFoundException(`El tipo de habitación '${tipoId}' no existe en este alojamiento.`);
    return tipo;
  }

  /** Busca por id o por código dentro del alojamiento. */
  async buscar(alojamientoId: string, idOCodigo: string, incluirInactivos = false): Promise<TipoHabitacion | null> {
    const tipos = await this.listar(alojamientoId, incluirInactivos);
    return tipos.find((t) => t.id === idOCodigo || t.codigo === idOCodigo) ?? null;
  }

  /**
   * Habitaciones libres de cada tipo ACTIVO en [checkin, checkout). Las reservas
   * anteriores a los tipos de habitación (sin tipo) cuentan contra el tipo base.
   */
  async ocupacion(alojamiento: Alojamiento, checkin: string, checkout: string, excluirReservaId?: string): Promise<OcupacionTipo[]> {
    const tipos = await this.asegurarTipoBase(alojamiento);
    const todos = await this.listar(alojamiento.id, true);
    const tipoPorDefecto = todos.find((t) => t.codigo === CODIGO_TIPO_BASE) ?? todos[0];
    const reservas = await this.reservaRepo.find({
      where: { alojamientoId: alojamiento.id, status: ReservationStatus.CONFIRMED } as any,
    });
    const reservadasPor = new Map<string, number>();
    for (const r of reservas) {
      if (r.id === excluirReservaId || !(r.checkin < checkout && r.checkout > checkin)) continue;
      const tipoId = r.tipoHabitacionId || tipoPorDefecto?.id;
      if (tipoId) reservadasPor.set(tipoId, (reservadasPor.get(tipoId) ?? 0) + (r.habitacionesCount || 1));
    }
    return tipos.map((tipo) => {
      const reservadas = reservadasPor.get(tipo.id) ?? 0;
      return { tipo, total: tipo.cantidad, reservadas, libres: Math.max(0, tipo.cantidad - reservadas) };
    });
  }

  async crear(alojamiento: Alojamiento, dto: CreateTipoHabitacionDto): Promise<TipoHabitacion> {
    const codigo = dto.codigo ?? codigoDesdeNombre(dto.nombre);
    const existentes = await this.listar(alojamiento.id, true);
    if (existentes.some((t) => t.codigo === codigo)) {
      throw new ConflictException(`Ya existe un tipo de habitación con el código '${codigo}' en este alojamiento.`);
    }
    const creado = await this.tipoRepo.save(this.tipoRepo.create(this.nuevoTipo(alojamiento.id, codigo, dto, existentes.length + 1)));
    await this.resumir(alojamiento.id);
    return creado;
  }

  async actualizar(alojamientoId: string, tipoId: string, dto: UpdateTipoHabitacionDto): Promise<TipoHabitacion> {
    const tipo = await this.porId(alojamientoId, tipoId);
    if (dto.codigo !== undefined && dto.codigo !== tipo.codigo) {
      const existentes = await this.listar(alojamientoId, true);
      if (existentes.some((t) => t.codigo === dto.codigo)) {
        throw new ConflictException(`Ya existe un tipo de habitación con el código '${dto.codigo}' en este alojamiento.`);
      }
    }
    const desactiva = (dto.activo === false && tipo.activo) || (dto.cantidad === 0 && tipo.cantidad > 0);
    if (desactiva) await this.exigirOtroTipoVendible(alojamientoId, tipo.id);
    Object.assign(tipo, this.camposDesdeDto(dto));
    const guardado = await this.tipoRepo.save(tipo);
    await this.resumir(alojamientoId);
    return guardado;
  }

  /**
   * Baja de un tipo. Con reservas (de cualquier fecha) no se borra: se desactiva
   * para conservar el historial, como hace Booking con las habitaciones retiradas.
   */
  async eliminar(alojamientoId: string, tipoId: string): Promise<{ desactivado: boolean }> {
    const tipo = await this.porId(alojamientoId, tipoId);
    await this.exigirOtroTipoVendible(alojamientoId, tipo.id);
    const conReservas = await this.reservaRepo.count({ where: { tipoHabitacionId: tipo.id } as any });
    if (conReservas > 0) {
      tipo.activo = false;
      await this.tipoRepo.save(tipo);
      await this.resumir(alojamientoId);
      return { desactivado: true };
    }
    await this.tipoRepo.remove(tipo);
    await this.resumir(alojamientoId);
    return { desactivado: false };
  }

  /**
   * Reemplaza los tipos de un alojamiento por la lista recibida (sincronización
   * de proveedores o edición completa): empareja por código, crea los nuevos y
   * desactiva los que ya no vienen. Nunca borra: puede haber reservas.
   */
  async reemplazar(alojamiento: Alojamiento, lista: CreateTipoHabitacionDto[]): Promise<TipoHabitacion[]> {
    const codigos = lista.map((t) => t.codigo ?? codigoDesdeNombre(t.nombre));
    const repetido = codigos.find((c, i) => codigos.indexOf(c) !== i);
    if (repetido) {
      throw validacion('Hay tipos de habitación repetidos.', [
        { name: 'tiposHabitacion', reason: `El código '${repetido}' aparece más de una vez.` },
      ]);
    }
    if (!lista.some((t) => t.activo !== false && t.cantidad > 0)) {
      throw validacion('El alojamiento necesita al menos un tipo de habitación a la venta.', [
        { name: 'tiposHabitacion', reason: 'Incluye al menos un tipo activo con cantidad mayor que 0.' },
      ]);
    }
    const actuales = await this.listar(alojamiento.id, true);
    const resultado: TipoHabitacion[] = [];
    for (let i = 0; i < lista.length; i++) {
      const existente = actuales.find((t) => t.codigo === codigos[i]);
      const datos = existente
        ? Object.assign(existente, this.camposDesdeDto(lista[i]), { codigo: codigos[i], activo: lista[i].activo ?? true })
        : this.tipoRepo.create(this.nuevoTipo(alojamiento.id, codigos[i], lista[i], i + 1));
      resultado.push(await this.tipoRepo.save(datos));
    }
    for (const sobrante of actuales.filter((t) => !codigos.includes(t.codigo) && t.activo)) {
      sobrante.activo = false;
      await this.tipoRepo.save(sobrante);
    }
    await this.resumir(alojamiento.id);
    return resultado;
  }

  /**
   * Un alojamiento con un solo tipo (el caso simple: un hotel con una tarifa)
   * se edita desde la ficha del alojamiento: precio, capacidad y habitaciones se
   * trasladan a ese tipo. Con varios tipos hay que editar cada tipo.
   */
  async propagarDesdeAlojamiento(alojamiento: Alojamiento, cambios: Partial<Alojamiento>): Promise<void> {
    const tipos = await this.listar(alojamiento.id, false);
    const campos: Array<[keyof Alojamiento, keyof TipoHabitacion, string]> = [
      ['precioPorNoche', 'precioNoche', 'precioPorNoche'],
      ['capacidadAdultos', 'capacidadAdultos', 'capacidadAdultos'],
      ['capacidadNinos', 'capacidadNinos', 'capacidadNinos'],
      ['habitaciones', 'cantidad', 'habitaciones'],
    ];
    const cambiados = campos.filter(([campo]) => cambios[campo] !== undefined && Number(cambios[campo]) !== Number(alojamiento[campo]));
    if (cambiados.length === 0) return;
    if (tipos.length === 1) {
      const [tipo] = tipos;
      for (const [campo, campoTipo] of cambiados) (tipo as any)[campoTipo] = Number(cambios[campo]);
      if (cambios.camas !== undefined) tipo.camas = cambios.camas;
      await this.tipoRepo.save(tipo);
      return;
    }
    if (tipos.length > 1) {
      throw validacion(
        'Este alojamiento tiene varios tipos de habitación: el precio, la capacidad y las habitaciones se cambian en cada tipo.',
        cambiados.map(([, , nombre]) => ({
          name: nombre,
          reason: 'Se calcula a partir de los tipos de habitación. Usa /alojamientos/{id}/tipos-habitacion o envía tiposHabitacion.',
        })),
      );
    }
  }

  /**
   * El alojamiento resume sus tipos activos (igual que el trigger de la BD):
   * precio "desde", total de habitaciones y capacidad máxima por habitación.
   */
  async resumir(alojamientoId: string): Promise<void> {
    const vendibles = (await this.listar(alojamientoId, false)).filter((t) => t.cantidad > 0);
    if (vendibles.length === 0) return;
    const alojamiento = await this.alojamientoRepo.findOne({ where: { id: alojamientoId } as any });
    if (!alojamiento) return;
    const resumen = {
      precioPorNoche: Math.min(...vendibles.map((t) => Number(t.precioNoche))),
      habitaciones: vendibles.reduce((s, t) => s + t.cantidad, 0),
      capacidadAdultos: Math.max(...vendibles.map((t) => t.capacidadAdultos)),
      capacidadNinos: Math.max(...vendibles.map((t) => t.capacidadNinos ?? 0)),
    };
    const cambia = (Object.keys(resumen) as (keyof typeof resumen)[]).some((k) => Number(alojamiento[k]) !== resumen[k]);
    if (cambia) await this.alojamientoRepo.save(Object.assign(alojamiento, resumen));
  }

  private async exigirOtroTipoVendible(alojamientoId: string, tipoId: string) {
    const otros = (await this.listar(alojamientoId, false)).filter((t) => t.id !== tipoId && t.cantidad > 0);
    if (otros.length === 0) {
      throw new ConflictException(
        'Es el único tipo de habitación a la venta. Crea otro antes o desactiva el alojamiento (estado INACTIVO).',
      );
    }
  }

  private nuevoTipo(alojamientoId: string, codigo: string, dto: CreateTipoHabitacionDto, orden: number): Partial<TipoHabitacion> {
    return {
      alojamientoId,
      codigo,
      capacidadNinos: 0,
      camas: 1,
      regimen: 'SOLO_ALOJAMIENTO',
      cancelacionGratuitaHoras: 48,
      amenidades: [],
      photos: [],
      activo: true,
      orden,
      ...this.camposDesdeDto(dto),
    };
  }

  private camposDesdeDto(dto: Partial<CreateTipoHabitacionDto>): Partial<TipoHabitacion> {
    const { precioPorNoche, ...resto } = dto as any;
    const campos: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(resto)) if (v !== undefined) campos[k] = v;
    if (precioPorNoche !== undefined) campos.precioNoche = precioPorNoche;
    return campos as Partial<TipoHabitacion>;
  }
}
