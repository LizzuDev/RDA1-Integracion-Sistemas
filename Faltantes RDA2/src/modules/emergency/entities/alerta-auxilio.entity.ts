import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum EstadoAlertaAuxilio {
  ABIERTA = 'abierta',
  ASIGNADA = 'asignada',
  EN_DESPLAZAMIENTO = 'en_desplazamiento',
  ATENDIDA = 'atendida',
  CERRADA = 'cerrada',
  FALSA_ALARMA = 'falsa_alarma',
}

export enum ClasificacionAlerta {
  VERDADERA = 'verdadera',
  FALSA_ALARMA = 'falsa_alarma',
  PRUEBA = 'prueba',
  REQUIERE_INVESTIGACION = 'requiere_investigacion',
}

@Entity({ name: 'alerta_auxilio_bus' })
export class AlertaAuxilioBus {
  @PrimaryGeneratedColumn('uuid')
  alerta_id: string;

  @Column({ name: 'bus_id', type: 'uuid', nullable: false })
  bus_id: string;

  @Column({ name: 'placa', length: 20, nullable: false })
  placa: string;

  @Column({ name: 'linea', length: 50, nullable: true })
  linea: string;

  @Column({ name: 'ruta', length: 150, nullable: true })
  ruta: string;

  @Column({ name: 'latitud', type: 'decimal', precision: 9, scale: 6, nullable: false })
  latitud: number;

  @Column({ name: 'longitud', type: 'decimal', precision: 9, scale: 6, nullable: false })
  longitud: number;

  @Column({ name: 'velocidad_kmh', type: 'decimal', precision: 5, scale: 2, nullable: true })
  velocidad_kmh: number;

  @Column({ name: 'timestamp_activacion', type: 'timestamptz', nullable: false })
  timestamp_activacion: Date;

  @Column({ name: 'camaras_vinculadas', type: 'jsonb', nullable: true })
  camaras_vinculadas: string[];

  @Column({ name: 'video_clip_id', type: 'uuid', nullable: true })
  video_clip_id: string;

  @Column({
    name: 'estado_alerta',
    type: 'enum',
    enum: EstadoAlertaAuxilio,
    nullable: false,
    default: EstadoAlertaAuxilio.ABIERTA,
  })
  estado_alerta: EstadoAlertaAuxilio;

  @Column({ name: 'autoridades_notificadas', type: 'jsonb', nullable: true })
  autoridades_notificadas: any[];

  @Column({ name: 'revisor_humano_id', type: 'uuid', nullable: true })
  revisor_humano_id: string;

  @Column({
    name: 'clasificacion',
    type: 'enum',
    enum: ClasificacionAlerta,
    nullable: true,
  })
  clasificacion: ClasificacionAlerta;

  @Column({ name: 'justificacion_clasificacion', type: 'text', nullable: true })
  justificacion_clasificacion: string;

  @Column({ name: 'risk_score', type: 'int', nullable: true })
  risk_score: number;

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