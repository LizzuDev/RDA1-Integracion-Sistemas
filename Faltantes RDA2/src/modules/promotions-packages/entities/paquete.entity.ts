import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoPaquete {
  FLEXIBLE = 'flexible',
  PREDEFINIDO = 'predefinido',
  PERSONALIZADO = 'personalizado',
}

export enum EstadoPaquete {
  BORRADOR = 'borrador',
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  EXPIRADO = 'expirado',
  ANULADO = 'anulado',
}

@Entity({ name: 'paquete' })
export class Paquete {
  @PrimaryGeneratedColumn('uuid')
  paquete_id: string;

  @Column({ name: 'codigo_paquete', length: 50, unique: true, nullable: false })
  codigo_paquete: string;

  @Column({ name: 'nombre', length: 150, nullable: false })
  nombre: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string;

  @Column({
    name: 'tipo_paquete',
    type: 'enum',
    enum: TipoPaquete,
    nullable: false,
    default: TipoPaquete.PREDEFINIDO,
  })
  tipo_paquete: TipoPaquete;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoPaquete,
    nullable: false,
    default: EstadoPaquete.BORRADOR,
  })
  estado: EstadoPaquete;

  @Column({ name: 'partner_id', type: 'uuid', nullable: true })
  partner_id: string;

  @Column({ name: 'precio_base_total', type: 'decimal', precision: 12, scale: 2, nullable: false, default: 0 })
  precio_base_total: number;

  @Column({ name: 'precio_paquete', type: 'decimal', precision: 12, scale: 2, nullable: false, default: 0 })
  precio_paquete: number;

  @Column({ name: 'pct_descuento_aplicado', type: 'decimal', precision: 5, scale: 2, nullable: false, default: 0 })
  pct_descuento_aplicado: number;

  @Column({ name: 'ahorro_total', type: 'decimal', precision: 12, scale: 2, nullable: false, default: 0 })
  ahorro_total: number;

  @Column({ name: 'moneda', length: 3, nullable: false, default: 'USD' })
  moneda: string;

  @Column({ name: 'valido_desde', type: 'timestamptz', nullable: true })
  valido_desde: Date;

  @Column({ name: 'valido_hasta', type: 'timestamptz', nullable: true })
  valido_hasta: Date;

  @Column({ name: 'requiere_contrato_vigente', type: 'boolean', nullable: false, default: true })
  requiere_contrato_vigente: boolean;

  @Column({ name: 'search_criteria', type: 'jsonb', nullable: true })
  search_criteria: Record<string, any>;

  @Column({ name: 'configuracion', type: 'jsonb', nullable: true })
  configuracion: Record<string, any>;

  @Column({ name: 'node_id', type: 'uuid', nullable: true })
  node_id: string;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: false })
  correlation_id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by: string;
}
EOF
echo "ok"