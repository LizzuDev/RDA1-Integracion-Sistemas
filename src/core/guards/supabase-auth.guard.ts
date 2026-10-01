import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  private supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  private supabase;

  constructor() {
    if (!this.supabaseUrl || !this.supabaseKey) {
      console.warn('⚠️ Supabase credentials not found in env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }
    this.supabase = createClient(this.supabaseUrl || 'https://placeholder.supabase.co', this.supabaseKey || 'placeholder');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No se proporcionó token de autorización (Falta cabecera Authorization)');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('El formato del token debe ser "Bearer [token]"');
    }

    const token = parts[1];

    // Se valida el token de forma segura contra el servidor de Supabase
    // Esto previene que se falsifiquen tokens en Base64
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException(`Token inválido o expirado: ${error?.message || 'Usuario no encontrado'}`);
    }

    // Inyectar el usuario validado en el objeto de la petición para que los controladores lo usen
    request.user = data.user;
    return true;
  }
}
