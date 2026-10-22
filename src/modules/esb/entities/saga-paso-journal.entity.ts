import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity({ name: 'saga_pasos_journal', schema: 'schema_auditoria' })
export class SagaPasoJournal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'saga_id', type: 'uuid' })
  sagaId: string;

  @Column({ name: 'orden_ejecucion', type: 'int' })
  ordenEjecucion: number;

  @Column({ name: 'servicio_nombre', type: 'varchar', length: 60 })
  servicioNombre: string;

  @Column({ type: 'varchar', length: 100 })
  operacion: string;

  @Column({ name: 'endpoint_invocado', type: 'text' })
  endpointInvocado: string;

  @Column('jsonb', { name: 'payload_enviado', nullable: true })
  payloadEnviado: any;

  @Column('jsonb', { name: 'respuesta_recibida', nullable: true })
  respuestaRecibida: any;

  @Column({ name: 'estado_paso', type: 'varchar', length: 30, default: 'SUCCESS' })
  estadoPaso: string; // 'SUCCESS', 'FAILED', 'COMPENSATED'

  @Column({ name: 'compensacion_endpoint', type: 'text', nullable: true })
  compensacionEndpoint: string;

  @Column('jsonb', { name: 'compensacion_payload', nullable: true })
  compensacionPayload: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
