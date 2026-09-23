import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RsvpModule } from './rsvp/rsvp.module';
import { MediaModule } from './media/media.module';
import { CalendarModule } from './calendar/calendar.module';
import { HealthController } from './common/health.controller';
import { validateEnv } from './common/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Rate limiting global por defecto; cada controller puede ajustar
    // límites más estrictos con @Throttle() por endpoint (ver PROJECT.md
    // sección 6, punto 1 — obligatorio, no opcional).
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    RsvpModule,
    MediaModule,
    CalendarModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
