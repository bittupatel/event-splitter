-- Event Splitter schema. Run once in Supabase -> SQL Editor.
-- Security model: every table has RLS enabled with NO policies and no grants for
-- anon/authenticated, so the public API cannot read or write anything.
-- All access goes through the Next.js server using the service-role key, after
-- the server has checked the admin identity or the event-scoped participant session.

create extension if not exists pgcrypto;

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 2 and 80),
  tagline       text check (tagline is null or char_length(tagline) <= 140),
  theme         text not null default 'lantern',
  starts_on     date not null default current_date,
  ends_on       date,
  is_live       boolean not null default true,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.participants (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  email        text not null check (email = lower(email)),
  emoji        text not null default '🎉',
  note         text check (note is null or char_length(note) <= 200),
  created_at   timestamptz not null default now()
);
create unique index if not exists participants_event_email_uq
  on public.participants (event_id, email);

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  spent_on     date not null,
  title        text not null check (char_length(title) between 1 and 100),
  amount_paise bigint not null check (amount_paise > 0 and amount_paise < 100000000000),
  paid_by      uuid not null references public.participants(id) on delete restrict,
  added_by     text not null default 'admin',
  created_at   timestamptz not null default now()
);
create index if not exists expenses_event_date_idx on public.expenses (event_id, spent_on);

-- One-use login codes. Only a hash is stored; the plain code is shown once to the admin.
create table if not exists public.access_codes (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  code_hash      text not null,
  expires_at     timestamptz not null,
  used_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists access_codes_lookup_idx
  on public.access_codes (participant_id, code_hash);

-- Failed-login log used for lockouts (5 per email / 20 per IP per 15 min).
create table if not exists public.login_attempts (
  id         bigint generated always as identity primary key,
  event_id   uuid not null,
  email      text not null,
  ip         text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_email_idx on public.login_attempts (event_id, email, created_at);
create index if not exists login_attempts_ip_idx on public.login_attempts (ip, created_at);

create table if not exists public.event_photos (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  storage_path text not null unique,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists event_photos_event_idx on public.event_photos (event_id, position);

-- Hard cap: max 20 photos per event, enforced in the database (race-safe).
create or replace function public.enforce_photo_limit() returns trigger
language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.event_id::text));
  if (select count(*) from public.event_photos where event_id = new.event_id) >= 20 then
    raise exception 'photo_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists event_photos_limit on public.event_photos;
create trigger event_photos_limit before insert on public.event_photos
  for each row execute function public.enforce_photo_limit();

-- Lock everything down.
alter table public.events         enable row level security;
alter table public.participants   enable row level security;
alter table public.expenses       enable row level security;
alter table public.access_codes   enable row level security;
alter table public.login_attempts enable row level security;
alter table public.event_photos   enable row level security;

revoke all on public.events, public.participants, public.expenses,
              public.access_codes, public.login_attempts, public.event_photos
  from anon, authenticated;

-- Admin settings: OTP toggle and SMTP configuration (single-row table).
create table if not exists public.admin_settings (
  id                  int primary key default 1 check (id = 1),
  otp_required        boolean not null default true,
  admin_notify_email  text not null default '',
  smtp_host           text not null default '',
  smtp_port           int not null default 587,
  smtp_user           text not null default '',
  smtp_pass           text not null default '',
  smtp_from           text not null default '',
  smtp_secure         boolean not null default true,
  updated_at          timestamptz not null default now()
);
alter table public.admin_settings add column if not exists admin_notify_email text not null default '';
alter table public.admin_settings enable row level security;
revoke all on public.admin_settings from anon, authenticated;
-- Seed with defaults so selects never return null.
insert into public.admin_settings (id) values (1) on conflict (id) do nothing;

-- Private storage bucket for event photos (no storage policies => service role only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', false, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false;
