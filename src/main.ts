import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Rfc7807ExceptionFilter } from './core/filters/rfc7807-exception.filter';
import { HateoasInterceptor } from './core/interceptors/hateoas.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita CORS para que el frontend pueda llamar al backend.
  //
  // `X-Device-Fingerprint` es OBLIGATORIA en `POST /vuelos/search` (contrato
  // v1.5.0.0). Como es una cabecera no simple, el navegador dispara un PREFLIGHT:
  // si no aparece en `allowedHeaders`, el navegador rechaza la peticion ANTES de
  // salir, y la busqueda falla con un error de red sin llegar al controlador.
  //
  // `credentials: true` es necesario para las rutas autenticadas, que viajan con
  // `withCredentials: true` para enviar la cookie httpOnly de sesion. Al
  // activarlo, el navegador exige que `origin` sea un valor EXACTO (nunca `*`),
  // por eso se mantiene la lista de origenes concreta en lugar de un comodin.
  app.enableCors({
    origin: [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^https:\/\/.*\.vercel\.app$/
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'idempotency-key'],
  });

  app.setGlobalPrefix('api/v1');

  // `whitelist: true` + `forbidNonWhitelisted: true` es lo que hace que un campo
  // no declarado en el DTO sea un 400 y no se ignore en silencio. Sin eso, un
  // cliente podria mandar `{ departureDate: 'ayer' }` creyendo que habia
  // programado un vuelo.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: factoryDeValidacion,
    }),
  );

  // Registrar el filtro global de excepciones para cumplir con la RFC 7807
  app.useGlobalFilters(new Rfc7807ExceptionFilter());

  // HATEOAS: inyectar enlaces en las respuestas (Richardson Nivel 3)
  app.useGlobalInterceptors(new HateoasInterceptor());


  const config = new DocumentBuilder()
    .setTitle('Booking Prototipo API')
    .setDescription('API base para los dominios de Alojamientos, Autos, Atracciones y Vuelos.')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
