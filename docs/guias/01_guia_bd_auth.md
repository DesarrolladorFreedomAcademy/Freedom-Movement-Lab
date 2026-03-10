# Guía: Configuración de Base de Datos y Google Auth con Supabase

Esta guía detalla los pasos para configurar la base de datos en Supabase y habilitar la autenticación con Google para la aplicación.

## 1. Configuración del Proyecto en Supabase

1. Crea una cuenta o inicia sesión en [Supabase](https://supabase.com/).
2. Haz clic en **"New Project"**.
3. Selecciona tu organización, dale un nombre al proyecto y define una contraseña fuerte para la base de datos.
4. Selecciona la región más cercana a tus usuarios (ej. Europa central si tu audiencia es española) y haz clic en "Create new project". Espera unos minutos a que se inicie la base de datos.

## 2. Modelado de la Base de Datos

Necesitaremos tablas para manejar los perfiles de los usuarios que hagan login. Ve a **"SQL Editor"** en Supabase y ejecuta el siguiente script:

```sql
-- Tabla para registrar información pública/extendida del usuario
create table public.perfiles (
  id uuid references auth.users not null primary key,
  nombre text,
  avatar_url text,
  rol text default 'usuario',
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Row Level Security) para proteger los datos
alter table public.perfiles enable row level security;

-- Políticas de seguridad para lectura y actualización
create policy "Los perfiles pueden ser públicos." on perfiles for select using (true);
create policy "Los usuarios pueden actualizar su propio perfil." on perfiles for update using (auth.uid() = id);

-- Trigger para crear un perfil automáticamente al hacer Signup/Login
create function public.manejar_nuevo_usuario()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute procedure public.manejar_nuevo_usuario();
```

## 3. Configuración de Google Cloud para Autenticación

Para que los usuarios puedan iniciar sesión mediante Google:

1. Ve a la [Consola de Google Cloud](https://console.cloud.google.com/).
2. Crea un **Nuevo Proyecto**.
3. Ve a la sección **APIs & Services > OAuth consent screen**.
   - Elige el tipo de usuario **External** y dale a Create.
   - Completa la información solicitada: Nombre de la App, correo de soporte, etc.
   - Añade tu dominio o simplemente continúa asegurándote de rellenar los datos obligatorios.
4. Ve a **APIs & Services > Credentials**.
   - Haz clic en **"Create Credentials"** y selecciona **"OAuth client ID"**.
   - Tipo de aplicación: **Web application**.
   - En **Authorized JavaScript origins**, añade las URLs de tu sitio local (`http://localhost:4321` para Astro) y también la URL final de Vercel.
   - En **Authorized redirect URIs**, deberás pegar la Callback URL que nos dará Supabase en el paso 4.
5. ¡Listo! Copia el **Client ID** y el **Client Secret** que se habrán generado. 

## 4. Habilitar Google Auth en Supabase

1. En tu proyecto de Supabase, entra a la pestaña **Authentication**, y luego a **Providers**.
2. Despliega la opción de **Google** y actívala (Turn on).
3. Pega el **Client ID** y el **Client Secret** que extrajimos de Google Cloud.
4. Debajo de estos campos aparecerá el **Callback URL (for OAuth)**. Copia esta URL, vuelve a la Consola de Google Cloud y añádela en la sección de *Authorized redirect URIs* (paso 3.4).
5. Ve a Save y guarda los cambios en Supabase.

## 5. Integración Básica con Astro

En el proyecto de Astro, hay que conectar el entorno para procesar los logins.

**1.** Instala la librería de Supabase:
```bash
npm install @supabase/supabase-js
```

**2.** Configura las variables en `.env`:
```env
PUBLIC_SUPABASE_URL=tu_url_del_proyecto_supabase
PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

**3.** Ejemplo de inicialización de sesión para el cliente:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Función para invocar el inicio de sesión
export async function loginConGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:4321/dashboard' // Cambiar en producción o dinámicamente
    }
  })
}
```
Con estos pasos tendrás la Base de datos y el motor Google Auth 100% operativos.
