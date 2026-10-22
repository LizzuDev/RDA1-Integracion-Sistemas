import { ObjectType, Field, Float, ID } from '@nestjs/graphql';

@ObjectType('CatalogoItem')
export class CatalogoItemModel {
  @Field(() => ID)
  id: string;

  @Field()
  vertical: string;

  @Field()
  nombre: string;

  @Field({ nullable: true })
  descripcion?: string;

  @Field({ nullable: true })
  destino?: string;

  @Field(() => Float)
  precio: number;

  @Field(() => Boolean)
  disponible: boolean;

  @Field({ nullable: true })
  imagen_url?: string;

  @Field({ nullable: true })
  categoria?: string;

  @Field(() => Float, { nullable: true })
  rating?: number;

  @Field({ nullable: true })
  metadata_json?: string;
}
