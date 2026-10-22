import Link from 'next/link';
import type { Metadata } from 'next';
import { Backdrop } from '@/components/Backdrop';
import { CoverArt } from '@/components/CoverArt';
import { Flash } from '@/components/ui';
import { requireAdmin } from '@/lib/auth-admin';
import { db } from '@/lib/supabase/admin';
import { fmtDate, fmtINR } from '@/lib/money';
import { THEMES, THEME_KEYS, asTheme } from '@/lib/themes';
import { todayLocal } from '@/lib/validate';
import { adminLogout, createEvent } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Admin workspace',
  description: 'Create events and manage every expense, person, photo and report.',
  robots: { index: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

import { getSettings, smtpReady } from '@/lib/settings';

export default async function AdminHome({ searchParams }: Props) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const client = db();
  const [{ data: events }, { data: totals }, settings] = await Promise.all([
    client.from('events').select('id,title,tagline,theme,starts_on,ends_on,is_live,participants(count)').order('starts_on', { ascending: false }),
    client.from('expenses').select('event_id,amount_paise'),
    getSettings(),
  ]);
  const sumBy = new Map<string, number>();
  (totals ?? []).forEach((r: any) => sumBy.set(r.event_id, (sumBy.get(r.event_id) ?? 0) + Number(r.amount_paise)));

  return (
    <>
      <Backdrop theme="marigold" />
      <main className="wrap stack">
        <div className="row row-between">
          <div>
            <h1 style={{ fontSize: '2.4rem' }}>Admin workspace</h1>
            <p className="muted" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Signed in as {user.email}</span>
              <span>·</span>
              <span className={`chip ${settings.otp_required ? 'chip-live' : ''}`} style={{ fontSize: '0.72rem', padding: '1px 8px' }}>
                {settings.otp_required ? 'OTP Login: ON' : 'OTP Login: OFF'}
              </span>
              <span className="chip" style={{ fontSize: '0.72rem', padding: '1px 8px', background: smtpReady(settings) ? 'var(--good)' : 'var(--line)', color: smtpReady(settings) ? '#fff' : 'var(--ink)' }}>
                {smtpReady(settings) ? 'SMTP Active' : 'SMTP Off'}
              </span>
            </p>
          </div>
          <div className="row">
            <Link href="/admin/settings" className="btn btn-sm btn-accent">⚙️ Settings & SMTP</Link>
            <Link href="/" className="btn btn-sm">Public hub</Link>
            <form action={adminLogout}><button className="btn btn-sm">Sign out</button></form>
          </div>
        </div>
        <Flash msg={one(sp.msg)} err={one(sp.err)} />

        <section className="card">
          <h2>Create an event</h2>
          <form action={createEvent} className="expense-form">
            <label><span>Title</span><input name="title" required minLength={2} maxLength={80} placeholder="Lantern Night Trip" /></label>
            <label><span>Tagline (optional)</span><input name="tagline" maxLength={140} placeholder="Three days, one big group" /></label>
            <label>
              <span>Look</span>
              <select name="theme" defaultValue="lantern">
                {THEME_KEYS.map((k) => <option key={k} value={k}>{THEMES[k].label}</option>)}
              </select>
            </label>
            <label><span>Starts</span><input type="date" name="starts_on" required defaultValue={todayLocal()} /></label>
            <label><span>Ends (optional)</span><input type="date" name="ends_on" /></label>
            <label><span>Shared event password</span><input type="text" name="password" required minLength={6} maxLength={100} autoComplete="off" placeholder="min 6 characters" /></label>
            <button className="btn btn-primary">Create event</button>
          </form>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: 10 }}>
            Everyone in an event signs in with the shared password, their own invited email, and a one-time code you issue.
          </p>
        </section>

        <section>
          <h2 style={{ marginBottom: 14 }}>Your events</h2>
          {(events ?? []).length === 0 && <div className="card empty"><p className="muted">No events yet. Create your first one above.</p></div>}
          <div className="events">
            {(events ?? []).map((e: any) => (
              <Link key={e.id} href={`/admin/events/${e.id}`} className="event-card">
                <div className="cover">
                  <CoverArt theme={asTheme(e.theme)} seed={e.id} />
                  <span className={`chip${e.is_live ? ' chip-live' : ''}`}>{e.is_live ? 'Live' : 'Hidden'}</span>
                </div>
                <div className="body">
                  <h3>{e.title}</h3>
                  <span className="muted">{fmtDate(e.starts_on)} · {e.participants?.[0]?.count ?? 0} people</span>
                  <b className="num">{fmtINR(sumBy.get(e.id) ?? 0)} spent</b>
                  <span className="go">Open workspace →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
