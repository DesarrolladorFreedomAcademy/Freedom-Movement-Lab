import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const DELETE: APIRoute = async ({ request }) => {
    try {
        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
        const tokenId = import.meta.env.MUX_TOKEN_ID;
        const tokenSecret = import.meta.env.MUX_TOKEN_SECRET;

        // Verificar credenciales de Mux
        if (!tokenId || !tokenSecret) {
            return new Response(JSON.stringify({ error: 'Credenciales de Mux no configuradas' }), { status: 500 });
        }

        // Obtener el JWT del usuario para RLS
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

        // Obtener los datos del vídeo (verificar que el usuario sea el dueño y obtener mux_asset_id)
        const { data: video, error: dbFetchError } = await supabase
            .from('videos')
            .select('id, usuario_id, mux_asset_id')
            .eq('id', videoId)
            .single();

        if (dbFetchError || !video) {
            return new Response(JSON.stringify({ error: 'Vídeo no encontrado' }), { status: 404 });
        }

        // Verificar propiedad
        if (video.usuario_id !== user.id) {
            return new Response(JSON.stringify({ error: 'No tienes permiso para eliminar este vídeo' }), { status: 403 });
        }

        // 1. Intentar borrar el asset en Mux (si existe mux_asset_id)
        if (video.mux_asset_id) {
            const credentials = Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64');

            // El mux_asset_id guardado puede ser un Upload ID o un Asset ID.
            // Intentamos primero obtener el asset real via el upload ID.
            let muxAssetId = video.mux_asset_id;

            try {
                // Intentar obtener el Asset ID real desde el Upload ID
                const uploadRes = await fetch(`https://api.mux.com/video/v1/uploads/${video.mux_asset_id}`, {
                    headers: { 'Authorization': `Basic ${credentials}` }
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    // Si el upload tiene un asset_id asociado, usamos ese
                    if (uploadData?.data?.asset_id) {
                        muxAssetId = uploadData.data.asset_id;
                    }
                }
            } catch (e) {
                // Si falla, intentamos usar el mux_asset_id directamente como Asset ID
                console.warn('No se pudo obtener asset_id desde upload_id, usando como asset_id directo:', e);
            }

            // Borrar el Asset en Mux
            try {
                const deleteRes = await fetch(`https://api.mux.com/video/v1/assets/${muxAssetId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Basic ${credentials}` }
                });

                if (!deleteRes.ok && deleteRes.status !== 404) {
                    const errText = await deleteRes.text();
                    console.error(`Error borrando asset Mux ${muxAssetId}:`, deleteRes.status, errText);
                    // No bloqueamos el borrado en BD si Mux falla (el asset puede ya no existir)
                }
            } catch (e) {
                console.error('Error llamando a Mux DELETE:', e);
                // Continuamos con el borrado en BD igualmente
            }
        }

        // 2. Borrar el registro en Supabase
        const { error: dbDeleteError } = await supabase
            .from('videos')
            .delete()
            .eq('id', videoId);

        if (dbDeleteError) {
            return new Response(JSON.stringify({ error: `Error eliminando de BD: ${dbDeleteError.message}` }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('Error en delete-video:', err);
        return new Response(JSON.stringify({ error: err.message || 'Error inesperado' }), { status: 500 });
    }
};
