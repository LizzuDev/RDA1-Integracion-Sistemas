import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

@Entity({ name: 'atracciones_categorias_recursivas', schema: 'schema_atracciones' })
export class CategoriaRecursiva {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string;

  @Column({ name: 'nivel_profundidad', type: 'int', default: 0 })
  nivelProfundidad: number;

  @Column({ name: 'incluye_comida', type: 'boolean', default: false })
  incluyeComida: boolean;

  @Column({ name: 'incluye_transporte', type: 'boolean', default: false })
  incluyeTransporte: boolean;

  @Column({ name: 'incluye_guia', type: 'boolean', default: false })
  incluyeGuia: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => CategoriaRecursiva, (cat) => cat.subcategorias, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: CategoriaRecursiva;

  @OneToMany(() => CategoriaRecursiva, (cat) => cat.parent)
  subcategorias?: CategoriaRecursiva[];
}
