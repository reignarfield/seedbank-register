-- Adds expense tracking (income-minus-expenses picture for tax records) and
-- renewal-date reminders (insurance, licences). Additive only - safe to run
-- on a live project with real data.
--
-- This also re-applies (and supersedes) the reminder_log type widening from
-- 0002 - running that first is harmless, or skip straight to this file.

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null default 'other' check (category in ('fuel', 'supplies', 'equipment', 'insurance', 'vehicle', 'software', 'other')),
  amount numeric(10, 2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses(expense_date);

alter table public.expenses enable row level security;

create policy "authenticated full access" on public.expenses
  for all to authenticated using (true) with check (true);

create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- renewals (insurance, licences, anything with a "don't let this lapse" date)
-- ---------------------------------------------------------------------------
create table if not exists public.renewals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  due_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists renewals_due_date_idx on public.renewals(due_date);

alter table public.renewals enable row level security;

create policy "authenticated full access" on public.renewals
  for all to authenticated using (true) with check (true);

create trigger renewals_set_updated_at before update on public.renewals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Widen reminder_log's allowed types (adds renewal_due for future use).
-- ---------------------------------------------------------------------------
alter table public.reminder_log drop constraint if exists reminder_log_type_check;
alter table public.reminder_log add constraint reminder_log_type_check
  check (type in ('due_soon', 'invoice_overdue', 'job_confirmation', 'review_request', 'renewal_due'));
