-- ===========================================================================
-- Complete database schema - paste this whole file into the Supabase SQL
-- Editor and hit Run. That's the entire database setup.
--
-- Safe to run more than once. Every statement is idempotent: existing tables
-- and data are left alone, missing pieces are added. Nothing is ever dropped,
-- so running it against a live project can't lose you a customer record.
--
-- This is the flattened result of supabase/migrations/0001-0009. Those files
-- are kept for projects already running an older version - a project set up
-- from this file needs none of them.
--
-- The model is deliberately trade-agnostic. A window cleaner, a mobile
-- mechanic and a dog groomer all store the same shapes:
--   customers      - people you serve, with an optional recurring frequency
--   jobs           - individual visits (scheduled / completed / cancelled)
--   quotes         - prices offered, to a lead or an existing customer
--   invoices       - what's owed, standalone or raised from a finished job
--   leads          - inbound enquiries from the public booking form
--   expenses       - what you spent, for the income-minus-costs picture
--   renewals       - insurance/licence dates that mustn't lapse
--   trips          - drives, for the cents-per-km deduction
--   settings       - single-row config (home base, rate, checklists)
--   customer_notes - running on-site log, separate from permanent notes
--   reminder_log   - dedupe record so automated emails never double-send
--
-- Access model: everything needs a sign-in EXCEPT inserting a lead, which is
-- public - that's how the booking form works for strangers.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Shared trigger function: keeps updated_at honest without the app setting it
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql
set search_path = '';

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
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
  lat double precision,       -- cached geocode, so an address is looked up once
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columns added after the first release, for projects upgrading in place.
alter table public.customers add column if not exists lat double precision;
alter table public.customers add column if not exists lng double precision;

-- ---------------------------------------------------------------------------
-- jobs (individual visits)
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  scheduled_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  price numeric(10, 2),
  notes text,
  job_type text,              -- validated in the UI against the price list
  route_order integer,        -- display-only ordering for today's run
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs add column if not exists job_type text;
alter table public.jobs add column if not exists route_order integer;

create index if not exists jobs_customer_id_idx on public.jobs(customer_id);
create index if not exists jobs_scheduled_date_idx on public.jobs(scheduled_date);

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  lead_id uuid,               -- FK added below, once leads exists
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

-- Traceability from a job back to the quote that won it.
alter table public.jobs add column if not exists quote_id uuid
  references public.quotes(id) on delete set null;

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
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

create index if not exists invoices_customer_id_idx on public.invoices(customer_id);
create index if not exists invoices_status_idx on public.invoices(status);

-- ---------------------------------------------------------------------------
-- leads (public booking / quote requests)
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  source text not null default 'direct',  -- from ?src= on the booking link
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads add column if not exists source text not null default 'direct';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quotes_lead_id_fkey'
  ) then
    alter table public.quotes
      add constraint quotes_lead_id_fkey
      foreign key (lead_id) references public.leads(id) on delete set null;
  end if;
end $$;

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

-- ---------------------------------------------------------------------------
-- renewals (insurance, licences - anything with a "don't let this lapse" date)
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

-- ---------------------------------------------------------------------------
-- settings: exactly one row (id is forced true)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id boolean primary key default true check (id),
  home_base_address text,
  home_base_lat double precision,
  home_base_lng double precision,
  mileage_rate_cents integer not null default 88,
  packing_checklist text[] not null default array[
    'Squeegees',
    'Extension pole',
    'Towels / cloths',
    'Screwdriver',
    'Bucket & soap'
  ],
  type_checklists jsonb not null default '{}'::jsonb,
  day_started_date date,
  updated_at timestamptz not null default now()
);

alter table public.settings add column if not exists packing_checklist text[] not null default array[
  'Squeegees', 'Extension pole', 'Towels / cloths', 'Screwdriver', 'Bucket & soap'
];
alter table public.settings add column if not exists type_checklists jsonb not null default '{}'::jsonb;
alter table public.settings add column if not exists day_started_date date;

insert into public.settings (id) values (true) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- trips (cents-per-km vehicle log)
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  trip_date date not null default current_date,
  from_label text,
  to_label text,
  distance_km numeric(10, 1) not null default 0,
  round_trip boolean not null default true,
  purpose text,
  customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_date_idx on public.trips(trip_date);
create index if not exists trips_customer_id_idx on public.trips(customer_id);

-- ---------------------------------------------------------------------------
-- customer_notes (fast running log, distinct from permanent customer notes)
-- ---------------------------------------------------------------------------
create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_notes_customer_id_idx on public.customer_notes(customer_id);

-- ---------------------------------------------------------------------------
-- reminder_log (dedupe, so the automated emails never double-send)
-- ---------------------------------------------------------------------------
create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  ref_id uuid not null,       -- customer_id or invoice_id, depending on type
  sent_date date not null default current_date,
  sent_at timestamptz not null default now()
);

alter table public.reminder_log drop constraint if exists reminder_log_type_check;
alter table public.reminder_log add constraint reminder_log_type_check
  check (type in ('due_soon', 'invoice_overdue', 'job_confirmation', 'review_request', 'renewal_due'));

create unique index if not exists reminder_log_dedupe_idx
  on public.reminder_log(type, ref_id, sent_date);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'customers', 'jobs', 'quotes', 'invoices', 'leads',
    'expenses', 'renewals', 'settings', 'trips'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Signed-in users get full access to the operational tables; the public can
-- only INSERT a lead. The reminders Edge Function uses the service_role key,
-- which bypasses RLS entirely, so it needs no policy of its own.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'customers', 'jobs', 'quotes', 'invoices', 'leads', 'expenses',
    'renewals', 'settings', 'trips', 'customer_notes', 'reminder_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated full access" on public.%I', t);
  end loop;
end $$;

create policy "authenticated full access" on public.customers      for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.jobs           for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.quotes         for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.invoices       for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.leads          for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.expenses       for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.renewals       for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.settings       for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.trips          for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.customer_notes for all to authenticated using (true) with check (true);

-- reminder_log is written only by the Edge Function; staff may read it.
drop policy if exists "authenticated read reminder_log" on public.reminder_log;
create policy "authenticated read reminder_log" on public.reminder_log
  for select to authenticated using (true);

-- The public booking form may only INSERT a lead - never read, update or
-- delete - so a stranger can never see anyone else's data.
drop policy if exists "public can submit a lead" on public.leads;
create policy "public can submit a lead" on public.leads
  for insert to anon with check (true);

-- ---------------------------------------------------------------------------
-- complete_job: mark done + roll the customer's due date + raise the invoice,
-- as one all-or-nothing operation. Called from the app via rpc(). The invoice
-- wording is passed in so the database never assumes what trade this is.
-- ---------------------------------------------------------------------------
create or replace function public.complete_job(
  p_job_id uuid,
  p_price numeric default null,
  p_paid_now boolean default false,
  p_description text default null,
  p_due_days integer default 14
)
returns public.jobs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_job   public.jobs;
  v_price numeric;
begin
  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then
    raise exception 'job % not found', p_job_id;
  end if;

  v_price := coalesce(p_price, v_job.price);
  if v_price is not null and v_price <= 0 then
    v_price := null;
  end if;

  update public.jobs
     set status       = 'completed',
         completed_at = now(),
         price        = coalesce(v_price, price)
   where id = p_job_id
   returning * into v_job;

  update public.customers
     set last_service_date = v_job.scheduled_date
   where id = v_job.customer_id;

  if v_price is not null then
    insert into public.invoices
      (customer_id, job_id, description, amount, status, issued_date, due_date, paid_date)
    values (
      v_job.customer_id,
      v_job.id,
      coalesce(nullif(p_description, ''), nullif(v_job.notes, ''), 'Job - ' || v_job.scheduled_date::text),
      v_price,
      case when p_paid_now then 'paid' else 'unpaid' end,
      current_date,
      current_date + p_due_days,
      case when p_paid_now then current_date else null end
    );
  end if;

  return v_job;
end;
$$;

grant execute on function public.complete_job(uuid, numeric, boolean, text, integer) to authenticated;

-- ===========================================================================
-- Done. Next: Authentication -> Users -> Add user (tick auto-confirm) to
-- create the login you'll use at /team.
-- ===========================================================================
