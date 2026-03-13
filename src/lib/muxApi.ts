import { supabase } from './supabase';

/**
 * Intenta recuperar la duración real de un vídeo directamente desde MUX API
 * si no existe en la base de datos, y luego la actualiza.
 */
export async function getAndSyncMuxDuration(videos: any[]) {
  const tokenId = import.meta.env.MUX_TOKEN_ID;
  const tokenSecret = import.meta.env.MUX_TOKEN_SECRET;

  if (!tokenId || !tokenSecret) {
    return videos;
  }

  // Usamos btoa que es universal (browser, edge, node) en lugar de Buffer.from
  const authHeader = `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`;

  for (let v of videos) {
    // Si no tiene duración, pero sí tiene un Mux Asset ID, consultamos a Mux directly.
    if (!v.duracion && v.mux_asset_id) {
      try {
        const res = await fetch(`https://api.mux.com/video/v1/assets/${v.mux_asset_id}`, {
          headers: {
            'Authorization': authHeader
          }
        });

        if (res.ok) {
          const muxData = await res.json();
          if (muxData.data && muxData.data.duration) {
            // Guardamos la duración aproximada en segundos
            const duracionSegundos = Math.round(muxData.data.duration);
            v.duracion = duracionSegundos;

            // Actualizamos en background la DB para que la próxima vez sea instantáneo
            supabase
              .from('videos')
              .update({ duracion: duracionSegundos })
              .eq('id', v.id)
              .then(({ error }) => {
                if (error) console.error('Error auto-sync duracion en DB:', error);
              });
          }
        } else {
           console.error(`Error API Mux al obtener duración de ${v.mux_asset_id}:`, await res.text());
        }
      } catch (err) {
        console.error('Error fetching duration from MUX:', err);
      }
    }
  }

  return videos;
}
