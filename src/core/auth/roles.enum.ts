/**
 * Roles formales del ecosistema Booking Prototipo (Cátedra RDA2 §5)
 */
export enum Rol {
  CLIENTE = 'CLIENTE',
  ADMIN = 'ADMIN',
  MANTENIMIENTO = 'MANTENIMIENTO',
}

/**
 * Normaliza cualquier variante de cadena de rol al formato canónico
 * (ej. 'admin' -> 'ADMIN', 'tecnico_mantenimiento' -> 'MANTENIMIENTO')
 */
export function normalizarRol(rolRaw: string | undefined | null): Rol | string | null {
  if (!rolRaw) return null;
  const upper = rolRaw.trim().toUpperCase();
  if (upper === 'ADMIN' || upper === 'ADMINISTRADOR') return Rol.ADMIN;
  if (upper === 'MANTENIMIENTO' || upper === 'TECNICO_MANTENIMIENTO' || upper === 'MANTENIMIENTO_TECNICO') {
    return Rol.MANTENIMIENTO;
  }
  if (upper === 'CLIENTE' || upper === 'USER' || upper === 'USUARIO') return Rol.CLIENTE;
  return upper;
}
