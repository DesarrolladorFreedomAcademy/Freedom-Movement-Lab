-- ==========================================
-- FEATURE: QUEDADAS Y UBICACIÓN EN FORO
-- ==========================================

-- 1. Crear categoría "Quedadas" si no existe
INSERT INTO public.forum_categories (name, description)
SELECT 'Quedadas', 'Organiza y encuentra entrenamientos y eventos grupales'
WHERE NOT EXISTS (
    SELECT 1 FROM public.forum_categories WHERE name = 'Quedadas'
);

-- 2. Agregar columnas de ubicación a forum_posts
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS location_lat NUMERIC(10, 8);
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS location_lng NUMERIC(11, 8);
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS location_address TEXT;

-- 3. Actualizar la vista vw_forum_posts para incluir las nuevas columnas
DROP VIEW IF EXISTS public.vw_forum_posts;
CREATE OR REPLACE VIEW public.vw_forum_posts AS
SELECT 
    p.id,
    p.thread_id,
    p.content,
    p.created_at,
    p.user_id,
    p.location_lat,
    p.location_lng,
    p.location_address,
    COALESCE(p_profile.nombre, split_part(u.email, '@', 1), 'Usuario') AS author_name,
    p_profile.avatar_url AS author_avatar,
    COALESCE(p_profile.rol, 'usuario') AS author_role
FROM public.forum_posts p
JOIN auth.users u ON p.user_id = u.id
LEFT JOIN public.perfiles p_profile ON p.user_id = p_profile.id;

-- Aviso: Recuerda que las políticas (RLS) en forum_posts ya permiten a los autores 
-- y autenticados insertar y actualizar sus propios posts, así que estas columnas
-- heredan esos permisos para ser modificadas.
