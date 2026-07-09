-- Window Cleaning Business Register
-- Replaces the old seedbank schema. Run this in Supabase SQL editor
-- (or `supabase db push` if you use the CLI) on a fresh project.
--
-- Model:
--   customers    - people/properties he services, with recurring frequency
--   jobs         - individual visits (scheduled/completed/cancelled)
--   quotes       - price quotes for leads or existing customers
--   invoices     - what's owed, standalone or linked to a completed job
--   leads        - inbound requests from the public "request a quote" form
--   reminder_log - dedupe record so automated reminders don't double-send
--
-- Access model: everything requires sign-in EXCEPT inserting a lead, which
-- is public (that's how the quote-request form works for strangers).

-- ---------------------------------------------------------------------------
-- Clean slate: safe to run this whole script again from scratch at any time,
-- including after a partial/failed run - every table it creates is dropped
-- first, cascading away its indexes, triggers and policies with it.
-- ---------------------------------------------------------------------------
drop table if exists public.seedlots cascade;
drop table if exists public.reminder_log cascade;
drop table if exists public.invoices cascade;
drop table if exists public.quotes cascade;
drop table if exists public.jobs cascade;
drop table if exists public.leads cascade;
drop table if exists public.customers cascade;

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  access_notes text,          -- gate codes, pets, hazards, ladder access etc.
  frequency_weeks integer,    -- null = one-off / not recurring
  last_service_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- jobs (individual visits)
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  scheduled_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  price numeric(10, 2),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_customer_id_idx on public.jobs(customer_id);
create index jobs_scheduled_date_idx on public.jobs(scheduled_date);

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  lead_id uuid,               -- references leads(id), set below after leads exists
  contact_name text,          -- snapshot for quotes not yet tied to a customer
  contact_email text,
  contact_phone text,
  description text,
  amount numeric(10, 2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined')),
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  description text,
  amount numeric(10, 2) not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  issued_date date not null default current_date,
  due_date date not null,
  paid_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoices_customer_id_idx on public.invoices(customer_id);
create index invoices_status_idx on public.invoices(status);

-- ---------------------------------------------------------------------------
-- leads (public quote requests)
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quotes
  add constraint quotes_lead_id_fkey foreign key (lead_id) references public.leads(id) on delete set null;

-- ---------------------------------------------------------------------------
-- reminder_log (so the automated-reminder function never double-sends)
-- ---------------------------------------------------------------------------
create table public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('due_soon', 'invoice_overdue')),
  ref_id uuid not null,       -- customer_id for due_soon, invoice_id for invoice_overdue
  sent_date date not null default current_date, -- plain column, not an expression, so it can be indexed
  sent_at timestamptz not null default now()
);

create unique index reminder_log_dedupe_idx on public.reminder_log(type, ref_id, sent_date);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql
set search_path = '';

create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger quotes_set_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.jobs enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.leads enable row level security;
alter table public.reminder_log enable row level security;

-- Signed-in users (the business owner and anyone he creates a login for)
-- get full access to the operational tables.
create policy "authenticated full access" on public.customers
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.jobs
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.quotes
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.invoices
  for all to authenticated using (true) with check (true);
create policy "authenticated read/manage leads" on public.leads
  for all to authenticated using (true) with check (true);
create policy "authenticated read reminder_log" on public.reminder_log
  for select to authenticated using (true);

-- The public "request a quote" form may only INSERT a lead - no read/update/delete,
-- so a stranger can never see other customers' data.
create policy "public can submit a lead" on public.leads
  for insert to anon with check (true);

-- The reminders Edge Function uses the service_role key, which bypasses RLS
-- entirely, so no anon/authenticated policy is needed for writing reminder_log.
