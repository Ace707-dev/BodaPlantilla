# wedding-backend

Backend de la plataforma de invitación de boda (Brenda & Sergio). Ver `PROJECT.md` (en la raíz del proyecto original) para el contexto completo de decisiones de arquitectura.

## Arranque local

```bash
npm install
cp .env.example .env   # y llena los valores reales
npm run start:dev
```

## Endpoints

- `POST /rsvp` — confirma asistencia, envía email (no persiste nada).
- `GET /calendar/ics` — descarga el evento como archivo .ics.
- `POST /media/presigned-url` — pide una URL firmada para subir una foto directo a R2.
- `GET /media` — lista las fotos ya subidas (lee directo de R2).
- `GET /health` — healthcheck para Railway.

## Flujo de subida de fotos desde el frontend

```js
// 1. Pedir la URL firmada
const res = await fetch(`${API_URL}/media/presigned-url`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: file.name,
    contentType: file.type,
    guestName: 'Juan Pérez',
  }),
});
const { uploadUrl } = await res.json();

// 2. Subir el archivo DIRECTO a R2 (no pasa por el backend)
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file,
});
```

## Despliegue en Railway

1. Conectar el repo a Railway.
2. Configurar todas las variables de `.env.example` en el dashboard de Railway.
3. **Configurar un spending limit** en el proyecto de Railway (Settings → Usage) — esto es obligatorio según lo acordado, no opcional.
4. Confirmar que `ALLOWED_ORIGINS` incluye los dos dominios reales de producción.

## Checklist antes de cada deploy

Ver `PROJECT.md` sección 7 — build, lint, y confirmar que ningún endpoint recibe archivos binarios directamente.
