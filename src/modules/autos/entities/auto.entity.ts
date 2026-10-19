import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

export enum EstadoVehiculo {
  DISPONIBLE = 'DISPONIBLE',
  RESERVADO = 'RESERVADO',
  ENTREGADO = 'ENTREGADO',
  EN_LIMPIEZA = 'EN_LIMPIEZA'
}

@Entity('autos')
export class Auto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplier_name: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 50.00 })
  price: number;

  @Column('jsonb', { nullable: true })
  vehicle_info: {
    category: string;
    type: string;
    transmission: string;
    fuel: string;
    air_conditioning: boolean;
    doors: number;
    seats: number;
    bags: number;
    marca?: string;
    modelo?: string;
    politica_combustible?: string;
    kilometraje_ilimitado?: boolean;
    deposito_garantia?: number;
  };

  @Column('jsonb', { nullable: true })
  images: string[];

  @Column({ type: 'boolean', default: true })
  available: boolean;

  // Ciclo de vida estricto y Cooldown 2 Horas (Consideraciones RDA2 §5)
  @Column({ type: 'varchar', length: 50, default: 'DISPONIBLE', nullable: true })
  estado: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  disponible_desde: Date;

  // Gestión de Mantenimiento Preventivo (Consideraciones RDA2 §5)
  @Column({ type: 'int', default: 5000, nullable: true })
  kilometraje_actual: number;

  @Column({ type: 'int', default: 10000, nullable: true })
  proximo_mantenimiento_km: number;

  @Column({ type: 'boolean', default: false, nullable: true })
  mantenimiento_requerido: boolean;

  @Column({ type: 'int', default: 100, nullable: true })
  nivel_combustible_actual: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
