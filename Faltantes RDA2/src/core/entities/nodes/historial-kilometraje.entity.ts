import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum MotivoKm {
  SALIDA = 'salida',
  INGRESO_MTO = 'ingreso_mto',
  DEVOLUCION = 'devolucion',
  LECTURA_TECNICA = 'lectura_tecnica',
  AJUSTE_AUTORIZADO = 'ajuste_autorizado',
}

export enum OrigenKm {
  SISTEMA = 'sistema',
  OPERADOR = 'operador',
  TECNICO = 'tecnico',
}

@Entity({ name: 'historial_kilometraje' })
export class HistorialKilometraje {
  @PrimaryGeneratedColumn('uuid')
  hist_id: string;

  @Column({ name: 'auto_id', type: 'uuid', nullable: false })
  auto_id: string;

  @Column({ name: 'km_anterior', type: 'decimal', precision: 12, scale: 1, nullable: false })
  km_anterior: number;

  @Column({ name: 'km_nuevo', type: 'decimal', precision: 12, scale: 1, nullable: false })
  km_nuevo: number;

  @Column({
    name: 'motivo',
    type: 'enum',
    enum: MotivoKm,
    nullable: false,
  })
  motivo: MotivoKm;

  @Column({
    name: 'origen',
    type: 'enum',
    enum: OrigenKm,
    nullable: false,
    default: OrigenKm.SISTEMA,
  })
  origen: OrigenKm;

  @Column({ name: 'registrado_por_id', type: 'uuid', nullable: false })
  registrado_por_id: string;

  @Column({ name: 'justificacion', type: 'text', nullable: true })
  justificacion: string;

  @Column({ name: 'timestamp', type: 'timestamptz', nullable: false })
  timestamp: Date;

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