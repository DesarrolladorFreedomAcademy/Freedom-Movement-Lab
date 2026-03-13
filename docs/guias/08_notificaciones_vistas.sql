-- ==================================================================
-- Tabla para registrar qué notificaciones de vídeo ha visto el usuario
-- ==================================================================
-- Cuando un usuario pulsa "Marcar como vistas" en las notificaciones,
-- se inserta un registro por cada vídeo que estaba como "nuevo".
-- Así, la próxima vez que se carguen notificaciones, esos vídeos
-- ya no aparecerán resaltados como nuevos.
-- ==================================================================

CREATE TABLE public.notificaciones_vistas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  visto_en timestamp with time zone DEFAULT now(),
  UNIQUE(usuario_id, video_id)  -- Un registro por usuario y vídeo
);

-- Índice para consultas rápidas
CREATE INDEX idx_noti_vistas_usuario ON public.notificaciones_vistas(usuario_id);

-- =====================
-- Políticas RLS
-- =====================
ALTER TABLE public.notificaciones_vistas ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propias lecturas
CREATE POLICY "Usuarios pueden ver sus notificaciones vistas."
  ON public.notificaciones_vistas FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Los usuarios pueden insertar (marcar como vistas)
CREATE POLICY "Usuarios pueden marcar notificaciones como vistas."
  ON public.notificaciones_vistas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Los usuarios pueden borrar sus propias lecturas (por si se quiere "des-marcar")
CREATE POLICY "Usuarios pueden desmarcar notificaciones."
  ON public.notificaciones_vistas FOR DELETE
  TO authenticated
  USING (auth.uid() = usuario_id);
