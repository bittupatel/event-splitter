'use client';

import { useActionState, useState } from 'react';
import { adminLogin, type AuthState } from '../actions';

export function AdminLoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(adminLogin, {});
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="mode" value={mode} />
      {state.error && <div className="flash flash-err" role="alert">{state.error}</div>}
      {state.info && <div className="flash flash-ok" role="status">{state.info}</div>}
      <label>
        <span>Administrator email</span>
        <input type="email" name="email" required autoComplete="email" />
      </label>
      <label>
        <span>Password</span>
        <input type="password" name="password" required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
      </label>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'One moment…' : mode === 'signup' ? 'Create admin account' : 'Sign in'}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'First time? Create the admin account' : 'Already have an account? Sign in'}
      </button>
    </form>
  );
}
