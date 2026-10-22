import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Rol, normalizarRol } from '../auth/roles.enum';
import { esAdministrador } from '../auth/administradores';

/**
 * Guard para Control de Acceso Basado en Roles (RBAC) según Cátedra RDA2 §5.
 * 
 * Protege endpoints decorados con @Roles(Rol.MANTENIMIENTO, Rol.ADMIN, etc.).
 * Evalúa los metadatos de usuario inyectados por SupabaseAuthGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [
      typeof context.getHandler === 'function' ? context.getHandler() : null,
      typeof context.getClass === 'function' ? context.getClass() : null,
    ].filter(Boolean);

    const requiredRoles = targets.length > 0
      ? this.reflector.getAllAndOverride<(Rol | string)[]>(ROLES_KEY, targets)
      : null;

    // Si la ruta no exige roles específicos, se permite el paso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado o sesión no iniciada (Falta Authorization / X-Role).');
    }

    // Si el endpoint acepta ADMIN y el usuario es administrador reconocido, acceso inmediato
    if (esAdministrador(user) && requiredRoles.some(r => normalizarRol(r) === Rol.ADMIN)) {
      return true;
    }

    // Extraer rol del usuario desde app_metadata o fallback
    const userRoleRaw =
      user.app_metadata?.role ||
      user.role ||
      user.user_metadata?.role;

    const userRole = normalizarRol(userRoleRaw);

    const hasPermission = requiredRoles.some((requiredRole) => {
      const normalizedReq = normalizarRol(requiredRole);
      return userRole === normalizedReq;
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Acceso restringido (403 Forbidden): Esta operación exige uno de los roles [${requiredRoles.join(', ')}]. Rol actual del usuario: ${userRole || 'NINGUNO'}.`,
      );
    }

    return true;
  }
}
