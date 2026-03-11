-- ==================================================================
-- Tabla para registrar los seguimientos de usuario a instructores
-- ==================================================================
-- Un usuario puede "seguir" a un instructor (por nombre).
-- Esto permite filtrar el catálogo de vídeos mostrando solo los de
-- los instructores seguidos.
-- ==================================================================

CREATE TABLE public.seguimientos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instructor_nombre text NOT NULL,       -- Nombre del instructor tal como aparece en la tabla videos
  creado_en timestamp with time zone DEFAULT now(),
  UNIQUE(usuario_id, instructor_nombre)  -- Un usuario solo puede seguir una vez a cada instructor
);

-- Índice para consultas rápidas de "¿a quién sigue este usuario?"
CREATE INDEX idx_seguimientos_usuario ON public.seguimientos(usuario_id);

-- Índice para consultas rápidas de "¿cuántos seguidores tiene este instructor?"
CREATE INDEX idx_seguimientos_instructor ON public.seguimientos(instructor_nombre);

-- =====================
-- Políticas RLS
-- =====================
ALTER TABLE public.seguimientos ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propios seguimientos
CREATE POLICY "Usuarios pueden ver sus seguimientos."
  ON public.seguimientos FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Los usuarios pueden insertar seguimientos propios
CREATE POLICY "Usuarios pueden seguir instructores."
  ON public.seguimientos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Los usuarios pueden dejar de seguir (borrar) sus propios seguimientos
CREATE POLICY "Usuarios pueden dejar de seguir."
  ON public.seguimientos FOR DELETE
  TO authenticated
  USING (auth.uid() = usuario_id);
