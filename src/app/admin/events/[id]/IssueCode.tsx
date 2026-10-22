'use client';

import { useActionState } from 'react';
import { CopyButton } from '@/components/CopyButton';
import type { CodeState } from './actions';

export function IssueCode({ action, name }: { action: (prev: CodeState, fd: FormData) => Promise<CodeState>; name: string }) {
  const [state, formAction, pending] = useActionState(action, {} as CodeState);
  return (
    <form action={formAction} className="stack" style={{ minWidth: 190 }}>
      <button className="btn btn-sm btn-accent" disabled={pending} aria-label={`Issue one-time code for ${name}`}>
        {pending ? 'Issuing…' : 'Issue login code'}
      </button>
      {state.error && <div className="flash flash-err">{state.error}</div>}
      {state.code && (
        <div role="status">
          <div className="code-box">{state.code}</div>
          <p className="muted" style={{ fontSize: '0.78rem', margin: '6px 0' }}>
            For {state.who}. Works once, expires in {state.expires}. Not shown again.
          </p>
          {state.emailSent && (
            <div className="flash flash-ok" style={{ fontSize: '0.82rem', padding: '8px 12px' }}>
              ✉ Code emailed to {state.who}.
            </div>
          )}
          {state.emailError && (
            <div className="flash flash-err" style={{ fontSize: '0.82rem', padding: '8px 12px' }}>
              ✉ Email failed: {state.emailError}
            </div>
          )}
          <CopyButton text={state.code} label="Copy code" />
        </div>
      )}
    </form>
  );
}
