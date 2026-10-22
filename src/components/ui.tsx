import type { ReactNode } from 'react';
import { fmtINR } from '@/lib/money';
import { todayLocal } from '@/lib/validate';

export function Flash({ msg, err }: { msg?: string; err?: string }) {
  if (!msg && !err) return null;
  return (
    <div className={`flash ${err ? 'flash-err' : 'flash-ok'}`} role={err ? 'alert' : 'status'}>
      {err ?? msg}
    </div>
  );
}

export function Stat({ label, value, tone, hint }: { label: string; value: ReactNode; tone?: 'good' | 'bad'; hint?: string }) {
  return (
    <div className="stat">
      <div className="stat-k">{label}</div>
      <div className={`stat-v${tone ? ` ${tone}` : ''}`}>{value}</div>
      {hint && <div className="stat-h">{hint}</div>}
    </div>
  );
}

export function ExpenseForm({
  action,
  people,
  defaultDate,
  defaultPayer,
  defaults,
  submitLabel = 'Add item',
}: {
  action: (fd: FormData) => Promise<void>;
  people: { id: string; name: string }[];
  defaultDate?: string;
  defaultPayer?: string;
  defaults?: { title: string; amountPaise: number };
  submitLabel?: string;
}) {
  const amt = defaults ? String(defaults.amountPaise / 100) : '';
  return (
    <form action={action} className="expense-form">
      <label>
        <span>Date</span>
        <input type="date" name="date" required defaultValue={defaultDate ?? todayLocal()} />
      </label>
      <label>
        <span>What was it for?</span>
        <input name="title" required maxLength={100} placeholder="Pizza, cab, tickets…" defaultValue={defaults?.title} />
      </label>
      <label>
        <span>Amount (₹)</span>
        <input name="amount" required inputMode="decimal" placeholder="400" defaultValue={amt} />
      </label>
      <label>
        <span>Who paid?</span>
        <select name="paid_by" required defaultValue={defaultPayer ?? ''}>
          <option value="" disabled>Choose…</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      <button className="btn btn-primary" type="submit">{submitLabel}</button>
    </form>
  );
}

export function Money({ paise }: { paise: number }) {
  return <span className="num">{fmtINR(paise)}</span>;
}
