-- Invites become consensual. addMemberByEmail now inserts existing accounts as
-- pending too, so joining a team is always the member's own act:
--
-- 1. accept_pending_membership / decline_pending_membership give the invited
--    person a real accept path (the "Entrar no time" button previously led
--    nowhere). Accept re-runs the checks accept_team_invite makes — lock,
--    capacity, one-team-per-edition — plus the registration requirement, keyed
--    on the caller's own pending row instead of the retired invite token.
-- 2. handle_new_user's auto-accept was limit-1 across ALL editions: someone
--    invited in two editions had one invite accepted and the other stuck
--    pending forever. Now it accepts the oldest eligible invite PER edition,
--    still skipping full or locked teams (those stay pending for the manual
--    accept path above, instead of consuming the one linked slot).

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

  select count(*) into v_accepted
  from public.team_members
  where team_id = p_team_id and status = 'accepted';

  if v_accepted >= 4 then raise exception 'team_full'; end if;

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
end;
$$;

create or replace function public.decline_pending_membership(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  delete from public.team_members
  where team_id = p_team_id and user_id = v_user_id and status = 'pending';

  if not found then raise exception 'invite_not_found'; end if;
end;
$$;

revoke execute on function public.accept_pending_membership(uuid) from anon, public;
revoke execute on function public.decline_pending_membership(uuid) from anon, public;
grant execute on function public.accept_pending_membership(uuid) to authenticated;
grant execute on function public.decline_pending_membership(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_login text;
begin
  v_login := nullif(new.raw_user_meta_data->>'user_name', '');

  insert into public.users (id, email, full_name, avatar_url, github_url)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    case when v_login is null then null else 'https://github.com/' || v_login end
  )
  on conflict (id) do nothing;

  update public.team_members
  set user_id = new.id
  where user_id is null
    and lower(invited_email) = lower(new.email);

  -- Oldest eligible invite per edition. Runs inside the auth signup
  -- transaction, so an ineligible invite is left pending rather than raised.
  update public.team_members
  set status = 'accepted', accepted_at = now()
  where id in (
    select distinct on (t.hackathon_id) tm.id
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = new.id
      and tm.status = 'pending'
      and t.locked = false
      and (
        select count(*) from public.team_members full_check
        where full_check.team_id = tm.team_id and full_check.status = 'accepted'
      ) < 4
      and not exists (
        select 1 from public.team_members mine
        join public.teams mt on mt.id = mine.team_id
        where mine.user_id = new.id
          and mine.status = 'accepted'
          and mt.hackathon_id = t.hackathon_id
      )
    order by t.hackathon_id, tm.invited_at asc
  );

  return new;
end;
$$;
