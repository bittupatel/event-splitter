import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Backdrop } from '@/components/Backdrop';
import { Chart } from '@/components/Chart';
import { CopyButton } from '@/components/CopyButton';
import { CoverArt } from '@/components/CoverArt';
import { ExpenseForm, Flash, Stat } from '@/components/ui';
import { requireAdmin } from '@/lib/auth-admin';
import { barChartSvg, donutSvg, pairChartSvg } from '@/lib/charts';
import { getPhotos, loadEventBundle } from '@/lib/event-data';
import { fmtDate, fmtDay, fmtINR } from '@/lib/money';
import { THEMES, THEME_KEYS, asTheme } from '@/lib/themes';
import { PHOTO_LIMIT } from '@/lib/types';
import { isUuid } from '@/lib/validate';
import {
  addExpense, addPerson, changeEventPassword, deleteEvent, deleteExpense, deletePerson,
  deletePhoto, issueCode, updateEvent, updateExpense, updatePerson,
} from './actions';
import { IssueCode } from './IssueCode';
import { PhotoUploader } from './PhotoUploader';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Event workspace',
  description: 'Manage people, expenses, photos, analysis and reports for this event.',
  robots: { index: false },
};

const TABS = [
  ['overview', 'Dashboard'],
  ['expenses', 'Expenses'],
  ['people', 'People & codes'],
  ['gallery', 'Gallery'],
  ['settings', 'Settings'],
  ['report', 'Report'],
] as const;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminEvent({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sp = await searchParams;
  const bundle = await loadEventBundle(id);
  if (!bundle) notFound();

  const tabParam = one(sp.tab) ?? 'overview';
  const tab = TABS.some(([k]) => k === tabParam) ? tabParam : 'overview';
  const { event, people, summary: s } = bundle;
  const theme = asTheme(event.theme);
  const photos = tab === 'gallery' ? await getPhotos(id) : [];
  const nameOf = new Map(s.people.map((p) => [p.id, p.name]));
  const personOptions = s.people.map((p) => ({ id: p.id, name: p.name }));
  const when = event.ends_on && event.ends_on !== event.starts_on ? `${fmtDate(event.starts_on)} – ${fmtDate(event.ends_on)}` : fmtDate(event.starts_on);
  const daysDesc = [...s.days].reverse();
  const href = (t: string) => `/admin/events/${id}?tab=${t}`;

  return (
    <>
      <Backdrop theme={theme} />
      <main className="wrap">
        <div className="row row-between" style={{ marginBottom: 12 }}>
          <Link href="/admin">← All events</Link>
          <Link href="/admin/settings" className="btn btn-sm btn-ghost">⚙️ Admin Settings &amp; SMTP</Link>
        </div>
        <header className="event-head">
          <div className="art"><CoverArt theme={theme} seed={event.id} /></div>
          <div className="inner">
            <div className="row">
              <span className={`chip${event.is_live ? ' chip-live' : ''}`}>{event.is_live ? 'Live on hub' : 'Hidden from hub'}</span>
              <span className="chip" style={{ color: 'var(--ink)' }}>{THEMES[theme].label}</span>
            </div>
            <h1>{event.title}</h1>
            <p style={{ margin: 0 }}>{when}{event.tagline ? ` · ${event.tagline}` : ''}</p>
            <div className="row">
              <Link href={`/e/${id}/login`} className="btn btn-sm">Open public sign-in</Link>
              <a href={`/api/admin/events/${id}/report`} className="btn btn-sm btn-accent">Download HTML report</a>
            </div>
          </div>
        </header>

        <nav className="tabs" aria-label="Event sections">
          {TABS.map(([k, label]) => (
            <Link key={k} href={href(k)} className="tab" aria-current={tab === k ? 'page' : undefined}>{label}</Link>
          ))}
        </nav>

        <div className="stack">
          <Flash msg={one(sp.msg)} err={one(sp.err)} />

          {tab === 'overview' && (
            <>
              <section className="grid grid-4">
                <Stat label="Total spent" value={fmtINR(s.total)} hint={`${s.count} items`} />
                <Stat label="People" value={s.people.length} />
                <Stat label="Fair share each" value={fmtINR(s.people[0]?.share ?? 0)} />
                <Stat label="Days with spending" value={s.days.length} hint={s.days.length ? `avg ${fmtINR(Math.round(s.total / s.days.length))}/day` : undefined} />
              </section>

              <section className="card">
                <h2>Who pays whom</h2>
                {s.settlements.length === 0 ? (
                  <p className="muted">{s.count === 0 ? 'Add expenses to see settlements.' : 'Everyone is settled up.'}</p>
                ) : (
                  <ul className="pay-list">
                    {s.settlements.map((t, i) => (
                      <li key={i}>
                        <span><b>{nameOf.get(t.from)}</b> pays <b>{nameOf.get(t.to)}</b></span>
                        <span className="amt">{fmtINR(t.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="grid grid-2">
                <Chart title="Spending per day" svg={barChartSvg(s.days.map((d) => ({ label: fmtDay(d.date).replace(/^\w+, /, ''), value: d.total })), 'Spending per day')} />
                <Chart title="Who paid how much" svg={donutSvg(s.people.map((p) => ({ label: p.name, value: p.paid })), 'Who paid how much')} />
              </section>
              <Chart title="Paid vs fair share" svg={pairChartSvg(s.people.map((p) => ({ label: p.name, a: p.paid, b: p.share })), 'Paid versus fair share', ['Paid', 'Fair share'])} />

              <section className="card">
                <h2>Each person</h2>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Person</th><th className="r">Paid</th><th className="r">Fair share</th><th className="r">Balance</th></tr></thead>
                    <tbody>
                      {s.people.map((p) => (
                        <tr key={p.id}>
                          <td>{p.emoji} {p.name}</td>
                          <td className="r num">{fmtINR(p.paid)}</td>
                          <td className="r num">{fmtINR(p.share)}</td>
                          <td className={`r num ${p.balance > 0 ? 'pos' : p.balance < 0 ? 'neg' : ''}`}>
                            {p.balance > 0 ? `gets ${fmtINR(p.balance)}` : p.balance < 0 ? `owes ${fmtINR(-p.balance)}` : 'settled'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card">
                <h2>Day-wise totals</h2>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Date</th><th className="r">Total</th><th>Who paid that day</th></tr></thead>
                    <tbody>
                      {daysDesc.length === 0 && <tr><td colSpan={3} className="muted">No expenses yet.</td></tr>}
                      {daysDesc.map((d) => (
                        <tr key={d.date}>
                          <td>{fmtDay(d.date)}</td>
                          <td className="r num"><b>{fmtINR(d.total)}</b></td>
                          <td>{d.payers.map((p) => `${p.name} ${fmtINR(p.amount)}`).join(' · ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {tab === 'expenses' && (
            <>
              <section className="card">
                <h2>Add an item</h2>
                {personOptions.length === 0 ? (
                  <p className="muted">Add people first (People &amp; codes tab), then record what they paid.</p>
                ) : (
                  <ExpenseForm action={addExpense.bind(null, id)} people={personOptions} />
                )}
              </section>
              <section className="stack">
                {daysDesc.length === 0 && <div className="card empty"><p className="muted">No items yet.</p></div>}
                {daysDesc.map((d) => (
                  <article key={d.date} className="day">
                    <header><h3>{fmtDay(d.date)}</h3><span className="day-total num">{fmtINR(d.total)}</span></header>
                    <p className="day-payers">Paid by: {d.payers.map((p) => `${p.name} ${fmtINR(p.amount)}`).join(' · ')}</p>
                    {d.items.map((it) => (
                      <div key={it.id} className="item" style={{ display: 'block' }}>
                        <div className="row row-between">
                          <div>{it.title}<small>paid by {nameOf.get(it.paidBy)}{it.addedBy ? ` · added by ${it.addedBy}` : ''}</small></div>
                          <div className="row">
                            <b className="num">{fmtINR(it.amount)}</b>
                            <form action={deleteExpense.bind(null, id, it.id)}><button className="btn btn-sm btn-danger" aria-label={`Delete ${it.title}`}>Delete</button></form>
                          </div>
                        </div>
                        <details className="edit">
                          <summary>Edit</summary>
                          <div style={{ padding: '8px 0 4px' }}>
                            <ExpenseForm
                              action={updateExpense.bind(null, id, it.id)}
                              people={personOptions}
                              defaultDate={it.date}
                              defaultPayer={it.paidBy}
                              defaults={{ title: it.title, amountPaise: it.amount }}
                              submitLabel="Save changes"
                            />
                          </div>
                        </details>
                      </div>
                    ))}
                  </article>
                ))}
              </section>
            </>
          )}

          {tab === 'people' && (
            <>
              <section className="card">
                <h2>How people get in</h2>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Add each person below with the email they will use.</li>
                  <li>Share the event link and the shared event password.</li>
                  <li>Press <b>Issue login code</b> for the person and send them the 6-digit code. It works once and expires in 30 minutes. They need a fresh code for every sign-in.</li>
                </ol>
                <div className="row" style={{ marginTop: 12 }}>
                  <code>/e/{id}/login</code>
                  <CopyButton text={`/e/${id}/login`} label="Copy event link" />
                </div>
              </section>

              <section className="card">
                <h2>Add a person</h2>
                <form action={addPerson.bind(null, id)} className="expense-form">
                  <label><span>Display name</span><input name="name" required maxLength={60} placeholder="Arun" /></label>
                  <label><span>Email (their login)</span><input type="email" name="email" required placeholder="arun@example.com" /></label>
                  <label><span>Emoji avatar</span><input name="emoji" maxLength={8} placeholder="🎉" /></label>
                  <label><span>Note (optional)</span><input name="note" maxLength={200} placeholder="Handles the snacks" /></label>
                  <button className="btn btn-primary">Add person</button>
                </form>
              </section>

              <section className="stack">
                {people.length === 0 && <div className="card empty"><p className="muted">No people yet.</p></div>}
                {people.map((p) => (
                  <article key={p.id} className="card">
                    <div className="row row-between" style={{ alignItems: 'flex-start' }}>
                      <div className="row">
                        <span className="avatar" aria-hidden="true">{p.emoji}</span>
                        <div>
                          <h3>{p.display_name}</h3>
                          <span className="muted">{p.email}</span>
                          {p.note && <div className="muted" style={{ fontSize: '0.85rem' }}>{p.note}</div>}
                        </div>
                      </div>
                      <IssueCode action={issueCode.bind(null, id, p.id)} name={p.display_name} />
                    </div>
                    <details className="edit" style={{ marginTop: 12 }}>
                      <summary>Edit profile</summary>
                      <form action={updatePerson.bind(null, id, p.id)} className="expense-form" style={{ padding: '8px 0' }}>
                        <label><span>Display name</span><input name="name" required maxLength={60} defaultValue={p.display_name} /></label>
                        <label><span>Email</span><input type="email" name="email" required defaultValue={p.email} /></label>
                        <label><span>Emoji</span><input name="emoji" maxLength={8} defaultValue={p.emoji} /></label>
                        <label><span>Note</span><input name="note" maxLength={200} defaultValue={p.note ?? ''} /></label>
                        <button className="btn btn-primary">Save</button>
                      </form>
                      <form action={deletePerson.bind(null, id, p.id)}>
                        <button className="btn btn-sm btn-danger">Remove {p.display_name}</button>
                      </form>
                    </details>
                  </article>
                ))}
              </section>
            </>
          )}

          {tab === 'gallery' && (
            <section className="card">
              <h2>Event gallery</h2>
              <p className="muted">These photos appear in the members&rsquo; gallery and drift softly behind their pages. Photos are shrunk in your browser before upload.</p>
              <PhotoUploader eventId={id} used={photos.length} limit={PHOTO_LIMIT} />
              <div className="gallery-grid" style={{ marginTop: 16 }}>
                {photos.map((p, i) => (
                  <div key={p.id} className="thumb photo-admin" style={{ cursor: 'default' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Gallery photo ${i + 1}`} loading="lazy" />
                    <form action={deletePhoto.bind(null, id, p.id)}>
                      <button className="btn btn-sm btn-danger" aria-label={`Delete photo ${i + 1}`}>✕</button>
                    </form>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === 'settings' && (
            <>
              <section className="card">
                <h2>Event details</h2>
                <form action={updateEvent.bind(null, id)} className="expense-form">
                  <label><span>Title</span><input name="title" required minLength={2} maxLength={80} defaultValue={event.title} /></label>
                  <label><span>Tagline</span><input name="tagline" maxLength={140} defaultValue={event.tagline ?? ''} /></label>
                  <label>
                    <span>Look</span>
                    <select name="theme" defaultValue={theme}>
                      {THEME_KEYS.map((k) => <option key={k} value={k}>{THEMES[k].label}</option>)}
                    </select>
                  </label>
                  <label><span>Starts</span><input type="date" name="starts_on" required defaultValue={event.starts_on} /></label>
                  <label><span>Ends</span><input type="date" name="ends_on" defaultValue={event.ends_on ?? ''} /></label>
                  <label style={{ gridAutoFlow: 'column', justifyContent: 'start', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" name="is_live" defaultChecked={event.is_live} style={{ width: 20, height: 20 }} />
                    <span>Show on the public hub</span>
                  </label>
                  <button className="btn btn-primary">Save details</button>
                </form>
              </section>

              <section className="card">
                <h2>Shared event password</h2>
                <p className="muted">Everyone in this event uses the same password plus their own one-time code. Changing it signs nobody out, but new sign-ins need the new password.</p>
                <form action={changeEventPassword.bind(null, id)} className="inline-form">
                  <label><span>New password</span><input type="text" name="password" required minLength={6} maxLength={100} autoComplete="off" /></label>
                  <button className="btn btn-primary">Change password</button>
                </form>
              </section>

              <section className="card" style={{ borderColor: 'var(--bad)' }}>
                <h2>Delete event</h2>
                <p className="muted">Removes the event, its people, expenses and photos for good. Type <b>{event.title}</b> to confirm.</p>
                <form action={deleteEvent.bind(null, id)} className="inline-form">
                  <label><span>Event title</span><input name="confirm" required autoComplete="off" /></label>
                  <button className="btn btn-danger">Delete forever</button>
                </form>
              </section>
            </>
          )}

          {tab === 'report' && (
            <section className="card">
              <div className="row row-between">
                <h2>Report</h2>
                <div className="row">
                  <a className="btn btn-sm" href={`/api/admin/events/${id}/report?inline=1`} target="_blank" rel="noopener">Open in new tab</a>
                  <a className="btn btn-sm btn-accent" href={`/api/admin/events/${id}/report`}>Download HTML</a>
                </div>
              </div>
              <p className="muted">A self-contained page with totals, charts, day-by-day items and settlements. Print it to PDF from any browser.</p>
              <iframe
                title="Report preview"
                src={`/api/admin/events/${id}/report?inline=1`}
                sandbox=""
                style={{ width: '100%', height: 720, border: '2px solid var(--ink)', borderRadius: 14, background: '#fff' }}
              />
            </section>
          )}
        </div>
      </main>
    </>
  );
}
