export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export const isDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) &&
  new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export const isEmail = (s: string) => s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export const field = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();

/** Today's date (YYYY-MM-DD) in the app's home timezone. */
export const todayLocal = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

/** Dates more than ~13 months from today are almost certainly typos. */
export function dateInSaneRange(s: string): boolean {
  const diff = Math.abs(Date.parse(`${s}T00:00:00Z`) - Date.parse(`${todayLocal()}T00:00:00Z`));
  return diff <= 400 * 86_400_000;
}

export const THEME_FALLBACK = 'lantern';
