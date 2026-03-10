-- 1. Permite a los usuarios actualizar sus propios videos
CREATE POLICY "Usuarios pueden actualizar sus propios videos."
  ON public.videos FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- 2. Permite a los usuarios borrar sus propios videos
CREATE POLICY "Usuarios pueden borrar sus propios videos."
  ON public.videos FOR DELETE
  TO authenticated
  USING (auth.uid() = usuario_id);
