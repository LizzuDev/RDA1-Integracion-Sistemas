import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { FacturaItem } from './factura-item.entity';

@Entity({ name: 'facturas_encabezado', schema: 'schema_facturacion' })
export class Factura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  numero_factura: string;

  @Column({ name: 'carrito_id', type: 'uuid', nullable: true })
  carritoId: string;

  @Column({ name: 'cliente_id', type: 'uuid' })
  clienteId: string;

  get usuarioId(): string {
    return this.clienteId;
  }
  set usuarioId(val: string) {
    this.clienteId = val;
  }

  @Column({ length: 150 })
  nombre_cliente: string;

  @Column({ length: 20 })
  cedula_ruc_cliente: string;

  @Column({ length: 255 })
  email_cliente: string;

  @Column('text', { nullable: true })
  direccion_cliente: string;

  @Column('numeric', { precision: 10, scale: 2, default: 0.00 })
  subtotal: number;

  @Column('numeric', { precision: 5, scale: 2, default: 15.00 })
  iva_porcentaje: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0.00 })
  iva_valor: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0.00 })
  total: number;

  @Column({ type: 'varchar', length: 50, default: 'TARJETA_CREDITO' })
  metodo_pago: string;

  @Column({ length: 255, nullable: true })
  referencia_pago: string;

  @Column({ type: 'varchar', length: 30, default: 'EMITIDA' })
  estado: string; // 'EMITIDA', 'PAGADA', 'ANULADA_POR_COMPENSACION'

  @Column({ name: 'idempotency_key', length: 64, unique: true, default: () => 'gen_random_uuid()' })
  idempotency_key: string;

  @Column({ name: 'transaccion_pago_id', type: 'uuid', nullable: true })
  transaccion_pago_id: string;

  @Column('text', { nullable: true })
  notas: string;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  emitida_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => FacturaItem, (item) => item.factura, { cascade: true })
  items: FacturaItem[];
}
