import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Inicializar el cliente sólo si las variables están definidas
export const supabase = createClient(
  supabaseUrl || 'https://tu-proyecto.supabase.co',
  supabaseAnonKey || 'tu-anon-key'
);

// Utilidad para Login con Google
export async function loginConGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/entrenamiento', // Redirigir al dashboard tras login
    },
  });
  
  if (error) {
    console.error('Error iniciando sesión con Google:', error.message);
    throw error;
  }
  
  return data;
}

// Utilidad para Cerrar Sesión
export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error cerrando sesión:', error.message);
    throw error;
  }
}
