import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

@Entity({ name: 'contrato_promociones', schema: 'schema_paquetes' })
export class ContratoPromociones {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proveedor_codigo', type: 'varchar', length: 50, unique: true })
  proveedorCodigo: string; // ej: 'NODE_ATR_DILAN', 'NODE_AUT_LOCAL', etc.

  @Column({ type: 'varchar', length: 30 })
  vertical: string;

  @Column({ name: 'permite_promociones', type: 'boolean', default: true })
  permitePromociones: boolean;

  @Column('numeric', {
    name: 'descuento_maximo_pct',
    precision: 5,
    scale: 2,
    default: 15.00,
    transformer: new ColumnNumericTransformer(),
  })
  descuentoMaximoPct: number;

  @Column('text', { name: 'destinos_habilitados', array: true, default: [] })
  destinosHabilitados: string[];

  @Column({ name: 'vigencia_hasta', type: 'date', default: '2026-12-31' })
  vigenciaHasta: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
