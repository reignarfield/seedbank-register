-- Two things an invoice and a job were missing.
--
-- 1. How to pay. "Bank transfer or cash" was printed on every invoice with
--    no account to transfer to. The details live in settings and print on
--    the invoice with the invoice number as the reference.
-- 2. Photos on a job - before, after, the crack that was already there. Same
--    shape as receipts: a private bucket, a path on the row, signed URLs to
--    view. Additive only.

alter table public.settings add column if not exists bank_account_name text;
alter table public.settings add column if not exists bank_bsb text;
alter table public.settings add column if not exists bank_account_number text;
alter table public.settings add column if not exists payment_note text;

create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  path text not null,
  note text,
  taken_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists job_photos_job_idx on public.job_photos(job_id);
alter table public.job_photos enable row level security;
drop policy if exists "authenticated full access" on public.job_photos;
create policy "authenticated full access" on public.job_photos
  for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
drop policy if exists "authenticated photos" on storage.objects;
create policy "authenticated photos" on storage.objects
  for all to authenticated using (bucket_id = 'photos') with check (bucket_id = 'photos');
