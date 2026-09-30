import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';


@Injectable()
export class PagoService {
  private readonly logger = new Logger(PagoService.name);

  /**
   * Simula una llamada síncrona a un servicio de pagos.
   * Rechaza aleatoriamente o por ciertos datos para simular robustez.
   */
  async procesarPago(dto: { cantidadTickets: number; metodoPago?: string; userEmail?: string }): Promise<{ success: boolean; transactionId: string }> {
    // Simulamos un retraso de procesamiento (1 segundo)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Lógica básica de simulación: si la cantidad de tickets es muy alta, el pago "falla"
    if (dto.cantidadTickets > 10) {
      throw new HttpException(
        'Fondos insuficientes o límite de tickets excedido en la pasarela de pagos',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Retorna éxito
    const txId = `TXN-${Math.floor(Math.random() * 1000000)}`;
    
    // Simula envío de comprobante asíncrono
    if (dto.userEmail) {
      this.logger.log(`[EmailService] Simulando envío de Factura Electrónica y código QR al correo: ${dto.userEmail} (Transacción: ${txId})`);
    }

    return {
      success: true,
      transactionId: txId,
    };
  }
}
