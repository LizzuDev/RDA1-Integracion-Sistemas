import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Carrito } from './carrito.entity';

@Entity({ name: 'carrito_items', schema: 'schema_carritos' })
export class CarritoItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Carrito, (carrito) => carrito.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrito_id' })
  carrito: Carrito;

  @Column({ name: 'vertical', type: 'varchar', length: 30, default: 'ATRACCIONES' })
  vertical: string; // 'ATRACCIONES', 'AUTOS', 'ALOJAMIENTOS', 'VUELOS', 'PAQUETES'

  @Column({ name: 'tipo_producto', type: 'text', nullable: true })
  tipo_producto: string;

  @Column({ name: 'item_referencia_id', type: 'varchar', length: 64, default: '' })
  itemReferenciaId: string;

  @Column({ name: 'producto_id_externo', type: 'varchar', length: 64, nullable: true })
  producto_id_externo: string;

  @Column({ name: 'nombre_producto', length: 250 })
  nombre_producto: string;

  @Column('numeric', { precision: 10, scale: 2, default: 0.00 })
  precio_unitario: number;

  @Column('int', { default: 1 })
  cantidad: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0.00 })
  subtotal: number;

  @Column({ name: 'detalles_json', type: 'jsonb', nullable: true })
  detalles_json: any;

  @Column('date', { nullable: true })
  fecha_inicio: Date;

  @Column('date', { nullable: true })
  fecha_fin: Date;

  @Column('text', { nullable: true })
  notas: string;

  @Column('text', { nullable: true })
  api_origen_url: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
