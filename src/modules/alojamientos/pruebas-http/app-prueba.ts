import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { of } from 'rxjs';
import { randomUUID } from 'crypto';
import { AddressInfo } from 'net';

import { AlojamientosController } from '../alojamientos.controller';
import { AlojamientosService } from '../alojamientos.service';
import { Alojamiento } from '../entities/alojamiento.entity';
import { ReservaAlojamiento } from '../entities/reserva.entity';
import { ResenaAlojamiento } from '../entities/resena.entity';
import { TipoHabitacion } from '../entities/tipo-habitacion.entity';
import { HuespedReserva } from '../entities/huesped-reserva.entity';
import { ProveedorAlojamiento } from '../entities/proveedor-alojamiento.entity';
import { TiposHabitacionService } from '../tipos-habitacion.service';
import { ProveedoresAlojamientoService } from '../proveedores.service';
import { TelemetryService } from '../../telemetry/telemetry.service';
import { Rfc7807ExceptionFilter } from '../../../core/filters/rfc7807-exception.filter';
import { HateoasInterceptor } from '../../../core/interceptors/hateoas.interceptor';
import { crearValidationPipeGlobal } from '../../../core/validation/validation-pipe';
import { fechaRelativa } from '../reglas-estancia';
import { RepositorioMemoria } from './repositorio-memoria';
import { SesionSupabaseService } from '../../../core/auth/sesion-supabase.service';
import {
  GestionAlojamientosGuard,
  ClienteAutenticadoGuard,
  SesionOpcionalGuard,
  SoloAdministradorGuard,
} from '../guards/gestion-alojamientos.guard';

/**
 * Identidades de prueba. La sesión de Supabase se sustituye por un mapa
 * token → usuario; las API keys de proveedores van en ALOJAMIENTOS_API_KEYS.
 */
export const USUARIOS = {
  admin: { id: 'u-admin', email: 'admin@booking.com', app_metadata: {} },
  adminPromovido: { id: 'u-admin2', email: 'gestor@booking.com', app_metadata: { role: 'admin' } },
  cliente: { id: 'u-cli', email: 'cliente@example.com', app_metadata: {}, user_metadata: {} },
  // Intento de escalada: se pone role=admin en user_metadata (editable por el usuario).
  tramposo: { id: 'u-tramp', email: 'tramposo@example.com', app_metadata: {}, user_metadata: { role: 'admin' } },
};
export const TOKENS: Record<string, keyof typeof USUARIOS> = {
  'token-admin': 'admin',
  'token-admin-promovido': 'adminPromovido',
  'token-cliente': 'cliente',
  'token-tramposo': 'tramposo',
};
export const API_KEYS = {
  'proveedor-a': 'clave-proveedor-a-0123456789abcdef',
  'proveedor-b': 'clave-proveedor-b-0123456789abcdef',
};
process.env.ALOJAMIENTOS_API_KEYS = Object.entries(API_KEYS).map(([id, k]) => `${id}:${k}`).join(',');

/** Con qué identidad se hace una petición. Por defecto, como administrador. */
export type Como = 'admin' | 'admin-promovido' | 'cliente' | 'tramposo' | 'anonimo' | 'token-invalido' | 'proveedor-a' | 'proveedor-b' | 'clave-falsa';

function cabecerasDe(como: Como): Record<string, string> {
  switch (como) {
    case 'admin': return { Authorization: 'Bearer token-admin' };
    case 'admin-promovido': return { Authorization: 'Bearer token-admin-promovido' };
    case 'cliente': return { Authorization: 'Bearer token-cliente' };
    case 'tramposo': return { Authorization: 'Bearer token-tramposo' };
    case 'token-invalido': return { Authorization: 'Bearer token-que-no-existe' };
    case 'proveedor-a': return { 'X-Api-Key': API_KEYS['proveedor-a'] };
    case 'proveedor-b': return { 'X-Api-Key': API_KEYS['proveedor-b'] };
    case 'clave-falsa': return { 'X-Api-Key': 'clave-inventada-0123456789abcdef' };
    default: return {};
  }
}

/** `YYYY-MM-DD` a `n` días de hoy. */
export const dia = (n: number) => fechaRelativa(n);

/**
 * Catálogo de prueba basado en los alojamientos reales de `backup.sql`, con
 * capacidades y precios conocidos para poder verificar cálculos exactos.
 */
export const HOTELES = {
  gangotena: {
    id: 'quito-gangotena', nombre: 'Casa Gangotena Relais & Châteaux', destino: 'Quito',
    descripcion: 'Palacio renacentista en la Plaza San Francisco.', tipoPropiedad: 'Hoteles',
    precioPorNoche: 250, moneda: 'USD', capacidadAdultos: 2, capacidadNinos: 1, habitaciones: 3,
    tienePiscina: false, amenidades: ['WiFi gratis', 'Restaurante'],
  },
  epiq: {
    id: 'quito-epiq', nombre: 'Top Rentals EpiQ', destino: 'Quito',
    descripcion: 'Apartamentos de lujo en La Carolina con piscina climatizada.', tipoPropiedad: 'Apartamentos',
    precioPorNoche: 120, moneda: 'USD', capacidadAdultos: 4, capacidadNinos: 2, habitaciones: 2,
    tienePiscina: true, amenidades: ['Piscina', 'Gimnasio', 'Pet friendly'],
  },
  ejido: {
    id: 'quito-ejido', nombre: 'Hotel El Ejido', destino: 'Quito',
    descripcion: 'Frente al parque El Ejido.', tipoPropiedad: 'Hoteles',
    precioPorNoche: 45.5, moneda: 'USD', capacidadAdultos: 2, capacidadNinos: 0, habitaciones: 1,
    tienePiscina: false, amenidades: [],
  },
  cancun: {
    id: 'cancun-coral', nombre: 'Grand Fiesta Americana Coral Beach', destino: 'Cancún',
    descripcion: 'Resort 5 estrellas frente al Caribe.', tipoPropiedad: 'Resort Todo Incluido',
    precioPorNoche: 380, moneda: 'USD', capacidadAdultos: 3, capacidadNinos: 2, habitaciones: 10,
    tienePiscina: true, amenidades: ['Piscina', 'Spa'],
  },
  cartagena: {
    id: 'cartagena-charleston', nombre: 'Hotel Charleston Santa Teresa', destino: 'Cartagena',
    descripcion: 'Antiguo convento en la ciudad amurallada.', tipoPropiedad: 'Hotel Boutique',
    precioPorNoche: 300, moneda: 'COP', capacidadAdultos: 2, capacidadNinos: 1, habitaciones: 5,
    tienePiscina: true, amenidades: ['Piscina'],
  },
  medellin: {
    id: 'medellin-clickclack', nombre: 'The Click Clack Hotel', destino: 'Medellín',
    descripcion: 'Hotel de diseño en El Poblado.', tipoPropiedad: 'Design Hotel',
    precioPorNoche: 95, moneda: 'USD', capacidadAdultos: 2, capacidadNinos: 0, habitaciones: 4,
    tienePiscina: false, amenidades: [],
  },
  cusco: {
    id: 'cusco-inka', nombre: 'Palacio del Inka', destino: 'Cusco',
    descripcion: 'Hotel museo frente al Qoricancha.', tipoPropiedad: 'Hotel Museo',
    precioPorNoche: 210, moneda: 'USD', capacidadAdultos: 2, capacidadNinos: 1, habitaciones: 6,
    tienePiscina: false, amenidades: [],
  },
} as const;

export const TOTAL_HOTELES = Object.keys(HOTELES).length;

/**
 * Tres tipos de habitación de EpiQ con los precios que antes se inventaban como
 * "recargos" (120 / ×1.25 / ×1.6): ahora son datos reales, cada uno con su cupo,
 * régimen y política de cancelación.
 */
export const TIPOS_EPIQ = [
  { codigo: 'estandar', nombre: 'Apartamento estándar', precioNoche: 120, cantidad: 2, capacidadAdultos: 4, capacidadNinos: 2, regimen: 'SOLO_ALOJAMIENTO', cancelacionGratuitaHoras: 48, orden: 1 },
  { codigo: 'deluxe', nombre: 'Apartamento deluxe con balcón', precioNoche: 150, cantidad: 1, capacidadAdultos: 4, capacidadNinos: 2, regimen: 'DESAYUNO', cancelacionGratuitaHoras: 24, orden: 2 },
  { codigo: 'suite', nombre: 'Master suite', precioNoche: 192, cantidad: 1, capacidadAdultos: 4, capacidadNinos: 2, regimen: 'TODO_INCLUIDO', cancelacionGratuitaHoras: null, orden: 3 },
];

export interface RespuestaHttp {
  status: number;
  headers: Headers;
  body: any;
  texto: string;
}

export interface OpcionesPeticion {
  body?: unknown;
  /** Cuerpo crudo (sin JSON.stringify), para probar JSON mal formado. */
  raw?: string;
  headers?: Record<string, string>;
  /** Atajo: añade `Idempotency-Key` con un UUID nuevo. */
  idem?: boolean | string;
  /** Identidad de la petición (por defecto `admin`). */
  como?: Como;
}

export interface AppPrueba {
  app: INestApplication;
  base: string;
  repos: {
    alojamientos: RepositorioMemoria<any>;
    reservas: RepositorioMemoria<any>;
    resenas: RepositorioMemoria<any>;
    tipos: RepositorioMemoria<any>;
    huespedes: RepositorioMemoria<any>;
    proveedores: RepositorioMemoria<any>;
  };
  telemetria: { trackEvent: jest.Mock; trackApiCall: jest.Mock };
  http: { post: jest.Mock };
  service: AlojamientosService;
  pedir: (metodo: string, ruta: string, opciones?: OpcionesPeticion) => Promise<RespuestaHttp>;
  sembrarCatalogo: () => void;
  /** Siembra tipos de habitación (devuelve los guardados, con su id). */
  sembrarTipos: (alojamientoId: string, tipos: Record<string, unknown>[]) => any[];
  cerrar: () => Promise<void>;
}

export async function crearAppPrueba(): Promise<AppPrueba> {
  const repos = {
    alojamientos: new RepositorioMemoria<any>(),
    reservas: new RepositorioMemoria<any>({ generarId: true, unicos: ['idempotencyKey', 'codigoReserva'] }),
    resenas: new RepositorioMemoria<any>({ generarId: true }),
    tipos: new RepositorioMemoria<any>({ generarId: true }),
    huespedes: new RepositorioMemoria<any>({ generarId: true }),
    // El id del proveedor lo fija quien lo crea; api_key_hash es único como en la BD.
    proveedores: new RepositorioMemoria<any>({ unicos: ['apiKeyHash'] }),
  };
  const telemetria = { trackEvent: jest.fn(), trackApiCall: jest.fn() };
  const http = { post: jest.fn(() => of({ status: 200, data: {} })) };

  const moduloRef = await Test.createTestingModule({
    imports: [CacheModule.register({ ttl: 60000 })],
    controllers: [AlojamientosController],
    providers: [
      AlojamientosService,
      { provide: getRepositoryToken(Alojamiento), useValue: repos.alojamientos },
      { provide: getRepositoryToken(ReservaAlojamiento), useValue: repos.reservas },
      { provide: getRepositoryToken(ResenaAlojamiento), useValue: repos.resenas },
      { provide: getRepositoryToken(TipoHabitacion), useValue: repos.tipos },
      { provide: getRepositoryToken(HuespedReserva), useValue: repos.huespedes },
      { provide: getRepositoryToken(ProveedorAlojamiento), useValue: repos.proveedores },
      TiposHabitacionService,
      ProveedoresAlojamientoService,
      { provide: HttpService, useValue: http },
      { provide: TelemetryService, useValue: telemetria },
      {
        provide: SesionSupabaseService,
        useValue: { obtenerUsuario: async (token: string) => (TOKENS[token] ? structuredClone(USUARIOS[TOKENS[token]]) : null) },
      },
      GestionAlojamientosGuard,
      ClienteAutenticadoGuard,
      SesionOpcionalGuard,
      SoloAdministradorGuard,
    ],
  })
    .setLogger({ log() {}, error() {}, warn() {}, debug() {}, verbose() {} })
    .compile();

  // Misma configuración que `main.ts`.
  const app = moduloRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(crearValidationPipeGlobal());
  app.useGlobalFilters(new Rfc7807ExceptionFilter());
  app.useGlobalInterceptors(new HateoasInterceptor());
  await app.listen(0, '127.0.0.1');

  const { port } = app.getHttpServer().address() as AddressInfo;
  const base = `http://127.0.0.1:${port}/api/v1`;

  const pedir = async (metodo: string, ruta: string, opciones: OpcionesPeticion = {}): Promise<RespuestaHttp> => {
    // Reservar y pagar se hace por defecto como INVITADO (cliente sin sesión): con
    // sesión, la reserva se vincula al usuario y dos reservas seguidas de la misma
    // sesión disparan el aviso de reserva duplicada. Las pruebas de sesión indican `como`.
    const esReserva = metodo === 'POST' && /\/reservations$|\/orders\/create$/.test(ruta.split('?')[0]);
    const como = opciones.como ?? (esReserva ? 'anonimo' : 'admin');
    const headers: Record<string, string> = { ...cabecerasDe(como), ...(opciones.headers ?? {}) };
    if (opciones.idem) headers['Idempotency-Key'] = typeof opciones.idem === 'string' ? opciones.idem : randomUUID();
    let cuerpo: string | undefined;
    if (opciones.raw !== undefined) {
      cuerpo = opciones.raw;
      headers['Content-Type'] ??= 'application/json';
    } else if (opciones.body !== undefined) {
      cuerpo = JSON.stringify(opciones.body);
      headers['Content-Type'] ??= 'application/json';
    }
    const res = await fetch(`${base}${ruta}`, { method: metodo, headers, body: cuerpo });
    const texto = await res.text();
    let body: any = texto;
    try {
      body = texto ? JSON.parse(texto) : undefined;
    } catch {
      /* respuesta no JSON */
    }
    return { status: res.status, headers: res.headers, body, texto };
  };

  const sembrarCatalogo = () => {
    repos.alojamientos.limpiar();
    // Sin tipos: cada hotel recibe su tipo "estándar" la primera vez que se consulta.
    repos.tipos.limpiar();
    repos.huespedes.limpiar();
    // createdAt creciente: el orden de inserción es el orden del catálogo.
    Object.values(HOTELES).forEach((h, i) =>
      repos.alojamientos.sembrar({
        ...h,
        amenidades: [...h.amenidades],
        photos: [{ url: `https://cf.bstatic.com/${h.id}.jpg` }],
        ratings: { score: 9.1, number_of_reviews: 120 },
        createdAt: new Date(Date.UTC(2026, 0, 1 + i)),
      }),
    );
  };
  sembrarCatalogo();

  const sembrarTipos = (alojamientoId: string, tipos: Record<string, unknown>[]) => {
    tipos.forEach((t, i) =>
      repos.tipos.sembrar({
        alojamientoId,
        camas: 1,
        capacidadNinos: 0,
        regimen: 'SOLO_ALOJAMIENTO',
        cancelacionGratuitaHoras: 48,
        amenidades: [],
        photos: [],
        activo: true,
        orden: i + 1,
        ...t,
      }),
    );
    return repos.tipos.todas().filter((t) => t.alojamientoId === alojamientoId);
  };

  return {
    app,
    base,
    repos,
    telemetria,
    http,
    service: moduloRef.get(AlojamientosService),
    pedir,
    sembrarCatalogo,
    sembrarTipos,
    cerrar: () => app.close(),
  };
}

/** Cuerpo válido para `POST /alojamientos/:id/reservations`. */
export function reservaValida(extra: Record<string, unknown> = {}) {
  return {
    checkin: dia(10),
    checkout: dia(13),
    habitaciones_count: 1,
    customer_name: 'Ana Pérez',
    customer_email: `ana.${randomUUID().slice(0, 8)}@example.com`,
    adultos: 2,
    ninos: 0,
    ...extra,
  };
}

/** Comprueba la forma RFC 7807 de una respuesta de error. */
export function esperarProblema(res: RespuestaHttp, status: number, code?: string) {
  expect(res.status).toBe(status);
  expect(res.headers.get('content-type')).toContain('application/problem+json');
  expect(res.body).toEqual(
    expect.objectContaining({
      type: expect.any(String),
      title: expect.any(String),
      status,
      detail: expect.any(String),
      instance: expect.stringContaining('/api/v1/'),
    }),
  );
  if (code) expect(res.body.code).toBe(code);
}

/** Nombres de los campos señalados en `invalidParams`. */
export const camposInvalidos = (res: RespuestaHttp): string[] =>
  (res.body?.invalidParams ?? []).map((p: { name: string }) => p.name);
