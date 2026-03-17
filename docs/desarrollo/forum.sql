-- ==========================================
-- SCRIPT DE REVERSIÓN Y ACTUALIZACIÓN (FINAL)
-- ==========================================

-- 1. REVERTIR (ELIMINAR) TABLAS Y VISTAS ANTERIORES
DROP VIEW IF EXISTS public.vw_forum_posts CASCADE;
DROP VIEW IF EXISTS public.vw_forum_threads CASCADE;

DROP TABLE IF EXISTS public.forum_posts CASCADE;
DROP TABLE IF EXISTS public.forum_threads CASCADE;
DROP TABLE IF EXISTS public.forum_categories CASCADE;


-- ==========================================
-- 2. CREACIÓN DE LAS NUEVAS TABLAS
-- ==========================================

CREATE TABLE public.forum_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.forum_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.forum_categories(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- 3. SEGURIDAD Y POLÍTICAS (RLS)
-- ==========================================
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura (Públicas)
CREATE POLICY "Tarjetas de categoría visibles por todos" ON public.forum_categories FOR SELECT USING (true);
CREATE POLICY "Hilos visibles por todos" ON public.forum_threads FOR SELECT USING (true);
CREATE POLICY "Respuestas visibles por todos" ON public.forum_posts FOR SELECT USING (true);

-- Políticas de inserción (Autenticados)
CREATE POLICY "Usuarios autenticados pueden insertar hilos" ON public.forum_threads
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios autenticados pueden insertar posts" ON public.forum_posts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Políticas de edición
CREATE POLICY "Autores pueden editar sus posts" ON public.forum_posts 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS DE BORRADO (Autores y Staff)
-- Función auxiliar para check de staff (admin o instructor)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol IN ('admin', 'instructor')
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Autores y Staff pueden borrar hilos" ON public.forum_threads
    FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_staff());

CREATE POLICY "Autores y Staff pueden borrar posts" ON public.forum_posts
    FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_staff());


-- ==========================================
-- 4. VISTAS PARA ACCEDER A METADATOS Y ROLES
-- ==========================================

CREATE OR REPLACE VIEW public.vw_forum_threads AS
SELECT 
    t.id,
    t.category_id,
    t.title,
    t.created_at,
    t.user_id,
    COALESCE(p.nombre, split_part(u.email, '@', 1), 'Usuario') AS author_name,
    p.avatar_url AS author_avatar,
    COALESCE(p.rol, 'usuario') AS author_role
FROM public.forum_threads t
JOIN auth.users u ON t.user_id = u.id
LEFT JOIN public.perfiles p ON t.user_id = p.id;

CREATE OR REPLACE VIEW public.vw_forum_posts AS
SELECT 
    p.id,
    p.thread_id,
    p.content,
    p.created_at,
    p.user_id,
    COALESCE(p_profile.nombre, split_part(u.email, '@', 1), 'Usuario') AS author_name,
    p_profile.avatar_url AS author_avatar,
    COALESCE(p_profile.rol, 'usuario') AS author_role
FROM public.forum_posts p
JOIN auth.users u ON p.user_id = u.id
LEFT JOIN public.perfiles p_profile ON p.user_id = p_profile.id;


-- ==========================================
-- 5. DATOS DE INICIALIZACIÓN
-- ==========================================
INSERT INTO public.forum_categories (name, description) 
VALUES ('General', 'Discusiones generales sobre parkour y la plataforma')
-- ==========================================
-- 6. HABILITAR REALTIME
-- ==========================================
-- Esto permite que Supabase envíe eventos INSERT/UPDATE/DELETE al cliente Astro
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
