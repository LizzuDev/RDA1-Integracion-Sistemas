import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Paquete } from './paquete.entity';

export enum TipoRecursoPaquete {
  AUTO = 'auto',
  VUELO = 'vuelo',
  ATRACCION = 'atraccion',
  ALOJAMIENTO = 'alojamiento',
}

@Entity({ name: 'paquete_items' })
export class PaqueteItem {
  @PrimaryGeneratedColumn('uuid')
  paquete_item_id: string;

  @Column({ name: 'paquete_id', type: 'uuid', nullable: false })
  paquete_id: string;

  @ManyToOne(() => Paquete, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paquete_id' })
  paquete: Paquete;

  @Column({
    name: 'tipo_recurso',
    type: 'enum',
    enum: TipoRecursoPaquete,
    nullable: false,
  })
  tipo_recurso: TipoRecursoPaquete;

  @Column({ name: 'recurso_id', type: 'uuid', nullable: false })
  recurso_id: string;

  @Column({ name: 'codigo_recurso', length: 50, nullable: true })
  codigo_recurso: string;

  @Column({ name: 'nombre_recurso', length: 150, nullable: false })
  nombre_recurso: string;

  @Column({ name: 'cantidad', type: 'int', nullable: false, default: 1 })
  cantidad: number;

  @Column({ name: 'precio_unitario_base', type: 'decimal', precision: 12, scale: 2, nullable: false, default: 0 })
  precio_unitario_base: number;

  @Column({ name: 'precio_unitario_pkg', type: 'decimal', precision: 12, scale: 2, nullable: false, default: 0 })
  precio_unitario_pkg: number;

  @Column({ name: 'es_obligatorio', type: 'boolean', nullable: false, default: true })
  es_obligatorio: boolean;

  @Column({ name: 'orden', type: 'int', nullable: false, default: 0 })
  orden: number;

  @Column({ name: 'detalles', type: 'jsonb', nullable: true })
  detalles: Record<string, any>;

  @Column({ name: 'snapshot', type: 'jsonb', nullable: false })
  snapshot: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
EOF
echo "ok"