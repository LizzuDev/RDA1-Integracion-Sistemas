import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FacturasController } from './facturas.controller';
import { FacturasService } from './facturas.service';

/**
 * Facturacion: envio de la factura en PDF por correo.
 *
 * No usa `TypeOrmModule.forFeature`. El PDF se genera en el NAVEGADOR con jsPDF y
 * llega aqui en Base64, asi que el backend no reconstruye la factura ni la
 * persiste: solo la reenvía como adjunto. La entidad `Factura` de
 * `core/entities` pertenece a la facturacion de Supabase (`FacturasPage`) y es otro
 * flujo, asi que no se mezcla con este.
 *
 * El transporte SMTP lo lee `FacturasService` de `ConfigService`, que es global
 * (`isGlobal: true` en `app.module.ts`); se importa `ConfigModule` solo para dejar
 * explicito de donde vienen las credenciales.
 */
@Module({
  imports: [ConfigModule],
  controllers: [FacturasController],
  providers: [FacturasService],
})
export class FacturasModule {}
