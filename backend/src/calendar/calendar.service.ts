import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createEvent, EventAttributes } from 'ics';

@Injectable()
export class CalendarService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Genera el .ics al vuelo — no requiere OAuth ni la API de Google
   * Calendar. Funciona con Google Calendar, Apple Calendar y Outlook.
   */
  generateWeddingIcs(): string {
    const weddingDate = new Date(this.config.get<string>('WEDDING_DATE')!);

    const event: EventAttributes = {
      title: 'Boda — Brenda & Sergio',
      description: 'Ceremonia y recepción de la boda de Brenda & Sergio.',
      start: [
        weddingDate.getFullYear(),
        weddingDate.getMonth() + 1,
        weddingDate.getDate(),
        16, // 4:00 PM — ajustar según itinerario real
        0,
      ],
      duration: { hours: 8 },
      location: 'Hacienda Los Fresnos, León, Guanajuato',
      status: 'CONFIRMED',
      organizer: { name: 'Brenda & Sergio' },
    };

    const { error, value } = createEvent(event);
    if (error || !value) {
      throw error ?? new Error('No se pudo generar el archivo .ics');
    }
    return value;
  }
}
