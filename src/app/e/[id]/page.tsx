import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Backdrop } from '@/components/Backdrop';
import { Chart } from '@/components/Chart';
import { CoverArt } from '@/components/CoverArt';
import { Gallery } from '@/components/Gallery';
import { ExpenseForm, Flash, Stat } from '@/components/ui';
import { barChartSvg } from '@/lib/charts';
import { getPhotos, getPublicEvent, loadEventBundle } from '@/lib/event-data';
import { fmtDate, fmtDay, fmtINR } from '@/lib/money';
import { getMemberSession } from '@/lib/session';
import { asTheme } from '@/lib/themes';
import { isUuid } from '@/lib/validate';
import { addMemberExpense, memberLogout } from './actions';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ev = isUuid(id) ? await getPublicEvent(id).catch(() => null) : null;
  return {
    title: ev ? ev.title : 'Event',
    description: ev ? `Expenses, balances and photos for ${ev.title}.` : 'Event workspace',
    robots: { index: false },
  };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function EventHome({ params, searchParams }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await getMemberSession(id);
  if (!session) redirect(`/e/${id}/login`);

  const [bundle, photos, sp] = await Promise.all([loadEventBundle(id), getPhotos(id), searchParams]);
  if (!bundle) notFound();
  const { event, people, summary: s } = bundle;
  const me = s.people.find((p) => p.id === session.participantId);
  if (!me) redirect(`/e/${id}/login`);

  const nameOf = new Map(s.people.map((p) => [p.id, p.name]));
  const theme = asTheme(event.theme);
  const when = event.ends_on && event.ends_on !== event.starts_on ? `${fmtDate(event.starts_on)} – ${fmtDate(event.ends_on)}` : fmtDate(event.starts_on);
  const myPay = s.settlements.filter((t) => t.from === me.id || t.to === me.id);
  const daysDesc = [...s.days].reverse();
  const dailyChart = barChartSvg(s.days.map((d) => ({ label: fmtDay(d.date).replace(/^\w+, /, ''), value: d.total })), 'Spending per day');

  return (
    <>
      <Backdrop images={photos.map((p) => p.url)} theme={theme} />
      <main className="wrap stack">
        <header className="event-head">
          <div className="art"><CoverArt theme={theme} seed={event.id} /></div>
          <div className="inner">
            <span className="chip" style={{ width: 'fit-content', color: 'var(--ink)' }}>{me.emoji ?? '🎉'} {me.name}</span>
            <h1>{event.title}</h1>
            <p style={{ margin: 0 }}>{when}{event.tagline ? ` · ${event.tagline}` : ''}</p>
            <form action={memberLogout.bind(null, id)}>
              <button className="btn btn-sm">Sign out</button>
            </form>
          </div>
        </header>

        <Flash msg={one(sp.msg)} err={one(sp.err)} />

        <section className="grid grid-4" aria-label="Summary">
          <Stat label="Event total" value={fmtINR(s.total)} hint={`${s.count} items · ${s.days.length} days`} />
          <Stat label="Fair share each" value={fmtINR(me.share)} hint={`${s.people.length} people`} />
          <Stat label="You paid" value={fmtINR(me.paid)} />
          <Stat
            label="Your balance"
            tone={me.balance > 0 ? 'good' : me.balance < 0 ? 'bad' : undefined}
            value={me.balance > 0 ? `+${fmtINR(me.balance)}` : me.balance < 0 ? `−${fmtINR(-me.balance)}` : 'Settled'}
            hint={me.balance > 0 ? 'you get this back' : me.balance < 0 ? 'you owe this' : 'nothing to pay'}
          />
        </section>

        <section className="card" id="settle">
          <div className="row row-between" style={{ alignItems: 'baseline', marginBottom: 12 }}>
            <h2>Settle up (Who needs to pay whom)</h2>
            <a className="btn btn-sm" href={`/api/admin/events/${id}/report?inline=1`} target="_blank" rel="noopener">
              📄 View full report
            </a>
          </div>
          {s.settlements.length === 0 ? (
            <p className="muted">Nothing to settle yet. Add items below and the transfers appear here.</p>
          ) : (
            <>
              {myPay.length > 0 && (
                <>
                  <h3>Your payments</h3>
                  <ul className="pay-list">
                    {myPay.map((t, i) => (
                      <li key={i} className="me">
                        <span>{t.from === me.id ? <>You pay <b>{nameOf.get(t.to)}</b></> : <><b>{nameOf.get(t.from)}</b> pays you</>}</span>
                        <span className="amt">{fmtINR(t.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <h3>Everyone</h3>
              <ul className="pay-list">
                {s.settlements.map((t, i) => (
                  <li key={i}>
                    <span><b>{nameOf.get(t.from)}</b> pays <b>{nameOf.get(t.to)}</b></span>
                    <span className="amt">{fmtINR(t.amount)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card" id="add">
          <h2>Add an item</h2>
          <ExpenseForm action={addMemberExpense.bind(null, id)} people={s.people.map((p) => ({ id: p.id, name: p.name }))} defaultPayer={me.id} />
        </section>

        <section className="grid grid-2">
          <div className="card">
            <h2>Who paid what</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Person</th><th className="r">Paid</th><th className="r">Balance</th></tr></thead>
                <tbody>
                  {s.people.map((p) => (
                    <tr key={p.id}>
                      <td>{p.emoji} {p.name}{p.id === me.id ? ' (you)' : ''}</td>
                      <td className="r num">{fmtINR(p.paid)}</td>
                      <td className={`r num ${p.balance > 0 ? 'pos' : p.balance < 0 ? 'neg' : ''}`}>
                        {p.balance > 0 ? `+${fmtINR(p.balance)}` : p.balance < 0 ? `−${fmtINR(-p.balance)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Chart svg={dailyChart} title="Spending per day" />
        </section>

        <section className="card" id="days">
          <h2>Day by day</h2>
          {daysDesc.length === 0 && <p className="muted">No items yet. Be the first to add one.</p>}
          <div className="stack">
            {daysDesc.map((d) => (
              <article key={d.date} className="day">
                <header>
                  <h3>{fmtDay(d.date)}</h3>
                  <span className="day-total num">{fmtINR(d.total)}</span>
                </header>
                <p className="day-payers">Paid by: {d.payers.map((p) => `${p.name} ${fmtINR(p.amount)}`).join(' · ')}</p>
                {d.items.map((it) => (
                  <div key={it.id} className="item">
                    <div>{it.title}<small>paid by {nameOf.get(it.paidBy)}{it.addedBy ? ` · added by ${it.addedBy}` : ''}</small></div>
                    <b className="num">{fmtINR(it.amount)}</b>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>

        <section className="card" id="gallery">
          <h2>Gallery <span className="muted" style={{ fontSize: '1rem' }}>{photos.length}/20</span></h2>
          <Gallery photos={photos} />
        </section>
      </main>
    </>
  );
}
