import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum TipoAlertaMto {
  KM_UMBRAL = 'km_umbral',
  TIEMPO = 'tiempo',
  VENCIMIENTO = 'vencimiento',
  REVISION_CRITICA = 'revision_critica',
  AVERIA = 'averia',
}

export enum SeveridadAlerta {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum EstadoAlerta {
  ACTIVA = 'activa',
  LEIDA = 'leida',
  ATENDIDA = 'atendida',
  CERRADA = 'cerrada',
}

@Entity({ name: 'alertas_mantenimiento' })
export class AlertasMantenimiento {
  @PrimaryGeneratedColumn('uuid')
  alerta_id: string;

  @Column({ name: 'auto_id', type: 'uuid', nullable: false })
  auto_id: string;

  @Column({
    name: 'tipo_alerta',
    type: 'enum',
    enum: TipoAlertaMto,
    nullable: false,
  })
  tipo_alerta: TipoAlertaMto;

  @Column({
    name: 'severidad',
    type: 'enum',
    enum: SeveridadAlerta,
    nullable: false,
    default: SeveridadAlerta.WARNING,
  })
  severidad: SeveridadAlerta;

  @Column({ name: 'km_actual', type: 'decimal', precision: 12, scale: 1, nullable: true })
  km_actual: number;

  @Column({ name: 'km_umbral_config', type: 'decimal', precision: 12, scale: 1, nullable: true })
  km_umbral_config: number;

  @Column({ name: 'mensaje', type: 'text', nullable: false })
  mensaje: string;

  @Column({
    name: 'estado_alerta',
    type: 'enum',
    enum: EstadoAlerta,
    nullable: false,
    default: EstadoAlerta.ACTIVA,
  })
  estado_alerta: EstadoAlerta;

  @Column({ name: 'fecha_generacion', type: 'timestamptz', nullable: false })
  fecha_generacion: Date;

  @Column({ name: 'atendida_por_id', type: 'uuid', nullable: true })
  atendida_por_id: string;

  @Column({ name: 'fecha_atencion', type: 'timestamptz', nullable: true })
  fecha_atencion: Date;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  correlation_id: string;

  @Column({ name: 'trace_id', type: 'uuid', nullable: true })
  trace_id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
EOF
echo "ok"