-- Four small, additive things.
--
-- 1. A time on a job. "Confirm tomorrow" had nothing to confirm but the day.
-- 2. When an invoice was sent and to where, so Send can't silently double up.
-- 3. What the public page says - service area, a reviews link, a line in the
--    owner's words - held in settings, and exposed to the public page through
--    a view that shows those columns and nothing else.
-- 4. Push notifications, scaffolded: a table of devices that opted in.

alter table public.jobs add column if not exists scheduled_time time;

alter table public.invoices add column if not exists sent_at timestamptz;
alter table public.invoices add column if not exists sent_to text;

alter table public.settings add column if not exists service_area text;
alter table public.settings add column if not exists google_review_url text;
alter table public.settings add column if not exists public_tagline text;
alter table public.settings add column if not exists public_blurb text;

create or replace view public.public_profile
with (security_invoker = false) as
  select service_area, google_review_url, public_tagline, public_blurb, abn, gst_registered
  from public.settings where id = true;
grant select on public.public_profile to anon, authenticated;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  endpoint text not null unique,
  keys jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "authenticated full access" on public.push_subscriptions;
create policy "authenticated full access" on public.push_subscriptions
  for all to authenticated using (true) with check (true);
