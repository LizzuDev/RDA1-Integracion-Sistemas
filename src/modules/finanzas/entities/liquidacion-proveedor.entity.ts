import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

@Entity({ name: 'liquidaciones_proveedores', schema: 'schema_finanzas' })
export class LiquidacionProveedor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proveedor_codigo', type: 'varchar', length: 50 })
  proveedorCodigo: string; // ej. 'NODE_ATR_DILAN', 'NODE_AUT_LOCAL', etc.

  @Column({ type: 'varchar', length: 30 })
  vertical: string;

  @Column({ type: 'varchar', length: 20 })
  periodo: string; // ej. '2026-10-Q1'

  @Column('numeric', {
    name: 'total_recaudado',
    precision: 10,
    scale: 2,
    default: 0.00,
    transformer: new ColumnNumericTransformer(),
  })
  totalRecaudado: number;

  @Column('numeric', {
    name: 'comision_booking_10pct',
    precision: 10,
    scale: 2,
    default: 0.00,
    transformer: new ColumnNumericTransformer(),
  })
  comisionBooking10pct: number;

  @Column('numeric', {
    name: 'monto_liquidar_socio_90pct',
    precision: 10,
    scale: 2,
    default: 0.00,
    transformer: new ColumnNumericTransformer(),
  })
  montoLiquidarSocio90pct: number;

  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado: string; // 'PENDIENTE', 'PAGADO', 'CONCILIADO'

  @Column({ name: 'comprobante_transferencia_url', type: 'text', nullable: true })
  comprobanteTransferenciaUrl: string;

  @Column({ name: 'fecha_pago', type: 'timestamptz', nullable: true })
  fechaPago: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
