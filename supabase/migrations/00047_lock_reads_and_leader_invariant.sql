-- Race hardening. leave_team, remove_team_member and submit_team read
-- teams.locked without FOR UPDATE (unlike delete_team and
-- transfer_team_leadership, which lock), so a member could leave a team in
-- the same instant it locked, leaving a submitted team below minimum size —
-- and two concurrent submits could both pass the locked check. The bodies are
-- unchanged apart from the row lock.

create or replace function public.leave_team(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid; v_leader_id uuid; v_locked boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select leader_id, locked into v_leader_id, v_locked
  from public.teams where id = p_team_id for update;

  if v_leader_id is null then raise exception 'team_not_found'; end if;
  if v_locked then raise exception 'team_locked'; end if;
  if v_leader_id = v_user_id then raise exception 'leader_must_transfer_first'; end if;

  delete from public.team_members where team_id = p_team_id and user_id = v_user_id;
end;
$$;

create or replace function public.remove_team_member(p_member_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid; v_team_id uuid; v_is_leader boolean; v_leader_id uuid; v_locked boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select tm.team_id, tm.is_leader into v_team_id, v_is_leader
  from public.team_members tm where tm.id = p_member_id;

  if v_team_id is null then raise exception 'member_not_found'; end if;
  if v_is_leader then raise exception 'cannot_remove_leader'; end if;

  select t.leader_id, t.locked into v_leader_id, v_locked
  from public.teams t where t.id = v_team_id for update;

  if v_leader_id <> v_user_id then raise exception 'not_leader'; end if;
  if v_locked then raise exception 'team_locked'; end if;

  delete from public.team_members where id = p_member_id;
end;
$$;

create or replace function public.submit_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid;
  v_leader_id uuid;
  v_locked boolean;
  v_deadline timestamptz;
  v_hackathon_id uuid;
  v_sub public.submissions%rowtype;
  v_missing_luma int;
  v_accepted int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select t.leader_id, t.locked, t.hackathon_id, h.submission_deadline_at
    into v_leader_id, v_locked, v_hackathon_id, v_deadline
  from public.teams t
  join public.hackathons h on h.id = t.hackathon_id
  where t.id = p_team_id
  for update of t;

  if v_leader_id is null then raise exception 'team_not_found'; end if;
  if v_leader_id <> v_user_id then raise exception 'not_leader'; end if;
  if v_locked then raise exception 'already_locked'; end if;
  if v_deadline <= now() then raise exception 'deadline_passed'; end if;

  select * into v_sub from public.submissions where team_id = p_team_id;

  if v_sub.project_name is null or length(trim(v_sub.project_name)) = 0
     or v_sub.description is null or length(trim(v_sub.description)) = 0
     or v_sub.pitch_deck_url is null or length(trim(v_sub.pitch_deck_url)) = 0
     or v_sub.pitch_video_url is null or length(trim(v_sub.pitch_video_url)) = 0
     or v_sub.github_url is null or length(trim(v_sub.github_url)) = 0
     or v_sub.github_access_granted is not true then
    raise exception 'missing_required_fields';
  end if;

  select count(*) into v_accepted
  from public.team_members
  where team_id = p_team_id and status = 'accepted';

  if v_accepted < 2 then raise exception 'team_too_small'; end if;

  select count(*) into v_missing_luma
  from public.team_members tm
  left join public.hackathon_registrations hr
    on hr.user_id = tm.user_id and hr.hackathon_id = v_hackathon_id
  where tm.team_id = p_team_id
    and tm.status = 'accepted'
    and hr.luma_confirmed_at is null;

  if v_missing_luma > 0 then raise exception 'members_missing_luma'; end if;

  update public.submissions
  set status = 'submitted', submitted_at = now()
  where team_id = p_team_id;

  update public.teams set locked = true where id = p_team_id;
end;
$function$;

-- transfer_team_leadership racing remove_team_member could leave leader_id
-- pointing at a non-member; nothing enforced one is_leader row per team. The
-- index makes the invariant structural (transfer clears the old flag before
-- setting the new one, so it never trips it).
create unique index if not exists team_members_one_leader_per_team
  on public.team_members (team_id)
  where is_leader;
