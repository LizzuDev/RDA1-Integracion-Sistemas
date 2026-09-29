import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { Boleto } from './boleto.entity';
import { Pasajero } from './pasajero.entity';
import { TipoCodigoBarras } from './vuelos.enums';

/**
 * Bloque 5 — Boletos, Check-in, Pases de abordar
 * Tabla: `pase_abordar`
 *
 * `BoardingPass` completo. El borrador 3 del plan la definía con solo 3 FKs
 * (`pab_boletoId`, `pab_asientoId`) y no podía construir la respuesta: le
 * faltaban el segmento, el asiento, el grupo de abordaje y el código de barras.
 *
 * UNIQUE (pab_pasajeroId, pab_segmentId)
 * CHECK (pab_tipoCodigoBarras IN ('AZTEC','PDF417','QR'))
 * CHECK (tipo × longitud de pab_codigoBarras)
 *
 * ## `pab_segmentId` es un identificador de negocio
 * Referencia LÓGICA a `reserva_segmento.rsg_segmentId`. El DDL no declara
 * `REFERENCES`: un pase emitido es histórico y no debe borrarse si cambia el
 * segmento.
 *
 * ## Sobre el contenido de `pab_codigoBarras`
 * Es un `TEXT` que transporta datos binarios codificados por el GDS (BCP-47 /
 * base64) tal cual. NO se decodifica ni se reinterpreta en la capa de
 * persistencia: la vista `vista_pases_abordar` (§5.10) lo expone con
 * `to_json(...)` para que la API lo serialice como `string`, tal y como declara
 * el contrato (`barcode: string`).
 *
 * El `UNIQUE` queda en el DDL: indexa `pab_pasajeroId`, que aquí es una
 * propiedad VIRTUAL vía `@RelationId`.
 */
@Entity({ name: 'pase_abordar' })
export class PaseAbordar {
  /** PK. Generada por PostgreSQL. */
  @PrimaryGeneratedColumn('uuid', { name: 'id_pase_abordar' })
  idPaseAbordar: string;

  /** FK al boleto (`pab_boletoId`). `ON DELETE CASCADE`. */
  @ManyToOne(() => Boleto, (boleto) => boleto.pasesAbordar, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pab_boletoid' })
  boleto: Boleto;

  /** Valor crudo de `pab_boletoId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: PaseAbordar) => entity.boleto)
  boletoId: string;

  /** FK al pasajero (`pab_pasajeroId`), `BoardingPass.passengerId`. */
  @ManyToOne(() => Pasajero, (pasajero) => pasajero.pasesAbordar, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pab_pasajeroid' })
  pasajero: Pasajero;

  /** Valor crudo de `pab_pasajeroId` (virtual; ver nota de `@RelationId`). */
  @RelationId((entity: PaseAbordar) => entity.pasajero)
  pasajeroId: string;

  /** `BoardingPass.segmentId`. Referencia LÓGICA (ver nota de cabecera). */
  @Column({ name: 'pab_segmentid', type: 'varchar', length: 64 })
  segmentId: string;

  /** `BoardingPass.seat` (`required`, no nullable en el contrato). */
  @Column({ name: 'pab_asiento', type: 'varchar', length: 5 })
  asiento: string;

  /** `BoardingPass.boardingGroup` (`nullable: true`), p. ej. `'A'`. */
  @Column({
    name: 'pab_grupoabordaje',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  grupoAbordaje: string | null;

  /** `BoardingPass.boardingPosition` (`nullable: true`), p. ej. `'34A'`. */
  @Column({
    name: 'pab_posicionabordaje',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  posicionAbordaje: string | null;

  /**
   * `BoardingPass.barcode` (`required`).
   * `TEXT` porque su longitud depende del formato (el `CHECK` del DDL admite
   * entre 50 y 5000 caracteres según el tipo de código).
   */
  @Column({ name: 'pab_codigobarras', type: 'text' })
  codigoBarras: string;

  /**
   * `BoardingPass.barcodeType`.
   * El `CHECK` del DDL cruza este valor con la longitud de `pab_codigoBarras`.
   */
  @Column({
    name: 'pab_tipocodigobarras',
    type: 'varchar',
    length: 10,
    enum: TipoCodigoBarras,
  })
  tipoCodigoBarras: TipoCodigoBarras;
}
