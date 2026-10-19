import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('orders_autos')
export class OrderAuto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  autoId: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  idempotencyKey: string;

  @Column({ type: 'varchar', length: 50, default: 'CONFIRMED' })
  status: string; // CONFIRMED, PENDING, CANCELLED, DELIVERED, COMPLETED

  @Column({ type: 'int', default: 3 })
  diasRenta: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pnr: string;

  @Column({ type: 'varchar', length: 50, default: 'BASICA', nullable: true })
  tipoCobertura: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 1200.00, nullable: true })
  depositoGarantia: number;

  @Column('jsonb', { nullable: true })
  totalPrice: { currency: string; total: number };

  @Column('jsonb', { nullable: true })
  booker: { country: string; name?: string; email?: string };

  @Column('jsonb', { nullable: true })
  driver: {
    age: number;
    nombre?: string;
    email?: string;
    telefono?: string;
    licencia?: string;
    pais_licencia?: string;
    numero_vuelo?: string;
  };

  @Column('jsonb', { nullable: true })
  route: any; // pickup and dropoff details

  @Column({ type: 'varchar', length: 50, default: 'PENDING_CHECKIN', nullable: true })
  checkinStatus: string;

  @Column({ type: 'text', nullable: true })
  voucherQrData: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
