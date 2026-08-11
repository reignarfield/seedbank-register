-- Traceability from a job back to the quote it came from, matching the
-- existing invoices.job_id pattern. Additive only.

alter table public.jobs add column if not exists quote_id uuid references public.quotes(id) on delete set null;
