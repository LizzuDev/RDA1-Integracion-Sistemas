import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { esAdministrador } from '../auth/administradores';

/**
 * Exige que el usuario autenticado sea ADMINISTRADOR.
 *
 * Va siempre DESPUÉS de `SupabaseAuthGuard`, que valida el token y deja el
 * usuario en `request.user`. Antes el panel `/admin` solo exigía estar logueado:
 * cualquier cuenta normal podía listar usuarios, cancelar reservas o promoverse
 * a admin llamando directamente a la API (el rol solo se comprobaba en el
 * frontend).
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const usuario = context.switchToHttp().getRequest().user;
    if (!esAdministrador(usuario)) {
      throw new ForbiddenException('Esta operación requiere permisos de administrador.');
    }
    return true;
  }
}
