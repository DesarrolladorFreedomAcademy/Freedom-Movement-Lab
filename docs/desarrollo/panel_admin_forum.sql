-- ==========================================
-- ACTUALIZACIÓN: PERMISOS PARA ADMIN EN FORO
-- ==========================================

-- 1. Función para verificar si un usuario es administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Asegurar que las políticas públicas siguen vigentes para lectura
-- (Ya debe existir "Tarjetas de categoría visibles por todos", se deja por si acaso)
DROP POLICY IF EXISTS "Tarjetas de categoría visibles por todos" ON public.forum_categories;
CREATE POLICY "Tarjetas de categoría visibles por todos" ON public.forum_categories FOR SELECT USING (true);

-- 3. Políticas para que los administradores gestionen categorías
DROP POLICY IF EXISTS "Administradores pueden crear categorías" ON public.forum_categories;
CREATE POLICY "Administradores pueden crear categorías" ON public.forum_categories
    FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Administradores pueden actualizar categorías" ON public.forum_categories;
CREATE POLICY "Administradores pueden actualizar categorías" ON public.forum_categories
    FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Administradores pueden eliminar categorías" ON public.forum_categories;
CREATE POLICY "Administradores pueden eliminar categorías" ON public.forum_categories
    FOR DELETE TO authenticated USING (public.is_admin());

-- 4. Habilitar realtime para las categorías
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_categories;
