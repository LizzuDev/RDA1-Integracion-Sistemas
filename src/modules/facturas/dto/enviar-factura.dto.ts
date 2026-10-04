import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Cuerpo de `POST /api/v1/facturas/enviar`.
 *
 * ── Por que NO viaja `to` ────────────────────────────────────────────────────
 * El destinatario se toma SIEMPRE del `email` del usuario que el valido
 * `SupabaseAuthGuard` (el JWT de Supabase). Aceptar un `to` libre convertiria
 * este endpoint en un relay de correo abierto: cualquiera con una sesion valida
 * podria mandar correos en nombre de la aplicacion a terceros, y Gmail terminaria
 * marcando la cuenta como spam. El cliente no manda el destino y por eso no
 * puede equivocarse.
 *
 * ── Base64 y no multipart ────────────────────────────────────────────────────
 * El PDF lo genera el NAVEGADOR con jsPDF (ver `utils/facturaPdf.js`), asi que
 * llega ya serializado. `multipart/form-data` obligaria al navegador a releer el
 * PDF como `Blob` y a reconstruirlo, y ademas obliga a configurar multer en el
 * backend para un unico archivo con tamano ya acotado. Un `string` Base64 con
 * `@MaxLength` es suficiente y no necesita estado adicional en el servidor.
 *
 * ── Tamano ───────────────────────────────────────────────────────────────────
 * El limite es de 2.5 MB de Base64, unos 1.8 MB de PDF. Una factura generada por
 * jsPDF sin imagenes pesa entre 10 y 30 KB, asi que el margen es de casi dos
 * ordenes de magnitud. Existe para que un `pdfBase64` enorme sea un 400 con un
 * motivo claro en lugar de agotar la memoria del proceso.
 */
export class EnviarFacturaDto {
  @ApiProperty({
    description:
      'Contenido del PDF de la factura codificado en Base64 (sin el prefijo `data:application/pdf;base64,`).',
    example: 'JVBERi0xLjQKJcTl8uXr...',
  })
  @IsString()
  @MinLength(64, { message: 'pdfBase64 debe contener el PDF completo.' })
  @MaxLength(2_500_000, {
    message: 'El PDF supera el tamano maximo permitido (1.8 MB).',
  })
  pdfBase64: string;

  @ApiProperty({
    description: 'Codigo de confirmacion de la reserva. Se usa en el nombre del adjunto.',
    example: 'QZXEDP',
    maxLength: 40,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  pnr: string;

  @ApiPropertyOptional({
    description: 'Concepto que se muestra en el cuerpo del correo.',
    example: 'Vuelo Quito → Guayaquil',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  concepto?: string;
}
