-- Editions can register people here and collect the project elsewhere
-- (Superteam Earn for the Vibeathon). `external_url` keeps its meaning of
-- "the whole edition lives on another site"; this is a narrower mode.
alter table public.hackathons
  add column if not exists submission_mode text not null default 'platform'
    constraint hackathons_submission_mode_check check (submission_mode in ('platform', 'external')),
  add column if not exists external_submission_url text;

comment on column public.hackathons.submission_mode is
  'platform: teams and submissions on this platform. external: register here, submit at external_submission_url.';
comment on column public.hackathons.external_submission_url is
  'Where the project is submitted when submission_mode = external (e.g. a Superteam Earn listing).';
