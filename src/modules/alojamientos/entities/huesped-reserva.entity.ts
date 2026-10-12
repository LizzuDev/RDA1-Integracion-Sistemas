import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Persona que se aloja en una reserva: el titular y sus acompañantes. */
@Entity('huespedes_reserva')
export class HuespedReserva {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reserva_id', type: 'uuid' })
  reservaId: string;

  @Column({ type: 'smallint' })
  orden: number;

  @Column({ name: 'es_titular', type: 'boolean', default: false })
  esTitular: boolean;

  @Column({ type: 'varchar', length: 10, default: 'ADULTO' })
  tipo: 'ADULTO' | 'NINO';

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  apellido: string;

  @Column({ type: 'smallint', nullable: true })
  edad?: number | null;

  @Column({ name: 'documento_tipo', type: 'varchar', length: 20, nullable: true })
  documentoTipo?: string | null;

  @Column({ name: 'documento_numero', type: 'varchar', length: 30, nullable: true })
  documentoNumero?: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  nacionalidad?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono?: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  createdAt: Date;
}
