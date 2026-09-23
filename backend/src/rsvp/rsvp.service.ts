import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { CreateRsvpDto } from './dto/create-rsvp.dto';

@Injectable()
export class RsvpService {
  private readonly logger = new Logger(RsvpService.name);
  private readonly resend: Resend;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  /**
   * IMPORTANTE: esta decisión es intencional (ver PROJECT.md sección 2).
   * No se guarda en ninguna base de datos ni archivo. Cada confirmación es
   * un correo independiente a los novios. Si en el futuro se pide un
   * "resumen" o "dashboard", eso requiere reabrir esta decisión con el
   * cliente, no agregar persistencia por debajo sin avisar.
   */
  async submitRsvp(dto: CreateRsvpDto): Promise<{ sent: boolean }> {
    const subject = dto.attending
      ? `✅ ${dto.fullName} confirmó asistencia (+${dto.guestCount})`
      : `❌ ${dto.fullName} no podrá asistir`;

    const body = `
      <h2>Nueva confirmación de RSVP</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(dto.fullName)}</p>
      <p><strong>Asistirá:</strong> ${dto.attending ? 'Sí' : 'No'}</p>
      <p><strong>Acompañantes:</strong> ${dto.guestCount}</p>
      ${dto.message ? `<p><strong>Mensaje:</strong> ${escapeHtml(dto.message)}</p>` : ''}
    `;

    try {
      await this.resend.emails.send({
        from: this.config.get<string>('RESEND_FROM_EMAIL')!,
        to: this.config.get<string>('NOVIOS_EMAIL_TO')!,
        subject,
        html: body,
      });
      return { sent: true };
    } catch (error) {
      // No tumbamos la respuesta al invitado por un fallo de email — lo
      // logueamos para que el desarrollador se entere, pero el invitado ya
      // hizo su parte al llenar el formulario.
      this.logger.error('Falló el envío del email de RSVP', error as Error);
      return { sent: false };
    }
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
