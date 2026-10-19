import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AccionTipoStep {
  FORWARD = 'forward',
  COMPENSATE = 'compensate',
}

export enum EstadoStep {
  PENDIENTE = 'pendiente',
  EJECUTANDO = 'ejecutando',
  EXITOSO = 'exitoso',
  FALLIDO = 'fallido',
  OMITIDO = 'omitido',
}

@Entity({ name: 'saga_step' })
export class SagaStep {
  @PrimaryGeneratedColumn('uuid')
  step_id: string;

  @Column({ name: 'saga_id', type: 'uuid', nullable: false })
  saga_id: string;

  @Column({ name: 'orden', type: 'int', nullable: false })
  orden: number;

  @Column({ name: 'accion', length: 100, nullable: false })
  accion: string;

  @Column({
    name: 'accion_tipo',
    type: 'enum',
    enum: AccionTipoStep,
    nullable: false,
    default: AccionTipoStep.FORWARD,
  })
  accion_tipo: AccionTipoStep;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoStep,
    nullable: false,
    default: EstadoStep.PENDIENTE,
  })
  estado: EstadoStep;

  @Column({ name: 'resultado', type: 'jsonb', nullable: true })
  resultado: Record<string, any>;

  @Column({ name: 'error', type: 'jsonb', nullable: true })
  error: Record<string, any>;

  @Column({ name: 'intentos', type: 'int', nullable: false, default: 0 })
  intentos: number;

  @Column({ name: 'executed_at', type: 'timestamptz', nullable: true })
  executed_at: Date;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  correlation_id: string;

  @Column({ name: 'trace_id', type: 'uuid', nullable: true })
  trace_id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
EOF
echo "ok"