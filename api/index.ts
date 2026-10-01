import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
  INestApplication,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Rfc7807ExceptionFilter } from '../src/core/filters/rfc7807-exception.filter';
import {
  CodigoProblema,
  InvalidParam,
} from '../src/core/errors/codigo-error';
import { HateoasInterceptor } from '../src/core/interceptors/hateoas.interceptor';

let cachedApp: INestApplication;

function aplanarValidacion(
  errores: ValidationError[],
  prefijo = '',
): InvalidParam[] {
  const salida: InvalidParam[] = [];
  for (const error of errores) {
    const nombre = prefijo ? `${prefijo}.${error.property}` : error.property;
    const motivos = Object.values(error.constraints ?? {});
    if (motivos.length > 0) {
      salida.push({ name: nombre, reason: motivos[0] });
    }
    if (error.children && error.children.length > 0) {
      salida.push(...aplanarValidacion(error.children, nombre));
    }
  }
  return salida;
}

function factoryDeValidacion(errores: ValidationError[]): BadRequestException {
  return new BadRequestException({
    message: 'La peticion no supera la validacion del esquema.',
    code: CodigoProblema.VALIDATION_FAILED,
    invalidParams: aplanarValidacion(errores),
  });
}

async function bootstrap(): Promise<INestApplication> {
  if (cachedApp) return cachedApp;

  const app = await NestFactory.create(AppModule, new ExpressAdapter(), {
    logger: ['error', 'warn', 'log'],
  });

  app.enableCors({
    origin: [
      /^http:\/\/localhost:\d+$/,
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.onrender\.com$/,
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'idempotency-key'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: factoryDeValidacion,
    }),
  );

  app.useGlobalFilters(new Rfc7807ExceptionFilter());
  app.useGlobalInterceptors(new HateoasInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Booking Prototipo API')
    .setDescription(
      'API base para los dominios de Alojamientos, Autos, Atracciones y Vuelos.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();
  cachedApp = app;
  return cachedApp;
}

// Vercel Serverless Handler
export default async function handler(req: any, res: any) {
  try {
    const app = await bootstrap();
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance();
    instance(req, res);
  } catch (err: any) {
    console.error('[Vercel Handler] Bootstrap error:', err?.message, err?.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      details: err?.message ?? 'Unknown error during initialization',
    });
  }
}
