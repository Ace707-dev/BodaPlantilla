import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MediaService } from './media.service';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presigned-url')
  @HttpCode(HttpStatus.OK)
  // Límite deliberadamente estricto: generar URLs es barato, pero no hay
  // razón legítima para que un mismo cliente pida decenas por segundo.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestUploadUrl(@Body() dto: RequestUploadUrlDto) {
    return this.mediaService.requestUploadUrl(dto);
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async listGallery() {
    return this.mediaService.listGallery();
  }
}
