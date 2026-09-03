-- Team size limits become a per-edition setting instead of the hard-coded
-- "2 a 4 integrantes". Every RPC that enforced the cap (team_full) or the
-- minimum (team_too_small) now reads team_size_min/team_size_max off the
-- team's hackathon row instead of the literals 2 and 4.

alter table public.hackathons
  add column if not exists team_size_min int not null default 2 check (team_size_min >= 1),
  add column if not exists team_size_max int not null default 4 check (team_size_max >= 1);

do $$
begin
  alter table public.hackathons
    add constraint hackathons_team_size_max_gte_min check (team_size_max >= team_size_min);
exception when duplicate_object then null;
end $$;

update public.hackathons
set team_size_min = (metadata->>'team_size_min')::int
where metadata->>'team_size_min' is not null
  and metadata->>'team_size_min' ~ '^[0-9]+$';

update public.hackathons
set team_size_max = (metadata->>'team_size_max')::int
where metadata->>'team_size_max' is not null
  and metadata->>'team_size_max' ~ '^[0-9]+$';

update public.hackathons
set team_size_max = 10
where slug = 'solana-cursor-passo-fundo-2026';

-- accept_team_invite (base: 00006, latest). Legacy invite-token flow — the
-- product no longer issues invite_token rows (see 00034+), but the function
-- is still callable, so the cap it enforces should not silently drift from
-- every other RPC's per-edition limit.
create or replace function public.accept_team_invite(p_invite_token text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_member_id uuid;
  v_team_id uuid;
  v_hackathon_id uuid;
  v_invited_email text;
  v_existing_count int;
  v_accepted_count int;
  v_locked boolean;
  v_max int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select email into v_user_email from public.users where id = v_user_id;

  select id, team_id, invited_email
    into v_member_id, v_team_id, v_invited_email
  from public.team_members
  where invite_token = p_invite_token and status = 'pending';

  if v_member_id is null then raise exception 'invite_not_found'; end if;

  if lower(v_invited_email) <> lower(coalesce(v_user_email, '')) then
    raise exception 'invite_email_mismatch';
  end if;

  select hackathon_id, locked into v_hackathon_id, v_locked
  from public.teams where id = v_team_id for update;

  if v_locked then raise exception 'team_locked'; end if;

  select team_size_max into v_max from public.hackathons where id = v_hackathon_id;

  select count(*) into v_accepted_count
  from public.team_members
  where team_id = v_team_id and status = 'accepted';

  if v_accepted_count >= v_max then raise exception 'team_full'; end if;

  select count(*) into v_existing_count
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = v_user_id
    and tm.status = 'accepted'
    and t.hackathon_id = v_hackathon_id;

  if v_existing_count > 0 then raise exception 'already_on_team'; end if;

  update public.team_members
  set user_id = v_user_id,
      status = 'accepted',
      accepted_at = now(),
      invite_token = null
  where id = v_member_id;

  return v_team_id;
end;
$$;

-- pending_membership_for_edition (base: 00034, latest). p_hackathon_id is
-- already an argument, so the "full" flag can join hackathons directly.
create or replace function public.pending_membership_for_edition(p_hackathon_id uuid)
returns table (
  "teamId" uuid,
  "teamName" text,
  "leaderName" text,
  "leaderEmail" text,
  "locked" boolean,
  "full" boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    t.id,
    t.name,
    l.full_name,
    l.email,
    t.locked,
    (
      select count(*) from public.team_members fm
      where fm.team_id = t.id and fm.status = 'accepted'
    ) >= h.team_size_max
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  join public.users l on l.id = t.leader_id
  join public.hackathons h on h.id = t.hackathon_id
  where tm.user_id = auth.uid()
    and tm.hackathon_id = p_hackathon_id
    and tm.status = 'pending'
  order by tm.invited_at asc
  limit 1;
$$;

-- accept_pending_membership (base: 00045, latest redefinition: 00051).
create or replace function public.accept_pending_membership(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_member_id uuid;
  v_hackathon_id uuid;
  v_locked boolean;
  v_accepted int;
  v_existing int;
  v_registered int;
  v_max int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select hackathon_id, locked into v_hackathon_id, v_locked
  from public.teams where id = p_team_id for update;

  if v_hackathon_id is null then raise exception 'team_not_found'; end if;
  if v_locked then raise exception 'team_locked'; end if;

  select id into v_member_id
  from public.team_members
  where team_id = p_team_id and user_id = v_user_id and status = 'pending';

  if v_member_id is null then raise exception 'invite_not_found'; end if;

  select team_size_max into v_max from public.hackathons where id = v_hackathon_id;

  select count(*) into v_accepted
  from public.team_members
  where team_id = p_team_id and status = 'accepted';

  if v_accepted >= v_max then raise exception 'team_full'; end if;

  select count(*) into v_existing
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = v_user_id
    and tm.status = 'accepted'
    and t.hackathon_id = v_hackathon_id;

  if v_existing > 0 then raise exception 'already_on_team'; end if;

  select count(*) into v_registered
  from public.hackathon_registrations
  where user_id = v_user_id and hackathon_id = v_hackathon_id;

  if v_registered = 0 then raise exception 'not_registered'; end if;

  update public.team_members
  set status = 'accepted', accepted_at = now()
  where id = v_member_id;

  update public.team_seekers
  set active = false, updated_at = now()
  where user_id = v_user_id and hackathon_id = v_hackathon_id and active;

  update public.team_applications
  set status = 'withdrawn', decided_at = now()
  where user_id = v_user_id and hackathon_id = v_hackathon_id
    and status = 'pending';
end;
$$;

-- team_up_board (base: 00051, latest redefinition: 00053). p_hackathon_id
-- is already an argument, so the opening filter can join hackathons directly.
create or replace function public.team_up_board(p_hackathon_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_teams jsonb;
  v_seekers jsonb;
  v_max int;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'not_authenticated'; end if;

  if not exists (
    select 1 from public.hackathon_registrations
    where user_id = v_user and hackathon_id = p_hackathon_id
      and luma_confirmed_at is not null and terms_accepted_at is not null
  ) then
    raise exception 'not_registered';
  end if;

  select team_size_max into v_max from public.hackathons where id = p_hackathon_id;

  select coalesce(jsonb_agg(row order by row->>'created_at' desc), '[]'::jsonb)
  into v_teams
  from (
    select jsonb_build_object(
      'team_id', t.id,
      'name', t.name,
      'description', t.description,
      'roles', o.roles,
      'note', o.note,
      'accepted_count', (
        select count(*) from public.team_members m
        where m.team_id = t.id and m.status = 'accepted'
      ),
      'leader_id', t.leader_id,
      'leader_name', u.full_name,
      'leader_avatar_url', u.avatar_url,
      'created_at', o.created_at
    ) as row
    from public.team_openings o
    join public.teams t on t.id = o.team_id
    join public.users u on u.id = t.leader_id
    where o.hackathon_id = p_hackathon_id
      and o.active
      and not t.locked
      and (
        select count(*) from public.team_members m
        where m.team_id = t.id and m.status in ('accepted', 'pending')
      ) < v_max
  ) teams_sub;

  select coalesce(jsonb_agg(row order by row->>'created_at' desc), '[]'::jsonb)
  into v_seekers
  from (
    select jsonb_build_object(
      'user_id', u.id,
      'full_name', u.full_name,
      'avatar_url', u.avatar_url,
      'headline', u.headline,
      'roles', s.roles,
      'note', s.note,
      'github_url', u.github_url,
      'twitter_url', u.twitter_url,
      'linkedin_url', u.linkedin_url,
      'telegram_handle', u.telegram_handle,
      'created_at', s.created_at
    ) as row
    from public.team_seekers s
    join public.users u on u.id = s.user_id
    where s.hackathon_id = p_hackathon_id
      and s.active
      and exists (
        select 1 from public.hackathon_registrations r
        where r.user_id = s.user_id and r.hackathon_id = p_hackathon_id
      )
      and not exists (
        select 1 from public.team_members m
        join public.teams t on t.id = m.team_id
        where m.user_id = s.user_id
          and m.status = 'accepted'
          and t.hackathon_id = p_hackathon_id
      )
  ) seekers_sub;

  return jsonb_build_object('teams', v_teams, 'seekers', v_seekers);
end;
$$;

-- apply_to_team (base: 00051, latest redefinition: 00053).
create or replace function public.apply_to_team(p_team_id uuid, p_message text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_hackathon_id uuid;
  v_locked boolean;
  v_leader uuid;
  v_accepted int;
  v_max int;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'not_authenticated'; end if;

  select t.hackathon_id, t.locked, t.leader_id
  into v_hackathon_id, v_locked, v_leader
  from public.teams t
  join public.team_openings o on o.team_id = t.id and o.active
  where t.id = p_team_id
  for update of t;

  if v_hackathon_id is null then raise exception 'opening_not_found'; end if;
  if v_leader = v_user then raise exception 'own_team'; end if;
  if v_locked then raise exception 'team_locked'; end if;

  if not exists (
    select 1 from public.hackathon_registrations
    where user_id = v_user and hackathon_id = v_hackathon_id
      and luma_confirmed_at is not null and terms_accepted_at is not null
  ) then
    raise exception 'not_registered';
  end if;

  if exists (
    select 1 from public.team_members m
    join public.teams t on t.id = m.team_id
    where m.user_id = v_user and m.status = 'accepted'
      and t.hackathon_id = v_hackathon_id
  ) then
    raise exception 'already_on_team';
  end if;

  select team_size_max into v_max from public.hackathons where id = v_hackathon_id;

  select count(*) into v_accepted
  from public.team_members
  where team_id = p_team_id and status in ('accepted', 'pending');
  if v_accepted >= v_max then raise exception 'team_full'; end if;

  begin
    insert into public.team_applications (team_id, hackathon_id, user_id, message)
    values (p_team_id, v_hackathon_id, v_user, nullif(trim(p_message), ''));
  exception when unique_violation then
    raise exception 'already_applied';
  end;
end;
$$;

-- respond_to_application (base: 00051, latest redefinition: 00053).
create or replace function public.respond_to_application(p_application_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_app record;
  v_locked boolean;
  v_leader uuid;
  v_accepted int;
  v_email text;
  v_max int;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'not_authenticated'; end if;

  select a.id, a.team_id, a.hackathon_id, a.user_id
  into v_app
  from public.team_applications a
  where a.id = p_application_id and a.status = 'pending'
  for update;

  if v_app.id is null then raise exception 'application_not_found'; end if;

  select locked, leader_id into v_locked, v_leader
  from public.teams where id = v_app.team_id for update;

  if v_leader is distinct from v_user then raise exception 'not_leader'; end if;

  if not p_accept then
    update public.team_applications
    set status = 'declined', decided_at = now(), decided_by = v_user
    where id = p_application_id;
    return;
  end if;

  if v_locked then raise exception 'team_locked'; end if;

  select team_size_max into v_max from public.hackathons where id = v_app.hackathon_id;

  select count(*) into v_accepted
  from public.team_members
  where team_id = v_app.team_id and status in ('accepted', 'pending');
  if v_accepted >= v_max then raise exception 'team_full'; end if;

  if exists (
    select 1 from public.team_members m
    join public.teams t on t.id = m.team_id
    where m.user_id = v_app.user_id and m.status = 'accepted'
      and t.hackathon_id = v_app.hackathon_id
  ) then
    raise exception 'already_on_team';
  end if;

  select email into v_email from public.users where id = v_app.user_id;

  -- A previously removed/declined row for this user would violate the
  -- (team_id, invited_email) uniqueness — revive it instead of inserting.
  update public.team_members
  set user_id = v_app.user_id, status = 'accepted', accepted_at = now()
  where team_id = v_app.team_id
    and lower(invited_email) = lower(v_email)
    and status <> 'accepted';
  if not found then
    insert into public.team_members
      (team_id, hackathon_id, user_id, invited_email, is_leader, status, invited_at, accepted_at)
    values
      (v_app.team_id, v_app.hackathon_id, v_app.user_id, v_email, false, 'accepted', now(), now());
  end if;

  update public.team_applications
  set status = 'accepted', decided_at = now(), decided_by = v_user
  where id = p_application_id;

  update public.team_seekers
  set active = false, updated_at = now()
  where user_id = v_app.user_id and hackathon_id = v_app.hackathon_id and active;

  update public.team_applications
  set status = 'withdrawn', decided_at = now()
  where user_id = v_app.user_id and hackathon_id = v_app.hackathon_id
    and status = 'pending' and id <> p_application_id;
end;
$$;

-- submit_team (base: 00006, latest redefinition: 00057). Already joins
-- hackathons as h for the deadline/mode check, so team_size_min piggybacks
-- on that same select instead of a separate lookup.
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
  v_min int;
  v_sub public.submissions%rowtype;
  v_missing_luma int;
  v_accepted int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select t.leader_id, t.locked, t.hackathon_id, h.submission_deadline_at, h.submission_mode, h.team_size_min
    into v_leader_id, v_locked, v_hackathon_id, v_deadline, v_mode, v_min
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

  if v_accepted < v_min then raise exception 'team_too_small'; end if;

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
