import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum NivelCombustible {
  VACIO = 'vacio',
  CUARTO = '1/4',
  MEDIO = '1/2',
  TRES_CUARTOS = '3/4',
  LLENO = 'lleno',
}

export enum PrioridadMto {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica',
}

@Entity({ name: 'ingreso_mantenimiento' })
export class IngresoMantenimiento {
  @PrimaryGeneratedColumn('uuid')
  ingreso_id: string;

  @Column({ name: 'auto_id', type: 'uuid', nullable: false })
  auto_id: string;

  @Column({ name: 'orden_mto_id', type: 'uuid', nullable: true })
  orden_mto_id: string;

  @Column({ name: 'fecha_hora_ingreso', type: 'timestamptz', nullable: false })
  fecha_hora_ingreso: Date;

  @Column({ name: 'ingresado_por_id', type: 'uuid', nullable: false })
  ingresado_por_id: string;

  @Column({ name: 'km_ingreso', type: 'decimal', precision: 12, scale: 1, nullable: false })
  km_ingreso: number;

  @Column({
    name: 'nivel_combustible',
    type: 'enum',
    enum: NivelCombustible,
    nullable: true,
  })
  nivel_combustible: NivelCombustible;

  @Column({ name: 'caracteristicas_llegada', type: 'text', nullable: false })
  caracteristicas_llegada: string;

  @Column({ name: 'danios_reportados', type: 'jsonb', nullable: true })
  danios_reportados: any;

  @Column({ name: 'partes_afectadas', type: 'jsonb', nullable: true })
  partes_afectadas: any;

  @Column({ name: 'observaciones_tecnico', type: 'text', nullable: true })
  observaciones_tecnico: string;

  @Column({ name: 'evidencias', type: 'jsonb', nullable: true })
  evidencias: any;

  @Column({ name: 'tiene_averia', type: 'boolean', nullable: false, default: false })
  tiene_averia: boolean;

  @Column({
    name: 'prioridad',
    type: 'enum',
    enum: PrioridadMto,
    nullable: false,
    default: PrioridadMto.MEDIA,
  })
  prioridad: PrioridadMto;

  @Column({ name: 'node_id', type: 'uuid', nullable: true })
  node_id: string;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  correlation_id: string;

  @Column({ name: 'trace_id', type: 'uuid', nullable: true })
  trace_id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string;
}
EOF
echo "ok"