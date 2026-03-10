// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // SSR para API routes y páginas dinámicas
  output: 'server',

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel()
});