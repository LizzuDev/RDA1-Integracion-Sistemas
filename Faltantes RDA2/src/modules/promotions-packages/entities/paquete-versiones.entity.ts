import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'paquete_versiones' })
export class PaqueteVersion {
  @PrimaryGeneratedColumn('uuid')
  version_id: string;

  @Column({ name: 'paquete_id', type: 'uuid', nullable: false })
  paquete_id: string;

  @Column({ name: 'numero_version', type: 'int', nullable: false })
  numero_version: number;

  @Column({ name: 'payload_paquete', type: 'jsonb', nullable: false })
  payload_paquete: Record<string, any>;

  @Column({ name: 'motivo_cambio', length: 255, nullable: true })
  motivo_cambio: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  correlation_id: string;
}
EOF
echo "ok"