import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum SagaType {
  CHECKOUT_PAGO = 'checkout_pago',
  ARMADO_PAQUETE = 'armado_paquete',
  RESERVA_COMPLETA = 'reserva_completa',
  CANCELACION = 'cancelacion',
}

export enum SagaEstado {
  INICIADA = 'iniciada',
  EN_PROGRESO = 'en_progreso',
  COMPLETADA = 'completada',
  COMPENSANDO = 'compensando',
  COMPENSADA = 'compensada',
  FALLIDA = 'fallida',
  ABORTADA = 'abortada',
}

@Entity({ name: 'saga_instance' })
export class SagaInstance {
  @PrimaryGeneratedColumn('uuid')
  saga_id: string;

  @Column({
    name: 'saga_type',
    type: 'enum',
    enum: SagaType,
    nullable: false,
  })
  saga_type: SagaType;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: SagaEstado,
    nullable: false,
    default: SagaEstado.INICIADA,
  })
  estado: SagaEstado;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: false })
  correlation_id: string;

  @Column({ name: 'paso_actual', type: 'int', nullable: false, default: 0 })
  paso_actual: number;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @Column({ name: 'error', type: 'jsonb', nullable: true })
  error: Record<string, any>;

  @Column({ name: 'timeout_at', type: 'timestamptz', nullable: true })
  timeout_at: Date;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  started_at: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finished_at: Date;

  @Column({ name: 'node_id', type: 'uuid', nullable: true })
  node_id: string;
}
EOF
echo "ok"