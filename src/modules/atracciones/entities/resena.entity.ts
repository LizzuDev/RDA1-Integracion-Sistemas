import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

@Entity({ name: 'atracciones_resenas', schema: 'schema_atracciones' })
export class ResenaAtraccion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'atraccion_id', type: 'varchar', length: 64 })
  atraccionId: string;

  @Column({ name: 'cliente_id', type: 'uuid', nullable: true })
  clienteId: string;

  @Column({ name: 'nombre_cliente', type: 'varchar', length: 120, default: 'Visitante' })
  nombreCliente: string;

  @Column({ name: 'pais_origen', type: 'varchar', length: 60, default: 'Ecuador' })
  paisOrigen: string;

  @Column('numeric', {
    name: 'calificacion_general',
    precision: 3,
    scale: 1,
    default: 9.8,
    transformer: new ColumnNumericTransformer(),
  })
  calificacionGeneral: number;

  @Column('numeric', {
    name: 'calificacion_limpieza',
    precision: 3,
    scale: 1,
    default: 9.9,
    transformer: new ColumnNumericTransformer(),
  })
  calificacionLimpieza: number;

  @Column('numeric', {
    name: 'calificacion_servicio',
    precision: 3,
    scale: 1,
    default: 9.8,
    transformer: new ColumnNumericTransformer(),
  })
  calificacionServicio: number;

  @Column('numeric', {
    name: 'calificacion_calidad',
    precision: 3,
    scale: 1,
    default: 9.6,
    transformer: new ColumnNumericTransformer(),
  })
  calificacionCalidad: number;

  @Column({ type: 'text' })
  comentario: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Compatibilidad con código previo
  get usuarioNombre(): string {
    return this.nombreCliente;
  }
  set usuarioNombre(val: string) {
    this.nombreCliente = val;
  }

  get usuarioPais(): string {
    return this.paisOrigen;
  }
  set usuarioPais(val: string) {
    this.paisOrigen = val;
  }

  get usuarioId(): string {
    return this.clienteId;
  }
  set usuarioId(val: string) {
    this.clienteId = val;
  }

  get limpieza(): number {
    return Number(this.calificacionLimpieza);
  }
  set limpieza(val: number) {
    this.calificacionLimpieza = val;
  }

  get servicio(): number {
    return Number(this.calificacionServicio);
  }
  set servicio(val: number) {
    this.calificacionServicio = val;
  }

  get calidad(): number {
    return Number(this.calificacionCalidad);
  }
  set calidad(val: number) {
    this.calificacionCalidad = val;
  }
}
