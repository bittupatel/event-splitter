import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function cleanSupabaseUrl(raw?: string): string {
  if (!raw) return '';
  let url = raw.trim();
  if (url.includes('=')) {
    url = url.split('=').pop()?.trim() ?? url;
  }
  url = url.replace(/^["']|["']$/g, '').trim();
  url = url.replace(/\.supabase\.com(\/.*)?$/, (_m, rest) => `.supabase.co${rest ?? ''}`);
  url = url.replace(/\/+$/, '');
  return url;
}

export function cleanSupabaseKey(raw?: string): string {
  if (!raw) return '';
  let key = raw.trim();
  if (key.includes('=')) {
    key = key.split('=').pop()?.trim() ?? key;
  }
  return key.replace(/^["']|["']$/g, '').trim();
}

/**
 * Service-role client. Server only. It bypasses RLS, so every caller must have
 * already verified the admin identity or the event-scoped participant session.
 */
export function db(): SupabaseClient {
  if (!client) {
    const url = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const key = cleanSupabaseKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!url || !key) throw new Error('Supabase environment variables are missing.');
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

export const supabaseConfigured = () =>
  Boolean(
    cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      cleanSupabaseKey(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      cleanSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      process.env.SESSION_SECRET?.trim(),
  );
