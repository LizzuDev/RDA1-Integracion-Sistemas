import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

@Entity({ name: 'paquete_items', schema: 'schema_paquetes' })
export class PaqueteItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'paquete_id', type: 'uuid' })
  paqueteId: string;

  @Column({ type: 'varchar', length: 30 })
  vertical: string; // 'ATRACCIONES', 'AUTOS', 'ALOJAMIENTOS', 'VUELOS'

  @Column({ name: 'item_referencia_id', type: 'varchar', length: 64 })
  itemReferenciaId: string;

  @Column({ name: 'nombre_item', type: 'varchar', length: 255 })
  nombreItem: string;

  @Column('numeric', {
    name: 'precio_individual',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  precioIndividual: number;

  @Column('numeric', {
    name: 'descuento_aplicado_pct',
    precision: 5,
    scale: 2,
    default: 10.00,
    transformer: new ColumnNumericTransformer(),
  })
  descuentoAplicadoPct: number;

  @Column('numeric', {
    name: 'precio_con_descuento',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  precioConDescuento: number;

  @Column('jsonb', { name: 'detalles_json', nullable: true })
  detallesJson: any;
}
