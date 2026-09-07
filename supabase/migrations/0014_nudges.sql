-- HANDOFF 2/4 - the to-do list, and the memory that makes it bearable.
--
-- The app already knows who is overdue for a clean, which invoice hasn't been
-- paid and which lead nobody rang back. It just never said so as a list of
-- things to do. This table is the other half of saying it: what he has
-- already dealt with, what he has pushed to next Tuesday, and what he has
-- pressed send on.
--
-- Without it a to-do list is worse than none - the same five items back every
-- morning, including the four he has already handled, until he stops reading
-- it.
--
-- One row per person per suggestion, because a snooze is a personal decision:
-- Tyson putting "ring Sarah" off until Monday shouldn't clear it off an
-- offsider's screen.

create table if not exists public.nudge_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  -- A stable, derived key: "rebook:<customer_id>", "invoice:<invoice_id>".
  -- Same suggestion tomorrow = same key = the snooze still holds.
  nudge_key text not null,
  kind text not null,
  ref_table text,
  ref_id uuid,
  snoozed_until date,          -- don't show it again until this morning
  done_at timestamptz,         -- handled; gone until the underlying facts change
  -- Anything a customer would receive is opt-in per item: the reminder
  -- function sends only what has been approved here, so nothing leaves in
  -- Tyson's name that he didn't press send on.
  approved_send_at timestamptz,
  sent_at timestamptz,         -- stamped by send-reminders once it actually went
  updated_at timestamptz not null default now(),
  primary key (user_id, nudge_key)
);

create index if not exists nudge_state_pending_idx
  on public.nudge_state(approved_send_at) where approved_send_at is not null and sent_at is null;

alter table public.nudge_state enable row level security;
drop policy if exists "own nudges" on public.nudge_state;
-- Your own list only. The scheduled reminder function runs on the service key
-- and reads across everyone's approvals.
create policy "own nudges" on public.nudge_state
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
