import { ObjectType, Field, Float, ID, Int } from '@nestjs/graphql';

@ObjectType('ReservaUnificada')
export class ReservaUnificadaModel {
  @Field(() => ID)
  id: string;

  @Field()
  vertical: string;

  @Field()
  estado: string;

  @Field(() => Float)
  total: number;

  @Field({ nullable: true })
  fecha?: string;

  @Field({ nullable: true })
  hora?: string;

  @Field({ nullable: true })
  titular_nombre?: string;

  @Field({ nullable: true })
  titular_email?: string;

  @Field({ nullable: true })
  codigo_checkin?: string;

  @Field({ nullable: true })
  voucher_qr_payload?: string;

  @Field({ nullable: true })
  habitacion_asignada?: string;

  @Field({ nullable: true })
  clave_acceso_digital?: string;

  @Field({ nullable: true })
  asiento_asignado?: string;

  @Field({ nullable: true })
  km_salida?: number;

  @Field({ nullable: true })
  km_retorno?: number;

  @Field({ nullable: true })
  created_at?: string;
}

@ObjectType('AggregateBookingResponse')
export class AggregateBookingResponseModel {
  @Field()
  cliente_id: string;

  @Field(() => Int)
  total_reservas_activas: number;

  @Field(() => [ReservaUnificadaModel])
  reservas: ReservaUnificadaModel[];
}
