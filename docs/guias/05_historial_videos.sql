-- Tabla para registrar el progreso y visualizaciones de vídeos
CREATE TABLE public.historial_videos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  tiempo_actual integer DEFAULT 0,
  completado boolean DEFAULT false,
  actualizado_en timestamp with time zone DEFAULT now(),
  UNIQUE(usuario_id, video_id) -- Un único registro por usuario y vídeo
);

-- Políticas RLS
ALTER TABLE public.historial_videos ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden elegir (SELECT) su propio historial
CREATE POLICY "Usuarios pueden ver su propio historial."
  ON public.historial_videos FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Los usuarios pueden insertar (INSERT) en su propio historial
CREATE POLICY "Usuarios pueden insertar en su propio historial."
  ON public.historial_videos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Los usuarios pueden actualizar (UPDATE) su propio historial
CREATE POLICY "Usuarios pueden actualizar su propio historial."
  ON public.historial_videos FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);
