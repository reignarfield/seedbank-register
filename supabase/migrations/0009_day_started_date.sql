-- The "Start my day" bookend writes settings.day_started_date, but the
-- column was never migrated when that feature shipped - so tapping the
-- button errored and the start card could never be dismissed. Additive only.

alter table public.settings add column if not exists day_started_date date;
