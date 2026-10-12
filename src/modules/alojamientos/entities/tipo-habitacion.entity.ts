import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

export const REGIMENES = ['SOLO_ALOJAMIENTO', 'DESAYUNO', 'MEDIA_PENSION', 'PENSION_COMPLETA', 'TODO_INCLUIDO'] as const;
export type Regimen = (typeof REGIMENES)[number];

/**
 * Tipo de habitación de un alojamiento (doble, suite…), con su propio precio,
 * capacidad, régimen y cupo, como las "room types" de Booking. Una reserva
 * siempre es de un tipo concreto.
 */
@Entity('tipos_habitacion')
export class TipoHabitacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'alojamiento_id', type: 'varchar', length: 50 })
  alojamientoId: string;

  /** Identificador estable dentro del alojamiento (lo usan los proveedores al sincronizar). */
  @Column({ type: 'varchar', length: 60 })
  codigo: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;

  @Column({ name: 'capacidad_adultos', type: 'smallint', default: 2 })
  capacidadAdultos: number;

  @Column({ name: 'capacidad_ninos', type: 'smallint', default: 0 })
  capacidadNinos: number;

  @Column({ type: 'smallint', default: 1 })
  camas: number;

  @Column({ name: 'descripcion_camas', type: 'varchar', length: 150, nullable: true })
  descripcionCamas?: string | null;

  @Column('numeric', { name: 'tamano_m2', precision: 6, scale: 1, nullable: true, transformer: new ColumnNumericTransformer() })
  tamanoM2?: number | null;

  @Column('numeric', { name: 'precio_noche', precision: 10, scale: 2, transformer: new ColumnNumericTransformer() })
  precioNoche: number;

  /** Habitaciones de este tipo que se venden por noche. */
  @Column({ type: 'smallint', default: 1 })
  cantidad: number;

  @Column({ type: 'varchar', length: 20, default: 'SOLO_ALOJAMIENTO' })
  regimen: Regimen;

  /** Horas antes de la llegada con cancelación gratuita. NULL = no reembolsable. */
  @Column({ name: 'cancelacion_gratuita_horas', type: 'smallint', nullable: true, default: 48 })
  cancelacionGratuitaHoras: number | null;

  @Column('jsonb', { default: () => "'[]'::jsonb" })
  amenidades: string[];

  @Column('jsonb', { default: () => "'[]'::jsonb" })
  photos: { url: string; caption?: string }[];

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'smallint', default: 1 })
  orden: number;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamp' })
  updatedAt: Date;
}
