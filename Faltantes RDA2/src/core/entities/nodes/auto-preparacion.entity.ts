import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum EstadoPreparacion {
  EN_LIMPIEZA = 'en_limpieza',
  ESPERANDO_2H = 'esperando_2h',
  LISTO = 'listo',
  OMITIDO = 'omitido',
}

@Entity({ name: 'auto_preparacion' })
export class AutoPreparacion {
  @PrimaryGeneratedColumn('uuid')
  prep_id: string;

  @Column({ name: 'auto_id', type: 'uuid', nullable: false })
  auto_id: string;

  @Column({ name: 'reserva_devolucion_id', type: 'uuid', nullable: true })
  reserva_devolucion_id: string;

  @Column({
    name: 'estado_prep',
    type: 'enum',
    enum: EstadoPreparacion,
    nullable: false,
    default: EstadoPreparacion.EN_LIMPIEZA,
  })
  estado_prep: EstadoPreparacion;

  @Column({ name: 'fecha_hora_devolucion', type: 'timestamptz', nullable: true })
  fecha_hora_devolucion: Date;

  @Column({ name: 'fecha_hora_inicio_limpieza', type: 'timestamptz', nullable: true })
  fecha_hora_inicio_limpieza: Date;

  @Column({ name: 'fecha_hora_fin_limpieza', type: 'timestamptz', nullable: true })
  fecha_hora_fin_limpieza: Date;

  @Column({ name: 'fecha_hora_inicio_espera2h', type: 'timestamptz', nullable: true })
  fecha_hora_inicio_espera2h: Date;

  @Column({ name: 'fecha_hora_disponible_min', type: 'timestamptz', nullable: true })
  fecha_hora_disponible_min: Date;

  @Column({ name: 'fecha_hora_liberado', type: 'timestamptz', nullable: true })
  fecha_hora_liberado: Date;

  @Column({ name: 'forzado_antes_tiempo', type: 'boolean', nullable: false, default: false })
  forzado_antes_tiempo: boolean;

  @Column({ name: 'motivo_forzado', type: 'text', nullable: true })
  motivo_forzado: string;

  @Column({ name: 'autorizado_por_id', type: 'uuid', nullable: true })
  autorizado_por_id: string;

  @Column({ name: 'checklist_limpieza', type: 'jsonb', nullable: true })
  checklist_limpieza: Record<string, any>;

  @Column({ name: 'checklist_inspeccion', type: 'jsonb', nullable: true })
  checklist_inspeccion: Record<string, any>;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  correlation_id: string;

  @Column({ name: 'trace_id', type: 'uuid', nullable: true })
  trace_id: string;

  @Column({ name: 'node_id', type: 'uuid', nullable: true })
  node_id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
EOF
echo "ok"