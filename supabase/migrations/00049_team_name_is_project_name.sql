-- Project name and team name are the same thing. teams.name is the single
-- source of truth; submissions.project_name stays as a synced column so
-- submit_team, the auto-lock validation, public_submissions and the gallery
-- keep working unchanged.
--
-- The insert-time sync is folded into handle_new_team (the submission row is
-- born inside this trigger, so a second AFTER INSERT trigger on teams would
-- depend on alphabetical firing order); renames propagate via a separate
-- update trigger.

create or replace function public.handle_new_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into submissions (team_id, project_name) values (new.id, new.name);
  insert into team_members (team_id, user_id, invited_email, is_leader, status, accepted_at)
  select new.id, new.leader_id, u.email, true, 'accepted', now()
  from users u where u.id = new.leader_id;
  return new;
end;
$$;

create or replace function public.sync_project_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.submissions set project_name = new.name where team_id = new.id;
  return new;
end;
$$;

drop trigger if exists teams_sync_project_name on public.teams;
create trigger teams_sync_project_name
  after update of name on public.teams
  for each row
  when (new.name is distinct from old.name)
  execute function public.sync_project_name();

update public.submissions s
set project_name = t.name
from public.teams t
where t.id = s.team_id
  and s.project_name is distinct from t.name;

-- The column is trigger-owned now: without this, any member could still
-- PATCH project_name straight through PostgREST and desync it.
revoke update (project_name) on public.submissions from authenticated;
