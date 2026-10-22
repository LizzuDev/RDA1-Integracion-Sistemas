import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Factura } from './factura.entity';

@Entity({ name: 'facturas_detalle', schema: 'schema_facturacion' })
export class FacturaItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Factura, (factura) => factura.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'factura_id' })
  factura: Factura;

  @Column({ name: 'vertical', type: 'varchar', length: 30, default: 'ATRACCIONES' })
  vertical: string;

  @Column({ name: 'tipo_producto', type: 'text', nullable: true })
  tipo_producto: string;

  @Column({ name: 'item_id', type: 'varchar', length: 64, default: '' })
  itemId: string;

  @Column({ name: 'producto_id_externo', type: 'varchar', length: 64, nullable: true })
  producto_id_externo: string;

  @Column({ name: 'descripcion', type: 'text', default: '' })
  descripcion: string;

  get nombre_producto(): string {
    return this.descripcion;
  }
  set nombre_producto(val: string) {
    this.descripcion = val;
  }

  @Column('int', { default: 1 })
  cantidad: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0.00 })
  precio_unitario: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0.00 })
  subtotal: number;

  @Column('date', { nullable: true })
  fecha_inicio: Date;

  @Column('date', { nullable: true })
  fecha_fin: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
