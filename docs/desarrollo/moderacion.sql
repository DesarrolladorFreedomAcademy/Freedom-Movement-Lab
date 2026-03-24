-- ==========================================
-- SISTEMA DE MODERACIÓN Y DENUNCIAS
-- ==========================================

-- 1. Ampliar el perfil de usuario para manejar sanciones
-- Añadimos campos para rastrear el estado de la cuenta y suspensiones
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS suspension_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS warnings_count INTEGER DEFAULT 0;

-- 2. Nueva tabla de denuncias (forum_reports)
CREATE TABLE public.forum_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    thread_id UUID REFERENCES public.forum_threads(id) ON DELETE SET NULL,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    verdict TEXT DEFAULT 'none' CHECK (verdict IN ('none', 'warning', 'suspension', 'ban', 'dismissed')),
    verdict_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verdict_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ACTIVAR RLS Y POLÍTICAS
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden crear sus propias denuncias
CREATE POLICY "Cualquier usuario autenticado puede denunciar" ON public.forum_reports
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- Solo el Staff (Admin/Trainer) puede ver la lista de denuncias
CREATE POLICY "Staff puede ver denuncias" ON public.forum_reports
    FOR SELECT TO authenticated USING (public.is_staff());

-- Solo el Staff puede actualizar denuncias (para emitir veredictos)
CREATE POLICY "Staff puede gestionar denuncias" ON public.forum_reports
    FOR UPDATE TO authenticated USING (public.is_staff());

-- 4. VISTA PARA EL PANEL DE CONTROL
-- Facilita mostrar nombres, avatares y el contenido denunciado
CREATE OR REPLACE VIEW public.vw_forum_reports AS
SELECT 
    r.*,
    p_reporter.nombre AS reporter_name,
    p_reporter.avatar_url AS reporter_avatar,
    p_reported.nombre AS reported_name,
    p_reported.avatar_url AS reported_avatar,
    t.title AS thread_title,
    p_post.content AS post_content
FROM public.forum_reports r
JOIN public.perfiles p_reporter ON r.reporter_id = p_reporter.id
JOIN public.perfiles p_reported ON r.reported_user_id = p_reported.id
LEFT JOIN public.forum_threads t ON r.thread_id = t.id
LEFT JOIN public.forum_posts p_post ON r.post_id = p_post.id;

-- 5. Habilitar Realtime para el Panel de Control
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_reports;
