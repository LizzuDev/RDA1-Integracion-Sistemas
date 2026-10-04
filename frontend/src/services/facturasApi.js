import { api } from './api';

/**
 * Servicio de Facturación (envío de la factura por correo).
 *
 * Reutiliza la instancia global de `services/api.ts`, así que hereda el
 * interceptor que inyecta el JWT de Supabase: es lo que permite que el backend
 * sepa a QUIÉN enviar el correo. El `to` no viaja en el cuerpo precisamente
 * por eso; el backend lo toma del token.
 *
 * El PDF lo genera el navegador con `utils/facturaPdf.js` y llega aquí como
 * Base64, no como `FormData`: un `Blob` obligaría al backend a configurar multer
 * para un único archivo cuyo tamaño ya acota el `@MaxLength` del DTO.
 */
export async function enviarFacturaPorCorreo({ pdfBase64, pnr, concepto }) {
  const { data } = await api.post('/facturas/enviar', { pdfBase64, pnr, concepto });
  return data;
}
