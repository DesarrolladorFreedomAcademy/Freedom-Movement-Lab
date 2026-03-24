-- ======================================================
-- SISTEMA DE NOTIFICACIONES PARA MODERACIÓN
-- ======================================================

-- 1. Tabla para registrar notificaciones individuales por staff
-- Esto permite que cada admin/trainer marque sus notificaciones como leídas
CREATE TABLE IF NOT EXISTS public.forum_report_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.forum_reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Miembro del Staff
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Función Trigger para notificar a todo el Staff
-- Se activa cada vez que alguien pulsa el botón de "Denunciar"
CREATE OR REPLACE FUNCTION public.notify_staff_on_report()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertamos una notificación para cada perfil con rol admin o instructor
    INSERT INTO public.forum_report_notifications (report_id, user_id)
    SELECT NEW.id, p.id
    FROM public.perfiles p
    WHERE p.rol IN ('admin', 'instructor');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el Trigger vinculado a la tabla forum_reports
DROP TRIGGER IF EXISTS trigger_notify_staff_on_report ON public.forum_reports;
CREATE TRIGGER trigger_notify_staff_on_report
AFTER INSERT ON public.forum_reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_on_report();

-- 4. RLS para las notificaciones
ALTER TABLE public.forum_report_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede ver sus propias notificaciones."
    ON public.forum_report_notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Staff puede actualizar sus propias notificaciones."
    ON public.forum_report_notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Habilitar Realtime para alertas instantáneas en la campana
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_report_notifications;
