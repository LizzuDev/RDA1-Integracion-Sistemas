import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { Rol } from '../auth/roles.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorador para restringir el acceso a endpoints según los roles de la Cátedra RDA2 (§5).
 * Permite especificar uno o múltiples roles: @Roles(Rol.MANTENIMIENTO, Rol.ADMIN)
 */
export const Roles = (...roles: (Rol | string)[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
