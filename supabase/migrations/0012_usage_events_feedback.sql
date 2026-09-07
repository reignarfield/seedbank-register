-- A record of what the person actually does in the app - every screen they
-- land on and how long they stay, every tap and what it was on - plus a place
-- for their own suggestions. The point is to learn the real order of a
-- working day from the one person who lives it, instead of guessing.
--
-- Tracking writes here even in demo mode: it's the behaviour that matters,
-- not which data set was on screen. Additive only.

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,            -- one per app open, kept in sessionStorage
  occurred_at timestamptz not null default now(),
  kind text not null check (kind in ('session_start', 'screen', 'tap', 'feedback', 'session_end')),
  screen text,                         -- where it happened: today, schedule, customers...
  label text,                          -- for taps: the button's own words
  duration_ms integer,                 -- for screen events: how long they stayed
  meta jsonb                           -- viewport, online/offline, anything else useful
);

create index if not exists usage_events_session_idx on public.usage_events(session_id, occurred_at);
create index if not exists usage_events_time_idx on public.usage_events(occurred_at desc);

alter table public.usage_events enable row level security;
drop policy if exists "authenticated full access" on public.usage_events;
create policy "authenticated full access" on public.usage_events
  for all to authenticated using (true) with check (true);

-- Suggestions from the little button in the corner.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text,
  screen text,
  trying_to text,                      -- "what were you trying to do?" - optional
  message text not null,
  resolved_at timestamptz
);

alter table public.feedback enable row level security;
drop policy if exists "authenticated full access" on public.feedback;
create policy "authenticated full access" on public.feedback
  for all to authenticated using (true) with check (true);
