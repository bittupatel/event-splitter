import { db } from '@/lib/supabase/admin';
import { summarize, type EventSummary } from '@/lib/settle';
import {
  EVENT_COLUMNS,
  PHOTO_BUCKET,
  type EventRow,
  type ExpenseRow,
  type ParticipantRow,
  type Photo,
  type PublicEvent,
} from '@/lib/types';

export type EventBundle = {
  event: EventRow;
  people: ParticipantRow[];
  expenses: ExpenseRow[];
  summary: EventSummary;
};

/** Safe, public listing fields only (no password hash, no roster, no money). */
export async function getPublicEvents(): Promise<PublicEvent[]> {
  const { data, error } = await db()
    .from('events')
    .select('id,title,tagline,theme,starts_on,ends_on,is_live,participants(count)')
    .eq('is_live', true)
    .order('starts_on', { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return (data ?? []).map((e: any) => ({
    id: e.id,
    title: e.title,
    tagline: e.tagline,
    theme: e.theme,
    starts_on: e.starts_on,
    ends_on: e.ends_on,
    is_live: e.is_live,
    participant_count: e.participants?.[0]?.count ?? 0,
  }));
}

export async function getPublicEvent(id: string): Promise<PublicEvent | null> {
  const { data } = await db()
    .from('events')
    .select('id,title,tagline,theme,starts_on,ends_on,is_live,participants(count)')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const e = data as any;
  return { ...e, participant_count: e.participants?.[0]?.count ?? 0 };
}

export function buildBundle(event: EventRow, people: ParticipantRow[], expenses: ExpenseRow[]): EventBundle {
  const summary = summarize(
    people.map((p) => ({ id: p.id, name: p.display_name, emoji: p.emoji })),
    expenses.map((e) => ({
      id: e.id,
      date: e.spent_on,
      title: e.title,
      amount: Number(e.amount_paise),
      paidBy: e.paid_by,
      addedBy: e.added_by,
    })),
  );
  return { event, people, expenses, summary };
}

/** Full event data for authorised callers (admin or a verified member of this event). */
export async function loadEventBundle(eventId: string): Promise<EventBundle | null> {
  const client = db();
  const [ev, pp, ex] = await Promise.all([
    client.from('events').select(EVENT_COLUMNS).eq('id', eventId).maybeSingle(),
    client
      .from('participants')
      .select('id,event_id,display_name,email,emoji,note')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true }),
    client
      .from('expenses')
      .select('id,event_id,spent_on,title,amount_paise,paid_by,added_by,created_at')
      .eq('event_id', eventId)
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);
  if (ev.error || !ev.data) return null;
  if (pp.error) throw new Error(pp.error.message);
  if (ex.error) throw new Error(ex.error.message);
  return buildBundle(ev.data as EventRow, (pp.data ?? []) as ParticipantRow[], (ex.data ?? []) as ExpenseRow[]);
}

/** Photos with short-lived signed URLs from the private bucket. Never more than the DB-enforced 20. */
export async function getPhotos(eventId: string): Promise<Photo[]> {
  const client = db();
  const { data } = await client
    .from('event_photos')
    .select('id,storage_path')
    .eq('event_id', eventId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(20);
  const rows = (data ?? []) as { id: string; storage_path: string }[];
  if (!rows.length) return [];
  const { data: signed } = await client.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), 60 * 60);
  const urlByPath = new Map((signed ?? []).map((s) => [s.path ?? '', s.signedUrl]));
  return rows
    .map((r) => ({ id: r.id, url: urlByPath.get(r.storage_path) ?? '' }))
    .filter((p) => p.url);
}
