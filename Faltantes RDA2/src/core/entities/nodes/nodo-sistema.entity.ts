import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Nodo Sistema - Representa página web individual conectada a Booking
 * Auditoría de servicios con foco rojo/verde. Conectar/desconectar páginas web.
 */
export enum EstadoConexion {
  CONECTADO = 'conectado',
  DESCONECTADO = 'desconectado',
  MANTENIMIENTO = 'mantenimiento',
  ERROR = 'error',
  DESCONOCIDO = 'desconocido',
}

export enum EstadoOperativo {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  BLOQUEADO = 'bloqueado',
}

export enum TipoOrigen {
  INTERNO = 'interno',
  PARTNER = 'partner',
  TERCERO = 'tercero',
}

@Entity({ name: 'nodos_sistema' })
export class NodoSistema {
  @PrimaryGeneratedColumn('uuid')
  node_id: string;

  @Column({ name: 'node_code', length: 50, unique: true, nullable: false })
  node_code: string;

  @Column({ name: 'nombre', length: 120, nullable: false })
  nombre: string;

  @Column({ name: 'url_base', length: 500, unique: true, nullable: false })
  url_base: string;

  @Column({
    name: 'tipo_origen',
    type: 'enum',
    enum: TipoOrigen,
    nullable: false,
    default: TipoOrigen.INTERNO,
  })
  tipo_origen: TipoOrigen;

  @Column({
    name: 'estado_conexion',
    type: 'enum',
    enum: EstadoConexion,
    nullable: false,
    default: EstadoConexion.DESCONOCIDO,
  })
  estado_conexion: EstadoConexion;

  @Column({
    name: 'estado_operativo',
    type: 'enum',
    enum: EstadoOperativo,
    nullable: false,
    default: EstadoOperativo.ACTIVO,
  })
  estado_operativo: EstadoOperativo;

  @Column({ name: 'grpc_endpoint', length: 500, nullable: true })
  grpc_endpoint: string;

  @Column({ name: 'health_check_url', length: 500, nullable: true })
  health_check_url: string;

  @Column({ name: 'ultimo_heartbeat', type: 'timestamptz', nullable: true })
  ultimo_heartbeat: Date;

  @Column({ name: 'heartbeat_interval_ms', type: 'int', nullable: false, default: 30000 })
  heartbeat_interval_ms: number;

  @Column({ name: 'timeout_ms', type: 'int', nullable: false, default: 5000 })
  timeout_ms: number;

  @Column({ name: 'latencia_ms', type: 'int', nullable: true })
  latencia_ms: number;

  @Column({ name: 'intentos_fallidos', type: 'int', nullable: false, default: 0 })
  intentos_fallidos: number;

  @Column({ name: 'umbral_fallos', type: 'int', nullable: false, default: 3 })
  umbral_fallos: number;

  @Column({ name: 'version_conector', length: 20, nullable: true })
  version_conector: string;

  @Column({ name: 'capabilities', type: 'jsonb', nullable: true })
  capabilities: string[];

  @Column({ name: 'config', type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @Column({ name: 'activo', type: 'boolean', nullable: false, default: true })
  activo: boolean;

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