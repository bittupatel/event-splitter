import Link from 'next/link';
import type { Metadata } from 'next';
import { CoverArt } from '@/components/CoverArt';
import { Backdrop } from '@/components/Backdrop';
import { getPublicEvents } from '@/lib/event-data';
import { cleanSupabaseUrl, supabaseConfigured } from '@/lib/supabase/admin';
import { fmtDate } from '@/lib/money';
import { THEMES, THEME_KEYS, asTheme } from '@/lib/themes';
import type { PublicEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Live events · Event Splitter' },
  description: 'Pick your event, enter the shared credentials and split the bill the fair way.',
};

const WORDS = ['Lanterns', 'Color clouds', 'Dance circles', 'Marigold garlands', 'Kite skies', 'Midnight snacks', 'Fair rides', 'Big laughs'];

function Bunting() {
  const flags = Array.from({ length: 26 }, (_, i) => i);
  const cols = ['#d9381e', '#f2a900', '#2e7d32', '#c2185b', '#0e7c86'];
  return (
    <svg className="bunting" viewBox="0 0 1040 56" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 6 Q 520 40 1040 6" fill="none" stroke="#fff3c4" strokeWidth="2" />
      {flags.map((i) => {
        const t = (i + 0.5) / flags.length;
        const x = t * 1040;
        const y = 6 + 34 * 2 * t * (1 - t) * 1;
        return <polygon key={i} points={`${x - 16},${y} ${x + 16},${y} ${x},${y + 30}`} fill={cols[i % cols.length]} />;
      })}
    </svg>
  );
}

function EventCard({ e }: { e: PublicEvent }) {
  const theme = asTheme(e.theme);
  const when = e.ends_on && e.ends_on !== e.starts_on ? `${fmtDate(e.starts_on)} – ${fmtDate(e.ends_on)}` : fmtDate(e.starts_on);
  return (
    <Link href={`/e/${e.id}/login`} className="event-card">
      <div className="cover">
        <CoverArt theme={theme} seed={e.id} />
        <span className="chip chip-live">Live</span>
      </div>
      <div className="body">
        <h3>{e.title}</h3>
        {e.tagline && <p className="muted" style={{ margin: 0 }}>{e.tagline}</p>}
        <div className="row row-between">
          <span className="muted">{when} · {e.participant_count} {e.participant_count === 1 ? 'person' : 'people'}</span>
        </div>
        <span className="go">Enter event →</span>
        <span className="muted" style={{ fontSize: '0.78rem' }}>{THEMES[theme].label}</span>
      </div>
    </Link>
  );
}

export default async function Home() {
  let events: PublicEvent[] = [];
  let problem: string | null = null;
  if (!supabaseConfigured()) {
    problem = 'The app is not connected to its database yet. Add the environment variables from .env.example and run supabase/schema.sql.';
  } else {
    try {
      events = await getPublicEvents();
    } catch (e: any) {
      const url = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
      if (e?.message === 'fetch failed' || e?.name === 'TypeError') {
        problem = `Events could not be loaded ("fetch failed"). Attempted Supabase URL: "${url || 'NOT CONFIGURED'}". Check NEXT_PUBLIC_SUPABASE_URL in Vercel settings and ensure project is unpaused.`;
      } else {
        problem = `Events could not be loaded: ${e?.message ?? 'unknown database error'}`;
      }
    }
  }
  const marquee = [...WORDS, ...WORDS];

  return (
    <>
      <Backdrop theme="marigold" />
      <section className="hero">
        <Bunting />
        <div className="hero-art"><CoverArt theme="lantern" seed="hero" /></div>
        <div className="hero-inner">
          <p style={{ fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '26px 0 8px' }}>Event Splitter</p>
          <h1>Share the fun.<br />Split it fair.</h1>
          <p style={{ marginTop: 14 }}>
            Pick your event, step in with the shared credentials and one-time code, log every bill by day, and see exactly who pays whom.
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            <a href="#events" className="btn btn-accent">See live events</a>
            <Link href="/admin/login" className="btn btn-ghost" style={{ color: '#fff3c4', borderColor: '#fff3c4', boxShadow: 'none' }}>Organiser sign-in</Link>
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {marquee.map((w, i) => (
            <span key={i}>✦ {w}</span>
          ))}
        </div>
      </div>

      <main className="wrap" id="events">
        <div className="row row-between" style={{ marginBottom: 18 }}>
          <h2>Live events</h2>
          <span className="muted">{THEME_KEYS.length} festive looks · every event gets its own</span>
        </div>
        {problem && <div className="flash flash-err">{problem}</div>}
        {!problem && events.length === 0 && (
          <div className="card empty">
            <h3>No live events yet</h3>
            <p className="muted">The organiser can create the first one from the admin workspace.</p>
          </div>
        )}
        <div className="events">
          {events.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </div>
      </main>
      <p className="footer">Made for friends who share the bill. Amounts are in ₹.</p>
    </>
  );
}
