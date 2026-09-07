-- HANDOFF 1/4 - "who did it", not just "what happened".
--
-- 0012 recorded behaviour against a per-app-open session id and nothing else,
-- so two people using the app produced one indistinguishable stream. Once
-- there is a second login - Tyson and whoever is building this, or Tyson and
-- an offsider - "he spends 4 minutes on Schedule" stops being true of anyone
-- in particular, and the personalised order of the app can't be read off it.
--
-- Every event and every suggestion now carries the login that produced it.
-- Additive: existing rows keep a null user_id and show as "unattributed".

alter table public.usage_events add column if not exists user_id    uuid references auth.users(id) on delete set null;
alter table public.usage_events add column if not exists user_email text;
alter table public.feedback     add column if not exists user_id    uuid references auth.users(id) on delete set null;
alter table public.feedback     add column if not exists user_email text;

create index if not exists usage_events_user_idx on public.usage_events(user_id, occurred_at desc);
create index if not exists feedback_user_idx     on public.feedback(user_id, created_at desc);

-- Attribution has to be honest to be worth reading, so the database decides
-- whose row it is rather than trusting whatever the browser sent. Any signed-in
-- user can still read every row - comparing two people's days is the whole
-- point of the timeline - but nobody can write a row in someone else's name.
drop policy if exists "authenticated full access" on public.usage_events;
drop policy if exists "usage read"   on public.usage_events;
drop policy if exists "usage insert" on public.usage_events;
create policy "usage read"   on public.usage_events for select to authenticated using (true);
create policy "usage insert" on public.usage_events for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "authenticated full access" on public.feedback;
drop policy if exists "feedback read"   on public.feedback;
drop policy if exists "feedback insert" on public.feedback;
drop policy if exists "feedback update" on public.feedback;
create policy "feedback read"   on public.feedback for select to authenticated using (true);
create policy "feedback insert" on public.feedback for insert to authenticated with check (user_id = auth.uid());
-- Marking a suggestion resolved is builder housekeeping, not authorship.
create policy "feedback update" on public.feedback for update to authenticated using (true) with check (true);
