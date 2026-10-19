import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoServicioAuto {
  RENTA = 'renta',
  TURISMO = 'turismo',
  UTILITARIO = 'utilitario',
}

export enum EstadoFisicoAuto {
  DISPONIBLE = 'disponible',
  EN_RENTA = 'en_renta',
  EN_MANT = 'en_mant',
  FUERA_SERVICIO = 'fuera_servicio',
  ROBADO = 'robado',
  DESGUACE = 'desguace',
}

@Entity({ name: 'flota_autos' })
export class FlotaAutos {
  @PrimaryGeneratedColumn('uuid')
  auto_id: string;

  @Column({ name: 'placa', length: 20, unique: true, nullable: false })
  placa: string;

  @Column({ name: 'marca', length: 80, nullable: false })
  marca: string;

  @Column({ name: 'modelo', length: 80, nullable: false })
  modelo: string;

  @Column({ name: 'anio', type: 'int', nullable: false })
  anio: number;

  @Column({ name: 'km_actual', type: 'decimal', precision: 12, scale: 1, nullable: false, default: 0 })
  km_actual: number;

  @Column({ name: 'km_ultima_revision', type: 'decimal', precision: 12, scale: 1, nullable: true })
  km_ultima_revision: number;

  @Column({
    name: 'tipo_servicio',
    type: 'enum',
    enum: TipoServicioAuto,
    nullable: false,
    default: TipoServicioAuto.RENTA,
  })
  tipo_servicio: TipoServicioAuto;

  @Column({
    name: 'estado_fisico',
    type: 'enum',
    enum: EstadoFisicoAuto,
    nullable: false,
    default: EstadoFisicoAuto.DISPONIBLE,
  })
  estado_fisico: EstadoFisicoAuto;

  @Column({ name: 'proximo_mantenimiento_km', type: 'decimal', precision: 12, scale: 1, nullable: true })
  proximo_mantenimiento_km: number;

  @Column({ name: 'alerta_km_config', type: 'decimal', precision: 12, scale: 1, nullable: true })
  alerta_km_config: number;

  @Column({ name: 'margen_alerta_km', type: 'decimal', precision: 12, scale: 1, nullable: true, default: 500 })
  margen_alerta_km: number;

  @Column({ name: 'requiere_mantenimiento', type: 'boolean', nullable: false, default: false })
  requiere_mantenimiento: boolean;

  @Column({ name: 'ultima_orden_mto_id', type: 'uuid', nullable: true })
  ultima_orden_mto_id: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by: string;
}
EOF
echo "ok"