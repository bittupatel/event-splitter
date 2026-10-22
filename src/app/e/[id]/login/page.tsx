import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Backdrop } from '@/components/Backdrop';
import { CoverArt } from '@/components/CoverArt';
import { getPublicEvent } from '@/lib/event-data';
import { getMemberSession } from '@/lib/session';
import { getSettings } from '@/lib/settings';
import { fmtDate } from '@/lib/money';
import { asTheme } from '@/lib/themes';
import { isUuid } from '@/lib/validate';
import { LoginForm } from './LoginForm';
import { memberLogin, requestMemberOtp } from '../actions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ev = isUuid(id) ? await getPublicEvent(id).catch(() => null) : null;
  return {
    title: ev ? `Enter ${ev.title}` : 'Enter event',
    description: ev ? `Sign in to ${ev.title} with the shared event credentials and a one-time code.` : 'Event sign-in',
  };
}

export default async function EventLogin({ params }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ev = await getPublicEvent(id);
  if (!ev) notFound();
  if (await getMemberSession(id)) redirect(`/e/${id}`);
  const theme = asTheme(ev.theme);
  const settings = await getSettings();

  return (
    <>
      <Backdrop theme={theme} />
      <main className="wrap">
        <p><Link href="/">← All events</Link></p>
        <div className="grid grid-2" style={{ alignItems: 'stretch' }}>
          <div className="event-card" style={{ boxShadow: '6px 6px 0 var(--ink)' }}>
            <div className="cover" style={{ aspectRatio: '16/11' }}><CoverArt theme={theme} seed={ev.id} /></div>
            <div className="body">
              <h1 style={{ fontSize: '2rem' }}>{ev.title}</h1>
              {ev.tagline && <p className="muted">{ev.tagline}</p>}
              <p className="muted">{fmtDate(ev.starts_on)} · {ev.participant_count} {ev.participant_count === 1 ? 'person' : 'people'}</p>
            </div>
          </div>
          <div className="card">
            <h2>Step inside</h2>
            <p className="muted">
              {settings.otp_required
                ? "Use the email the organiser invited, the event\u2019s shared password, and the 6-digit OTP received on the admin\u2019s email."
                : "Use the email the organiser invited and the event\u2019s shared password."}
            </p>
            <LoginForm
              action={memberLogin.bind(null, id)}
              requestOtpAction={requestMemberOtp.bind(null, id)}
              otpRequired={settings.otp_required}
            />
          </div>
        </div>
      </main>
    </>
  );
}
