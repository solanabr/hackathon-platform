-- Second-review hardening for team-up (findings C1, I3).
--
-- C1: 00052 gated team_up_board / team_seekers RLS / apply_to_team on a
-- hackathon_registrations row EXISTING, but "registered" for every other
-- flow (src/lib/registration.ts) means luma_confirmed_at AND
-- terms_accepted_at are both set. RLS lets any authenticated user insert a
-- bare registrations row for themselves, so that gap let a half-registered
-- account both post a seeker card and read every seeker's contact info off
-- the board. Add the same two null-checks everywhere "registered" is
-- checked for team-up.
--
-- I3: team-invite.ts (manual add-member) counts accepted+pending toward the
-- 4-cap, but apply_to_team, respond_to_application and the board's opening
-- filter counted accepted only. A leader with pending invites could accept
-- applications past what the invitees can then fit into, stranding them on
-- team_full forever. Count accepted+pending everywhere the cap is enforced;
-- the accepted_count returned to the board stays accepted-only (it's the
-- membership badge, "3/4"), only the <4 filter and the team_full checks
-- change.

drop policy team_seekers_own_insert on public.team_seekers;
drop policy team_seekers_own_update on public.team_seekers;

create policy team_seekers_own_insert on public.team_seekers
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.hackathon_registrations r
      where r.user_id = (select auth.uid()) and r.hackathon_id = team_seekers.hackathon_id
        and r.luma_confirmed_at is not null and r.terms_accepted_at is not null
    )
  );

create policy team_seekers_own_update on public.team_seekers
  for update using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.hackathon_registrations r
      where r.user_id = (select auth.uid()) and r.hackathon_id = team_seekers.hackathon_id
        and r.luma_confirmed_at is not null and r.terms_accepted_at is not null
    )
  );

-- Board (base: 00052): caller gate requires a complete registration, and
-- the opening filter now counts accepted+pending toward the 4-cap.
create or replace function public.team_up_board(p_hackathon_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_teams jsonb;
  v_seekers jsonb;
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
      ) < 4
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

-- apply_to_team (base: 00051): registration gate requires a complete
-- registration, and the cap check counts accepted+pending.
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

  select count(*) into v_accepted
  from public.team_members
  where team_id = p_team_id and status in ('accepted', 'pending');
  if v_accepted >= 4 then raise exception 'team_full'; end if;

  begin
    insert into public.team_applications (team_id, hackathon_id, user_id, message)
    values (p_team_id, v_hackathon_id, v_user, nullif(trim(p_message), ''));
  exception when unique_violation then
    raise exception 'already_applied';
  end;
end;
$$;

-- respond_to_application (base: 00051): only the capacity check changes,
-- from accepted-only to accepted+pending. Full body kept byte-identical
-- otherwise.
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

  select count(*) into v_accepted
  from public.team_members
  where team_id = v_app.team_id and status in ('accepted', 'pending');
  if v_accepted >= 4 then raise exception 'team_full'; end if;

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
