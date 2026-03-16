// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  // Habilita SSR para API routes
  output: 'server',

  vite: {
    plugins: [tailwindcss()],
    // Esto evita que Vite se reinicie a mitad del arranque
    optimizeDeps: {
      include: ['@supabase/supabase-js']
    }
  },

  adapter: netlify()
});