/**
 * Quién es administrador de la plataforma. Fuente ÚNICA para el backend.
 *
 * ── Por qué `app_metadata` y NO `user_metadata` ──────────────────────────────
 * En Supabase, `user_metadata` lo puede escribir el propio usuario desde el
 * navegador (`supabase.auth.updateUser({ data: { role: 'admin' } })`). Si el rol
 * viviera ahí, cualquiera podría declararse administrador. `app_metadata` solo
 * se escribe con la clave de servicio (backend), así que es el único sitio
 * fiable para el rol.
 *
 * Los correos de `ADMIN_EMAILS` son administradores fijos (no se pueden degradar
 * desde el panel). Deben coincidir con `frontend/src/components/AdminGuard.jsx`.
 */
export const ADMIN_EMAILS = ['admin@booking.com', 'alejandroflores@booking.com'];

export interface UsuarioSupabase {
  id?: string;
  email?: string | null;
  app_metadata?: Record<string, any> | null;
  user_metadata?: Record<string, any> | null;
}

export function esAdministrador(usuario: UsuarioSupabase | null | undefined): boolean {
  if (!usuario) return false;
  const email = (usuario.email || '').toLowerCase();
  return ADMIN_EMAILS.includes(email) || usuario.app_metadata?.role === 'admin';
}
