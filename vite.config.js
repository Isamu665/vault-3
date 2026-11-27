import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { validatePublicSupabaseConfig } from './scripts/build-security.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const url = env.VITE_SUPABASE_URL ?? '';
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  validatePublicSupabaseConfig(url, key);

  return {
    base: mode === 'github-pages' ? '/vault-3/' : '/',
    // Do not expose arbitrary VITE_* values to browser code.
    envPrefix: [],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(key),
    },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    plugins: [react()],
  };
});
