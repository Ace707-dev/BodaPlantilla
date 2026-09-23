import { Controller, Get, Header } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('ics')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Header('Content-Type', 'text/calendar')
  @Header('Content-Disposition', 'attachment; filename="boda-brenda-sergio.ics"')
  getIcs(): string {
    return this.calendarService.generateWeddingIcs();
  }
}
