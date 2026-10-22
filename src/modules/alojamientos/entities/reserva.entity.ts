import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

@Entity({ name: 'alojamientos_reservas', schema: 'schema_alojamientos' })
export class ReservaAlojamiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'codigo_reserva', type: 'varchar', length: 50, unique: true })
  codigoReserva: string;

  @Column({ name: 'alojamiento_id', type: 'varchar', length: 50 })
  alojamientoId: string;

  @Column({ name: 'cliente_nombre', type: 'varchar', length: 150 })
  customerName: string;

  @Column({ name: 'cliente_email', type: 'varchar', length: 150, nullable: true })
  customerEmail?: string;

  @Column({ name: 'fecha_inicio', type: 'date' })
  checkin: string;

  @Column({ name: 'fecha_fin', type: 'date' })
  checkout: string;

  @Column({ name: 'noches', type: 'int', default: 1 })
  noches: number;

  @Column({ name: 'huespedes', type: 'int', default: 1 })
  huespedes: number;

  @Column({ name: 'habitaciones_count', type: 'int', default: 1 })
  habitacionesCount: number;

  @Column('numeric', {
    name: 'total',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  total: number;

  @Column('jsonb', { name: 'total_price', nullable: true })
  totalPrice?: { currency: string; total: number };

  @Column({ name: 'estado', type: 'varchar', length: 50, default: 'CONFIRMED' })
  status: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, unique: true, nullable: true })
  idempotencyKey?: string;

  /** Usuario de Supabase Auth que reservó (FK a auth.users). NULL = sin sesión. */
  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId?: string | null;

  @Column({ name: 'tipo_habitacion_id', type: 'uuid' })
  tipoHabitacionId: string;

  @Column({ type: 'smallint', default: 1 })
  adultos: number;

  @Column({ type: 'smallint', default: 0 })
  ninos: number;

  /** Tarifa por noche y habitación contratada: no cambia si luego cambia el precio. */
  @Column('numeric', { name: 'precio_noche', precision: 10, scale: 2, transformer: new ColumnNumericTransformer() })
  precioNoche: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  moneda: string;

  @Column({ name: 'cliente_telefono', type: 'varchar', length: 30, nullable: true })
  telefono?: string | null;

  @Column({ name: 'peticiones_especiales', type: 'text', nullable: true })
  peticionesEspeciales?: string | null;

  @Column({ name: 'hora_llegada', type: 'varchar', length: 20, nullable: true })
  horaLlegada?: string | null;

  @Column({ name: 'motivo_cancelacion', type: 'varchar', length: 500, nullable: true })
  motivoCancelacion?: string | null;

  @Column({ name: 'cancelada_en', type: 'timestamp', nullable: true })
  canceladaEn?: Date | null;

  @Column({ name: 'habitacion_asignada', type: 'varchar', length: 20, nullable: true })
  habitacionAsignada?: string | null;

  @Column({ name: 'clave_acceso_digital', type: 'varchar', length: 30, nullable: true })
  claveAccesoDigital?: string | null;

  @Column({ name: 'checkin_liberado_a_las_14', type: 'boolean', default: false })
  checkinLiberadoALas14: boolean;

  @Column({ name: 'checkin_completado_at', type: 'timestamptz', nullable: true })
  checkinCompletadoAt?: Date | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
