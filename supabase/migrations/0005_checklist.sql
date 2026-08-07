-- Packing checklist items (settings): things not to forget before leaving
-- for the day - straight from Tyson's own answer ("that one screwdriver or
-- that pole or that towel or that squeegee"). Additive only.

alter table public.settings add column if not exists packing_checklist text[] not null default array[
  'Squeegees',
  'Extension pole',
  'Towels / cloths',
  'Screwdriver',
  'Bucket & soap'
];
