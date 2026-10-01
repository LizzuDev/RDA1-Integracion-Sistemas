import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Rfc7807ExceptionFilter } from '../src/core/filters/rfc7807-exception.filter';
import {
  CodigoProblema,
  InvalidParam,
} from '../src/core/errors/codigo-error';
import { HateoasInterceptor } from '../src/core/interceptors/hateoas.interceptor';
import { INestApplication } from '@nestjs/common';

let app: INestApplication;

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

async function getApp(): Promise<INestApplication> {
  if (!app) {
    app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

    app.enableCors({
      origin: [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^https:\/\/.*\.vercel\.app$/,
        /^https:\/\/.*\.onrender\.com$/,
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'idempotency-key'],
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
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();
  }
  return app;
}

// Vercel Serverless Handler
export default async function handler(req: any, res: any) {
  const nestApp = await getApp();
  const httpAdapter = nestApp.getHttpAdapter();
  // @ts-ignore
  httpAdapter.getInstance()(req, res);
}
