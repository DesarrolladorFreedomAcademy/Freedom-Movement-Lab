# Freedom Movement Lab — VOD Platform

Plataforma de vídeos bajo demanda (VOD) para Freedom Movement Lab. Permite subir, gestionar y visualizar vídeos de entrenamiento con autenticación de usuarios, seguimiento de progreso y historial de reproducción.

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | [Astro](https://astro.build) |
| Autenticación & Base de datos | [Supabase](https://supabase.com) |
| Almacenamiento de vídeo | [Mux](https://mux.com) |
| Estilos | Tailwind CSS |
| Despliegue de Edge Functions | Supabase Edge Functions (Deno) |

## 📁 Estructura del Proyecto

```
/
├── docs/
│   ├── guias/                   # Scripts SQL para configurar Supabase
│   │   ├── 01_*.sql             # Políticas RLS base de videos
│   │   ├── 02_*.sql             # ...
│   │   ├── 03_*.sql             # RLS para editar/borrar videos
│   │   ├── 04_*.sql             # Bucket de avatares
│   │   ├── 05_*.sql             # Tabla historial_videos
│   │   └── 06_*.sql             # Columna visualizaciones + RPC
│   └── arquitectura/            # Documentación de arquitectura
│
├── public/                      # Assets estáticos
│
├── src/
│   ├── components/
│   │   └── Nav.astro            # Barra de navegación
│   ├── layouts/
│   │   └── Layout.astro         # Layout base
│   ├── lib/
│   │   └── supabase.ts          # Cliente de Supabase
│   ├── pages/
│   │   ├── index.astro          # Página de inicio
│   │   ├── login.astro          # Login con Supabase Auth
│   │   ├── catalogo.astro       # Catálogo de vídeos
│   │   ├── reproductor.astro    # Reproductor + capítulos + progreso
│   │   ├── perfil.astro         # Perfil + subida de vídeos
│   │   └── api/
│   │       └── upload-video.ts  # Endpoint API para crear upload en Mux
│   └── styles/
│       └── global.css
│
└── supabase/
    └── functions/
        └── mux-webhook/         # Edge Function: recibe eventos de Mux
            └── index.ts
```

## ⚙️ Configuración del entorno

Crea un archivo `.env` en la raíz con las siguientes variables:

```env
PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxxx
MUX_TOKEN_ID=xxxx
MUX_TOKEN_SECRET=xxxx
```

> **Nunca** subas el `.env` a GitHub. Ya está en el `.gitignore`.

## 🗄️ Configuración de Supabase

Ejecuta los scripts SQL en orden desde **Supabase → SQL Editor**:

1. `docs/guias/01_...sql` — Políticas RLS base
2. `docs/guias/02_...sql` — ...
3. `docs/guias/03_actualizar_borrar_videos_rls.sql` — Editar/borrar vídeos
4. `docs/guias/04_crear_y_configurar_bucket_avatars.sql` — Bucket de avatares
5. `docs/guias/05_historial_videos.sql` — Tabla de historial de reproducción
6. `docs/guias/06_visualizaciones_videos.sql` — Contador de visualizaciones

## 🎬 Configuración de Mux Webhook

La función `supabase/functions/mux-webhook` debe estar desplegada y el Secret debe estar configurado:

```bash
# Desplegar la función
npx supabase functions deploy mux-webhook --no-verify-jwt

# Configurar el secreto del webhook de Mux
npx supabase secrets set MUX_WEBHOOK_SECRET=whsec_xxxx
```

En el panel de Mux, añade el endpoint:
```
https://<tu-proyecto>.supabase.co/functions/v1/mux-webhook
```

Con los eventos: `video.asset.ready`, `video.upload.asset_created`, `video.asset.errored`

## 🧞 Comandos

```bash
npm install        # Instalar dependencias
npm run dev        # Servidor de desarrollo en localhost:4321
npm run build      # Build de producción
npm run preview    # Vista previa del build
```

## ✨ Funcionalidades

- 🔐 **Autenticación** con email/contraseña via Supabase Auth
- 👤 **Perfil editable** — nombre y foto de perfil
- 📹 **Subida de vídeos** directamente a Mux con procesado automático
- ▶️ **Reproductor** con capítulos automáticos desde la descripción
- 📊 **Conteo real de visualizaciones** (se registra al dar Play, no al cargar)
- 🕓 **Historial "Seguir Viendo"** — guarda el minuto exacto de cada usuario
- ✅ **Marcar como completado** por usuario
- ✏️ **Edición y borrado** de vídeos propios
