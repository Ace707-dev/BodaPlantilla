import { IsNotEmpty, IsString, IsUrl, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Valida que TODAS las variables de entorno requeridas existan al arrancar
 * la app. Si falta una, la app NO debe arrancar — mejor fallar rápido en
 * desarrollo/deploy que fallar silenciosamente en producción cuando un
 * invitado intente subir una foto o mandar su RSVP.
 */
class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  R2_ACCOUNT_ID: string;

  @IsString()
  @IsNotEmpty()
  R2_ACCESS_KEY_ID: string;

  @IsString()
  @IsNotEmpty()
  R2_SECRET_ACCESS_KEY: string;

  @IsString()
  @IsNotEmpty()
  R2_BUCKET_NAME: string;

  @IsUrl({ require_tld: false })
  R2_PUBLIC_URL_BASE: string;

  @IsString()
  @IsNotEmpty()
  RESEND_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  RESEND_FROM_EMAIL: string;

  @IsString()
  @IsNotEmpty()
  NOVIOS_EMAIL_TO: string;

  @IsString()
  @IsNotEmpty()
  UPLOAD_WINDOW_OPEN_AT: string; // ISO date string

  @IsString()
  @IsNotEmpty()
  ALLOWED_ORIGINS: string; // comma-separated
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      `Faltan o son inválidas las siguientes variables de entorno:\n${errors
        .map((e) => `- ${e.property}`)
        .join('\n')}`,
    );
  }
  return validatedConfig;
}
