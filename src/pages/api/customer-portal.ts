// src/pages/api/customer-portal.ts
// Crea una sesión del Stripe Customer Portal para gestionar la suscripción.

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-04-22.dahlia',
});

const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL       as string,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

function jsonError(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Verificar autenticación
    const authHeader  = request.headers.get('Authorization') ?? '';
    const accessToken = authHeader.replace('Bearer ', '').trim();

    const { createClient: createClientAnon } = await import('@supabase/supabase-js');
    const supabaseAnon = createClientAnon(
      import.meta.env.PUBLIC_SUPABASE_URL     as string,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string,
    );
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(accessToken);

    if (authError || !user) {
      return jsonError('No autenticado', 401);
    }

    const siteUrl = import.meta.env.SITE_URL ?? 'http://localhost:8888';

    // 2. Buscar stripe_customer_id en la tabla suscripciones
    let customerId: string | null = null;

    const { data: suscripcion } = await supabaseAdmin
      .from('suscripciones')
      .select('stripe_customer_id')
      .eq('usuario_id', user.id)
      .maybeSingle();

    customerId = suscripcion?.stripe_customer_id ?? null;

    // 3. Fallback: buscar el cliente en Stripe por email del usuario
    if (!customerId && user.email) {
      console.log('[customer-portal] No hay registro en suscripciones, buscando en Stripe por email...');
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log('[customer-portal] Cliente encontrado en Stripe:', customerId);
      }
    }

    if (!customerId) {
      return jsonError('No se encontró ninguna suscripción activa para este usuario.', 404);
    }

    // 4. Crear sesión del portal de Stripe
    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${siteUrl}/perfil?from=portal`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[customer-portal] ❌ Error:', err?.message ?? err);

    // Si Stripe indica que el portal no está configurado, dar mensaje claro
    const msg = err?.message?.includes('No configuration provided')
      ? 'El portal de cliente de Stripe no está activado. Ve a Stripe → Settings → Billing → Customer portal y actívalo.'
      : (err?.message ?? 'Error interno del servidor');

    return jsonError(msg, 500);
  }
};

export const GET: APIRoute = () => new Response('Method Not Allowed', { status: 405 });
