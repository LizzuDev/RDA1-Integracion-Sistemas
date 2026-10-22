import {
  Column,
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

@Entity({ name: 'alojamientos_catalogo', schema: 'schema_alojamientos' })
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

  // ── Integración con proveedores ────────────────────────────────────────────
  // Origen del dato: NULL = alta manual en el panel; si no, el id del proveedor
  // (p. ej. el sistema de Alojamientos de otro grupo) que lo sincroniza.
  @Column({ name: 'proveedor_id', type: 'varchar', length: 60, nullable: true })
  proveedorId?: string | null;

  // Id del alojamiento EN el sistema del proveedor. (proveedor_id, id_externo) es
  // único: reenviar el mismo alojamiento actualiza en vez de duplicar.
  @Column({ name: 'id_externo', type: 'varchar', length: 100, nullable: true })
  idExterno?: string | null;

  // ACTIVO = se muestra y se puede reservar; INACTIVO = oculto en el catálogo
  // público (pausado por el admin o retirado por el proveedor), sin borrar su historial.
  @Column({ type: 'varchar', length: 20, default: 'ACTIVO' })
  estado: 'ACTIVO' | 'INACTIVO';

  // Políticas de la casa: horarios de entrada/salida, cancelación, mascotas, etc.
  @Column('jsonb', { nullable: true })
  politicas?: {
    checkin_desde?: string;
    checkin_hasta?: string;
    checkout_hasta?: string;
    cancelacion?: string;
    mascotas?: boolean;
    fumar?: boolean;
  } | null;

  @Column({ name: 'ultima_sincronizacion', type: 'timestamp', nullable: true })
  ultimaSincronizacion?: Date | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
