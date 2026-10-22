import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { cleanSupabaseKey, cleanSupabaseUrl } from './admin';

/** Cookie-bound client acting as the signed-in admin (Supabase Auth). */
export async function authClient() {
  const store = await cookies();
  const url = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) {
    throw new Error('Supabase URL or Anon key is not configured.');
  }

  return createServerClient(url, anonKey, {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // called from a Server Component; middleware refreshes the session instead
          }
        },
      },
    },
  );
}
