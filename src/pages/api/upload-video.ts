import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { titulo, descripcion, instructor, dificultad, usuarioId } = body;

        if (!titulo || !usuarioId) {
            return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), { status: 400 });
        }

        const tokenId = import.meta.env.MUX_TOKEN_ID;
        const tokenSecret = import.meta.env.MUX_TOKEN_SECRET;
        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

        if (!tokenId || !tokenSecret) {
            return new Response(JSON.stringify({ error: 'Credenciales de Mux no configuradas' }), { status: 500 });
        }

        // Crear cliente de Supabase con el JWT del usuario para que RLS lo permita
        const authHeader = request.headers.get('Authorization') || '';
        const userToken = authHeader.replace('Bearer ', '').trim();
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: userToken ? { Authorization: `Bearer ${userToken}` } : {}
            }
        });

        // 1. Crear URL directa de subida en Mux via REST API
        const credentials = Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64');
        const muxRes = await fetch('https://api.mux.com/video/v1/uploads', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cors_origin: '*',
                new_asset_settings: {
                    playback_policy: ['public'],
                    encoding_tier: 'baseline',
                },
            }),
        });

        if (!muxRes.ok) {
            const muxError = await muxRes.text();
            console.error('Error Mux API:', muxRes.status, muxError);
            return new Response(JSON.stringify({ error: `Error Mux: ${muxRes.status}` }), { status: 502 });
        }

        const muxData = await muxRes.json();
        const uploadUrl = muxData.data.url;
        const muxUploadId = muxData.data.id;

        // 2. Guardar el video en Supabase en estado "preparando"
        const { error: dbError } = await supabase
            .from('videos')
            .insert({
                titulo,
                descripcion: descripcion || '',
                instructor: instructor || 'Instructor Freedom',
                dificultad: dificultad || 'PRINCIPIANTE',
                mux_asset_id: muxUploadId,
                estado: 'preparando',
                usuario_id: usuarioId,
            });

        if (dbError) {
            console.error('Error insertando video en BD:', dbError);
            return new Response(JSON.stringify({ error: `Error BD: ${dbError.message}` }), { status: 500 });
        }

        return new Response(JSON.stringify({ uploadUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('Error en upload-video:', err);
        return new Response(JSON.stringify({ error: err.message || 'Error inesperado' }), { status: 500 });
    }
};
