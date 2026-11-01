import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const isConfigured = Boolean(url && key && !url.includes('YOUR_PROJECT'));
export const supabase = isConfigured ? createClient(url, key, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

export function requireBackend() {
  if (!supabase) throw new Error('Configure o Supabase para conectar sua conta e seus dados.');
  return supabase;
}

export async function getAuthProviders() {
  if (!isConfigured) return {};
  const response = await fetch(url + '/auth/v1/settings', { headers: { apikey: key } });
  if (!response.ok) throw new Error('Não foi possível consultar os métodos de login.');
  return (await response.json()).external;
}
