# Pruebas de Integración Stripe – Freedom Movement Lab

> Todas las pruebas se realizan en entorno local con `netlify dev` activo.
> URL base: `http://localhost:8888`
> Tarjeta de prueba Stripe: `4242 4242 4242 4242` · Exp: cualquier fecha futura · CVC: cualquier 3 dígitos

---

## PRUEBA 1 – Página de Precios (usuario no logueado)

**Objetivo:** Verificar que un usuario no autenticado ve la página de precios con el botón correcto.

**Precondiciones:**
- Ningún usuario activo en la sesión del navegador (o abrir en incógnito).

**Pasos:**
1. Abrir el navegador y navegar a `http://localhost:8888/precios`.
2. Observar la tarjeta de precio.

**Resultado esperado:**
- Se muestra la tarjeta del "Plan Freedom Pro" con un precio visible (9,99€/mes).
- El botón CTA dice **"Inicia sesión para suscribirte"** y enlaza a `/login`.
- No aparece ningún error en consola del navegador.

---

## PRUEBA 2 – Página de Precios (usuario logueado sin suscripción)

**Objetivo:** Verificar que un usuario autenticado pero sin suscripción ve el botón de activar plan.

**Precondiciones:**
- Usuario registrado en la plataforma con `tiene_acceso = false` en la tabla `perfiles`.
- Sesión iniciada.

**Pasos:**
1. Iniciar sesión con una cuenta de usuario normal (rol `usuario`).
2. Navegar a `http://localhost:8888/precios`.
3. Observar el botón CTA.

**Resultado esperado:**
- El botón CTA dice **"Activar Plan Pro"** (azul, con ícono de rayo).
- No aparece la tarjeta de "plan activo".
- No aparece el botón de "Gestionar mi suscripción".

---

## PRUEBA 3 – Flujo completo de suscripción (pago de prueba)

**Objetivo:** Verificar que el checkout de Stripe funciona y que el webhook actualiza Supabase.

**Precondiciones:**
- Usuario logueado con `tiene_acceso = false`.
- El servidor local `netlify dev` está activo.
- El webhook de Stripe está configurado en el dashboard de Stripe apuntando a `http://localhost:8888/api/stripe-webhook` (con Stripe CLI o ngrok si es local).

**Pasos:**
1. Navegar a `http://localhost:8888/precios`.
2. Hacer clic en **"Activar Plan Pro"**.
3. Verificar que el botón cambia a "Redirigiendo a Stripe…" con spinner.
4. Confirmar que el navegador redirige automáticamente a la página de Checkout de Stripe.
5. En el formulario de Stripe, introducir:
   - Email: el del usuario (aparecerá pre-rellenado).
   - Tarjeta: `4242 4242 4242 4242`
   - Fecha de expiración: `12/30`
   - CVC: `123`
   - Nombre: cualquiera
6. Hacer clic en **"Suscribirte"** (o el botón de pago que muestre Stripe).

**Resultado esperado:**
- Stripe procesa el pago y redirige a `http://localhost:8888/exito`.
- La página `/exito` muestra el ícono verde animado, el mensaje "¡Bienvenido a Freedom Pro!" y los botones "Explorar el Catálogo" y "Ver mi Perfil".
- En Supabase (tabla `suscripciones`): aparece una nueva fila con `estado = 'activa'` para el usuario.
- En Supabase (tabla `perfiles`): el campo `tiene_acceso` del usuario cambia a `true`.

---

## PRUEBA 4 – Página de Precios (usuario con suscripción activa)

**Objetivo:** Verificar que un usuario ya suscrito ve el estado correcto.

**Precondiciones:**
- Usuario con `tiene_acceso = true` en Supabase (tras completar la Prueba 3).

**Pasos:**
1. Con la sesión activa, navegar a `http://localhost:8888/precios`.
2. Observar el área CTA y la tarjeta debajo.

**Resultado esperado:**
- El botón CTA dice **"Gestionar mi suscripción"** (gris/oscuro).
- Aparece la tarjeta verde "Tu plan está activo" debajo del botón.
- No aparece el botón "Activar Plan Pro".

---

## PRUEBA 5 – Acceso a Gestionar suscripción (Customer Portal)

**Objetivo:** Verificar que el botón "Gestionar mi suscripción" abre el portal de Stripe.

**Precondiciones:**
- Usuario con suscripción activa (`tiene_acceso = true`).
- El Customer Portal de Stripe está habilitado en el dashboard de Stripe (`Billing → Customer Portal → Activar`).

**Pasos:**
1. Navegar a `http://localhost:8888/precios` (con sesión de usuario suscrito).
2. Hacer clic en **"Gestionar mi suscripción"**.
3. Observar la redirección.

**Resultado esperado:**
- El navegador redirige al portal de cliente de Stripe (URL de stripe.com).
- En el portal se pueden ver los detalles de la suscripción activa: plan, próxima renovación, y opción de cancelar.
- Al hacer clic en "← Volver" o el enlace de retorno, el navegador redirige a `http://localhost:8888/perfil`.

---

## PRUEBA 6 – Tarjeta "Mi Plan" en el Perfil (sin suscripción)

**Objetivo:** Verificar que la sección "Mi Plan" del perfil muestra el banner de upgrade para usuarios sin acceso.

**Precondiciones:**
- Usuario logueado con `tiene_acceso = false`.

**Pasos:**
1. Navegar a `http://localhost:8888/perfil`.
2. Desplazarse hasta la sección situada justo encima de las estadísticas (Horas de Entrenamiento, Racha Semanal).

**Resultado esperado:**
- Aparece un banner azul con el texto **"Desbloquea todo el contenido"** y el botón **"Ver Plan Pro"**.
- El botón enlaza a `/precios`.
- No aparece ninguna tarjeta verde de suscripción activa.

---

## PRUEBA 7 – Tarjeta "Mi Plan" en el Perfil (con suscripción activa)

**Objetivo:** Verificar que el perfil muestra el estado activo y el botón de gestión.

**Precondiciones:**
- Usuario con `tiene_acceso = true`.

**Pasos:**
1. Navegar a `http://localhost:8888/perfil`.
2. Desplazarse hasta la sección "Mi Plan".

**Resultado esperado:**
- Aparece el badge **"Freedom Pro Activo"** en verde con indicador "ACTIVO".
- Hay un botón **"Gestionar"** que, al hacer clic, abre el Customer Portal de Stripe.
- No aparece el banner de upgrade azul.

---

## PRUEBA 8 – Acceso al Perfil de Instructor/Admin (sin sección de plan)

**Objetivo:** Confirmar que los roles de staff no ven la sección de suscripción.

**Precondiciones:**
- Usuario con rol `instructor` o `admin`.

**Pasos:**
1. Iniciar sesión con una cuenta de instructor o admin.
2. Navegar a `http://localhost:8888/perfil`.
3. Revisar toda la sección de estadísticas y el perfil.

**Resultado esperado:**
- La sección "Mi Plan" **no aparece** en ningún lugar del perfil.
- El perfil muestra el panel de "Studio Creador" normalmente.

---

## PRUEBA 9 – Overlay Premium en el Reproductor (usuario sin sesión)

**Objetivo:** Verificar que los usuarios no logueados no pueden ver el contenido del reproductor.

**Precondiciones:**
- Sin sesión activa (navegar en incógnito o cerrar sesión).
- Al menos un vídeo en estado `listo` en la base de datos.

**Pasos:**
1. Copiar el ID de cualquier vídeo del catálogo.
2. Navegar directamente a `http://localhost:8888/reproductor?id=<ID_DEL_VIDEO>`.
3. Observar el área del reproductor de vídeo.

**Resultado esperado:**
- El reproductor muestra un **overlay oscuro con efecto blur** que cubre el player completamente.
- Se ve el ícono de candado azul con efecto de ping.
- El texto dice **"Contenido Exclusivo"** y **"Activa Freedom Pro para desbloquear…"**.
- Hay dos botones: **"Ver Plan Pro"** (azul) y **"Iniciar Sesión"** (gris).
- No se puede reproducir el vídeo debajo del overlay.

---

## PRUEBA 10 – Overlay Premium en el Reproductor (usuario logueado sin suscripción)

**Objetivo:** Verificar que usuarios logueados pero sin suscripción tampoco acceden al contenido.

**Precondiciones:**
- Usuario logueado con `tiene_acceso = false` (rol `usuario`).

**Pasos:**
1. Iniciar sesión.
2. Navegar a `http://localhost:8888/reproductor?id=<ID_DEL_VIDEO>`.
3. Observar el área del reproductor.

**Resultado esperado:**
- El overlay premium aparece igual que en la Prueba 9.
- Solo aparece el botón **"Ver Plan Pro"** (el botón "Iniciar Sesión" está oculto porque ya tiene sesión).
- No se puede interactuar con el player debajo.

---

## PRUEBA 11 – Sin Overlay para Usuarios con Acceso Activo

**Objetivo:** Verificar que suscriptores activos reproducen el vídeo sin restricciones.

**Precondiciones:**
- Usuario con `tiene_acceso = true`.

**Pasos:**
1. Iniciar sesión con el usuario suscrito.
2. Navegar a `http://localhost:8888/reproductor?id=<ID_DEL_VIDEO>`.
3. Observar el área del reproductor.

**Resultado esperado:**
- **No aparece ningún overlay**. El reproductor es completamente visible e interactivo.
- El vídeo inicia o muestra el thumbnail de Mux normalmente.

---

## PRUEBA 12 – Sin Overlay para Instructor/Admin

**Objetivo:** Confirmar que el personal no ve restricciones de contenido.

**Precondiciones:**
- Usuario con rol `instructor` o `admin`.

**Pasos:**
1. Iniciar sesión como instructor o admin.
2. Navegar a `http://localhost:8888/reproductor?id=<ID_DEL_VIDEO>`.

**Resultado esperado:**
- No aparece ningún overlay de contenido premium.
- El reproductor funciona con normalidad.

---

## PRUEBA 13 – Cancelación de suscripción y revocación de acceso

**Objetivo:** Verificar que al cancelar la suscripción en el portal de Stripe, el acceso se revoca correctamente.

**Precondiciones:**
- Usuario con suscripción activa.
- Webhook operativo.

**Pasos:**
1. Ir al Customer Portal (desde `/precios` o `/perfil` → botón "Gestionar").
2. Dentro del portal de Stripe, localizar la opción **"Cancelar plan"** y confirmar la cancelación.
3. Regresar a la plataforma (el portal redirige a `/perfil`).
4. Esperar unos segundos para que Stripe envíe el evento `customer.subscription.deleted` al webhook.
5. Refrescar la página `/perfil`.

**Resultado esperado:**
- En la sección "Mi Plan" del perfil vuelve a aparecer el banner azul de **"Desbloquea todo el contenido"**.
- En Supabase (tabla `suscripciones`): el campo `estado` cambia a `'cancelada'`.
- En Supabase (tabla `perfiles`): el campo `tiene_acceso` cambia a `false`.
- Al navegar al reproductor, aparece de nuevo el overlay premium.
