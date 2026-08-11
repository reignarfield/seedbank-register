-- Route order (display-only planning aid for today's job list) and a fast
-- running log of on-site customer notes, separate from the permanent
-- notes/access_notes fields on customers. Additive only.

alter table public.jobs add column if not exists route_order integer;

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_notes_customer_id_idx on public.customer_notes(customer_id);

alter table public.customer_notes enable row level security;
create policy "authenticated full access" on public.customer_notes
  for all to authenticated using (true) with check (true);
