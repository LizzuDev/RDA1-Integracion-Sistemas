import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity({ name: 'clientes', schema: 'schema_clientes' })
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150, nullable: true })
  nombre: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column('text', { nullable: true })
  password_hash: string;

  @Column({ length: 20, nullable: true })
  cedula_ruc: string;

  @Column({ length: 30, nullable: true })
  telefono: string;

  @Column('text', { nullable: true })
  direccion: string;

  @Column({ length: 60, default: 'Ecuador' })
  pais: string;

  @Column('text', { default: 'CLIENTE' })
  rol: string;

  @Column('text', { default: 'ACTIVO' })
  estado: string;

  @Column('text', { nullable: true })
  refresh_token_hash: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date;
}
