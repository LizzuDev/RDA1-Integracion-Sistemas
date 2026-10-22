import { ObjectType, Field, Float, ID, Int } from '@nestjs/graphql';

@ObjectType('FacturaItem')
export class FacturaItemModel {
  @Field(() => ID)
  id: string;

  @Field()
  vertical: string;

  @Field()
  descripcion: string;

  @Field(() => Int)
  cantidad: number;

  @Field(() => Float)
  precio_unitario: number;

  @Field(() => Float)
  subtotal: number;
}

@ObjectType('ClienteFactura')
export class ClienteFacturaModel {
  @Field({ nullable: true })
  nombre?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  cedula_ruc?: string;
}

@ObjectType('FacturaCompleta')
export class FacturaCompletaModel {
  @Field(() => ID)
  id: string;

  @Field()
  numero_factura: string;

  @Field({ nullable: true })
  fecha_emision?: string;

  @Field(() => Float)
  subtotal: number;

  @Field(() => Float)
  iva_15pct: number;

  @Field(() => Float)
  total: number;

  @Field()
  estado: string;

  @Field(() => ClienteFacturaModel, { nullable: true })
  cliente?: ClienteFacturaModel;

  @Field(() => [FacturaItemModel])
  items: FacturaItemModel[];
}
