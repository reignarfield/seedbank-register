-- Four things, all additive, all safe on a live project:
--
--   1. Archive instead of delete. Invoices are tax records with a five-year
--      retention rule, and deleting a customer used to cascade through their
--      jobs and invoices. Every operational table gains archived_at; the
--      cascades become restrict so nothing can take records with it.
--   2. The numbers Tyson might change move out of code and into settings:
--      invoice terms, GST registration, ABN, what counts as "lapsed", how
--      far ahead renewals warn, which reminders are switched on.
--   3. An activity log. Every automatic action the app takes - invoice
--      raised, due date rolled, km logged - is written here with enough to
--      undo it. Automation you can see and reverse is automation you trust.
--   4. Receipt photos, a GST amount and an asset flag on expenses.

-- ---------------------------------------------------------------------------
-- 1. Archive, never delete
-- ---------------------------------------------------------------------------
alter table public.customers add column if not exists archived_at timestamptz;
alter table public.jobs      add column if not exists archived_at timestamptz;
alter table public.quotes    add column if not exists archived_at timestamptz;
alter table public.invoices  add column if not exists archived_at timestamptz;
alter table public.expenses  add column if not exists archived_at timestamptz;  -- receipts are tax records too
alter table public.trips     add column if not exists archived_at timestamptz;  -- so is the km log

create index if not exists customers_archived_idx on public.customers(archived_at) where archived_at is null;
create index if not exists jobs_archived_idx      on public.jobs(archived_at)      where archived_at is null;

alter table public.jobs drop constraint if exists jobs_customer_id_fkey;
alter table public.jobs add constraint jobs_customer_id_fkey
  foreign key (customer_id) references public.customers(id) on delete restrict;

alter table public.invoices drop constraint if exists invoices_customer_id_fkey;
alter table public.invoices add constraint invoices_customer_id_fkey
  foreign key (customer_id) references public.customers(id) on delete restrict;

alter table public.customer_notes drop constraint if exists customer_notes_customer_id_fkey;
alter table public.customer_notes add constraint customer_notes_customer_id_fkey
  foreign key (customer_id) references public.customers(id) on delete restrict;

-- ---------------------------------------------------------------------------
-- 2. Tyson's knobs
-- ---------------------------------------------------------------------------
alter table public.settings add column if not exists invoice_due_days   integer not null default 14;
alter table public.settings add column if not exists gst_registered     boolean not null default false;
alter table public.settings add column if not exists abn                text;
alter table public.settings add column if not exists lapsed_days        integer not null default 180;
alter table public.settings add column if not exists renewal_lead_days  integer not null default 30;
alter table public.settings add column if not exists due_soon_days      integer not null default 7;
-- Which automated emails may go out. Off by default for anything a customer
-- sees; each is meant to be switched on only after it's been approved by hand.
alter table public.settings add column if not exists reminders jsonb not null default
  '{"owner_digest": true, "due_soon": false, "invoice_overdue": false, "job_confirmation": false, "review_request": false}'::jsonb;

-- ---------------------------------------------------------------------------
-- 3. Activity log
-- ---------------------------------------------------------------------------
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  kind text not null,               -- job_completed, invoice_raised, job_rescheduled, ...
  summary text not null,            -- one plain sentence, shown as-is
  actor text not null default 'app' check (actor in ('app', 'user')),
  customer_id uuid references public.customers(id) on delete set null,
  ref_table text,
  ref_id uuid,
  undo jsonb,                       -- whatever's needed to reverse it; null = not reversible
  undone_at timestamptz
);

create index if not exists activity_occurred_idx on public.activity(occurred_at desc);

alter table public.activity enable row level security;
drop policy if exists "authenticated full access" on public.activity;
create policy "authenticated full access" on public.activity
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 4. Expenses: receipt photo, GST, asset flag
-- ---------------------------------------------------------------------------
alter table public.expenses add column if not exists receipt_path text;
alter table public.expenses add column if not exists gst_amount   numeric(10, 2);
alter table public.expenses add column if not exists is_asset     boolean not null default false;

insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', false)
  on conflict (id) do nothing;

drop policy if exists "authenticated receipts" on storage.objects;
create policy "authenticated receipts" on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts') with check (bucket_id = 'receipts');

-- ---------------------------------------------------------------------------
-- complete_job now records what it did, with what's needed to undo it.
-- Same signature as 0010 so the app's call doesn't change.
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
  v_job        public.jobs;
  v_customer   public.customers;
  v_price      numeric;
  v_invoice_id uuid;
begin
  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then
    raise exception 'job % not found', p_job_id;
  end if;
  select * into v_customer from public.customers where id = v_job.customer_id;

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
    )
    returning id into v_invoice_id;
  end if;

  insert into public.activity (kind, summary, actor, customer_id, ref_table, ref_id, undo)
  values (
    'job_completed',
    'Marked ' || coalesce(v_customer.name, 'a job') || ' done'
      || case when v_invoice_id is not null
           then ' and raised a $' || trim(to_char(v_price, 'FM999,999,990.00')) || ' invoice'
             || case when p_paid_now then ', paid on the spot' else ', due in ' || p_due_days || ' days' end
           else ' (no price, so no invoice)' end,
    'app',
    v_job.customer_id,
    'jobs',
    v_job.id,
    jsonb_build_object(
      'invoice_id', v_invoice_id,
      'prev_last_service_date', v_customer.last_service_date,
      'prev_status', 'scheduled'
    )
  );

  return v_job;
end;
$$;

grant execute on function public.complete_job(uuid, numeric, boolean, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- undo_activity: reverse one logged action. Today that means un-completing a
-- job: status back to scheduled, the customer's last-service date restored,
-- the auto-raised invoice removed - but only if it's still unpaid. A paid
-- invoice is money that moved; that's not something to undo silently.
-- ---------------------------------------------------------------------------
create or replace function public.undo_activity(p_activity_id uuid)
returns public.activity
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_act public.activity;
  v_inv public.invoices;
begin
  select * into v_act from public.activity where id = p_activity_id for update;
  if not found then raise exception 'activity % not found', p_activity_id; end if;
  if v_act.undone_at is not null then raise exception 'already undone'; end if;
  if v_act.undo is null then raise exception 'this action cannot be undone'; end if;

  if v_act.kind = 'job_completed' then
    if (v_act.undo->>'invoice_id') is not null then
      select * into v_inv from public.invoices where id = (v_act.undo->>'invoice_id')::uuid;
      if found and v_inv.status = 'paid' then
        raise exception 'That invoice has been marked paid - unmark it first if this really needs undoing.';
      end if;
      delete from public.invoices where id = (v_act.undo->>'invoice_id')::uuid;
    end if;
    update public.jobs
       set status = 'scheduled', completed_at = null
     where id = v_act.ref_id;
    update public.customers
       set last_service_date = nullif(v_act.undo->>'prev_last_service_date', '')::date
     where id = v_act.customer_id;
  else
    raise exception 'no undo handler for %', v_act.kind;
  end if;

  update public.activity set undone_at = now() where id = p_activity_id returning * into v_act;
  return v_act;
end;
$$;

grant execute on function public.undo_activity(uuid) to authenticated;
