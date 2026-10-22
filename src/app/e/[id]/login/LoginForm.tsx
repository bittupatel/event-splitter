'use client';

import { useState, useActionState } from 'react';
import type { LoginState } from '../actions';

export function LoginForm({
  action,
  requestOtpAction,
  otpRequired,
}: {
  action: (prev: LoginState, fd: FormData) => Promise<LoginState>;
  requestOtpAction?: (fd: FormData) => Promise<LoginState>;
  otpRequired: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as LoginState);
  const [otpPending, setOtpPending] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  async function handleSendOtp(e: React.MouseEvent) {
    e.preventDefault();
    if (!requestOtpAction) return;
    const form = (e.currentTarget as HTMLElement).closest('form');
    if (!form) return;
    const fd = new FormData(form);
    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');
    if (!email || !password) {
      setErrMsg('Please fill in your invited email and event password first, then click Send OTP.');
      return;
    }
    setOtpPending(true);
    setErrMsg('');
    setInfoMsg('');
    try {
      const res = await requestOtpAction(fd);
      if (res.error) setErrMsg(res.error);
      if (res.info) setInfoMsg(res.info);
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not request OTP.');
    } finally {
      setOtpPending(false);
    }
  }

  const displayedError = errMsg || state.error;

  return (
    <form action={formAction} className="form-stack" autoComplete="off">
      {displayedError && <div className="flash flash-err" role="alert">{displayedError}</div>}
      {infoMsg && <div className="flash flash-ok" role="status">{infoMsg}</div>}

      <label>
        <span>Your invited email</span>
        <input type="email" name="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" />
      </label>

      <label>
        <span>Event password</span>
        <input type="password" name="password" required autoComplete="current-password" />
      </label>

      {otpRequired && (
        <label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>One-time code (OTP)</span>
            {requestOtpAction && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpPending}
                className="btn btn-sm btn-accent"
                style={{ fontSize: '0.76rem', padding: '3px 8px' }}
              >
                {otpPending ? 'Sending to Admin…' : '✉️ Send OTP to Admin'}
              </button>
            )}
          </div>
          <input
            name="otp"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="6-digit code"
            autoComplete="one-time-code"
          />
        </label>
      )}

      {!otpRequired && <input type="hidden" name="otp" value="" />}

      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Checking…' : 'Enter event →'}
      </button>

      {otpRequired && (
        <p className="muted" style={{ fontSize: '0.82rem' }}>
          Click <b>Send OTP to Admin</b> to email the code to the event organiser, then enter the code they give you.
        </p>
      )}

      {!otpRequired && (
        <p className="muted" style={{ fontSize: '0.82rem' }}>
          OTP requirement is currently turned off. Enter the shared credentials to step inside.
        </p>
      )}
    </form>
  );
}

