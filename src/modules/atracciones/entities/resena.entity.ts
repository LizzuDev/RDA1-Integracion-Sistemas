import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('resenas_atracciones')
export class ResenaAtraccion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'varchar', length: 100 })
  usuarioId: string;

  @Column({ name: 'usuario_nombre', type: 'varchar', length: 100, default: 'Anónimo' })
  usuarioNombre: string;

  @Column({ name: 'usuario_pais', type: 'varchar', length: 100, default: 'Ecuador' })
  usuarioPais: string;

  @Column({ name: 'atraccion_id', type: 'varchar', length: 100 })
  atraccionId: string;

  @Column({ type: 'text' })
  comentario: string;

  @Column({ type: 'float', default: 10.0 })
  limpieza: number;

  @Column({ type: 'float', default: 10.0 })
  servicio: number;

  @Column({ type: 'float', default: 10.0 })
  calidad: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
