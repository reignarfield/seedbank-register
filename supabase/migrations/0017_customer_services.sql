-- A customer can have several regular services, each on its own cycle:
-- windows every 8 weeks, solar once a year, gutters each autumn. One
-- frequency per customer - the old shape - couldn't say that. Each row has
-- its own last-done date and usual price, so "who's due" and "what to book"
-- are per service. Completing a job whose type matches a service moves that
-- service's date forward.
--
-- customers.frequency_weeks and last_service_date stay for anything still
-- reading them; new work reads customer_services. Existing single-cycle
-- customers are carried across as a 'General' service.
--
-- Also: nothing is sent automatically any more. Every email the app wants
-- to send is confirmed in the app first. Additive only.

create table if not exists public.customer_services (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  service text not null,                      -- a price-list category, e.g. 'Window Cleaning'
  frequency_weeks integer not null check (frequency_weeks > 0),
  last_done date,
  price numeric(10, 2),                       -- the usual price for this one
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_services_customer_idx on public.customer_services(customer_id);
alter table public.customer_services enable row level security;
drop policy if exists "authenticated full access" on public.customer_services;
create policy "authenticated full access" on public.customer_services
  for all to authenticated using (true) with check (true);
drop trigger if exists customer_services_set_updated_at on public.customer_services;
create trigger customer_services_set_updated_at before update on public.customer_services
  for each row execute function public.set_updated_at();

insert into public.customer_services (customer_id, service, frequency_weeks, last_done)
select id, 'General', frequency_weeks, last_service_date from public.customers
where frequency_weeks is not null and archived_at is null
  and not exists (select 1 from public.customer_services s where s.customer_id = customers.id);

-- complete_job: see schema.sql for the current definition (moves the matching
-- service's last_done forward as well as the customer's last_service_date).

update public.settings set reminders = '{"owner_digest": false, "due_soon": false, "invoice_overdue": false, "job_confirmation": false, "review_request": false}'::jsonb where id = true;
