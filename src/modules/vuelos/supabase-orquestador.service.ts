/**
 * SupabaseOrquestadorService
 *
 * Servicio que actúa como puente entre la API de vuelos y la base de datos
 * del orquestador (Supabase). Gestiona los carritos, items y facturas
 * del sistema central de la plataforma de booking.
 *
 * Responsabilidades:
 *  - Crear/obtener el carrito activo de un usuario
 *  - Insertar un ítem de vuelo (hold) en el carrito
 *  - Confirmar un carrito y generar la factura
 *  - Eliminar ítems expirados del carrito
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseOrquestadorService {
  private readonly logger = new Logger(SupabaseOrquestadorService.name);
  private readonly supabase: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SECRET_KEY');

    if (!url || !key) {
      throw new Error('SUPABASE_URL y SUPABASE_SECRET_KEY son obligatorios.');
    }

    this.supabase = createClient(url, key);
  }

  // ─── Carritos ─────────────────────────────────────────────────────────────

  /**
   * Obtiene el carrito activo de un usuario, o crea uno nuevo si no tiene.
   * Un usuario solo puede tener UN carrito "abierto" a la vez.
   */
  async obtenerOCrearCarrito(usuarioId: string): Promise<string> {
    // Buscar carrito abierto
    const { data: carritos, error: errBuscar } = await this.supabase
      .from('carritos')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('estado', 'abierto')
      .limit(1);

    if (errBuscar) {
      this.logger.warn(`Error al buscar carrito para usuario ${usuarioId}: ${errBuscar.message}`);
    }

    if (carritos && carritos.length > 0) {
      return carritos[0].id as string;
    }

    // Crear nuevo carrito
    const { data: nuevoCarrito, error: errCrear } = await this.supabase
      .from('carritos')
      .insert({ usuario_id: usuarioId, estado: 'abierto' })
      .select('id')
      .single();

    if (errCrear || !nuevoCarrito) {
      this.logger.error(`No se pudo crear el carrito para usuario ${usuarioId}: ${errCrear?.message}`);
      throw new Error('No se pudo crear el carrito.');
    }

    this.logger.debug(`Carrito creado: ${nuevoCarrito.id} para usuario ${usuarioId}`);
    return nuevoCarrito.id as string;
  }

  // ─── Carrito Items ─────────────────────────────────────────────────────────

  /**
   * Inserta un ítem de tipo "vuelo" en el carrito del usuario.
   * Se llama automáticamente cuando se crea un Hold exitoso.
   *
   * Si el usuario ya tiene un item de vuelo en ese carrito (de un hold previo),
   * lo reemplaza con el nuevo para evitar duplicados.
   */
  async agregarVueloAlCarrito(params: {
    usuarioId: string;
    holdId: string;
    descripcion: string;
    precioTotal: number;
    moneda: string;
    fechaSalida: string;
    apiOrigenUrl: string;
  }): Promise<void> {
    try {
      const carritoId = await this.obtenerOCrearCarrito(params.usuarioId);

      // Eliminar item previo del mismo tipo para este carrito (solo un vuelo a la vez)
      await this.supabase
        .from('carrito_items')
        .delete()
        .eq('carrito_id', carritoId)
        .eq('tipo_producto', 'vuelo');

      // Insertar el nuevo item
      const { error } = await this.supabase
        .from('carrito_items')
        .insert({
          carrito_id: carritoId,
          tipo_producto: 'vuelo',
          producto_id_externo: params.holdId,
          nombre_producto: params.descripcion,
          precio_unitario: params.precioTotal,
          cantidad: 1,
          fecha_inicio: params.fechaSalida,
          api_origen_url: params.apiOrigenUrl,
          notas: JSON.stringify({ moneda: params.moneda }),
        });

      if (error) {
        this.logger.warn(`No se pudo insertar item de vuelo en carrito: ${error.message}`);
      } else {
        this.logger.debug(`Vuelo hold:${params.holdId} agregado al carrito ${carritoId}`);
      }
    } catch (err) {
      // No lanzamos la excepción: si falla el carrito, la operación de hold
      // ya fue exitosa. Solo logueamos el error.
      this.logger.error(`Error al agregar vuelo al carrito del usuario ${params.usuarioId}: ${(err as Error).message}`);
    }
  }

  /**
   * Elimina un ítem de vuelo del carrito cuando el Hold expira o se cancela.
   */
  async eliminarVueloDelCarrito(holdId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('carrito_items')
        .delete()
        .eq('tipo_producto', 'vuelo')
        .eq('producto_id_externo', holdId);

      if (error) {
        this.logger.warn(`No se pudo eliminar item de vuelo ${holdId} del carrito: ${error.message}`);
      } else {
        this.logger.debug(`Item de vuelo ${holdId} eliminado del carrito.`);
      }
    } catch (err) {
      this.logger.error(`Error al eliminar vuelo del carrito: ${(err as Error).message}`);
    }
  }

  // ─── Facturas ──────────────────────────────────────────────────────────────

  /**
   * Genera una factura en Supabase al confirmar una reserva de vuelo.
   * Marca el carrito como "comprado" y crea el registro en `facturas`.
   *
   * @returns El ID de la factura generada.
   */
  async confirmarCompraYGenerarFactura(params: {
    usuarioId: string;
    holdId: string;
    reservaId: string;
    montoTotal: number;
    moneda: string;
  }): Promise<string | null> {
    try {
      // Buscar el carrito abierto del usuario
      const { data: carritos } = await this.supabase
        .from('carritos')
        .select('id')
        .eq('usuario_id', params.usuarioId)
        .eq('estado', 'abierto')
        .limit(1);

      if (!carritos || carritos.length === 0) {
        this.logger.warn(`No se encontró carrito abierto para usuario ${params.usuarioId} al confirmar compra.`);
        return null;
      }

      const carritoId = carritos[0].id as string;

      // Crear la factura
      const { data: factura, error: errFactura } = await this.supabase
        .from('facturas')
        .insert({
          carrito_id: carritoId,
          usuario_id: params.usuarioId,
        })
        .select('id')
        .single();

      if (errFactura || !factura) {
        this.logger.error(`No se pudo crear la factura: ${errFactura?.message}`);
        return null;
      }

      // Cerrar el carrito
      await this.supabase
        .from('carritos')
        .update({ estado: 'comprado' })
        .eq('id', carritoId);

      this.logger.debug(`Factura ${factura.id} generada para reserva ${params.reservaId}.`);
      return factura.id as string;
    } catch (err) {
      this.logger.error(`Error al generar factura: ${(err as Error).message}`);
      return null;
    }
  }
}
