import { InputType, Field, Float, ObjectType, Int } from '@nestjs/graphql';

@InputType('CheckoutItemInput')
export class CheckoutItemInput {
  @Field()
  vertical: string;

  @Field()
  itemId: string;

  @Field()
  nombre: string;

  @Field(() => Int)
  cantidad: number;

  @Field(() => Float)
  precioUnitario: number;

  @Field({ nullable: true })
  detallesReservaJson?: string;
}

@InputType('CheckoutSagaInputGql')
export class CheckoutSagaInputGql {
  @Field({ nullable: true })
  clienteId?: string;

  @Field()
  clienteEmail: string;

  @Field()
  clienteNombre: string;

  @Field({ nullable: true })
  metodoPago?: string;

  @Field({ nullable: true })
  numeroTarjeta?: string;

  @Field(() => [CheckoutItemInput])
  items: CheckoutItemInput[];

  @Field({ nullable: true })
  simularFalloEnPaso?: string;
}

@ObjectType('CheckoutResult')
export class CheckoutResultModel {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  correlationId?: string;

  @Field({ nullable: true })
  codigoCompensacion?: string;

  @Field()
  estado: string;

  @Field({ nullable: true })
  facturaId?: string;

  @Field(() => Float)
  total: number;

  @Field()
  mensaje: string;
}
