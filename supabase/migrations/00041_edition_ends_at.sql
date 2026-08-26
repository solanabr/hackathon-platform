-- The platform's date model ends at the finalists announcement; everything
-- after is narrative (docs/EDITION-DATES.md). ends_at is the one date that
-- means "this edition is over" — optional, because an online-only edition
-- ends at the announcement. Additive only: voting_*, development_starts_at
-- and presential_at keep working until the code cutover after 12/09, and
-- are dropped in a later migration once nothing reads them.

alter table public.hackathons add column if not exists ends_at timestamptz;

update public.hackathons
set ends_at = coalesce(presential_at, voting_closes_at, finalists_announced_at)
where ends_at is null;
