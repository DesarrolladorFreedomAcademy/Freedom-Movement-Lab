// src/pages/api/create-checkout.ts
// Crea una sesión de pago en Stripe y devuelve la URL de redirección.

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-04-22.dahlia',
});

export const POST: APIRoute = async ({ request }) => {

  // 1. Verificar que el usuario está autenticado
  // El cliente envía el token en el header Authorization: Bearer <token>
  const authHeader = request.headers.get('Authorization') ?? '';
  const accessToken = authHeader.replace('Bearer ', '').trim();

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Crear la Checkout Session en Stripe
  //    mode: 'subscription' → cargo mensual recurrente (se renueva solo)
  //    mode: 'payment'      → pago único (no usar para suscripciones)
  const siteUrl = import.meta.env.SITE_URL ?? 'http://localhost:8888';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',                          // ← recurrente mensual
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [{
      price:    import.meta.env.STRIPE_PRICE_MENSUAL as string,
      quantity: 1,
    }],
    metadata: {
      usuario_id: user.id,                         // ← el webhook lo usa para actualizar Supabase
    },
    allow_promotion_codes: true,                   // permite códigos de descuento en el checkout
    success_url: `${siteUrl}/exito`,               // redirige aquí si el pago tiene éxito
    cancel_url:  `${siteUrl}/precios`,             // redirige aquí si el usuario cancela
  });

  // 3. Devolver la URL de redirección al cliente
  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = () => new Response('Method Not Allowed', { status: 405 });
