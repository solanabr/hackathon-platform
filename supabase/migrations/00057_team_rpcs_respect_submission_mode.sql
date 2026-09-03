-- External editions (submission_mode = 'external') have no teams or
-- submissions here. The UI redirects away, but these RPCs are callable by any
-- authenticated user, so the invariant has to live in the definer functions.
create or replace function public.create_team_with_leader(
  p_hackathon_id uuid,
  p_name text,
  p_description text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_team_id uuid;
  v_existing_count int;
  v_deadline timestamptz;
  v_mode text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select submission_deadline_at, submission_mode into v_deadline, v_mode
  from hackathons where id = p_hackathon_id;

  if v_deadline is null then raise exception 'hackathon_not_found'; end if;
  if v_mode <> 'platform' then raise exception 'external_edition'; end if;
  if v_deadline <= now() then raise exception 'deadline_passed'; end if;

  select count(*) into v_existing_count
  from team_members tm
  join teams t on t.id = tm.team_id
  where tm.user_id = v_user_id
    and tm.status = 'accepted'
    and t.hackathon_id = p_hackathon_id;

  if v_existing_count > 0 then
    raise exception 'already_on_team';
  end if;

  insert into teams (hackathon_id, name, description, leader_id)
  values (p_hackathon_id, trim(p_name), nullif(trim(p_description), ''), v_user_id)
  returning id into v_team_id;

  return v_team_id;
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
  v_mode text;
  v_sub public.submissions%rowtype;
  v_missing_luma int;
  v_accepted int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select t.leader_id, t.locked, t.hackathon_id, h.submission_deadline_at, h.submission_mode
    into v_leader_id, v_locked, v_hackathon_id, v_deadline, v_mode
  from public.teams t
  join public.hackathons h on h.id = t.hackathon_id
  where t.id = p_team_id
  for update of t;

  if v_leader_id is null then raise exception 'team_not_found'; end if;
  if v_mode <> 'platform' then raise exception 'external_edition'; end if;
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
