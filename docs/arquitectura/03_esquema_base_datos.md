# Esquema de Base de Datos para Freedom VOD

Basándome en los mockups de la aplicación web de Escritorio (Inicio, Catálogo, Player y Perfil), he diseñado la estructura relacional de la base de datos en Supabase (PostgreSQL). Este esquema abarca desde el contenido VOD hasta la gamificación y estadísticas del usuario.

## 1. Usuarios y Perfiles (Instructores y Alumnos)

La tabla `perfiles` se extiende para alojar las estadísticas, el nivel del usuario (gamificación), membresías PRO e información extra si es un Instructor.

```sql
create table public.perfiles (
  id uuid references auth.users not null primary key,
  nombre text,
  avatar_url text,
  rol text default 'usuario', -- 'usuario', 'instructor', 'admin'
  -- Perfil y Gamificación
  titulo_nivel text default 'Principiante', -- ej: 'Traceur de Élite'
  rango_global int, -- Puesto global, ej. 124
  es_pro boolean default false,
  -- Estadísticas de Entrenamiento
  horas_entrenamiento numeric(10,2) default 0,
  racha_semanal int default 0,
  mejor_racha int default 0,
  habilidades_dominadas int default 0,
  -- Opcional (Si el usuario es Instructor)
  bio_instructor text,
  seguidores_count int default 0,
  
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla para que los usuarios sigan a Instructores
create table public.seguidores_instructor (
  id bigint generated always as identity primary key,
  seguidor_id uuid references public.perfiles(id),
  instructor_id uuid references public.perfiles(id),
  creado_en timestamp with time zone default now(),
  unique(seguidor_id, instructor_id)
);
```

## 2. Taxonomías: Categorías y Dificultad

En el catálogo se puede filtrar por "Dificultad", "Categoría", e "Instructor".

```sql
create table public.dificultades (
  id varchar(50) primary key, -- 'PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO', 'EXPERTO'
  nivel int not null -- 1, 2, 3, 4 para orden
);

create table public.categorias (
  id varchar(50) primary key, -- 'parkour', 'tricking', 'fuerza', 'mentalidad'
  nombre_display text not null
);
```

## 3. Contenido VOD: Módulos, Videos y Capítulos

Las lecciones pertenecen a Módulos/Cursos (ej. "Bases del Flow - MÓDULO 3"). Dentro del video existen "Capítulos" (Timecodes).

```sql
-- Módulos / Cursos (Opcional, si un video pertenece a una serie)
create table public.modulos (
  id uuid default uuid_generate_v4() primary key,
  titulo text not null,
  descripcion text
);

-- Tabla Principal de Videos
create table public.videos (
  id uuid default uuid_generate_v4() primary key,
  instructor_id uuid references public.perfiles(id),
  modulo_id uuid references public.modulos(id), -- Nullable si es un taller individual
  -- Metadatos
  titulo text not null,
  descripcion text,
  dificultad_id varchar(50) references public.dificultades(id),
  categoria_id varchar(50) references public.categorias(id),
  etiquetas text[], -- ej: ['Bases del parkour']
  -- Metadatos de visualización
  duracion_segundos int default 0,
  vistas_count bigint default 0,
  rating numeric(3,2), -- ej. 4.9
  -- Integración Mux
  mux_asset_id text,
  mux_playback_id text,
  estado varchar default 'preparando',
  creado_en timestamp with time zone default now()
);

-- Capítulos / Marcas de tiempo de un video
create table public.video_capitulos (
  id uuid default uuid_generate_v4() primary key,
  video_id uuid references public.videos(id) on delete cascade,
  titulo text not null,
  inicio_segundos int not null,
  orden int not null
);
```

## 4. Biblioteca del Usuario (Guardados y Progreso)

Maneja "+ Mi Lista" ("Favoritos") y también el tracking de "Marcar como Completado" y el Historial de Visualización.

```sql
-- "Mi Lista" o Favoritos
create table public.mi_lista (
  id uuid default uuid_generate_v4() primary key,
  usuario_id uuid references public.perfiles(id) on delete cascade,
  video_id uuid references public.videos(id) on delete cascade,
  creado_en timestamp with time zone default now(),
  unique(usuario_id, video_id)
);

-- Historial y Progreso del video
create table public.progreso_video (
  id uuid default uuid_generate_v4() primary key,
  usuario_id uuid references public.perfiles(id) on delete cascade,
  video_id uuid references public.videos(id) on delete cascade,
  estado_progreso varchar(20), -- 'viendo', 'completado'
  es_practica boolean default false, -- Diferenciar "Lección VOD" vs "Sesión de práctica"
  completado_en timestamp with time zone,
  ultimo_acceso timestamp with time zone default now(),
  unique(usuario_id, video_id)
);
```

## 5. Gamificación: Logros y Progreso de Habilidades

La vista de perfil del usuario posee "Mis Logros" (Badges como *Maestro del Backflip*) y el Progreso de Habilidades específicas en %.

```sql
-- Catálogo de Logros disponibles en la plataforma
create table public.logros (
  id varchar(50) primary key, -- 'maestro_backflip'
  titulo text not null,
  descripcion text,
  icono_url text
);

-- Logros desbloqueados por el usuario
create table public.logros_usuario (
  id uuid default uuid_generate_v4() primary key,
  usuario_id uuid references public.perfiles(id) on delete cascade,
  logro_id varchar(50) references public.logros(id) on delete cascade,
  desbloqueado_en timestamp with time zone default now(),
  unique(usuario_id, logro_id)
);

-- Catálogo de Habilidades Puras (Ej: 'Vaulting', 'Wall Runs')
create table public.habilidades_tecnicas (
  id varchar(50) primary key,
  nombre_display text not null
);

-- Progreso del usuario por habilidad en porcentaje (%)
create table public.progreso_habilidades_usuario (
  id uuid default uuid_generate_v4() primary key,
  usuario_id uuid references public.perfiles(id) on delete cascade,
  habilidad_id varchar(50) references public.habilidades_tecnicas(id) on delete cascade,
  porcentaje_completado int default 0 check (porcentaje_completado >= 0 and porcentaje_completado <= 100),
  actualizado_en timestamp with time zone default now(),
  unique(usuario_id, habilidad_id)
);
```

## Resumen de la Lógica de Negocio

1. **Dashboard Home**: Se construye realizando un `JOIN` de `videos` con `modulos` y `dificultades`.
2. **Dashboard Perfil**: Agrupa la cuenta de `progreso_video` para calcular "Historial de Entrenamiento", sumar las horas y calcular rachas. A su vez cruza las tablas de `logros_usuario` y `progreso_habilidades_usuario`.
3. **Catálogo VOD**: Usa `SELECT * FROM videos` aplicando filtros dinámicos (WHERE) `dificultad_id = X` e `instructor_id = Y`.
4. **Reproductor (Player)**: Lee la URL del video basada en `mux_playback_id`. Muestra en lateral un `SELECT * FROM video_capitulos WHERE video_id = X ORDER BY orden`. Además cruza datos de `perfiles` para la tarjeta de autor ("Alex Freedom - Lead Parkour Instructor").
