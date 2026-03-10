-- 1. Añadir columna visualizaciones a la tabla videos (si no existe ya)
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS visualizaciones integer DEFAULT 0 NOT NULL;

-- 2. Crear función RPC para incrementar visualizaciones de forma atómica
--    (evita condiciones de carrera si dos usuarios abren el mismo video a la vez)
CREATE OR REPLACE FUNCTION incrementar_visualizacion(video_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del creador de la función, no del usuario
AS $$
BEGIN
  UPDATE public.videos
  SET visualizaciones = visualizaciones + 1
  WHERE id = video_uuid;
END;
$$;

-- 3. Permitir que cualquier usuario (incluso anónimo) pueda llamar a esta función
GRANT EXECUTE ON FUNCTION incrementar_visualizacion(uuid) TO anon, authenticated;
