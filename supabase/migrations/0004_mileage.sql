-- Mileage / vehicle km tracking for the cents-per-km tax deduction.
-- Additive only - safe to run on a live project with real data.
--
--   settings   - single-row config: home base address + coords, ATO rate.
--   trips      - individual drives, either logged from a job or manually.
--   customers  - gains cached lat/lng so a job address is only geocoded once.

-- ---------------------------------------------------------------------------
-- Cache geocoded coordinates on customers so we never re-geocode an address.
-- ---------------------------------------------------------------------------
alter table public.customers add column if not exists lat double precision;
alter table public.customers add column if not exists lng double precision;

-- ---------------------------------------------------------------------------
-- settings: exactly one row (id is forced true), holding the home base and
-- the cents-per-km rate so it can be updated as the ATO rate changes.
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id boolean primary key default true check (id),
  home_base_address text,
  home_base_lat double precision,
  home_base_lng double precision,
  mileage_rate_cents integer not null default 88,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
create policy "authenticated full access" on public.settings
  for all to authenticated using (true) with check (true);
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (id) values (true) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- trips
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

alter table public.trips enable row level security;
create policy "authenticated full access" on public.trips
  for all to authenticated using (true) with check (true);
create trigger trips_set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
