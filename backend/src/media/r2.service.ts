import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  public readonly publicUrlBase: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    this.bucket = this.config.get<string>('R2_BUCKET_NAME')!;
    this.publicUrlBase = this.config.get<string>('R2_PUBLIC_URL_BASE')!;

    // R2 habla el protocolo S3 — solo cambia el endpoint.
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.get<string>('R2_ACCESS_KEY_ID')!,
        secretAccessKey: this.config.get<string>('R2_SECRET_ACCESS_KEY')!,
      },
    });
  }

  /**
   * Genera una URL firmada temporal para que el CLIENTE suba el archivo
   * directo a R2. El backend nunca recibe el archivo — solo firma la
   * autorización. Esto es lo que mantiene el consumo de CPU/RAM en
   * Railway prácticamente en cero sin importar cuántas fotos se suban.
   *
   * expiresInSeconds corto (default 5 min) para que el link no quede
   * abierto indefinidamente si se filtra o se comparte por error.
   */
  async getUploadPresignedUrl(
    objectKey: string,
    contentType: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Lista las fotos ya subidas para armar la galería.
   * Como no hay base de datos, R2 ES la fuente de verdad de qué fotos existen.
   * Esto es una operación Class B — barata y dentro del free tier para el
   * volumen de una boda.
   */
  async listPhotos(prefix = 'photos/'): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });
    const result = await this.client.send(command);
    return (result.Contents ?? [])
      .map((obj) => obj.Key)
      .filter((key): key is string => !!key)
      .map((key) => `${this.publicUrlBase}/${key}`);
  }
}
