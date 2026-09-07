-- An edition can have a front door on this site that is not /h/[slug]: the
-- Colosseum campaign lives at "/" while its sign-up happens on colosseum.com.
-- external_url keeps meaning "sign up elsewhere"; landing_path says where the
-- hub card and deep links go first, so the platform registration is not skipped.
alter table public.hackathons
  add column if not exists landing_path text
  check (landing_path is null or landing_path ~ '^/');

update public.hackathons set landing_path = '/' where slug = 'colosseum-2026';
