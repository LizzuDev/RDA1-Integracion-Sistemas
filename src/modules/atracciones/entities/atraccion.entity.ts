import { Column, Entity, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';

@Entity({ name: 'atracciones_items', schema: 'schema_atracciones' })
export class Atraccion {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 100, default: 'Quito' })
  ciudad: string;

  @Column({ type: 'varchar', length: 60, default: 'Ecuador' })
  pais: string;

  @Column({ name: 'descripcion_corta', type: 'text', nullable: true })
  descripcionCorta: string;

  @Column({ name: 'descripcion_larga', type: 'text', nullable: true })
  descripcionLarga: string;

  @Column({ name: 'duracion_estimada', type: 'varchar', length: 50, default: 'PT3H' })
  duracionEstimada: string;

  @Column({ name: 'categoria_id', type: 'uuid', nullable: true })
  categoriaId: string;

  @Column('numeric', {
    name: 'precio_unitario_adulto',
    precision: 10,
    scale: 2,
    default: 55.00,
    transformer: new ColumnNumericTransformer(),
  })
  precioUnitarioAdulto: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  moneda: string;

  @Column({ name: 'cancelacion_gratis', type: 'boolean', default: true })
  cancelacionGratis: boolean;

  @Column({ name: 'adicion_animales_servicio', type: 'boolean', default: true })
  adicionAnimalesServicio: boolean;

  @Column({ name: 'accesible_silla_ruedas', type: 'boolean', default: false })
  accesibleSillaRuedas: boolean;

  @Column('text', { name: 'idiomas_soportados', array: true, default: ['es', 'en'] })
  idiomasSoportados: string[];

  @Column({ name: 'punto_encuentro', type: 'varchar', length: 255, default: 'Boulevard Naciones Unidas, Quito' })
  puntoEncuentro: string;

  @Column('numeric', {
    precision: 10,
    scale: 7,
    default: -0.220164,
    transformer: new ColumnNumericTransformer(),
  })
  latitud: number;

  @Column('numeric', {
    precision: 10,
    scale: 7,
    default: -78.512327,
    transformer: new ColumnNumericTransformer(),
  })
  longitud: number;

  @Column('text', { name: 'fotos_urls', array: true, default: [] })
  fotosUrls: string[];

  @Column('jsonb', { name: 'itinerario_cronologico', nullable: true })
  itinerarioCronologico: any;

  @Column('text', { array: true, default: [] })
  inclusiones: string[];

  @Column('text', { array: true, default: [] })
  exclusiones: string[];

  @Column('numeric', {
    name: 'rating_general',
    precision: 3,
    scale: 1,
    default: 9.8,
    transformer: new ColumnNumericTransformer(),
  })
  ratingGeneral: number;

  @Column({ name: 'reviews_count', type: 'int', default: 0 })
  reviewsCount: number;

  @Column('numeric', {
    name: 'rating_limpieza',
    precision: 3,
    scale: 1,
    default: 9.9,
    transformer: new ColumnNumericTransformer(),
  })
  ratingLimpieza: number;

  @Column('numeric', {
    name: 'rating_servicio',
    precision: 3,
    scale: 1,
    default: 9.8,
    transformer: new ColumnNumericTransformer(),
  })
  ratingServicio: number;

  @Column('numeric', {
    name: 'rating_calidad',
    precision: 3,
    scale: 1,
    default: 9.6,
    transformer: new ColumnNumericTransformer(),
  })
  ratingCalidad: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'proveedor_id', type: 'varchar', length: 60, nullable: true, default: 'NODE_ATR_DILAN' })
  proveedorId?: string;

  @Column({ name: 'proveedor_codigo', type: 'varchar', length: 50, nullable: true, default: 'NODE_ATR_DILAN' })
  proveedorCodigo?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // --- Propiedades de compatibilidad con frontend y contratos OpenAPI v1/v2 ---
  get name(): string {
    return this.nombre;
  }
  set name(val: string) {
    this.nombre = val;
  }

  get long_description(): string {
    return this.descripcionLarga || this.descripcionCorta || '';
  }
  set long_description(val: string) {
    this.descripcionLarga = val;
  }

  get duration(): string {
    return this.duracionEstimada;
  }
  set duration(val: string) {
    this.duracionEstimada = val;
  }

  get price(): { currency: string; total: number } {
    return { currency: this.moneda || 'USD', total: Number(this.precioUnitarioAdulto || 55.00) };
  }
  set price(val: { currency: string; total: number }) {
    if (val?.total !== undefined) this.precioUnitarioAdulto = val.total;
    if (val?.currency) this.moneda = val.currency;
  }

  get photos(): any[] {
    return (this.fotosUrls || []).map((url) => ({ url }));
  }
  set photos(val: any[]) {
    if (Array.isArray(val)) {
      this.fotosUrls = val.map((item) => (typeof item === 'string' ? item : item.url));
    }
  }

  get free_cancellation(): boolean {
    return this.cancelacionGratis;
  }
  set free_cancellation(val: boolean) {
    this.cancelacionGratis = val;
  }

  get ratings(): { number_of_reviews: number; score: number } {
    return {
      number_of_reviews: this.reviewsCount || 0,
      score: Number(this.ratingGeneral || 9.8),
    };
  }
  set ratings(val: { number_of_reviews: number; score: number }) {
    if (val?.score !== undefined) this.ratingGeneral = val.score;
    if (val?.number_of_reviews !== undefined) this.reviewsCount = val.number_of_reviews;
  }

  get includes(): string[] {
    return this.inclusiones || [];
  }
  set includes(val: string[]) {
    this.inclusiones = val;
  }

  get supported_languages(): string[] {
    return this.idiomasSoportados || ['es', 'en'];
  }
  set supported_languages(val: string[]) {
    this.idiomasSoportados = val;
  }

  get locations(): any[] {
    return [
      {
        address: this.puntoEncuentro || `${this.ciudad}, ${this.pais}`,
        city: this.ciudad,
        country: this.pais,
        coordinates: {
          latitude: Number(this.latitud),
          longitude: Number(this.longitud),
        },
        type: 'STARTING_POINT',
      },
    ];
  }
}
