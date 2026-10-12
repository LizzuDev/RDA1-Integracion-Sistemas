import { ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';

import { ProveedorAlojamiento } from './entities/proveedor-alojamiento.entity';
import { Alojamiento } from './entities/alojamiento.entity';
import { CreateProveedorDto, UpdateProveedorDto } from './dto/proveedor.dto';

/**
 * Claves de los proveedores, en la variable de entorno
 * `ALOJAMIENTOS_API_KEYS="proveedorA:clave-larga-1,proveedorB:clave-larga-2"`.
 * Se importan a la tabla `proveedores_alojamiento` al arrancar (ver más abajo).
 */
export function clavesProveedores(): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const par of (process.env.ALOJAMIENTOS_API_KEYS || '').split(',')) {
    const i = par.indexOf(':');
    if (i <= 0) continue;
    const id = par.slice(0, i).trim();
    const clave = par.slice(i + 1).trim();
    if (id && clave.length >= 16) mapa.set(clave, id);
  }
  return mapa;
}

export const hashClave = (clave: string) => createHash('sha256').update(clave, 'utf8').digest('hex');

/** Clave nueva: 37 caracteres aleatorios (192 bits) con prefijo reconocible. */
const generarClave = () => `aloj_${randomBytes(24).toString('base64url')}`;

/**
 * Proveedores que sincronizan alojamientos. Sus API keys se guardan solo como
 * hash SHA-256: la clave en claro se muestra UNA vez, al crearla o rotarla.
 *
 * `ALOJAMIENTOS_API_KEYS` sigue funcionando: al arrancar, cada clave de la
 * variable de entorno se registra en la tabla (si su proveedor aún no tiene
 * clave). A partir de ahí manda la tabla: rotar una clave desde el panel invalida
 * la anterior aunque siga en la variable de entorno.
 */
@Injectable()
export class ProveedoresAlojamientoService implements OnModuleInit {
  private readonly logger = new Logger(ProveedoresAlojamientoService.name);

  constructor(
    @InjectRepository(ProveedorAlojamiento) private readonly repo: Repository<ProveedorAlojamiento>,
    @InjectRepository(Alojamiento) private readonly alojamientoRepo: Repository<Alojamiento>,
  ) {}

  async onModuleInit() {
    try {
      await this.registrarClavesDeEntorno();
    } catch (e: any) {
      this.logger.error(
        `No se pudieron registrar las claves de ALOJAMIENTOS_API_KEYS (${e.message}). ` +
          '¿Falta aplicar database/migraciones/2026-10-13_alojamientos_modelo_relacional.sql?',
      );
    }
  }

  async registrarClavesDeEntorno(): Promise<void> {
    for (const [clave, id] of clavesProveedores()) {
      const existente = await this.repo.findOne({ where: { id } as any });
      if (!existente) {
        await this.repo.save(
          this.repo.create({ id, nombre: id, apiKeyHash: hashClave(clave), apiKeyPrefijo: clave.slice(0, 9), activo: true }),
        );
      } else if (!existente.apiKeyHash) {
        await this.repo.save(Object.assign(existente, { apiKeyHash: hashClave(clave), apiKeyPrefijo: clave.slice(0, 9) }));
      }
    }
  }

  /** Id del proveedor ACTIVO dueño de la clave, o null. */
  async autenticar(clave: string): Promise<string | null> {
    if (!clave || clave.length < 16 || clave.length > 200) return null;
    const proveedor = await this.repo.findOne({ where: { apiKeyHash: hashClave(clave) } as any });
    if (!proveedor || !proveedor.activo) return null;
    // Último uso con resolución de minutos: no escribe en cada petición.
    if (!proveedor.ultimoUso || Date.now() - new Date(proveedor.ultimoUso).getTime() > 60_000) {
      proveedor.ultimoUso = new Date();
      await this.repo.save(proveedor).catch(() => undefined);
    }
    return proveedor.id;
  }

  async existe(id: string): Promise<boolean> {
    return (await this.repo.count({ where: { id } as any })) > 0;
  }

  async listar() {
    const proveedores = await this.repo.find({ order: { createdAt: 'ASC' } as any });
    const alojamientos = await this.alojamientoRepo.find();
    return proveedores.map((p) => this.aRespuesta(p, alojamientos.filter((a) => a.proveedorId === p.id)));
  }

  async crear(dto: CreateProveedorDto) {
    if (await this.existe(dto.id)) throw new ConflictException(`Ya existe un proveedor con id '${dto.id}'.`);
    const clave = generarClave();
    const proveedor = await this.repo.save(
      this.repo.create({
        id: dto.id,
        nombre: dto.nombre.trim(),
        emailContacto: dto.emailContacto?.trim().toLowerCase() ?? null,
        apiKeyHash: hashClave(clave),
        apiKeyPrefijo: clave.slice(0, 9),
        activo: true,
      }),
    );
    return { ...this.aRespuesta(proveedor, []), api_key: clave };
  }

  async actualizar(id: string, dto: UpdateProveedorDto) {
    const proveedor = await this.obtener(id);
    if (dto.nombre !== undefined) proveedor.nombre = dto.nombre.trim();
    if (dto.emailContacto !== undefined) proveedor.emailContacto = dto.emailContacto?.trim().toLowerCase() || null;
    if (dto.activo !== undefined) proveedor.activo = dto.activo;
    const guardado = await this.repo.save(proveedor);
    const alojamientos = await this.alojamientoRepo.find({ where: { proveedorId: id } as any });
    return this.aRespuesta(guardado, alojamientos);
  }

  /** Nueva clave; la anterior deja de funcionar al instante. */
  async rotarClave(id: string) {
    const proveedor = await this.obtener(id);
    const clave = generarClave();
    Object.assign(proveedor, { apiKeyHash: hashClave(clave), apiKeyPrefijo: clave.slice(0, 9) });
    const guardado = await this.repo.save(proveedor);
    const alojamientos = await this.alojamientoRepo.find({ where: { proveedorId: id } as any });
    return { ...this.aRespuesta(guardado, alojamientos), api_key: clave };
  }

  async eliminar(id: string): Promise<void> {
    const proveedor = await this.obtener(id);
    const suyos = await this.alojamientoRepo.count({ where: { proveedorId: id } as any });
    if (suyos > 0) {
      throw new ConflictException(
        `El proveedor tiene ${suyos} alojamiento(s). Desactívalo (activo: false) o elimina/reasigna antes sus alojamientos.`,
      );
    }
    await this.repo.remove(proveedor);
  }

  private async obtener(id: string): Promise<ProveedorAlojamiento> {
    const proveedor = await this.repo.findOne({ where: { id } as any });
    if (!proveedor) throw new NotFoundException(`El proveedor '${id}' no existe.`);
    return proveedor;
  }

  private aRespuesta(p: ProveedorAlojamiento, alojamientos: Alojamiento[]) {
    return {
      id: p.id,
      nombre: p.nombre,
      email_contacto: p.emailContacto ?? null,
      activo: p.activo,
      tiene_api_key: Boolean(p.apiKeyHash),
      api_key_prefijo: p.apiKeyPrefijo ? `${p.apiKeyPrefijo}…` : null,
      ultimo_uso: p.ultimoUso ?? null,
      alojamientos: alojamientos.length,
      alojamientos_activos: alojamientos.filter((a) => (a.estado || 'ACTIVO') === 'ACTIVO').length,
      creado_en: p.createdAt,
    };
  }
}
