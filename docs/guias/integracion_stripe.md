# Planificación: Integración de Stripe — Freedom Movement

> **Stack:** Astro (SSR) · Supabase · Netlify · Mux
> **Última actualización:** Mayo 2026

---

## 1. Modelo de Acceso

| Tipo de usuario          | Vídeos libres | Vídeos premium |
|--------------------------|:-------------:|:--------------:|
| Visitante (sin cuenta)   | ✅            | ❌             |
| Usuario sin suscripción  | ✅            | ❌ → redirige a `/precios` |
| Usuario con suscripción  | ✅            | ✅             |
| **Instructor / Admin**   | ✅            | ✅ **(sin pagar)** |

### Lógica de acceso a un vídeo premium

```
¿Tiene sesión?  →  NO  → mostrar vídeo si es libre / redirigir a /login si es premium
      ↓ SÍ
¿Es admin o instructor?  →  SÍ  → acceso concedido
      ↓ NO
¿tiene_acceso = true en perfiles?  →  SÍ  → acceso concedido
      ↓ NO
Redirigir a /precios
```

---

## 2. Cambios en la Base de Datos (Supabase)

### 2.1 Columna `es_premium` en la tabla `videos`

> **Acción manual:** SQL Editor de Supabase.

```sql
-- Añadir campo que marca si el vídeo es de pago
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS es_premium BOOLEAN NOT NULL DEFAULT true;

-- Los vídeos existentes son premium por defecto.
-- Para marcar uno como libre, actualiza manualmente:
-- UPDATE public.videos SET es_premium = false WHERE id = 'xxx';
```

Esto permite que los instructores (desde el formulario de subida) o los admins (desde Supabase) marquen cada vídeo como libre o de pago individualmente.

### 2.2 Columna `tiene_acceso` en la tabla `perfiles`

```sql
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS tiene_acceso BOOLEAN NOT NULL DEFAULT false;
```

### 2.3 Tabla `suscripciones`

```sql
CREATE TABLE IF NOT EXISTS public.suscripciones (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id  TEXT NOT NULL,
  stripe_sub_id       TEXT UNIQUE NOT NULL,
  estado              TEXT NOT NULL DEFAULT 'activa'
                        CHECK (estado IN ('activa', 'cancelada', 'pago_fallido')),
  inicio_en           TIMESTAMPTZ NOT NULL,
  fin_en              TIMESTAMPTZ,
  creado_en           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;

-- El usuario solo puede leer su propia suscripción
CREATE POLICY "select_own_sub"
  ON public.suscripciones FOR SELECT
  USING (auth.uid() = usuario_id);
-- INSERT/UPDATE/DELETE solo vía service_role (webhook)
```

---

## 3. Precio Dinámico desde Stripe

> **Principio clave:** el precio que se muestra en la app **nunca está escrito en el código**.
> Se consulta en tiempo real desde la API de Stripe. Para cambiar el precio, descuentos u ofertas,
> solo hay que actuar en el Dashboard de Stripe — la web se actualiza sola.

### Cómo funciona

Se crea un endpoint SSR que consulta el precio activo y lo devuelve al frontend:

```typescript
// src/pages/api/get-price.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const GET: APIRoute = async () => {
  const price = await stripe.prices.retrieve(import.meta.env.STRIPE_PRICE_MENSUAL);
  const amount = (price.unit_amount ?? 0) / 100; // Stripe guarda en céntimos
  const currency = price.currency.toUpperCase();

  return new Response(JSON.stringify({ amount, currency }), {
    headers: { 'Cache-Control': 'public, max-age=300' } // cache 5 min
  });
};
```

En la página `/precios`, el JS del cliente llama a este endpoint y rellena el precio:

```javascript
const res = await fetch('/api/get-price');
const { amount, currency } = await res.json();
document.getElementById('precio-mensual').textContent = `${amount} ${currency}/mes`;
```

### Ofertas y descuentos

Stripe permite dos mecanismos sin tocar el código:

| Mecanismo | Dónde se crea | Qué hace |
|-----------|--------------|----------|
| **Coupon** | Stripe → Products → Coupons | Descuento fijo o % sobre el precio |
| **Promotion Code** | Stripe → Products → Promotion codes | Código que el usuario introduce en Checkout |

Para activar una oferta: crea un Coupon en Stripe y pásalo al crear la Checkout Session:

```typescript
// En create-checkout.ts — añadir el parámetro opcional
const checkoutSession = await stripe.checkout.sessions.create({
  // ...
  discounts: [{ coupon: 'OFERTA_VERANO' }], // ID del coupon en Stripe
  // O permitir que el usuario introduzca su propio código:
  allow_promotion_codes: true,
});
```

> Si usas `allow_promotion_codes: true`, el campo de código aparece automáticamente en la
> página de pago de Stripe. No necesitas construir nada adicional.

---

## 4. Pasos de Implementación

### PASO 1 — Stripe Dashboard (manual)

1. Crea cuenta en [stripe.com](https://stripe.com).
2. **Products → Add product:**
   - Nombre: `"Acceso Freedom Movement"`
   - Un único precio: `X€ / mes` (recurring · monthly)
   - Anota el **Price ID** (`price_xxx`)
3. **Developers → API keys:** copia `Publishable key` y `Secret key`.
4. **Developers → Webhooks → Add endpoint:**
   - URL: `https://TU-DOMINIO.netlify.app/api/stripe-webhook`
   - Eventos:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copia el **Webhook Signing Secret** (`whsec_xxx`).

> ⚠️ Trabaja siempre en **modo test** hasta que todo funcione. Las claves `pk_test_` / `sk_test_`
> no mueven dinero real.

---

### PASO 2 — Variables de Entorno

**Archivo `.env` local:**
```env
STRIPE_SECRET_KEY=sk_test_XXXX
STRIPE_PUBLISHABLE_KEY=pk_test_XXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXX
STRIPE_PRICE_MENSUAL=price_XXXX
SUPABASE_URL=https://XXXX.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SITE_URL=http://localhost:8888
```

**Netlify → Site configuration → Environment variables:** mismas variables con valores de **producción**
(`sk_live_`, `pk_live_`, URL real del sitio).

---

### PASO 3 — Instalar Stripe

```bash
npm install stripe
```

> Solo necesitamos la librería de servidor. No necesitamos `@stripe/stripe-js` porque
> usamos Stripe Checkout (la página de pago la aloja Stripe, no nosotros).

---

### PASO 4 — Endpoint: Crear Sesión de Pago

```typescript
// src/pages/api/create-checkout.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verificar sesión
  const token = cookies.get('sb-access-token')?.value;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new Response('No autenticado', { status: 401 });

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [{ price: import.meta.env.STRIPE_PRICE_MENSUAL, quantity: 1 }],
    metadata: { usuario_id: user.id },
    allow_promotion_codes: true,          // permite códigos de descuento
    success_url: `${import.meta.env.SITE_URL}/perfil?pago=ok`,
    cancel_url:  `${import.meta.env.SITE_URL}/precios`,
  });

  return new Response(JSON.stringify({ url: checkoutSession.url }), { status: 200 });
};
```

---

### PASO 5 — Endpoint: Webhook de Stripe

```typescript
// src/pages/api/stripe-webhook.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
const admin = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  const sig  = request.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, import.meta.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response('Firma inválida', { status: 400 });
  }

  switch (event.type) {

    // ── Pago completado: dar acceso ──────────────────────────────────────
    case 'checkout.session.completed': {
      const session  = event.data.object as Stripe.Checkout.Session;
      const uid      = session.metadata?.usuario_id!;
      const subId    = session.subscription as string;
      const cusId    = session.customer    as string;
      const sub      = await stripe.subscriptions.retrieve(subId);

      await admin.from('suscripciones').upsert({
        usuario_id:         uid,
        stripe_customer_id: cusId,
        stripe_sub_id:      subId,
        estado:             'activa',
        inicio_en:          new Date(sub.current_period_start * 1000).toISOString(),
        fin_en:             new Date(sub.current_period_end   * 1000).toISOString(),
      }, { onConflict: 'usuario_id' });

      await admin.from('perfiles').update({ tiene_acceso: true }).eq('id', uid);
      break;
    }

    // ── Renovación: actualizar fechas ────────────────────────────────────
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await admin.from('suscripciones').update({
        estado:    sub.status === 'active' ? 'activa' : 'pago_fallido',
        inicio_en: new Date(sub.current_period_start * 1000).toISOString(),
        fin_en:    new Date(sub.current_period_end   * 1000).toISOString(),
      }).eq('stripe_sub_id', sub.id);
      break;
    }

    // ── Cancelación: revocar acceso ──────────────────────────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const { data } = await admin
        .from('suscripciones').select('usuario_id')
        .eq('stripe_sub_id', sub.id).single();

      if (data) {
        await admin.from('suscripciones').update({ estado: 'cancelada' }).eq('stripe_sub_id', sub.id);
        // Solo revocar si NO es admin/instructor
        const { data: perfil } = await admin
          .from('perfiles').select('rol').eq('id', data.usuario_id).single();
        if (perfil?.rol === 'usuario') {
          await admin.from('perfiles').update({ tiene_acceso: false }).eq('id', data.usuario_id);
        }
      }
      break;
    }

    // ── Pago fallido ─────────────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      if (inv.subscription) {
        await admin.from('suscripciones')
          .update({ estado: 'pago_fallido' })
          .eq('stripe_sub_id', inv.subscription as string);
      }
      break;
    }
  }

  return new Response('OK', { status: 200 });
};
```

---

### PASO 6 — Lógica de Acceso en el Reproductor

```typescript
// src/pages/reproductor.astro — frontmatter
const { data: { session } } = await supabase.auth.getSession();

// Obtener el vídeo
const { data: video } = await supabase.from('videos').select('*').eq('id', videoId).single();

if (video?.es_premium) {
  if (!session?.user) {
    return Astro.redirect('/login');
  }

  // Admins e instructores: acceso siempre
  const { data: perfil } = await supabase
    .from('perfiles').select('rol, tiene_acceso').eq('id', session.user.id).single();

  const esStaff = perfil?.rol === 'admin' || perfil?.rol === 'instructor';

  if (!esStaff && !perfil?.tiene_acceso) {
    return Astro.redirect('/precios');
  }
}
```

---

### PASO 7 — Endpoint: Portal de Gestión

Stripe proporciona una página lista para que el usuario cancele o actualice su pago:

```typescript
// src/pages/api/customer-portal.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
const admin  = createClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_SERVICE_ROLE_KEY);

export const POST: APIRoute = async ({ cookies }) => {
  // obtener usuario...
  const { data: sub } = await admin
    .from('suscripciones').select('stripe_customer_id')
    .eq('usuario_id', userId).single();

  const portal = await stripe.billingPortal.sessions.create({
    customer:   sub!.stripe_customer_id,
    return_url: `${import.meta.env.SITE_URL}/perfil`,
  });

  return new Response(JSON.stringify({ url: portal.url }), { status: 200 });
};
```

> ⚠️ **Activación manual:** Stripe → Billing → Customer portal → activar y configurar
> qué acciones permite (cancelar, actualizar tarjeta...).

---

## 5. Página de Precios (`/precios`)

La página muestra el precio obtenido dinámicamente. Esquema del frontmatter SSR:

```typescript
// src/pages/precios.astro — frontmatter
import Stripe from 'stripe';
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
const price  = await stripe.prices.retrieve(import.meta.env.STRIPE_PRICE_MENSUAL);
const importe = ((price.unit_amount ?? 0) / 100).toFixed(2);
const moneda  = price.currency.toUpperCase();
// Pasar importe y moneda al template → se renderiza en el servidor
```

> **Cambiar el precio:** ve a Stripe Dashboard → Products → archiva el precio antiguo
> y crea uno nuevo. Actualiza `STRIPE_PRICE_MENSUAL` en Netlify. Listo.

---

## 6. Pruebas en Local

```bash
# Instalar CLI de Stripe: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to http://localhost:8888/api/stripe-webhook
# El CLI imprime un whsec_xxx temporal → úsalo en .env como STRIPE_WEBHOOK_SECRET
```

**Tarjetas de test:**
| Resultado | Número de tarjeta |
|-----------|-------------------|
| ✅ Pago OK | `4242 4242 4242 4242` |
| ❌ Pago rechazado | `4000 0000 0000 0002` |
| 🔁 Requiere autenticación | `4000 0025 0000 3155` |

Fecha: cualquier futura · CVC: cualquier 3 dígitos · CP: cualquier 5 dígitos.

---

## 7. Gestión de Vídeos Libres vs. Premium

- **Desde Supabase (manual):** Table Editor → `videos` → editar campo `es_premium`.
- **Desde el formulario de subida (futuro):** añadir un toggle "Vídeo premium / libre" al
  formulario del Studio Creador en `perfil.astro`.

Por defecto todos los vídeos nuevos son premium (`DEFAULT true`). Los libres se marcan
explícitamente.

---

## 8. Checklist de Lanzamiento

- [ ] Ejecutar scripts SQL en Supabase (columnas `es_premium`, `tiene_acceso`, tabla `suscripciones`)
- [ ] Marcar los vídeos libres en la BD (`es_premium = false`)
- [ ] Probar flujo completo en modo test: pago → webhook → acceso
- [ ] Verificar que admins e instructores acceden sin suscripción
- [ ] Verificar que usuario sin suscripción es redirigido a `/precios`
- [ ] Verificar que el precio en `/precios` se muestra correctamente
- [ ] Probar cancelación: el acceso se revoca correctamente
- [ ] Activar Customer Portal en Stripe Dashboard
- [ ] Revisar Política de Privacidad y Términos (mención a pagos recurrentes)
- [ ] Activar cuenta Stripe con datos reales (NIF, banco) — puede tardar 1-2 días
- [ ] Reemplazar claves test por claves live en variables de Netlify
- [ ] Crear webhook de producción en Stripe Dashboard (URL live)
- [ ] Probar con pago real de importe mínimo

> ⚠️ Stripe requiere verificación de identidad/empresa antes de activar cobros reales.

---

## 9. Resumen de Cambios

| Acción | Recurso | Notas |
|--------|---------|-------|
| **SQL** | `videos.es_premium` | Distingue vídeos libres de premium |
| **SQL** | `perfiles.tiene_acceso` | Acceso rápido sin consultar Stripe |
| **SQL** | Tabla `suscripciones` | Historial de pagos y estado |
| **NUEVO** | `src/pages/api/create-checkout.ts` | Inicia el pago en Stripe |
| **NUEVO** | `src/pages/api/stripe-webhook.ts` | Recibe eventos de Stripe |
| **NUEVO** | `src/pages/api/customer-portal.ts` | Gestión de suscripción |
| **NUEVO** | `src/pages/api/get-price.ts` | Precio dinámico desde Stripe |
| **NUEVO** | `src/pages/precios.astro` | Página de planes |
| **MOD.** | `src/pages/reproductor.astro` | Lógica de acceso por rol + suscripción |
| **MOD.** | `src/pages/catalogo.astro` | Indicar vídeos libres/premium |
| **MOD.** | `src/pages/perfil.astro` | Mostrar estado suscripción + botón portal |
| **ENV** | `.env` + Netlify vars | Claves Stripe + Service Role Key |
| **Manual** | Stripe Dashboard | Producto, precio, webhook, portal |
