-- Per-job-type kit checklists. Jobs get an optional job_type (validated
-- against pricing.js categories in the UI, not the DB, to keep the list in
-- one place); settings gets a jsonb map of type -> extra checklist items,
-- on top of the existing packing_checklist base list. Additive only.

alter table public.jobs add column if not exists job_type text;

alter table public.settings add column if not exists type_checklists jsonb not null default '{}'::jsonb;
