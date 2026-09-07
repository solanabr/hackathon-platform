-- '^/' alone still admits "//evil.com" and "/\t/evil.com", which browsers
-- resolve to another origin when used as a redirect target. Match what
-- sanitizeRedirect() accepts: a leading slash, not two, and no whitespace,
-- control characters or backslashes anywhere.
alter table public.hackathons
  drop constraint if exists hackathons_landing_path_check;

alter table public.hackathons
  add constraint hackathons_landing_path_check check (
    landing_path is null
    or (
      landing_path ~ '^/'
      and landing_path !~ '^//'
      and landing_path !~ '[[:space:][:cntrl:]\\]'
    )
  );
