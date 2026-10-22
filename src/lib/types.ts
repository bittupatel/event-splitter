export type EventRow = {
  id: string;
  title: string;
  tagline: string | null;
  theme: string;
  starts_on: string;
  ends_on: string | null;
  is_live: boolean;
  created_at: string;
};

export type ParticipantRow = {
  id: string;
  event_id: string;
  display_name: string;
  email: string;
  emoji: string;
  note: string | null;
};

export type ExpenseRow = {
  id: string;
  event_id: string;
  spent_on: string;
  title: string;
  amount_paise: number;
  paid_by: string;
  added_by: string;
  created_at: string;
};

export type PublicEvent = Pick<EventRow, 'id' | 'title' | 'tagline' | 'theme' | 'starts_on' | 'ends_on' | 'is_live'> & {
  participant_count: number;
};

export type Photo = { id: string; url: string };

export const EVENT_COLUMNS = 'id,title,tagline,theme,starts_on,ends_on,is_live,created_at';
export const PHOTO_LIMIT = 20;
export const PHOTO_BUCKET = 'event-photos';
