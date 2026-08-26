-- Two holes found by the pre-launch participant audit.
--
-- 1. Any participant could declare their own team a finalist and a winner.
--    00014 column-scoped the UPDATE grant on teams so is_finalist/placement
--    cannot be changed after the fact, but it never touched INSERT, and the
--    teams_insert policy only checks leader_id = auth.uid(). So a direct
--    POST /rest/v1/teams with {"is_finalist": true, "placement": 1} passed
--    RLS, and both public readers (the landing's finalists list and the
--    gallery's winner podium) take those columns at face value.
--
--    No application code inserts into teams — create_team_with_leader is the
--    only path and it is SECURITY DEFINER owned by postgres, so it bypasses
--    these grants. Narrowing the grant to the columns a team legitimately
--    supplies is therefore invisible to the app.
revoke insert on public.teams from authenticated;
grant insert (hackathon_id, name, description, leader_id)
  on public.teams to authenticated;

-- 2. public_schedule exposed every content row of a draft edition to anon:
--    titles, speakers, descriptions and dates of an unannounced hackathon.
--    Same gap 00037 closed on sections and 00038 on sponsors.
create or replace view public.public_schedule as
  select c.id,
         c.hackathon_id,
         c.kind,
         c.title,
         c.speaker,
         c.description,
         c.scheduled_at,
         c.location,
         c.position
  from public.hackathon_contents c
  join public.hackathons h on h.id = c.hackathon_id
  where c.deleted_at is null
    and h.status <> 'draft';
