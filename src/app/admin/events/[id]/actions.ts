'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-admin';
import { db } from '@/lib/supabase/admin';
import { generateOtp, hashOtp, OTP_TTL_MINUTES } from '@/lib/codes';
import { sendMail, otpEmailBody, otpEmailForAdmin } from '@/lib/mailer';
import { parseRupeesToPaise } from '@/lib/money';
import { getSettings, getAdminNotificationEmail, smtpReady } from '@/lib/settings';
import { THEMES } from '@/lib/themes';
import { PHOTO_BUCKET } from '@/lib/types';
import { dateInSaneRange, field, isDate, isEmail, isUuid } from '@/lib/validate';
import { go } from '@/lib/nav';

const base = (id: string) => `/admin/events/${id}`;

async function guard(id: string) {
  await requireAdmin();
  if (!isUuid(id)) redirect('/admin');
}

/* ---------- expenses ---------- */

function parseExpense(id: string, fd: FormData, tab = 'expenses') {
  const date = field(fd, 'date');
  const title = field(fd, 'title').slice(0, 100);
  const paise = parseRupeesToPaise(field(fd, 'amount'));
  const paidBy = field(fd, 'paid_by');
  if (!isDate(date) || !dateInSaneRange(date)) go(base(id), { tab, err: 'Pick a valid date.' });
  if (!title) go(base(id), { tab, err: 'Add a title for the item.' });
  if (paise === null) go(base(id), { tab, err: 'Enter a valid amount, like 400 or 35.50.' });
  if (!isUuid(paidBy)) go(base(id), { tab, err: 'Choose who paid.' });
  return { date, title, paise, paidBy };
}

export async function addExpense(id: string, fd: FormData): Promise<void> {
  await guard(id);
  const x = parseExpense(id, fd);
  const client = db();
  const { data: payer } = await client.from('participants').select('id').eq('id', x.paidBy).eq('event_id', id).maybeSingle();
  if (!payer) go(base(id), { tab: 'expenses', err: 'That person is not on this event.' });
  const { error } = await client.from('expenses').insert({ event_id: id, spent_on: x.date, title: x.title, amount_paise: x.paise, paid_by: x.paidBy, added_by: 'admin' });
  if (error) go(base(id), { tab: 'expenses', err: 'Could not save the item.' });
  go(base(id), { tab: 'expenses', msg: `Added “${x.title}”.` });
}

export async function updateExpense(id: string, expenseId: string, fd: FormData): Promise<void> {
  await guard(id);
  if (!isUuid(expenseId)) go(base(id), { tab: 'expenses', err: 'Unknown item.' });
  const x = parseExpense(id, fd);
  const client = db();
  const { data: payer } = await client.from('participants').select('id').eq('id', x.paidBy).eq('event_id', id).maybeSingle();
  if (!payer) go(base(id), { tab: 'expenses', err: 'That person is not on this event.' });
  const { error } = await client.from('expenses').update({ spent_on: x.date, title: x.title, amount_paise: x.paise, paid_by: x.paidBy }).eq('id', expenseId).eq('event_id', id);
  if (error) go(base(id), { tab: 'expenses', err: 'Could not update the item.' });
  go(base(id), { tab: 'expenses', msg: 'Item updated.' });
}

export async function deleteExpense(id: string, expenseId: string): Promise<void> {
  await guard(id);
  if (isUuid(expenseId)) await db().from('expenses').delete().eq('id', expenseId).eq('event_id', id);
  go(base(id), { tab: 'expenses', msg: 'Item removed.' });
}

/* ---------- people ---------- */

function parsePerson(id: string, fd: FormData) {
  const name = field(fd, 'name').slice(0, 60);
  const email = field(fd, 'email').toLowerCase();
  const emoji = (field(fd, 'emoji') || '🎉').slice(0, 8);
  const note = field(fd, 'note').slice(0, 200) || null;
  if (!name) go(base(id), { tab: 'people', err: 'Add a display name.' });
  if (!isEmail(email)) go(base(id), { tab: 'people', err: 'Enter a valid email address.' });
  return { name, email, emoji, note };
}

export async function addPerson(id: string, fd: FormData): Promise<void> {
  await guard(id);
  const p = parsePerson(id, fd);
  const { error } = await db().from('participants').insert({ event_id: id, display_name: p.name, email: p.email, emoji: p.emoji, note: p.note });
  if (error) go(base(id), { tab: 'people', err: error.code === '23505' ? 'That email is already on this event.' : 'Could not add that person.' });
  go(base(id), { tab: 'people', msg: `${p.name} added. Issue a one-time code when they are ready to sign in.` });
}

export async function updatePerson(id: string, personId: string, fd: FormData): Promise<void> {
  await guard(id);
  if (!isUuid(personId)) go(base(id), { tab: 'people', err: 'Unknown person.' });
  const p = parsePerson(id, fd);
  const { error } = await db().from('participants').update({ display_name: p.name, email: p.email, emoji: p.emoji, note: p.note }).eq('id', personId).eq('event_id', id);
  if (error) go(base(id), { tab: 'people', err: error.code === '23505' ? 'That email is already on this event.' : 'Could not update that person.' });
  go(base(id), { tab: 'people', msg: 'Profile updated.' });
}

export async function deletePerson(id: string, personId: string): Promise<void> {
  await guard(id);
  if (!isUuid(personId)) go(base(id), { tab: 'people', err: 'Unknown person.' });
  const { error } = await db().from('participants').delete().eq('id', personId).eq('event_id', id);
  if (error) {
    go(base(id), { tab: 'people', err: error.code === '23503' ? 'This person paid for items. Reassign or delete those items first.' : 'Could not remove that person.' });
  }
  go(base(id), { tab: 'people', msg: 'Person removed.' });
}

export type CodeState = { code?: string; expires?: string; error?: string; who?: string; emailSent?: boolean; emailError?: string };

/** Issues a fresh single-use code. The plain code is returned once and never stored.
 *  If SMTP is configured, the code is also emailed to the participant. */
export async function issueCode(id: string, personId: string, _prev: CodeState, _fd: FormData): Promise<CodeState> {
  await requireAdmin();
  if (!isUuid(id) || !isUuid(personId)) return { error: 'Unknown person.' };
  const client = db();
  const [{ data: person }, { data: ev }] = await Promise.all([
    client.from('participants').select('id,display_name,email').eq('id', personId).eq('event_id', id).maybeSingle(),
    client.from('events').select('title').eq('id', id).maybeSingle(),
  ]);
  if (!person) return { error: 'Unknown person.' };

  // Only the newest code is valid: retire any outstanding ones.
  const nowIso = new Date().toISOString();
  await client.from('access_codes').update({ used_at: nowIso }).eq('participant_id', personId).is('used_at', null);

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
  const { error } = await client.from('access_codes').insert({
    event_id: id,
    participant_id: personId,
    code_hash: hashOtp(code, id, personId),
    expires_at: expiresAt.toISOString(),
  });
  if (error) return { error: 'Could not create a code. Try again.' };

  // Try emailing the OTP if SMTP is configured
  let emailSent = false;
  let emailError: string | undefined;
  const settings = await getSettings();
  if (smtpReady(settings)) {
    const adminEmail = await getAdminNotificationEmail(settings);
    if (adminEmail) {
      const adminMail = otpEmailForAdmin(code, ev?.title ?? 'Event', person.display_name, person.email, OTP_TTL_MINUTES);
      await sendMail(settings, {
        to: adminEmail,
        subject: `[Admin OTP Alert] Login code for ${person.display_name} – ${ev?.title ?? 'Event'}`,
        textBody: adminMail.text,
        htmlBody: adminMail.html,
      });
      emailSent = true;
    }
    if (person.email && person.email.toLowerCase() !== adminEmail.toLowerCase()) {
      const { text, html } = otpEmailBody(code, ev?.title ?? 'Event', person.display_name, OTP_TTL_MINUTES);
      const err = await sendMail(settings, {
        to: person.email,
        subject: `Your login code for ${ev?.title ?? 'Event'}`,
        textBody: text,
        htmlBody: html,
      });
      if (err && !emailSent) emailError = err;
      else if (!err) emailSent = true;
    }
  }

  return { code, who: person.display_name, expires: `${OTP_TTL_MINUTES} minutes`, emailSent, emailError };
}

/* ---------- event settings ---------- */

export async function updateEvent(id: string, fd: FormData): Promise<void> {
  await guard(id);
  const title = field(fd, 'title');
  const tagline = field(fd, 'tagline').slice(0, 140) || null;
  const theme = field(fd, 'theme');
  const startsOn = field(fd, 'starts_on');
  const endsOn = field(fd, 'ends_on') || null;
  const isLive = fd.get('is_live') === 'on';
  if (title.length < 2 || title.length > 80) go(base(id), { tab: 'settings', err: 'Title must be 2–80 characters.' });
  if (!(theme in THEMES)) go(base(id), { tab: 'settings', err: 'Pick a look.' });
  if (!isDate(startsOn) || (endsOn && (!isDate(endsOn) || endsOn < startsOn))) go(base(id), { tab: 'settings', err: 'Check the dates.' });
  const { error } = await db().from('events').update({ title, tagline, theme, starts_on: startsOn, ends_on: endsOn, is_live: isLive }).eq('id', id);
  if (error) go(base(id), { tab: 'settings', err: 'Could not save changes.' });
  go(base(id), { tab: 'settings', msg: 'Event updated.' });
}

export async function changeEventPassword(id: string, fd: FormData): Promise<void> {
  await guard(id);
  const password = String(fd.get('password') ?? '');
  if (password.length < 6 || password.length > 100) go(base(id), { tab: 'settings', err: 'The password needs 6–100 characters.' });
  const { error } = await db().from('events').update({ password_hash: await bcrypt.hash(password, 10) }).eq('id', id);
  if (error) go(base(id), { tab: 'settings', err: 'Could not change the password.' });
  go(base(id), { tab: 'settings', msg: 'Shared password changed. Share the new one with the group.' });
}

export async function deleteEvent(id: string, fd: FormData): Promise<void> {
  await guard(id);
  const client = db();
  const { data: ev } = await client.from('events').select('title').eq('id', id).maybeSingle();
  if (!ev) redirect('/admin');
  if (field(fd, 'confirm') !== ev.title) go(base(id), { tab: 'settings', err: 'Type the exact event title to confirm deletion.' });
  const { data: photos } = await client.from('event_photos').select('storage_path').eq('event_id', id);
  if (photos?.length) await client.storage.from(PHOTO_BUCKET).remove(photos.map((p: { storage_path: string }) => p.storage_path));
  const { error } = await client.from('events').delete().eq('id', id);
  if (error) go(base(id), { tab: 'settings', err: 'Could not delete the event.' });
  go('/admin', { msg: 'Event deleted.' });
}

/* ---------- gallery ---------- */

export async function deletePhoto(id: string, photoId: string): Promise<void> {
  await guard(id);
  if (!isUuid(photoId)) go(base(id), { tab: 'gallery', err: 'Unknown photo.' });
  const client = db();
  const { data: row } = await client.from('event_photos').select('storage_path').eq('id', photoId).eq('event_id', id).maybeSingle();
  if (row) {
    await client.storage.from(PHOTO_BUCKET).remove([row.storage_path]);
    await client.from('event_photos').delete().eq('id', photoId).eq('event_id', id);
  }
  go(base(id), { tab: 'gallery', msg: 'Photo removed.' });
}
