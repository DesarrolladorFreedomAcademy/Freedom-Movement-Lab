import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Nota: No usamos el SDK de mux-node para la verificación,
// lo hacemos manualmente con HMAC SHA-256 para evitar dependencias extras en Deno.

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const webhookSecret = Deno.env.get('MUX_WEBHOOK_SECRET') ?? ''

const supabase = createClient(supabaseUrl, supabaseKey)

// Función de verificación manual de firma Mux usando HMAC-SHA256
async function verificarFirmaMux(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
        // La cabecera mux-signature tiene formato: t=timestamp,v1=hash
        const partes = Object.fromEntries(
            signature.split(',').map(p => {
                const [k, ...v] = p.split('=')
                return [k, v.join('=')]
            })
        )

        const timestamp = partes['t']
        const hash = partes['v1']
        if (!timestamp || !hash) return false

        // Construir el mensaje: timestamp.body
        const mensaje = `${timestamp}.${payload}`
        const encoder = new TextEncoder()
        const keyData = encoder.encode(secret)
        const msgData = encoder.encode(mensaje)

        // Importar clave HMAC
        const cryptoKey = await crypto.subtle.importKey(
            'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        )

        // Firmar
        const signBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
        const signHex = Array.from(new Uint8Array(signBuffer))
            .map(b => b.toString(16).padStart(2, '0')).join('')

        return signHex === hash
    } catch {
        return false
    }
}

serve(async (req) => {
    const signature = req.headers.get('mux-signature')

    if (!signature) {
        return new Response('Missing signature', { status: 401 })
    }

    const payload = await req.text()

    // Verificar autenticidad del webhook
    const esValido = await verificarFirmaMux(payload, signature, webhookSecret)
    if (!esValido) {
        return new Response('Invalid signature', { status: 401 })
    }

    let event: any
    try {
        event = JSON.parse(payload)
    } catch {
        return new Response('Invalid JSON', { status: 400 })
    }

    // === Manejo de Eventos de Mux ===

    // Evento: Video procesado y listo para reproducir
    if (event.type === 'video.asset.ready') {
        const assetId = event.data.id
        const playbackId = event.data.playback_ids?.find((p: any) => p.policy === 'public')?.id
        const uploadId = event.data.upload_id

        if (!playbackId) {
            console.error('No se encontró un playback_id público para el asset:', assetId)
            return new Response('No public playback_id', { status: 422 })
        }

        // El webhook envía el assetId. Pero la base de datos lo guardó al principio con el Mux Upload ID en la columna mux_asset_id.
        // Mux a veces adjunta upload_id en los eventos. Si lo tenemos actualizamos basándonos en eso o en el asset directamente si se configuró antes.
        const idColumna = uploadId ? uploadId : assetId; // Usamos uploadId si está presente para igualar lo guardado en el API

        const { error } = await supabase
            .from('videos')
            .update({
                estado: 'listo',
                mux_playback_id: playbackId,
                mux_asset_id: assetId // Corregimos actualizándolo al Asset ID Real por si lo necesitan luego
            })
            // Intentamos buscar por mux_asset_id tanto si es el UploadID original (guardado al crear) o el AssetID ya registrado
            .or(`mux_asset_id.eq.${assetId},mux_asset_id.eq.${uploadId || assetId}`)

        if (error) {
            console.error('Error actualizando video en BD:', error)
            return new Response('Error en base de datos', { status: 500 })
        }

        console.log(`✅ Video listo: asset=${assetId}, playback=${playbackId}, upload=${uploadId}`)
    }

    // Evento auxiliar crucial: Asset Creado desde un Upload Directo 
    // Mux emite esto cuando un Upload termina y crea el Asset. Aquí vinculamos el UploadID original de la DB con el nuevo AssetID.
    if (event.type === 'video.upload.asset_created') {
        const uploadId = event.data.id;
        const assetId = event.data.asset_id;

        const { error } = await supabase
            .from('videos')
            .update({ mux_asset_id: assetId })
            .eq('mux_asset_id', uploadId) // Busca la fila con el upload_id que guardó Astro al inicio

        if (error) {
            console.error('Error bindeando Upload ID con Asset ID', error);
        } else {
            console.log(`🔗 Vinculado Upload ${uploadId} con Asset ${assetId}`);
        }
    }

    // Evento: Error en el procesamiento del video
    if (event.type === 'video.asset.errored') {
        const assetId = event.data.id
        await supabase
            .from('videos')
            .update({ estado: 'error' })
            .or(`mux_asset_id.eq.${assetId}`)

        console.error('❌ Error en asset de Mux:', assetId)
    }

    return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    })
})
