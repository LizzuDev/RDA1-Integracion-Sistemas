import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

@Entity({ name: 'libro_mayor_comisiones', schema: 'schema_finanzas' })
export class LibroMayorComisiones {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'orden_id', type: 'varchar', length: 64 })
  ordenId: string;

  @Column({ name: 'factura_id', type: 'uuid' })
  facturaId: string;

  @Column({ type: 'varchar', length: 30 })
  vertical: string;

  @Column('numeric', {
    name: 'total_venta',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  totalVenta: number;

  @Column('numeric', {
    name: 'comision_booking_10pct',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  comisionBooking10pct: number;

  @Column('numeric', {
    name: 'neto_socio_90pct',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  netoSocio90pct: number;

  @CreateDateColumn({ name: 'fecha_asiento', type: 'timestamptz' })
  fechaAsiento: Date;
}
