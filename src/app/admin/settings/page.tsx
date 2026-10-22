import Link from 'next/link';
import type { Metadata } from 'next';
import { Backdrop } from '@/components/Backdrop';
import { Flash } from '@/components/ui';
import { requireAdmin } from '@/lib/auth-admin';
import { getAdminNotificationEmail, getSettings, smtpReady } from '@/lib/settings';
import { saveOtpSettings, saveSmtpSettings, sendTestEmailAction } from './actions';
import { adminLogout } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Admin settings & SMTP',
  description: 'Manage OTP login requirements and SMTP email configuration.',
  robots: { index: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminSettingsPage({ searchParams }: Props) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const settings = await getSettings();
  const notifyEmail = await getAdminNotificationEmail(settings);
  const isSmtpReady = smtpReady(settings);

  return (
    <>
      <Backdrop theme="marigold" />
      <main className="wrap stack">
        <div className="row row-between">
          <div>
            <p><Link href="/admin">← Back to Workspace</Link></p>
            <h1 style={{ fontSize: '2.4rem' }}>Admin Settings</h1>
            <p className="muted">Configure OTP-wise login, admin alerts and SMTP email</p>
          </div>
          <div className="row">
            <Link href="/" className="btn btn-sm">Public hub</Link>
            <form action={adminLogout}><button className="btn btn-sm">Sign out</button></form>
          </div>
        </div>

        <Flash msg={one(sp.msg)} err={one(sp.err)} />

        {/* SECTION 1: OTP LOGIN TOGGLE */}
        <section className="card">
          <div className="row row-between" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h2>OTP-wise Login Setting</h2>
              <p className="muted">
                Control whether participants require a 6-digit OTP received on your admin email to sign in.
              </p>
            </div>
            <span className={`chip ${settings.otp_required ? 'chip-live' : ''}`} style={{ fontSize: '0.85rem' }}>
              {settings.otp_required ? 'OTP Required (Active)' : 'Credentials Only (Active)'}
            </span>
          </div>

          <form action={saveOtpSettings} className="form-stack">
            <div style={{ display: 'grid', gap: 10, margin: '8px 0 14px' }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="otp_required"
                  value="true"
                  defaultChecked={settings.otp_required}
                  style={{ width: 'auto', accentColor: 'var(--vermilion)' }}
                />
                <div>
                  <strong>Require OTP for login (Recommended)</strong>
                  <div className="muted" style={{ fontSize: '0.82rem' }}>
                    Users enter email, event password AND a 6-digit OTP code sent directly to your admin email.
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="otp_required"
                  value="false"
                  defaultChecked={!settings.otp_required}
                  style={{ width: 'auto', accentColor: 'var(--vermilion)' }}
                />
                <div>
                  <strong>Allow login with credentials only (No OTP)</strong>
                  <div className="muted" style={{ fontSize: '0.82rem' }}>
                    Users can sign in immediately using just their invited email and the shared event password.
                  </div>
                </div>
              </label>
            </div>

            <label>
              <span>Admin Notification Email (Where OTPs are delivered)</span>
              <input
                type="email"
                name="admin_notify_email"
                defaultValue={settings.admin_notify_email || notifyEmail}
                placeholder="admin@example.com"
                required
              />
              <span className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                When users request an OTP to log in, the 6-digit code is dispatched to this email address.
              </span>
            </label>

            <div>
              <button className="btn btn-primary">Save Login Settings</button>
            </div>
          </form>
        </section>

        {/* SECTION 2: SMTP EMAIL CONFIGURATION */}
        <section className="card">
          <div className="row row-between" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h2>SMTP Mail Server Configuration</h2>
              <p className="muted">
                Required for sending OTP login codes and notification emails via your own email service.
              </p>
            </div>
            <span
              className="chip"
              style={{
                backgroundColor: isSmtpReady ? 'var(--good)' : 'var(--line)',
                color: isSmtpReady ? '#fff' : 'var(--ink)',
                borderColor: 'var(--ink)',
              }}
            >
              {isSmtpReady ? '✓ SMTP Configured' : '⚪ Not Configured'}
            </span>
          </div>

          <div
            style={{
              padding: '12px 14px',
              background: '#fbf1da',
              border: '1px solid #e8dcc4',
              borderRadius: 12,
              marginBottom: 16,
              fontSize: '0.86rem',
            }}
          >
            <strong>💡 Quick Setup for Gmail:</strong>
            <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
              <li><b>Host:</b> <code>smtp.gmail.com</code> &nbsp; | &nbsp; <b>Port:</b> <code>587</code> (STARTTLS) or <code>465</code> (SSL)</li>
              <li><b>User:</b> Your full Gmail address (e.g. <code>you@gmail.com</code>)</li>
              <li><b>Password:</b> 16-character <b>Google App Password</b> (Google Account → Security → 2-Step Verification → App passwords)</li>
            </ul>
          </div>

          <form action={saveSmtpSettings} className="expense-form" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label>
              <span>SMTP Host</span>
              <input
                type="text"
                name="smtp_host"
                defaultValue={settings.smtp_host}
                placeholder="smtp.gmail.com"
                required
              />
            </label>

            <label>
              <span>SMTP Port</span>
              <input
                type="number"
                name="smtp_port"
                defaultValue={settings.smtp_port || 587}
                placeholder="587"
                required
              />
            </label>

            <label>
              <span>Encryption / Security</span>
              <select name="smtp_secure" defaultValue={settings.smtp_secure ? 'true' : 'false'}>
                <option value="false">STARTTLS (Port 587 - Standard)</option>
                <option value="true">SSL / TLS (Port 465 - Direct SSL)</option>
              </select>
            </label>

            <label>
              <span>SMTP Username / Email</span>
              <input
                type="text"
                name="smtp_user"
                defaultValue={settings.smtp_user}
                placeholder="you@gmail.com"
                required
              />
            </label>

            <label>
              <span>SMTP Password / App Password</span>
              <input
                type="password"
                name="smtp_pass"
                defaultValue={settings.smtp_pass}
                placeholder="16-character app password"
                required
                autoComplete="new-password"
              />
            </label>

            <label>
              <span>From Name & Email</span>
              <input
                type="text"
                name="smtp_from"
                defaultValue={settings.smtp_from}
                placeholder="Event Splitter <you@gmail.com>"
                required
              />
            </label>

            <div style={{ gridColumn: '1 / -1', marginTop: 10 }}>
              <button className="btn btn-primary">Save SMTP Settings</button>
            </div>
          </form>
        </section>

        {/* SECTION 3: TEST SMTP CONNECTION */}
        <section className="card">
          <h2>Test SMTP Email Dispatch</h2>
          <p className="muted">
            Send a live test message to verify your SMTP connection and credentials before issuing OTPs to users.
          </p>

          <form action={sendTestEmailAction} className="inline-form" style={{ maxWidth: 520, marginTop: 12 }}>
            <label style={{ flex: '1 1 280px' }}>
              <span>Recipient Email</span>
              <input
                type="email"
                name="test_email"
                defaultValue={notifyEmail || user.email}
                placeholder="test@example.com"
                required
              />
            </label>
            <button className="btn btn-accent" style={{ height: 44 }}>
              Send Test Email ✉️
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
