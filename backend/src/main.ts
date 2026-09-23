import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: ambos dominios de los padrinos apuntan a este mismo backend
  // (ver PROJECT.md sección 2 — un solo backend, dos frontends/dominios).
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  });

  // whitelist: true descarta cualquier campo no declarado en los DTOs —
  // primera línea de defensa contra payloads inesperados.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`Backend corriendo en el puerto ${port}`, 'Bootstrap');
  Logger.log(`Orígenes permitidos: ${allowedOrigins.join(', ') || '(ninguno configurado)'}`, 'Bootstrap');
}
bootstrap();
