import { InputType, Field, ObjectType, Float } from '@nestjs/graphql';

@InputType('CheckInInputGql')
export class CheckInInputGql {
  @Field()
  vertical: string;

  @Field()
  reservaId: string;

  @Field({ nullable: true })
  qrCode?: string;

  @Field({ nullable: true })
  licenciaConductor?: string;

  @Field(() => Float, { nullable: true })
  kmSalida?: number;

  @Field(() => Float, { nullable: true })
  kmLlegada?: number;

  @Field({ nullable: true })
  tipoCheckinAuto?: string; // 'ENTREGA' | 'DEVOLUCION'
}

@ObjectType('CheckInResult')
export class CheckInResultModel {
  @Field()
  success: boolean;

  @Field()
  vertical: string;

  @Field()
  reservaId: string;

  @Field()
  mensaje: string;

  @Field({ nullable: true })
  voucherQrBase64?: string;

  @Field({ nullable: true })
  habitacionAsignada?: string;

  @Field({ nullable: true })
  claveAccesoDigital?: string;

  @Field({ nullable: true })
  asientoAsignado?: string;

  @Field({ nullable: true })
  codigoAcceso?: string;
}
