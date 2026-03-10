# Guía: Conexión entre Mux y Supabase

Esta guía expone la arquitectura para integrar Mux (para procesamiento y CDN de Video) con Supabase, automatizando que un video subido dispare notificaciones asíncronas para guardarse en la base de datos de Supabase.

## 0. Resumen de la Arquitectura (El Flujo de Subida)

1. El usuario solicita subir un archivo desde frontend (Astro).
2. Para evitar sobrecargar nuestro backend, llamamos a la API de Mux para generar una **URL Directa de Subida**.
3. El frontend envía el archivo usando dicha URL directamente a Mux (ej: componente nativo `<mux-uploader>`). 
4. El Frontend registra el video en Supabase indicando que el archivo está *preparándose*.
5. Cuando Mux termina de procesar el archivo, dispara un evento asíncrono (**Webhook**) indicando que el video está subido (`video.asset.ready`).
6. En Supabase disponemos de una **Edge Function** que se suscribe a este Webhook, captura el evento de resolución de Mux y actualiza la fila de video correspondiente a *listo* y guarda el *Playback ID* con el que luego Astro visualizará `<mux-player>`.

A continuación procedemos con la configuración:

## 1. Diseño de Tabla Base en Supabase

Esta tabla mantendrá unidos a nuestros usuarios y los Playback IDs de Mux:

```sql
create table public.videos (
  id uuid default uuid_generate_v4() primary key,
  usuario_id uuid references public.perfiles(id),
  titulo text,
  mux_asset_id text,
  mux_playback_id text,
  estado varchar default 'preparando', -- puede ser: preparando, procesando, listo, error
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Políticas para permitir lecturas controladas (Ej: Ver solo videos listos)
alter table public.videos enable row level security;
create policy "Videos listos son públicos." on videos for select using (estado = 'listo');
```

## 2. Configuración en la Plataforma de Mux

1. Crea una cuenta/inicia en [Mux](https://mux.com/).
2. Navega al **Dashboard > Settings > API Environments**.
3. Selecciona tu Environment (ej: Development) e indica **"Generate new token"**. 
4. Dale permisos absolutos de lectura y escritura de videos.
5. Copia el **Token ID** y el **Token Secret** para guardarlos en tus variables de entorno locales y en Vercel llegado el momento.

## 3. Crear una Edge Function (Webhook) en Supabase 

Para conectar la bajada de Webhooks desde Mux, usaremos **Supabase Edge Functions** (que operan en la capa sin servidor basada en Deno).

1. Inicia sesión en la CLI local de Supabase:
   ```bash
   npx supabase init
   npx supabase login
   ```
2. Genera una función llamada `mux-webhook`:
   ```bash
   npx supabase functions new mux-webhook
   ```
3. Edita el archivo en `supabase/functions/mux-webhook/index.ts` usando este esqueleto base:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// SDK de mux
import Mux from 'https://esm.sh/@mux/mux-node@7'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 

const supabase = createClient(supabaseUrl, supabaseKey)
const webhookSecret = Deno.env.get('MUX_WEBHOOK_SECRET') ?? ''

serve(async (req) => {
  const signature = req.headers.get('mux-signature')
  
  if (!signature) {
    return new Response('Missing signature', { status: 401 })
  }

  const payload = await req.text()
  
  try {
    // Verificar que viene de Mux de verdad y que no es un atacante
    Mux.Webhooks.verifyHeader(payload, signature, webhookSecret)
  } catch (err) {
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(payload)

  // Acciones en la BD relativas al evento de cuando un video finaliza
  if (event.type === 'video.asset.ready') {
    const assetId = event.data.id
    
    // Obtener Playback ID para luego inyectarlo al componente
    const playbackId = event.data.playback_ids?.find((p: any) => p.policy === 'public')?.id

    const { error } = await supabase
      .from('videos')
      .update({ 
        estado: 'listo',
        mux_playback_id: playbackId 
      })
      .eq('mux_asset_id', assetId)

    if (error) {
      console.error("Error BD: ", error)
      return new Response('Error actualizando la base de datos', { status: 500 })
    }
  }

  return new Response('Webhook en orden', { status: 200 })
})
```

## 4. Conectar la Función con Mux 

1. Despliega la Edge Function a tu ecosistema remoto de Supabase (te generará una URL pública de la function `https://<REF>.supabase.co/functions/v1/mux-webhook`):
   ```bash
   npx supabase functions deploy mux-webhook
   ```

2. De vuelta al panel de configuración de Mux, ve a **Settings > Webhooks**.
3. Haz clic en **"Create Webhook"**.
4. Pega la URL de tu Edge Function de Supabase. Te generará un "Signing Secret" para ese webhook.
5. Inyecta ese secreto a la configuración de servidores de tu Supabase usando la CLI:
   ```bash
   npx supabase secrets set MUX_WEBHOOK_SECRET=tu_secrete_generado
   ```

## 5. Mostrando el Video y Tiempo Real

Con este circuito finalizado, tu frontend de Astro se ve beneficiado: 

1. Astro puede leer la base de datos de supabase indicando `select * from videos`.
2. Supabase *Realtime* le avisará al cliente automáticamente si el estado pasó a estar `listo`.
3. Astro lo muestra con simplicidad apoyándose del playback actual en vivo vía: 

```html
<!-- Native Web Component de Mux -->
<mux-player
  playback-id="ID_RECUPERADO_DE_SUPABASE"
  metadata-video-title="Mi Título"
></mux-player>
```
Con eso completas un flujo robusto de cero configuración de servidores físicos para Video Bajo Demanda (VOD).
