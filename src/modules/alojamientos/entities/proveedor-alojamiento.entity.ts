import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Sistema externo que sincroniza alojamientos con una API key. */
@Entity({ name: 'proveedores_alojamiento', schema: 'schema_alojamientos' })
export class ProveedorAlojamiento {
  @PrimaryColumn({ type: 'varchar', length: 60 })
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ name: 'email_contacto', type: 'varchar', length: 150, nullable: true })
  emailContacto?: string | null;

  /** SHA-256 (hex) de la API key: la clave en claro nunca se guarda. */
  @Column({ name: 'api_key_hash', type: 'char', length: 64, nullable: true, select: true })
  apiKeyHash?: string | null;

  @Column({ name: 'api_key_prefijo', type: 'varchar', length: 16, nullable: true })
  apiKeyPrefijo?: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'ultimo_uso', type: 'timestamp', nullable: true })
  ultimoUso?: Date | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamp' })
  updatedAt: Date;
}
