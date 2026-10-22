'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { adminEmails, requireAdmin } from '@/lib/auth-admin';
import { authClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/admin';
import { THEMES } from '@/lib/themes';
import { field, isDate, isEmail } from '@/lib/validate';
import { go } from '@/lib/nav';

export type AuthState = { error?: string; info?: string };

export async function adminLogin(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = field(fd, 'email').toLowerCase();
  const password = String(fd.get('password') ?? '');
  const mode = field(fd, 'mode');
  if (!isEmail(email) || password.length < 8) return { error: 'Enter your email and a password of at least 8 characters.' };

  // Only the configured administrator address may sign in or create the account.
  if (!adminEmails().includes(email)) return { error: 'That email is not the event administrator.' };

  const sb = await authClient();
  if (mode === 'signup') {
    const { error } = await sb.auth.signUp({ email, password });
    if (error) return { error: 'Could not create the account. If it already exists, sign in instead.' };
    return { info: 'Account created. Open the confirmation email, then come back and sign in.' };
  }

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  redirect('/admin');
}

export async function adminLogout() {
  const sb = await authClient();
  await sb.auth.signOut();
  redirect('/admin/login');
}

export async function createEvent(fd: FormData) {
  await requireAdmin();
  const title = field(fd, 'title');
  const tagline = field(fd, 'tagline').slice(0, 140) || null;
  const theme = field(fd, 'theme');
  const startsOn = field(fd, 'starts_on');
  const endsOn = field(fd, 'ends_on') || null;
  const password = String(fd.get('password') ?? '');

  if (title.length < 2 || title.length > 80) go('/admin', { err: 'Give the event a title (2–80 characters).' });
  if (!(theme in THEMES)) go('/admin', { err: 'Pick a look for the event.' });
  if (!isDate(startsOn) || (endsOn && (!isDate(endsOn) || endsOn < startsOn))) go('/admin', { err: 'Check the event dates.' });
  if (password.length < 6 || password.length > 100) go('/admin', { err: 'The shared event password needs 6–100 characters.' });

  const { data, error } = await db()
    .from('events')
    .insert({ title, tagline, theme, starts_on: startsOn, ends_on: endsOn, password_hash: await bcrypt.hash(password, 10) })
    .select('id')
    .single();
  if (error || !data) go('/admin', { err: 'Could not create the event.' });
  go(`/admin/events/${data.id}`, { tab: 'people', msg: 'Event created. Add your people next, then issue their one-time codes.' });
}
