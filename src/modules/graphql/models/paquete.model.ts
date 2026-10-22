import { ObjectType, Field, Float, ID } from '@nestjs/graphql';

@ObjectType('PaqueteItemDetalle')
export class PaqueteItemDetalleModel {
  @Field(() => ID)
  id: string;

  @Field()
  vertical: string;

  @Field()
  external_service_id: string;

  @Field()
  nombre_servicio: string;

  @Field(() => Float)
  precio_unitario: number;
}

@ObjectType('PaqueteCombo')
export class PaqueteComboModel {
  @Field(() => ID)
  id: string;

  @Field()
  nombre: string;

  @Field({ nullable: true })
  descripcion?: string;

  @Field()
  destino: string;

  @Field(() => Float)
  precio_total_original: number;

  @Field(() => Float)
  descuento_porcentaje: number;

  @Field(() => Float)
  precio_final_paquete: number;

  @Field()
  estado: string;

  @Field(() => [PaqueteItemDetalleModel], { nullable: true })
  items?: PaqueteItemDetalleModel[];
}
