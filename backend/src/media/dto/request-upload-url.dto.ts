import { IsIn, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

// Solo fotos — decisión explícita del proyecto (ver PROJECT.md sección 2 y 3).
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export class RequestUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  // Nombre de archivo simple, sin rutas ni caracteres raros — evita path traversal
  // al construir la key de R2.
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'fileName solo puede contener letras, números, puntos, guiones y guiones bajos',
  })
  fileName: string;

  @IsString()
  @IsIn(ALLOWED_CONTENT_TYPES, {
    message: `contentType debe ser una de: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
  })
  contentType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  // Nombre o identificador del invitado que sube la foto — solo para
  // organizar la key en el bucket, no se persiste en ninguna base de datos.
  guestName: string;
}
