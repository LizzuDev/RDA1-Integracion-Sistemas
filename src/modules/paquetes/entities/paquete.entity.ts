import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

@Entity({ name: 'paquetes', schema: 'schema_paquetes' })
export class Paquete {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'codigo_paquete', type: 'varchar', length: 50, unique: true })
  codigoPaquete: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ name: 'ciudad_destino', type: 'varchar', length: 100 })
  ciudadDestino: string;

  @Column('numeric', {
    name: 'precio_base_total',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  precioBaseTotal: number;

  @Column('numeric', {
    name: 'descuento_combo_pct',
    precision: 5,
    scale: 2,
    default: 10.00,
    transformer: new ColumnNumericTransformer(),
  })
  descuentoComboPct: number;

  @Column('numeric', {
    name: 'precio_final_paquete',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  precioFinalPaquete: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
