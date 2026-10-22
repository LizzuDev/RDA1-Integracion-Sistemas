import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'atracciones_turnos_aforo', schema: 'schema_atracciones' })
export class TurnoAforo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'atraccion_id', type: 'varchar', length: 64 })
  atraccionId: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ name: 'hora_inicio', type: 'varchar', length: 15 })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'varchar', length: 15, nullable: true })
  horaFin: string;

  @Column({ name: 'capacidad_total', type: 'int', default: 20 })
  capacidadTotal: number;

  @Column({ name: 'cupos_disponibles', type: 'int', default: 20 })
  cuposDisponibles: number;

  @Column({ type: 'varchar', length: 20, default: 'DISPONIBLE' })
  estado: string; // 'DISPONIBLE', 'ULTIMOS_CUPOS', 'AGOTADO'

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
