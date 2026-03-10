-- 1. Crear el bucket llamado 'avatars' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Permitir acceso público de lectura (select) a las imágenes
CREATE POLICY "Avatars images are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

-- 3. Permitir que usuarios logueados suban imágenes
CREATE POLICY "Anyone can upload an avatar."
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'avatars' );

-- 4. Permitir que los usuarios actualicen sus imágenes
CREATE POLICY "Anyone can update their avatar."
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ( bucket_id = 'avatars' );

-- 5. Permitir que borren sus imágenes
CREATE POLICY "Anyone can delete their avatar."
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( bucket_id = 'avatars' );
