import { redirect } from 'next/navigation';

/** Redirect with an optional flash message / tab, used by server actions. */
export function go(path: string, p: { msg?: string; err?: string; tab?: string } = {}): never {
  const q = new URLSearchParams();
  if (p.tab) q.set('tab', p.tab);
  if (p.msg) q.set('msg', p.msg);
  if (p.err) q.set('err', p.err);
  const s = q.toString();
  redirect(s ? `${path}?${s}` : path);
}
