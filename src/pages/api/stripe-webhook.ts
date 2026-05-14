// src/pages/api/stripe-webhook.ts
// Recibe eventos de Stripe y actualiza Supabase en consecuencia.
// URL del endpoint: https://tu-dominio.netlify.app/api/stripe-webhook

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Desactiva el prerenderizado estático: este endpoint es siempre dinámico (SSR)
export const prerender = false;

// ── Clientes ─────────────────────────────────────────────────────────────────

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-04-22.dahlia', // stripe@22.x
});

// Service Role Key: salta RLS para que el webhook pueda escribir en Supabase.
// NUNCA expongas esta clave en el cliente.
const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL       as string,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

// ── Handler ───────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {

  // 1. Leer el body CRUDO (obligatorio para verificar la firma de Stripe).
  //    Netlify a veces codifica en base64; lo decodificamos si es necesario.
  let rawBody = await request.text();
  if (request.headers.get('content-encoding') === 'base64') {
    rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
  }

  const signature = request.headers.get('stripe-signature') ?? '';

  // 2. Verificar que el mensaje viene realmente de Stripe
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      import.meta.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error('❌ Firma de webhook inválida:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 3. Procesar el evento
  try {
    switch (event.type) {

      // ── Pago completado → dar acceso ────────────────────────────────────────
      case 'checkout.session.completed': {
        const session    = event.data.object as Stripe.Checkout.Session;
        const usuarioId  = session.metadata?.usuario_id;
        const subId      = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;

        console.log(`📦 checkout.session.completed → usuarioId=${usuarioId} subId=${subId} customerId=${customerId}`);

        if (!usuarioId) {
          console.error('❌ Falta metadata.usuario_id en la sesión de checkout');
          break;
        }

        // ── 1. Actualizar perfiles (CRÍTICO) ──────────────────────────────────
        // Guarda también el stripe_customer_id para poder revocar acceso después
        const { error: perfilError } = await supabaseAdmin
          .from('perfiles')
          .update({ tiene_acceso: true, stripe_customer_id: customerId })
          .eq('id', usuarioId);

        if (perfilError) {
          console.error('❌ Error actualizando perfiles.tiene_acceso:', perfilError.message);
        } else {
          console.log(`✅ Acceso concedido al usuario ${usuarioId}`);
        }

        // ── 2. Registrar suscripción (SECUNDARIO) ─────────────────────────────
        if (subId && customerId) {
          try {
            const sub    = await stripe.subscriptions.retrieve(subId);
            const subAny = sub as any;

            // En API dahlia, current_period_start/end pueden no existir
            const startTs = subAny.current_period_start ?? subAny.billing_cycle_anchor ?? null;
            const endTs   = subAny.current_period_end ?? null;

            const { error: subError } = await supabaseAdmin.from('suscripciones').upsert({
              usuario_id:         usuarioId,
              stripe_customer_id: customerId,
              stripe_sub_id:      subId,
              estado:             'activa',
              inicio_en:          startTs ? new Date(startTs * 1000).toISOString() : null,
              fin_en:             endTs   ? new Date(endTs   * 1000).toISOString() : null,
            }, { onConflict: 'usuario_id' });

            if (subError) {
              console.warn('⚠️ No se pudo registrar en suscripciones:', subError.message);
            } else {
              console.log(`📝 Suscripción registrada: ${subId}`);
            }
          } catch (subErr: any) {
            console.warn('⚠️ Error recuperando detalles de suscripción:', subErr.message);
          }
        }

        break;
      }

      // ── Renovación / cambio → actualizar estado ──────────────────────────────
      case 'customer.subscription.updated': {
        const sub        = event.data.object as Stripe.Subscription;
        const subAny     = sub as any;
        const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id;
        const endTs      = subAny.current_period_end ?? null;
        const finEn      = endTs ? new Date(endTs * 1000).toISOString() : null;

        // Actualizar suscripciones si existe la fila
        let estadoNuevo = 'activa';
        if (sub.cancel_at_period_end)  estadoNuevo = 'cancelando';
        else if (sub.status !== 'active') estadoNuevo = sub.status;

        await supabaseAdmin.from('suscripciones').update({
          estado: estadoNuevo,
          fin_en: finEn,
        }).eq('stripe_sub_id', sub.id);

        // Actualizar perfiles por stripe_customer_id (siempre funciona)
        if (customerId) {
          const { error: pErr } = await supabaseAdmin
            .from('perfiles')
            .update({
              suscripcion_cancelando: sub.cancel_at_period_end === true,
              acceso_fin_en:          finEn,
            })
            .eq('stripe_customer_id', customerId);

          if (pErr) {
            console.warn('⚠️ No se pudo actualizar perfiles en subscription.updated:', pErr.message);
          } else {
            console.log(`🔄 Suscripción ${sub.id} → ${estadoNuevo} (cancelando: ${sub.cancel_at_period_end})`);
          }
        }
        break;
      }

      // ── Cancelación efectiva → revocar acceso ───────────────────────────────
      case 'customer.subscription.deleted': {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id;

        console.log(`🗑️ customer.subscription.deleted → subId=${sub.id} customerId=${customerId}`);

        // Buscar usuario: primero por stripe_sub_id, luego por stripe_customer_id
        let usuarioId: string | null = null;

        const { data: regPorSub } = await supabaseAdmin
          .from('suscripciones')
          .select('usuario_id')
          .eq('stripe_sub_id', sub.id)
          .maybeSingle();

        usuarioId = regPorSub?.usuario_id ?? null;

        if (!usuarioId && customerId) {
          const { data: regPorCustomer } = await supabaseAdmin
            .from('suscripciones')
            .select('usuario_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();
          usuarioId = regPorCustomer?.usuario_id ?? null;
        }

        if (usuarioId) {
          // Marcar suscripción como cancelada
          await supabaseAdmin
            .from('suscripciones')
            .update({ estado: 'cancelada' })
            .eq('stripe_sub_id', sub.id);

          // Revocar acceso solo a usuarios normales
          const { data: perfil } = await supabaseAdmin
            .from('perfiles')
            .select('rol')
            .eq('id', usuarioId)
            .maybeSingle();

          if (perfil?.rol === 'usuario' || !perfil?.rol) {
            await supabaseAdmin
              .from('perfiles')
              .update({ tiene_acceso: false })
              .eq('id', usuarioId);
            console.log(`🚫 Acceso revocado (deleted): ${usuarioId}`);
          } else {
            console.log(`ℹ️ Staff (${perfil?.rol}): acceso mantenido`);
          }
        } else {
          // Último fallback: buscar por stripe_customer_id en perfiles
          console.warn(`⚠️ Sin registro en suscripciones, buscando en perfiles por stripe_customer_id...`);
          const { data: perfilPorCustomer } = await supabaseAdmin
            .from('perfiles')
            .select('id, rol')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

          if (perfilPorCustomer?.id) {
            if (perfilPorCustomer.rol === 'usuario' || !perfilPorCustomer.rol) {
              await supabaseAdmin
                .from('perfiles')
                .update({ tiene_acceso: false })
                .eq('id', perfilPorCustomer.id);
              console.log(`🚫 Acceso revocado vía perfiles.stripe_customer_id: ${perfilPorCustomer.id}`);
            }
          } else {
            console.error(`❌ No se pudo encontrar usuario para customerId ${customerId}`);
          }
        }
        break;
      }

      // ── Pago fallido → marcar en BD ────────────────────────────────────────────
      case 'invoice.payment_failed': {
        // En la API dahlia (2026+), Invoice.subscription fue eliminado.
        // La suscripción ahora vive en invoice.parent.subscription_details.subscription
        const invoice = event.data.object as any;
        const subId: string | null =
          invoice?.parent?.subscription_details?.subscription  // dahlia (nuevo)
          ?? invoice?.subscription                             // fallback APIs anteriores
          ?? null;

        if (subId) {
          await supabaseAdmin
            .from('suscripciones')
            .update({ estado: 'pago_fallido' })
            .eq('stripe_sub_id', subId);
          console.log(`⚠️ Pago fallido: suscripción ${subId}`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Evento no gestionado: ${event.type}`);
    }

  } catch (err: any) {
    // Logeamos el error pero respondemos 200 para que Stripe no reintente
    console.error('❌ Error procesando evento Stripe:', err.message);
  }

  // 4. Siempre responder 200 rápido (si tardamos más de 30s, Stripe marca timeout)
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Rechazar cualquier método que no sea POST
export const GET:    APIRoute = () => new Response('Method Not Allowed', { status: 405 });
export const PUT:    APIRoute = () => new Response('Method Not Allowed', { status: 405 });
export const DELETE: APIRoute = () => new Response('Method Not Allowed', { status: 405 });
