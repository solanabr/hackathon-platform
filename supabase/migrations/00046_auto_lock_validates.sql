-- auto_lock_overdue flipped EVERY overdue draft to submitted with none of
-- submit_team's validation: a team that registered and never opened the form
-- became a blank public gallery card, published its members' profiles and
-- entered the judging pool. Now an overdue draft is only promoted when it
-- passes the same required-field checks submit_team makes (00029); everything
-- overdue still locks, so an unfinished draft ends as a locked draft, not a
-- blank public submission.

create or replace function public.auto_lock_overdue() returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  with overdue as (
    select t.id from teams t
    join hackathons h on h.id = t.hackathon_id
    where t.locked = false and h.submission_deadline_at < now()
  ),
  promoted as (
    update submissions s
    set status = 'submitted', submitted_at = coalesce(s.submitted_at, now())
    from overdue
    where s.team_id = overdue.id
      and s.status = 'draft'
      and s.project_name is not null and length(trim(s.project_name)) > 0
      and s.description is not null and length(trim(s.description)) > 0
      and s.pitch_deck_url is not null and length(trim(s.pitch_deck_url)) > 0
      and s.pitch_video_url is not null and length(trim(s.pitch_video_url)) > 0
      and s.github_url is not null and length(trim(s.github_url)) > 0
      and s.github_access_granted is true
    returning 1
  )
  update teams set locked = true
  where id in (select id from overdue);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Nothing gated team creation on the deadline: a team created after it was
-- promoted by the cron within sixty seconds. Creation now stops when
-- submissions do.
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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select submission_deadline_at into v_deadline
  from hackathons where id = p_hackathon_id;

  if v_deadline is null then raise exception 'hackathon_not_found'; end if;
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
