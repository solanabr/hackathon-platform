-- public_submissions and public_team_members both refuse draft editions;
-- public_profiles had no join to hackathons at all. Identical results while no
-- draft edition holds a submitted team, but the moment an admin takes an
-- edition offline its participants' names, avatars, bios and socials would
-- stay readable by anon while the projects vanish.
create or replace view public.public_profiles
with (security_barrier = true) as
select
  id, full_name, avatar_url, headline, bio,
  github_url, twitter_url, linkedin_url
from public.users
where id in (
  select tm.user_id
  from public.team_members tm
  join public.submissions s on s.team_id = tm.team_id
  join public.hackathons h on h.id = tm.hackathon_id
  where tm.status = 'accepted'
    and s.status = 'submitted'
    and h.status <> 'draft'
);

grant select on public.public_profiles to anon, authenticated;
grant all on public.public_profiles to service_role;
