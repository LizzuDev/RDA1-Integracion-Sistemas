import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity({ name: 'saga_transacciones', schema: 'schema_auditoria' })
export class SagaTransaccion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'correlation_id', type: 'varchar', length: 64, unique: true })
  correlationId: string;

  @Column({ name: 'saga_nombre', type: 'varchar', length: 100, default: 'SAGA_CHECKOUT_COMPUESTO' })
  sagaNombre: string;

  @Column({ type: 'varchar', length: 30, default: 'IN_PROGRESS' })
  estado: string; // 'IN_PROGRESS', 'COMPLETED', 'COMPENSATING', 'FAILED'

  @Column({ name: 'pasos_totales', type: 'int', default: 4 })
  pasosTotales: number;

  @Column({ name: 'paso_actual', type: 'int', default: 1 })
  pasoActual: number;

  @Column({ name: 'error_detalle', type: 'text', nullable: true })
  errorDetalle: string;

  @Column({ name: 'codigo_compensacion', type: 'varchar', length: 64, nullable: true })
  codigoCompensacion: string; // ej. 'REF-SAGA-XXXXXX'

  @CreateDateColumn({ name: 'iniciada_at', type: 'timestamptz' })
  iniciadaAt: Date;

  @Column({ name: 'finalizada_at', type: 'timestamptz', nullable: true })
  finalizadaAt: Date;
}
