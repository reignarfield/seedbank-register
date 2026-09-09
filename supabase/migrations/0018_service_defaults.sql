-- How often each kind of job usually repeats, in the owner's head: windows
-- every 8 weeks, solar yearly, a bond clean never. Used to suggest "make
-- this a regular?" after a job, and as the starting point when adding a
-- regular service by hand. null means one-off by nature. Additive only.

alter table public.settings add column if not exists service_defaults jsonb not null default
  '{ "Window Cleaning": 8, "Pressure Cleaning": 26, "Solar Panel Cleaning": 52, "Gutter Cleaning": 52, "Car Cleaning": null, "House / Office Cleaning": 4, "Bond Cleans": null, "Add-ons": null }'::jsonb;
