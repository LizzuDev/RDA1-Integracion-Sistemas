import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'contrato_promociones' })
export class ContratoPromociones {
  @PrimaryGeneratedColumn('uuid')
  contrato_id: string;

  @Column({ name: 'partner_id', type: 'uuid', nullable: false })
  partner_id: string;

  @Column({ name: 'acepta_promociones', type: 'boolean', nullable: false, default: false })
  acepta_promociones: boolean;

  @Column({ name: 'pct_max_descuento', type: 'decimal', precision: 5, scale: 2, nullable: false, default: 0.00 })
  pct_max_descuento: number;

  @Column({ name: 'fecha_aceptacion', type: 'timestamptz', nullable: false })
  fecha_aceptacion: Date;

  @Column({ name: 'vigente', type: 'boolean', nullable: false, default: true })
  vigente: boolean;

  @Column({ name: 'usuario_acepta_id', type: 'uuid', nullable: false })
  usuario_acepta_id: string;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones: string;

  @Column({ name: 'version', type: 'int', nullable: false, default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by: string;
}
EOF
echo "ok"