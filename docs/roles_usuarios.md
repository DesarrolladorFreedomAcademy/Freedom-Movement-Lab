# Roles de Usuario - Freedom Movement Lab
# Archivo de referencia para la gestión de roles en Supabase

## ROLES DISPONIBLES

Los roles se almacenan en la columna `rol` de la tabla `public.perfiles`.

| Rol          | Valor en BD    | Acceso                                                         |
|--------------|----------------|----------------------------------------------------------------|
| Usuario      | usuario        | Visualizar vídeos, marcar completados, acceder al catálogo     |
| Instructor   | instructor     | Todo lo anterior + subir vídeos al catálogo                    |
| Admin        | admin          | Todo lo anterior + gestión completa de usuarios y contenido    |

---

## CÓMO CAMBIAR EL ROL DE UN USUARIO (Supabase Dashboard)

1. Entra en tu proyecto de Supabase: https://app.supabase.com
2. Ve a la sección: Table Editor → Tabla "perfiles"
3. Encuentra la fila del usuario por su `id` o por `nombre`
4. Edita el campo `rol` y escribe uno de los valores de la tabla de arriba:
   - `usuario`        → Rol por defecto, acceso básico
   - `instructor`     → Puede subir vídeos
   - `admin`          → Acceso total

---

## CÓMO CAMBIAR EL ROL VÍA SQL (Supabase SQL Editor)

Si prefieres hacerlo via SQL, ve a SQL Editor y ejecuta:

-- Cambiar a Instructor (reemplaza el email del usuario):
UPDATE public.perfiles
SET rol = 'instructor'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'email_del_usuario@ejemplo.com'
);

-- Cambiar a Admin:
UPDATE public.perfiles
SET rol = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'email_del_usuario@ejemplo.com'
);

-- Volver a Usuario normal:
UPDATE public.perfiles
SET rol = 'usuario'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'email_del_usuario@ejemplo.com'
);

---

## COMPORTAMIENTO EN LA APLICACIÓN

- `usuario`    → Ve el perfil, catalogó y su entrenamiento. No ve el panel de subida.
- `instructor` → Además del acceso de usuario, ve el "Panel de Instructor" en su perfil
                 con formulario para subir vídeos y monitorizar el estado de procesado.
- `admin`      → Igual que instructor. En el futuro se añadirán paneles de gestión exclusivos.

---

## NOTA DE SEGURIDAD

El rol se verifica en el cliente (JavaScript del navegador) para controlar la visibilidad
del panel de subida. Sin embargo, la autorización real ocurre en el servidor:

- El endpoint `/api/upload-video` en Astro valida la sesión antes de crear URLs de Mux.
- Las políticas RLS de Supabase evitan que usuarios sin permiso inserten o editen registros.
- Para mayor seguridad en el futuro, se puede añadir una verificación del rol en el
  endpoint de API consultando la tabla `perfiles` antes de generar la URL de subida.
