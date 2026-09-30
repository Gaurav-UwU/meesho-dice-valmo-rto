-- Valmo Rescue Console: Live mode storage. Run once in the Supabase SQL editor.

-- One row per hub: the whole day as JSON. Already sanitised by the server (OTP codes hashed, OTP messages masked),
-- so browsers may read it. Only the server (service key) may write it.
create table if not exists public.day_state (
  hub_id     text primary key check (hub_id in ('powai', 'whitefield', 'lucknow', 'gaya')),
  version    integer not null,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.day_state enable row level security;

drop policy if exists "anyone can read the day" on public.day_state;
create policy "anyone can read the day" on public.day_state for select to anon using (true);
-- No insert/update/delete policy for anon: writes go through /api with the service key, which bypasses RLS.

-- Live updates to every open screen.
alter publication supabase_realtime add table public.day_state;

-- Which real WhatsApp number stands in for which synthetic order. Contains phone numbers, so no anon access at all.
create table if not exists public.wa_binding (
  phone    text primary key check (phone ~ '^\+[0-9]{10,15}$'),
  hub_id   text not null,
  order_id text not null
);

alter table public.wa_binding enable row level security;
-- Deliberately no policies: only the service key can read or write this table.

-- Twilio message ids already processed, so a retry or a replayed webhook is applied only once. Service key only.
create table if not exists public.wa_seen (
  message_sid text primary key,
  seen_at     timestamptz not null default now()
);

alter table public.wa_seen enable row level security;
-- Deliberately no policies.
