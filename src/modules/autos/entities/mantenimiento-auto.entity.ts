import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

@Entity({ name: 'autos_mantenimientos', schema: 'schema_autos' })
export class MantenimientoAuto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'auto_id', type: 'uuid' })
  autoId: string;

  @Column({ name: 'tipo_mantenimiento', type: 'varchar', length: 100, default: 'Mantenimiento Preventivo (Cambio de aceite y frenos)' })
  tipoMantenimiento: string;

  @Column({ name: 'kilometraje_servicio', type: 'int', default: 15000 })
  kilometrajeServicio: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column('numeric', {
    precision: 10,
    scale: 2,
    default: 0.00,
    transformer: new ColumnNumericTransformer(),
  })
  costo: number;

  @Column({ name: 'tecnico_responsable', type: 'varchar', length: 120, default: 'Taller Central Quito' })
  tecnicoResponsable: string;

  @Column({ name: 'fecha_ingreso', type: 'timestamptz', default: () => 'NOW()' })
  fechaIngreso: Date;

  @Column({ name: 'fecha_salida', type: 'timestamptz', nullable: true })
  fechaSalida: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Compatibilidad
  get tecnicoId(): string {
    return this.tecnicoResponsable;
  }
  set tecnicoId(val: string) {
    this.tecnicoResponsable = val;
  }

  get kilometrajeRegistrado(): number {
    return this.kilometrajeServicio;
  }
  set kilometrajeRegistrado(val: number) {
    this.kilometrajeServicio = val;
  }
}
