import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const DELETE: APIRoute = async ({ request }) => {
    try {
        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

        // Obtener el JWT del usuario
        const authHeader = request.headers.get('Authorization') || '';
        const userToken = authHeader.replace('Bearer ', '').trim();

        if (!userToken) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: { Authorization: `Bearer ${userToken}` }
            }
        });

        // Verificar sesión
        const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
        }

        // Obtener videoId del body
        const body = await request.json();
        const { videoId } = body;

        if (!videoId) {
            return new Response(JSON.stringify({ error: 'Falta el videoId' }), { status: 400 });
        }

        // Borrar el registro del historial para este usuario y video
        const { error: deleteError } = await supabase
            .from('historial_videos')
            .delete()
            .eq('usuario_id', user.id)
            .eq('video_id', videoId);

        if (deleteError) {
            return new Response(JSON.stringify({ error: `Error actualizando historial: ${deleteError.message}` }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('Error en unwatch-video:', err);
        return new Response(JSON.stringify({ error: err.message || 'Error inesperado' }), { status: 500 });
    }
};
