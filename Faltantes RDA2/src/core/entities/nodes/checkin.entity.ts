import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoCheckin {
  ALOJAMIENTO = 'alojamiento',
  ATRACCION = 'atraccion',
  VUELO = 'vuelo',
  AUTO = 'auto',
}

export enum EstadoCheckin {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  COMPLETADO = 'completado',
  CANCELADO = 'cancelado',
  RECHAZADO = 'rechazado',
}

@Entity({ name: 'checkins' })
export class Checkin {
  @PrimaryGeneratedColumn('uuid')
  checkin_id: string;

  @Column({
    name: 'tipo_checkin',
    type: 'enum',
    enum: TipoCheckin,
    nullable: false,
  })
  tipo_checkin: TipoCheckin;

  @Column({ name: 'reserva_id', type: 'uuid', nullable: false })
  reserva_id: string;

  @Column({ name: 'recurso_id', type: 'uuid', nullable: false })
  recurso_id: string;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoCheckin,
    nullable: false,
    default: EstadoCheckin.PENDIENTE,
  })
  estado: EstadoCheckin;

  @Column({ name: 'fecha_hora_prevista', type: 'timestamptz', nullable: true })
  fecha_hora_prevista: Date;

  @Column({ name: 'fecha_hora_checkin', type: 'timestamptz', nullable: true })
  fecha_hora_checkin: Date;

  @Column({ name: 'ubicacion', length: 150, nullable: true })
  ubicacion: string;

  @Column({ name: 'responsable_id', type: 'uuid', nullable: true })
  responsable_id: string;

  @Column({ name: 'documentacion_validada', type: 'boolean', nullable: false, default: false })
  documentacion_validada: boolean;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones: string;

  @Column({ name: 'evidencias', type: 'jsonb', nullable: true })
  evidencias: Record<string, any>;

  @Column({ name: 'node_id', type: 'uuid', nullable: true })
  node_id: string;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  correlation_id: string;

  @Column({ name: 'trace_id', type: 'uuid', nullable: true })
  trace_id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
EOF
echo "ok"