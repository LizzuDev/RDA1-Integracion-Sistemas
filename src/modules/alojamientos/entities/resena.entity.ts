import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('resenas_alojamiento')
export class ResenaAlojamiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'alojamiento_id', type: 'varchar', length: 50 })
  alojamientoId: string;

  @Column({ name: 'usuario_id', type: 'varchar', length: 100 })
  usuarioId: string;

  @Column({ name: 'usuario_nombre', type: 'varchar', length: 100, default: 'Anónimo' })
  usuarioNombre: string;

  @Column({ name: 'usuario_pais', type: 'varchar', length: 100, default: 'Ecuador' })
  usuarioPais: string;

  @Column({ type: 'text' })
  comentario: string;

  @Column({ type: 'float', default: 10.0 })
  puntuacion: number;

  @Column({ type: 'float', default: 10.0 })
  limpieza: number;

  @Column({ type: 'float', default: 10.0 })
  servicio: number;

  @Column({ type: 'float', default: 10.0 })
  calidad: number;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  createdAt: Date;
}
