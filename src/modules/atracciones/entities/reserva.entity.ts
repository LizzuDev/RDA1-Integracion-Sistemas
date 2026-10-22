import { Column, Entity, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

@Entity({ name: 'atracciones_reservas', schema: 'schema_atracciones' })
export class ReservaAtraccion {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string; // e.g. RES-ATR-XXXXXX o UUID

  @Column({ name: 'idempotency_key', type: 'varchar', length: 64, unique: true })
  idempotencyKey: string;

  @Column({ name: 'atraccion_id', type: 'varchar', length: 64 })
  atraccionId: string;

  @Column({ name: 'turno_id', type: 'uuid', nullable: true })
  turnoId: string;

  @Column({ name: 'cliente_id', type: 'uuid', nullable: true })
  clienteId: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 150 })
  customerName: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 150 })
  customerEmail: string;

  @Column({ name: 'customer_phone', type: 'varchar', length: 30, default: '+593999999999' })
  customerPhone: string;

  @Column({ name: 'document_id', type: 'varchar', length: 30, default: '1700000000' })
  documentId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 15, default: '10:00' })
  time: string;

  @Column({ name: 'adult_count', type: 'int', default: 1 })
  adultCount: number;

  @Column({ name: 'child_count', type: 'int', default: 0 })
  childCount: number;

  @Column({ name: 'senior_count', type: 'int', default: 0 })
  seniorCount: number;

  @Column({ name: 'infant_count', type: 'int', default: 0 })
  infantCount: number;

  @Column({ name: 'ticket_count', type: 'int', default: 1 })
  ticketCount: number;

  @Column('numeric', {
    precision: 10,
    scale: 2,
    default: 55.00,
    transformer: new ColumnNumericTransformer(),
  })
  subtotal: number;

  @Column('numeric', {
    name: 'total_price',
    precision: 10,
    scale: 2,
    default: 55.00,
    transformer: new ColumnNumericTransformer(),
  })
  totalAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 30, default: 'CONFIRMED' })
  status: string; // CONFIRMED, CHECKED_IN, CANCELLED, COMPENSATED

  @Column({ name: 'special_requirements', type: 'text', nullable: true })
  specialRequirements: string;

  @Column({ name: 'voucher_qr_payload', type: 'text', nullable: true })
  voucherQrPayload: string;

  @Column({ name: 'ics_calendar_url', type: 'text', nullable: true })
  icsCalendarUrl: string;

  @Column({ name: 'checkin_at', type: 'timestamptz', nullable: true })
  checkinAt: Date;

  @Column({ name: 'guia_oficial_asignado', type: 'varchar', length: 150, nullable: true })
  guiaOficialAsignado: string;

  @Column({ name: 'motivo_cancelacion', type: 'varchar', length: 255, nullable: true })
  motivoCancelacion: string;

  @Column({ name: 'cancel_code', type: 'varchar', length: 64, nullable: true })
  cancelCode: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Compatibilidad con código previo que usaba totalPrice como objeto { currency, total }
  get totalPrice(): { currency: string; total: number } {
    return {
      currency: this.currency || 'USD',
      total: Number(this.totalAmount !== undefined ? this.totalAmount : 55.00),
    };
  }
  set totalPrice(val: { currency: string; total: number } | number) {
    if (typeof val === 'number') {
      this.totalAmount = val;
    } else if (val && typeof val === 'object') {
      this.totalAmount = val.total || 0;
      if (val.currency) this.currency = val.currency;
    }
  }
}
