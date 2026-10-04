import {
  Column,
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

@Entity('alojamientos')
export class Alojamiento {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'tipo_propiedad', type: 'varchar', length: 100, default: 'Hotel / Resort' })
  tipoPropiedad: string;

  @Column({ name: 'tipo_alojamiento', type: 'varchar', length: 100, default: 'Habitación privada' })
  tipoAlojamiento: string;

  @Column({ type: 'varchar', length: 100 })
  destino: string;

  @Column('numeric', {
    name: 'precio_noche',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  precioPorNoche: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  moneda: string;

  @Column({ name: 'capacidad_adultos', type: 'int', default: 2 })
  capacidadAdultos: number;

  @Column({ name: 'capacidad_ninos', type: 'int', default: 0 })
  capacidadNinos: number;

  @Column({ type: 'int', default: 1 })
  habitaciones: number;

  @Column({ type: 'int', default: 1 })
  camas: number;

  @Column('numeric', {
    name: 'banos',
    precision: 3,
    scale: 1,
    default: 1.0,
    transformer: new ColumnNumericTransformer(),
  })
  banos: number;

  @Column({ name: 'tiene_piscina', type: 'boolean', default: false })
  tienePiscina: boolean;

  @Column('jsonb', { nullable: true, default: () => "'[]'::jsonb" })
  photos: { url: string; caption?: string }[];

  @Column('jsonb', { nullable: true, default: () => "'[]'::jsonb" })
  amenidades: string[];

  @Column('jsonb', { nullable: true, default: () => "'{}'::jsonb" })
  host: {
    id?: string;
    nombre?: string;
    tiempo_respuesta?: string;
    es_superhost?: boolean;
    foto_perfil?: string;
  };

  @Column('jsonb', { nullable: true, default: () => "'{}'::jsonb" })
  ratings: {
    score?: number;
    limpieza?: number;
    ubicacion?: number;
    servicio?: number;
    number_of_reviews?: number;
  };

  @Column('jsonb', { nullable: true, default: () => "'{}'::jsonb" })
  ubicacion: {
    address?: string;
    city?: string;
    country?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
