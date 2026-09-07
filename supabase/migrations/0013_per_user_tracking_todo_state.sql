-- Two small things, both additive.
--
-- 1. Usage events and feedback record who: the signed-in user's id (filled by
--    the database from auth.uid(), so it can't be spoofed) and their email
--    (filled by the app, for reading). Several people can share the app and
--    the timeline still says whose day it was.
--
-- 2. todo_state - the "Needs you" list on Today is derived from live data,
--    never stored; the only thing kept is what he did about each item:
--    snoozed until when, or dismissed. Keyed by a stable per-item key such
--    as `chase:<invoice id>` so the same reminder never comes back once dealt
--    with, and comes back on time if snoozed.

alter table public.usage_events add column if not exists user_id uuid default auth.uid();
alter table public.usage_events add column if not exists user_email text;
create index if not exists usage_events_user_idx on public.usage_events(user_id, occurred_at desc);

alter table public.feedback add column if not exists user_id uuid default auth.uid();
alter table public.feedback add column if not exists user_email text;

create table if not exists public.todo_state (
  key text primary key,
  snoozed_until date,
  dismissed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.todo_state enable row level security;
drop policy if exists "authenticated full access" on public.todo_state;
create policy "authenticated full access" on public.todo_state
  for all to authenticated using (true) with check (true);
