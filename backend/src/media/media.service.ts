import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { R2Service } from './r2.service';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';

const CONTENT_TYPE_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

@Injectable()
export class MediaService {
  constructor(
    private readonly r2: R2Service,
    private readonly config: ConfigService,
  ) {}

  /**
   * Punto de control central: nadie sube fotos fuera de la ventana del
   * evento, sin importar lo que diga el frontend. Esto se valida SIEMPRE
   * en el backend (ver PROJECT.md sección 6, punto 3).
   */
  private assertUploadWindowIsOpen(): void {
    const openAt = new Date(this.config.get<string>('UPLOAD_WINDOW_OPEN_AT')!);
    const closeAtRaw = this.config.get<string>('UPLOAD_WINDOW_CLOSE_AT');
    const now = new Date();

    if (now < openAt) {
      throw new ForbiddenException(
        `La galería aún no está abierta para subir fotos. Abre el ${openAt.toISOString()}.`,
      );
    }

    if (closeAtRaw) {
      const closeAt = new Date(closeAtRaw);
      if (now > closeAt) {
        throw new ForbiddenException('La ventana para subir fotos ya cerró.');
      }
    }
  }

  async requestUploadUrl(dto: RequestUploadUrlDto) {
    this.assertUploadWindowIsOpen();

    const extension = CONTENT_TYPE_EXTENSION[dto.contentType];
    if (!extension) {
      // No debería pasar (class-validator ya lo filtra), pero doble check explícito.
      throw new BadRequestException('Tipo de archivo no soportado.');
    }

    const safeGuestSegment = dto.guestName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 40);

    const objectKey = `photos/${safeGuestSegment}-${Date.now()}.${extension}`;

    const uploadUrl = await this.r2.getUploadPresignedUrl(objectKey, dto.contentType);

    return {
      uploadUrl,
      objectKey,
      // El frontend hace PUT directo a esta URL con el binario del archivo.
      // El backend nunca ve esos bytes.
      expiresInSeconds: 300,
    };
  }

  async listGallery() {
    return this.r2.listPhotos();
  }
}
