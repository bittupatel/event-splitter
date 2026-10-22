'use server';

import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase/admin';
import { generateOtp, hashOtp, OTP_TTL_MINUTES } from '@/lib/codes';
import { clearMemberSession, createMemberSession, getMemberSession } from '@/lib/session';
import { dateInSaneRange, field, isDate, isEmail, isUuid } from '@/lib/validate';
import { parseRupeesToPaise } from '@/lib/money';
import { go } from '@/lib/nav';
import { getAdminNotificationEmail, getSettings, smtpReady } from '@/lib/settings';
import { otpEmailForAdmin, sendMail } from '@/lib/mailer';

export type LoginState = { error?: string; info?: string };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;
const GENERIC = 'Those details did not match. Check the event email, shared password and the fresh one-time code from the organiser.';
const GENERIC_NO_OTP = 'Those details did not match. Check the event email and shared password.';
// Real bcrypt hash of a random string, so timing is similar when the event is unknown.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(12).toString('hex'), 10);

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '').trim().slice(0, 64);
}

export async function memberLogin(eventId: string, _prev: LoginState, fd: FormData): Promise<LoginState> {
  if (!isUuid(eventId)) return { error: GENERIC };
  const email = field(fd, 'email').toLowerCase();
  const password = String(fd.get('password') ?? '');
  const otp = field(fd, 'otp').replace(/\D/g, '');
  if (!isEmail(email) || !password || password.length > 200) {
    return { error: 'Enter your event email and the shared password.' };
  }

  const client = db();
  const ip = await clientIp();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const [byEmail, byIp] = await Promise.all([
    client.from('login_attempts').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('email', email).gte('created_at', since),
    ip
      ? client.from('login_attempts').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', since)
      : Promise.resolve({ count: 0 }),
  ]);
  if ((byEmail.count ?? 0) >= MAX_PER_EMAIL || (byIp.count ?? 0) >= MAX_PER_IP) {
    return { error: 'Too many attempts. Please wait 15 minutes and try again.' };
  }

  // Check if OTP is required from admin settings
  const { data: settings } = await client.from('admin_settings').select('otp_required').eq('id', 1).maybeSingle();
  const otpRequired = settings?.otp_required ?? true;

  const fail = async (): Promise<LoginState> => {
    await client.from('login_attempts').insert({ event_id: eventId, email, ip });
    return { error: otpRequired ? GENERIC : GENERIC_NO_OTP };
  };

  const { data: ev } = await client.from('events').select('id,password_hash').eq('id', eventId).maybeSingle();
  const passwordOk = await bcrypt.compare(password, ev?.password_hash ?? DUMMY_HASH);
  if (!ev || !passwordOk) return fail();

  const { data: person } = await client.from('participants').select('id').eq('event_id', eventId).eq('email', email).maybeSingle();
  if (!person) return fail();

  if (otpRequired) {
    // OTP is required: validate the 6-digit code
    if (otp.length !== 6) {
      return { error: 'Enter the 6-digit one-time code from the organiser.' };
    }

    // Redeem the one-time code atomically: only one request can flip used_at from null.
    const nowIso = new Date().toISOString();
    const { data: redeemed } = await client
      .from('access_codes')
      .update({ used_at: nowIso })
      .eq('event_id', eventId)
      .eq('participant_id', person.id)
      .eq('code_hash', hashOtp(otp, eventId, person.id))
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .select('id');
    if (!redeemed || redeemed.length !== 1) return fail();
  }

  await client.from('login_attempts').delete().eq('event_id', eventId).eq('email', email);
  await createMemberSession(eventId, person.id);
  redirect(`/e/${eventId}`);
}

export async function requestMemberOtp(eventId: string, fd: FormData): Promise<LoginState> {
  if (!isUuid(eventId)) return { error: GENERIC };
  const email = field(fd, 'email').toLowerCase();
  const password = String(fd.get('password') ?? '');
  if (!isEmail(email) || !password) {
    return { error: 'Please enter your invited email and event password first to request an OTP.' };
  }

  const client = db();
  const ip = await clientIp();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const [byEmail, byIp] = await Promise.all([
    client.from('login_attempts').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('email', email).gte('created_at', since),
    ip
      ? client.from('login_attempts').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', since)
      : Promise.resolve({ count: 0 }),
  ]);
  if ((byEmail.count ?? 0) >= MAX_PER_EMAIL || (byIp.count ?? 0) >= MAX_PER_IP) {
    return { error: 'Too many requests. Please wait 15 minutes before requesting another OTP.' };
  }

  const { data: ev } = await client.from('events').select('id,title,password_hash').eq('id', eventId).maybeSingle();
  const passwordOk = await bcrypt.compare(password, ev?.password_hash ?? DUMMY_HASH);
  if (!ev || !passwordOk) {
    await client.from('login_attempts').insert({ event_id: eventId, email, ip });
    return { error: 'The email or event password did not match.' };
  }

  const { data: person } = await client.from('participants').select('id,display_name,email').eq('event_id', eventId).eq('email', email).maybeSingle();
  if (!person) {
    await client.from('login_attempts').insert({ event_id: eventId, email, ip });
    return { error: 'No invited participant found with that email.' };
  }

  const settings = await getSettings();
  if (!settings.otp_required) {
    return { info: 'OTP login is currently disabled by the admin! You can sign in directly by clicking "Enter event".' };
  }

  // Retire outstanding codes
  const nowIso = new Date().toISOString();
  await client.from('access_codes').update({ used_at: nowIso }).eq('participant_id', person.id).is('used_at', null);

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
  const { error } = await client.from('access_codes').insert({
    event_id: eventId,
    participant_id: person.id,
    code_hash: hashOtp(code, eventId, person.id),
    expires_at: expiresAt.toISOString(),
  });
  if (error) return { error: 'Could not generate an OTP code. Please try again.' };

  if (!smtpReady(settings)) {
    return {
      error: 'SMTP email is not configured in the Admin Panel yet. Please contact the admin to set up SMTP or issue your code directly from the workspace.',
    };
  }

  const adminEmail = await getAdminNotificationEmail(settings);
  if (!adminEmail) {
    return { error: 'No admin email found to deliver the OTP. Please contact the administrator.' };
  }

  const adminMail = otpEmailForAdmin(code, ev.title, person.display_name, person.email, OTP_TTL_MINUTES);
  const sendErr = await sendMail(settings, {
    to: adminEmail,
    subject: `[Admin OTP Alert] Login code for ${person.display_name} – ${ev.title}`,
    textBody: adminMail.text,
    htmlBody: adminMail.html,
  });

  if (sendErr) {
    return { error: `Could not send OTP to admin email: ${sendErr}. Please ask the admin directly.` };
  }

  return {
    info: `✅ OTP sent successfully to the organiser's email! Please get your 6-digit code from the admin and enter it below.`,
  };
}

export async function memberLogout(eventId: string) {
  if (isUuid(eventId)) await clearMemberSession(eventId);
  redirect(`/e/${eventId}/login`);
}

export async function addMemberExpense(eventId: string, fd: FormData): Promise<void> {
  const session = isUuid(eventId) ? await getMemberSession(eventId) : null;
  if (!session) redirect(`/e/${eventId}/login`);

  const client = db();
  const { data: me } = await client.from('participants').select('id,display_name').eq('id', session.participantId).eq('event_id', eventId).maybeSingle();
  if (!me) {
    await clearMemberSession(eventId);
    redirect(`/e/${eventId}/login`);
  }

  const date = field(fd, 'date');
  const title = field(fd, 'title').slice(0, 100);
  const paise = parseRupeesToPaise(field(fd, 'amount'));
  const paidBy = field(fd, 'paid_by');
  const here = `/e/${eventId}`;

  if (!isDate(date) || !dateInSaneRange(date)) go(here, { err: 'Pick a valid date.' });
  if (!title) go(here, { err: 'Add a title for what was bought.' });
  if (paise === null) go(here, { err: 'Enter a valid amount, like 400 or 35.50.' });
  if (!isUuid(paidBy)) go(here, { err: 'Choose who paid.' });

  const { data: payer } = await client.from('participants').select('id').eq('id', paidBy).eq('event_id', eventId).maybeSingle();
  if (!payer) go(here, { err: 'Choose who paid.' });

  const { error } = await client.from('expenses').insert({
    event_id: eventId,
    spent_on: date,
    title,
    amount_paise: paise,
    paid_by: paidBy,
    added_by: me.display_name,
  });
  if (error) go(here, { err: 'Could not save that item. Please try again.' });
  go(here, { msg: `Added "${title}".` });
}
