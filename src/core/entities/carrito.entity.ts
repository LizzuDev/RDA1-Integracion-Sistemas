import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CarritoItem } from './carrito-item.entity';

@Entity({ name: 'carritos', schema: 'schema_carritos' })
export class Carrito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cliente_id', type: 'uuid' })
  clienteId: string;

  get usuarioId(): string {
    return this.clienteId;
  }
  set usuarioId(val: string) {
    this.clienteId = val;
  }

  @Column('text', { default: 'ACTIVO' })
  estado: string; // 'ACTIVO', 'PROCESADO', 'ABANDONADO'

  @Column({ length: 3, default: 'USD' })
  moneda: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => CarritoItem, (item) => item.carrito)
  items: CarritoItem[];
}
