import { redirect } from 'next/navigation';
import { authClient } from '@/lib/supabase/server';

export const adminEmails = () =>
  (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** The signed-in admin, or null. Requires a confirmed email on the allow-list. */
export async function getAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const sb = await authClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email || !user.email_confirmed_at) return null;
  if (!adminEmails().includes(user.email.toLowerCase())) return null;
  return user;
}

export async function requireAdmin() {
  const user = await getAdmin();
  if (!user) redirect('/admin/login');
  return user;
}
