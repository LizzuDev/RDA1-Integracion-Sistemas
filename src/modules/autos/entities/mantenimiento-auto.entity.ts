import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('autos_mantenimiento_bitacora')
export class MantenimientoAuto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  autoId: string;

  @Column({ type: 'varchar', length: 100 })
  tecnicoId: string;

  @Column({ type: 'int' })
  kilometrajeRegistrado: number;

  @Column({ type: 'int', default: 100 })
  nivelCombustible: number;

  @Column({ type: 'text', nullable: true })
  condicionesCarroceria: string;

  @Column({ type: 'varchar', length: 50, default: 'BUENO' })
  estadoNeumaticos: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'boolean', default: false })
  mantenimientoRealizado: boolean;

  @Column({ type: 'int', nullable: true })
  proximoMantenimientoKm: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
