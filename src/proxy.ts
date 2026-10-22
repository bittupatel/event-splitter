import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { cleanSupabaseKey, cleanSupabaseUrl } from '@/lib/supabase/admin';

/** Keeps the admin's Supabase session cookie fresh on admin routes. */
export async function proxy(req: NextRequest) {
  const url = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = cleanSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  let res = NextResponse.next({ request: req });
  if (!url || !anon) return res;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return res;
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
