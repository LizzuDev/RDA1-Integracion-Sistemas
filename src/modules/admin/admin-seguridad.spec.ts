import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { AdminRoleGuard } from '../../core/guards/admin-role.guard';
import { esAdministrador } from '../../core/auth/administradores';
import { AdminService } from './admin.service';

const contexto = (user: any) => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as any;

describe('Seguridad del panel de administración', () => {
  describe('esAdministrador', () => {
    it.each([
      ['correo fijo de admin', { email: 'admin@booking.com' }, true],
      ['correo fijo en mayúsculas', { email: 'Admin@Booking.com' }, true],
      ['rol admin en app_metadata (lo pone el backend)', { email: 'x@y.com', app_metadata: { role: 'admin' } }, true],
      ['rol admin en user_metadata (lo puede poner el propio usuario)', { email: 'x@y.com', user_metadata: { role: 'admin' } }, false],
      ['usuario normal', { email: 'x@y.com', app_metadata: { role: 'user' } }, false],
      ['sin usuario', null, false],
    ])('%s → %s', (_caso, usuario, esperado) => {
      expect(esAdministrador(usuario as any)).toBe(esperado);
    });
  });

  describe('AdminRoleGuard', () => {
    it('deja pasar a un administrador', () => {
      expect(new AdminRoleGuard().canActivate(contexto({ email: 'admin@booking.com' }))).toBe(true);
    });

    it.each([
      ['un cliente logueado', { email: 'cliente@example.com' }],
      ['un usuario que se puso role=admin en user_metadata', { email: 'x@y.com', user_metadata: { role: 'admin' } }],
      ['una petición sin usuario', undefined],
    ])('rechaza con 403 a %s', (_caso, user) => {
      expect(() => new AdminRoleGuard().canActivate(contexto(user))).toThrow(ForbiddenException);
    });
  });

  describe('AdminService.cancelarReserva (hospedaje)', () => {
    const crear = (reserva: any, cancelar = jest.fn().mockResolvedValue({})) => {
      const reservaAlojamientoRepo = { findOne: jest.fn().mockResolvedValue(reserva) };
      const servicio = new AdminService(
        {} as any, {} as any, {} as any, reservaAlojamientoRepo as any, {} as any, {} as any,
        { cancelarReserva: cancelar } as any,
      );
      return { servicio, cancelar, reservaAlojamientoRepo };
    };

    it('delega en el módulo de alojamientos (que aplica sus reglas y avisa por webhook)', async () => {
      const { servicio, cancelar } = crear({ id: '11111111-1111-1111-1111-111111111111' });
      const res = await servicio.cancelarReserva('hospedaje', 'BKG-123456');
      expect(res.success).toBe(true);
      expect(cancelar).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        { reason: 'Cancelada por el administrador' },
        expect.stringMatching(/^[0-9a-f-]{36}$/),
      );
    });

    it('busca por código de reserva o por UUID', async () => {
      const { servicio, reservaAlojamientoRepo } = crear({ id: 'x' });
      await servicio.cancelarReserva('hospedaje', 'BKG-123456');
      expect(reservaAlojamientoRepo.findOne).toHaveBeenLastCalledWith({ where: { codigoReserva: 'BKG-123456' } });
      await servicio.cancelarReserva('hospedaje', '11111111-1111-1111-1111-111111111111');
      expect(reservaAlojamientoRepo.findOne).toHaveBeenLastCalledWith({ where: { id: '11111111-1111-1111-1111-111111111111' } });
    });

    it('reserva inexistente → 404 (antes respondía "cancelada exitosamente")', async () => {
      const { servicio, cancelar } = crear(null);
      await expect(servicio.cancelarReserva('hospedaje', 'BKG-000000')).rejects.toThrow(NotFoundException);
      expect(cancelar).not.toHaveBeenCalled();
    });

    it('propaga las reglas del módulo, p. ej. estancia ya terminada → 409', async () => {
      const { servicio } = crear({ id: 'x' }, jest.fn().mockRejectedValue(new ConflictException('ya finalizó')));
      await expect(servicio.cancelarReserva('hospedaje', 'BKG-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('RolesGuard (RBAC Cátedra RDA2 §5: CLIENTE, ADMIN, MANTENIMIENTO)', () => {
    const { RolesGuard } = require('../../core/guards/roles.guard');
    const { Rol } = require('../../core/auth/roles.enum');
    const { Reflector } = require('@nestjs/core');

    const crearGuard = (rolesPermitidos: any[]) => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(rolesPermitidos);
      return new RolesGuard(reflector);
    };

    const contextoRoles = (user: any) =>
      ({
        getHandler: () => () => {},
        getClass: () => class {},
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      } as any);

    it('permite acceso si la ruta exige MANTENIMIENTO o ADMIN y el usuario tiene rol MANTENIMIENTO', () => {
      const guard = crearGuard([Rol.MANTENIMIENTO, Rol.ADMIN]);
      const ctx = contextoRoles({
        email: 'tecnico@booking.com',
        app_metadata: { role: 'mantenimiento' },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('permite acceso si la ruta exige MANTENIMIENTO o ADMIN y el usuario es ADMIN', () => {
      const guard = crearGuard([Rol.MANTENIMIENTO, Rol.ADMIN]);
      const ctx = contextoRoles({
        email: 'admin@booking.com',
        app_metadata: { role: 'admin' },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rechaza con 403 Forbidden si un CLIENTE intenta ingresar a ruta de MANTENIMIENTO', () => {
      const guard = crearGuard([Rol.MANTENIMIENTO, Rol.ADMIN]);
      const ctx = contextoRoles({
        email: 'turista@gmail.com',
        app_metadata: { role: 'CLIENTE' },
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});

