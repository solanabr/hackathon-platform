-- First-touch campaign attribution on the registration row. PostHog only sees
-- consenting visitors and UTMs die at the OAuth round-trip, so Supabase
-- becomes the attribution source of truth. Written by the registration
-- actions from the localStorage snapshot taken on landing (src/lib/attribution.ts).

alter table public.hackathon_registrations
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content  text,
  add column if not exists referrer     text;

comment on column public.hackathon_registrations.utm_source is
  'First-touch utm_source captured on landing; null when the person arrived without UTMs.';
comment on column public.hackathon_registrations.referrer is
  'document.referrer host on first touch; null for direct traffic.';
