import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { esAdministrador } from '../../../core/auth/administradores';
import { SesionSupabaseService, tokenBearer } from '../../../core/auth/sesion-supabase.service';

/**
 * Quién está modificando el catálogo de alojamientos.
 * - `admin`: una persona del panel de gestión (token de Supabase con rol admin).
 * - `proveedor`: el SISTEMA de un proveedor (p. ej. el sistema de Alojamientos de
 *   otro grupo) que sincroniza su inventario con una API key. Solo puede tocar
 *   los alojamientos de su `proveedorId`.
 */
export type ActorCatalogo =
  | { tipo: 'admin'; email: string | null; id?: string }
  | { tipo: 'proveedor'; proveedorId: string };

/**
 * Claves de los proveedores, en la variable de entorno
 * `ALOJAMIENTOS_API_KEYS="proveedorA:clave-larga-1,proveedorB:clave-larga-2"`.
 * Se leen en cada petición para poder rotarlas sin reiniciar en pruebas.
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

function proveedorDeClave(clave: string): string | null {
  const recibida = Buffer.from(clave);
  for (const [guardada, id] of clavesProveedores()) {
    const esperada = Buffer.from(guardada);
    // Comparación en tiempo constante: no revela por tiempos cuánto acierta la clave.
    if (esperada.length === recibida.length && timingSafeEqual(esperada, recibida)) return id;
  }
  return null;
}

/**
 * Protege las escrituras del catálogo (alta, edición, baja, sincronización).
 * Antes eran PÚBLICAS: cualquiera podía crear, cambiar el precio o borrar un
 * hotel con una sola petición.
 */
@Injectable()
export class GestionAlojamientosGuard implements CanActivate {
  constructor(private readonly sesion: SesionSupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const apiKey = req.headers['x-api-key'];
    if (typeof apiKey === 'string' && apiKey) {
      const proveedorId = proveedorDeClave(apiKey);
      if (!proveedorId) throw new UnauthorizedException('API key de proveedor no válida.');
      req.actorCatalogo = { tipo: 'proveedor', proveedorId } satisfies ActorCatalogo;
      return true;
    }

    const token = tokenBearer(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedException(
        'Se requiere autenticación: token de administrador (Authorization: Bearer) o API key de proveedor (X-Api-Key).',
      );
    }
    const usuario = await this.sesion.obtenerUsuario(token);
    if (!usuario) throw new UnauthorizedException('Token inválido o expirado.');
    if (!esAdministrador(usuario)) {
      throw new ForbiddenException('Solo un administrador o un proveedor autorizado puede modificar el catálogo.');
    }
    req.user = usuario;
    req.actorCatalogo = { tipo: 'admin', email: usuario.email ?? null, id: usuario.id } satisfies ActorCatalogo;
    return true;
  }
}

/**
 * Exige un cliente con sesión iniciada (cualquier rol) y deja el usuario en
 * `request.user`. Se usa para "Mis reservas": antes el listado devolvía las
 * reservas de TODOS los clientes, con nombre y correo, a quien lo pidiera.
 */
@Injectable()
export class ClienteAutenticadoGuard implements CanActivate {
  constructor(private readonly sesion: SesionSupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = tokenBearer(req.headers.authorization);
    if (!token) throw new UnauthorizedException('Inicia sesión para ver tus reservas.');
    const usuario = await this.sesion.obtenerUsuario(token);
    if (!usuario) throw new UnauthorizedException('La sesión no es válida o caducó. Vuelve a iniciar sesión.');
    req.user = usuario;
    return true;
  }
}

/** Lanza 403 si un proveedor intenta tocar un alojamiento que no es suyo. */
export function exigirPropiedad(actor: ActorCatalogo | undefined, proveedorDelAlojamiento: string | null | undefined) {
  if (actor?.tipo === 'proveedor' && actor.proveedorId !== proveedorDelAlojamiento) {
    throw new ForbiddenException('Este alojamiento pertenece a otro proveedor.');
  }
}
