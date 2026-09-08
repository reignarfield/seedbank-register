-- Where else the business lives: Instagram, Facebook, and how many Google
-- reviews to boast about. Shown on the public page through the same view.

alter table public.settings add column if not exists instagram_url text;
alter table public.settings add column if not exists facebook_url text;
alter table public.settings add column if not exists review_count integer;

create or replace view public.public_profile
with (security_invoker = false) as
  select service_area, google_review_url, public_tagline, public_blurb, abn, gst_registered, instagram_url, facebook_url, review_count
  from public.settings where id = true;
grant select on public.public_profile to anon, authenticated;
