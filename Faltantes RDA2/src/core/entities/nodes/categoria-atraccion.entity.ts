import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'categoria_atraccion' })
export class CategoriaAtraccion {
  @PrimaryGeneratedColumn('uuid')
  categoria_id: string;

  @Column({ name: 'codigo', length: 50, unique: true, nullable: false })
  codigo: string;

  @Column({ name: 'nombre', length: 150, nullable: false })
  nombre: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string;

  @Column({ name: 'padre_id', type: 'uuid', nullable: true })
  padre_id: string;

  @ManyToOne(() => CategoriaAtraccion, (cat) => cat.hijos, { nullable: true })
  @JoinColumn({ name: 'padre_id' })
  padre: CategoriaAtraccion;

  @OneToMany(() => CategoriaAtraccion, (cat) => cat.padre)
  hijos: CategoriaAtraccion[];

  @Column({ name: 'nivel', type: 'int', nullable: false, default: 0 })
  nivel: number;

  @Column({ name: 'ruta_categoria', length: 500, nullable: true })
  ruta_categoria: string;

  @Column({ name: 'incluye_comida', type: 'boolean', nullable: false, default: false })
  incluye_comida: boolean;

  @Column({ name: 'incluye_transporte', type: 'boolean', nullable: false, default: false })
  incluye_transporte: boolean;

  @Column({ name: 'incluye_guia', type: 'boolean', nullable: false, default: false })
  incluye_guia: boolean;

  @Column({ name: 'activa', type: 'boolean', nullable: false, default: true })
  activa: boolean;

  @Column({ name: 'orden', type: 'int', nullable: false, default: 0 })
  orden: number;

  @Column({ name: 'metadatos', type: 'jsonb', nullable: true })
  metadatos: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by: string;
}
EOF
echo "ok"