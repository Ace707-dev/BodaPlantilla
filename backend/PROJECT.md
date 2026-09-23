# Backend — Plataforma de Invitación de Boda (Brenda & Sergio)

Este documento es la fuente de verdad del proyecto. Cualquier agente (humano o IA) que retome el trabajo debe leerlo completo antes de escribir código, y debe mantenerlo actualizado conforme cambien decisiones de alcance.

---

## 1. Contexto del proyecto

- Freelance / primer proyecto de emprendimiento, en sociedad con una diseñadora (ella hace el diseño/frontend visual, este backend lo programa el desarrollador).
- Cliente real: amigo de la diseñadora. Boda: **diciembre 2026**.
- Se están construyendo **2 sitios casi idénticos** (uno por cada padrino), cada uno con su propio dominio.
  - **Los 2 sitios comparten exactamente los mismos datos** (misma galería de fotos, mismo destino de RSVP).
  - Lo único distinto entre ambos es el **frontend (diseño)** y el **dominio**.
  - **Un solo backend/instancia atiende ambos dominios** — no se duplica el backend. Se configura CORS para aceptar ambos orígenes.
- Precio del proyecto (desarrollo): $2,000 MXN total, repartido entre desarrollador y diseñadora. No relevante para el código, solo contexto de negocio.

## 2. Decisiones de arquitectura (ya tomadas — no cuestionar sin confirmar con el humano)

| Decisión | Detalle |
|---|---|
| **Backend** | NestJS |
| **Base de datos** | **NO se usa base de datos.** Decisión explícita del cliente/desarrollador. No agregar Postgres, Neon, ni ningún ORM salvo que el humano lo pida explícitamente. |
| **RSVP (confirmación de asistencia)** | **No se persiste.** El formulario de RSVP dispara directamente un correo electrónico (vía Resend) con los datos de la confirmación (nombre, asistencia sí/no, número de acompañantes, mensaje). No hay dashboard, no hay lista consultable — cada confirmación es un correo individual a los novios. |
| **Fotos de invitados** | Solo **fotos**, **no video**. Almacenadas en **Cloudflare R2**. |
| **Flujo de subida de fotos** | **Presigned URLs.** El backend NUNCA recibe el archivo de imagen. El flujo es: (1) frontend pide al backend una URL firmada, (2) backend valida (ventana de tiempo abierta, límites por invitado) y genera la presigned URL con el SDK S3-compatible de R2, (3) el navegador del invitado sube el archivo **directo a R2** usando esa URL, (4) frontend notifica al backend que terminó (opcional, para logging). Esto es crítico para mantener bajo el consumo de CPU/RAM en Railway. |
| **Ventana de subida de fotos** | Deshabilitada por defecto; se habilita únicamente el día del evento (controlado por fecha o toggle manual — ver sección de configuración). La **vista/lectura** de la galería sí puede estar siempre activa. |
| **Moderación de contenido** | **Ninguna.** Decisión final: publicación directa de fotos, sin aprobación previa, sin reporte automatizado, sin IA de moderación. Se confía en la buena fe de los invitados. (Nota para el humano: no está en el alcance actual, pero SI en algún momento se pide "borrar foto manualmente", ese endpoint sí debe existir protegido por auth simple de admin). |
| **Calendario** | Generación de archivo **.ics** al vuelo (sin dependencias externas de calendario) para que el invitado pueda agregar el evento a Google Calendar / Apple Calendar / Outlook. No requiere OAuth ni integración con Google Calendar API. |
| **Emails** | **Resend** para el envío de la notificación de RSVP a los novios. |
| **Hosting** | **Railway** (plan Hobby), un solo servicio para ambos dominios. |
| **Dominios** | 2 dominios distintos (Hostinger), cada uno enrutado al mismo backend. |
| **Multi-tenant futuro** | El diseño actual NO necesita multi-tenant real (los 2 sitios comparten todo). Si en el futuro se reutiliza este backend para un cliente nuevo con datos independientes, ahí sí se necesitaría introducir un concepto de `event_id`/tenant — **no construir esto de más ahora** (YAGNI), pero dejar el código razonablemente desacoplado por si se requiere después. |

## 3. Fuera de alcance (explícitamente descartado)

- Base de datos / persistencia de cualquier tipo para RSVP o invitados.
- Subida de videos por invitados.
- Moderación automática o manual de fotos.
- WhatsApp Business API / Twilio (se descartó, RSVP es solo email).
- Autenticación de invitados (no hay login para subir fotos, es abierto para quien tenga el link).

## 4. Variables de entorno esperadas

```
# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL_BASE=      # dominio público/CDN desde el que se sirven las fotos

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NOVIOS_EMAIL_TO=         # a dónde llegan las notificaciones de RSVP

# Config del evento
WEDDING_DATE=2026-12-XX
UPLOAD_WINDOW_OPEN_AT=   # timestamp ISO; antes de esto, subir fotos regresa 403
UPLOAD_WINDOW_CLOSE_AT=  # opcional

# CORS — ambos dominios de los padrinos
ALLOWED_ORIGINS=https://sitio-padrino-1.com,https://sitio-padrino-2.com

# Railway
PORT=
```

## 5. Endpoints esperados (alto nivel)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/rsvp` | Recibe confirmación de asistencia, valida payload, envía email vía Resend. No guarda nada. |
| `GET` | `/calendar/ics` | Devuelve el archivo `.ics` del evento para descarga/import a calendario. |
| `POST` | `/media/presigned-url` | Valida ventana de subida + límites, genera y devuelve una presigned URL de R2 para que el cliente suba una foto directo. |
| `GET` | `/media` | Lista las fotos ya subidas (para mostrar la galería) — lee directo de R2 (list objects) o de un índice simple si se decide cachear. |
| `GET` | `/health` | Healthcheck simple para Railway. |

> Nota: como no hay base de datos, `GET /media` debe listar objetos directamente del bucket de R2 (operación Class B), no de una tabla. Confirmar con el humano si se requiere paginación si la lista crece.

## 6. Protecciones de costo / resiliencia (obligatorias, no opcionales)

Esto no es "nice to have" — el humano tiene preocupación explícita por que el costo de Railway se dispare. Cualquier agente que trabaje en este proyecto debe implementar:

1. **Rate limiting** en todos los endpoints públicos (`@nestjs/throttler` o equivalente), especialmente `/rsvp` y `/media/presigned-url`.
2. **Nunca** recibir el archivo de imagen completo en el backend — si algún endpoint hace `multipart/form-data` con el archivo en sí, es un error de diseño, corregir a presigned URL.
3. **Validar la ventana de subida en el backend**, no solo en el frontend (el frontend puede ser bypasseado).
4. **Límite de tamaño y cantidad de archivos** por invitado (a definir cantidad exacta con el humano — placeholder: 10 fotos, 20MB máx por foto).
5. Documentar en README cómo configurar el **spending limit de Railway** (esto se hace en el dashboard de Railway, no en código, pero debe quedar como paso pendiente de checklist de despliegue).

## 7. Checklist de verificación continua (correr en cada sesión de trabajo)

Cualquier agente debe, antes de dar por terminada una tarea:

- [ ] `npm run build` sin errores.
- [ ] `npm run lint` sin errores.
- [ ] Confirmar que ningún endpoint de subida de fotos recibe el binario del archivo (grep por `multer`, `FileInterceptor` con almacenamiento de disco — si aparece, es una señal de alerta a revisar).
- [ ] Confirmar que `/rsvp` no escribe a ninguna base de datos ni archivo de persistencia local.
- [ ] Confirmar que las variables de entorno sensibles (R2 keys, Resend key) no están hardcodeadas ni committeadas.
- [ ] Si se tocó el flujo de presigned URLs, probar manualmente (o con test) que la URL generada permite `PUT` directo a R2 y que expira correctamente.
- [ ] Si se tocó la ventana de subida, probar el caso "fuera de ventana" → debe regresar 403/mensaje claro, no error genérico.
- [ ] Actualizar este `PROJECT.md` si alguna decisión de la sección 2 cambió durante la sesión.

## 8. Estado actual

- [ ] Proyecto NestJS aún no inicializado — **este es el punto de partida**.
- [ ] Sin código escrito todavía.

## 9. Historial de decisiones relevantes (para no repetir preguntas ya resueltas)

- Se descartó Neon/Postgres — no preguntar de nuevo si se necesita DB salvo cambio de alcance explícito.
- Se descartó moderación de contenido — no proponerla de nuevo salvo que el humano la pida.
- Se descartó subida de videos — solo fotos.
- El costo de infraestructura ya fue cotizado al cliente (~$15 USD/mes Railway + $0-5 USD/mes R2 + $25 USD/año dominios) — cambios grandes de arquitectura que impacten costo deben avisarse para no invalidar la cotización ya entregada.
