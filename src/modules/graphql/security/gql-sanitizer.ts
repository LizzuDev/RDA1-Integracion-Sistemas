/**
 * Utilidad de Sanitización para GraphQL BFF (Seguridad y Prevención XSS / Injection)
 * 
 * Cumple con el Paso 2: Blindaje de Seguridad y Roles (RBAC Cátedra)
 */
export function sanitizeString(val: string | null | undefined, maxLength: number = 500): string {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/<[^>]*>?/gm, '') // Eliminar tags HTML / XSS (<script>, <img>, etc.)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Eliminar caracteres de control ASCII
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
