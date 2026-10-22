/** All amounts are stored and computed as integer paise (1 rupee = 100 paise). */

export function fmtINR(paise: number): string {
  const whole = paise % 100 === 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function compactINR(paise: number): string {
  const r = paise / 100;
  if (r >= 1e5) return `₹${+(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${+(r / 1e3).toFixed(1)}k`;
  return `₹${Math.round(r)}`;
}

/** "1,250.50" / "₹400" -> paise, or null if invalid. */
export function parseRupeesToPaise(input: string): number | null {
  const s = input.replace(/[,₹\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [rupees, frac = ''] = s.split('.');
  const paise = Number(rupees) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise) || paise <= 0 || paise >= 1e11) return null;
  return paise;
}

export function fmtDate(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function fmtDay(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
