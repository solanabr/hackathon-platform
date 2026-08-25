-- Public project gallery and builder profiles. Same posture as public_schedule:
-- postgres-owned security_barrier views whose protection is the whitelisted
-- column list. Judge data, emails, and draft rows never reach anon. Supabase's
-- linter flags postgres-owned views exposed to anon — these are intentional.
-- The gate is a WHERE, not an RLS policy, so it can't be forgotten per-row.

create or replace view public.public_submissions
with (security_barrier = true) as
select
  s.id,
  s.project_name,
  s.description,
  s.image_path,
  s.github_url,
  s.twitter_url,
  s.website_url,
  s.demo_video_url,
  s.pitch_video_url,
  s.status,
  s.submitted_at,
  t.id as team_id,
  t.name as team_name,
  t.leader_id as team_leader_id,
  u.full_name as team_leader_name,
  h.id as hackathon_id,
  h.slug as hackathon_slug,
  h.name as hackathon_name
from public.submissions s
left join public.teams t on t.id = s.team_id
left join public.users u on u.id = t.leader_id
left join public.hackathons h on h.id = t.hackathon_id
where s.status = 'submitted'
  and h.status <> 'draft';

grant select on public.public_submissions to anon, authenticated;
grant all on public.public_submissions to service_role;

create or replace view public.public_profiles
with (security_barrier = true) as
select
  id, full_name, avatar_url, headline, bio,
  github_url, twitter_url, linkedin_url
from public.users;

grant select on public.public_profiles to anon, authenticated;
grant all on public.public_profiles to service_role;

-- Submission detail lists the whole team. team_members is member-scoped under
-- RLS, so anon needs the same whitelist treatment: accepted members only, and
-- only the public profile fields.
create or replace view public.public_team_members
with (security_barrier = true) as
select
  tm.team_id,
  u.id as user_id,
  u.full_name,
  u.avatar_url,
  u.headline,
  u.bio,
  u.github_url,
  u.twitter_url,
  u.linkedin_url
from public.team_members tm
join public.users u on u.id = tm.user_id
where tm.status = 'accepted';

grant select on public.public_team_members to anon, authenticated;
grant all on public.public_team_members to service_role;
