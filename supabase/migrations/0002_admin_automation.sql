-- Adds support for: auto-invoice on job completion (no schema change needed),
-- job-day confirmation emails, post-job review requests, and lead source
-- tracking. Additive only - safe to run on a live project with real data,
-- unlike 0001 which rebuilds its tables from scratch.

-- Widen reminder_log's allowed types to cover the two new automated emails.
alter table public.reminder_log drop constraint if exists reminder_log_type_check;
alter table public.reminder_log add constraint reminder_log_type_check
  check (type in ('due_soon', 'invoice_overdue', 'job_confirmation', 'review_request'));

-- Where a lead came from (Google listing, Facebook, referral, etc.), captured
-- automatically from a ?src= link on the public quote-request page - no new
-- field for the customer to fill in.
alter table public.leads add column if not exists source text not null default 'direct';
