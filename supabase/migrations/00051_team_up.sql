-- Team-up matchmaking (docs/superpowers/specs/2026-08-30-team-up-design.md).
-- Teams post open roles; solo hackers post availability. Applications and
-- invites both end in consensual membership: an accepted application inserts
-- an accepted member directly (the application was the hacker's consent);
-- invites reuse the existing pending flow untouched.

create table public.team_openings (
  team_id uuid primary key references public.teams(id) on delete cascade,
  hackathon_id uuid not null references public.hackathons(id) on delete cascade,
  roles text[] not null check (cardinality(roles) between 1 and 6),
  note text check (note is null or char_length(note) <= 280),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_openings_board_idx on public.team_openings (hackathon_id) where active;

create table public.team_seekers (
  id uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references public.hackathons(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  roles text[] not null check (cardinality(roles) between 1 and 6),
  note text check (note is null or char_length(note) <= 280),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hackathon_id, user_id)
);

create index team_seekers_board_idx on public.team_seekers (hackathon_id) where active;

create table public.team_applications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  hackathon_id uuid not null references public.hackathons(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message text check (message is null or char_length(message) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.users(id)
);

create unique index team_applications_pending_unique
  on public.team_applications (team_id, user_id) where status = 'pending';
create index team_applications_team_idx
  on public.team_applications (team_id) where status = 'pending';

-- 00009/00010 default privileges cover new tables; stay explicit for parity.
-- Openings are written by leader-gated server actions (service role);
-- applications only through the RPCs below — authenticated gets reads only.
grant select on public.team_openings to authenticated;
grant select, insert, update on public.team_seekers to authenticated;
grant select on public.team_applications to authenticated;
grant all on public.team_openings to service_role;
grant all on public.team_seekers to service_role;
grant all on public.team_applications to service_role;

alter table public.team_openings enable row level security;
alter table public.team_seekers enable row level security;
alter table public.team_applications enable row level security;

-- Leader reads their own opening on the team page; the board reads through
-- the RPC, so nobody else needs direct select.
create policy team_openings_leader_read on public.team_openings
  for select using (
    exists (
      select 1 from public.teams t
      where t.id = team_openings.team_id and t.leader_id = (select auth.uid())
    )
  );

create policy team_seekers_own_read on public.team_seekers
  for select using (user_id = (select auth.uid()));
create policy team_seekers_own_insert on public.team_seekers
  for insert with check (user_id = (select auth.uid()));
create policy team_seekers_own_update on public.team_seekers
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy team_applications_own_read on public.team_applications
  for select using (user_id = (select auth.uid()));

-- One round trip for the whole board; every visibility rule lives here.
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
        where m.team_id = t.id and m.status = 'accepted'
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
  where team_id = p_team_id and status = 'accepted';
  if v_accepted >= 4 then raise exception 'team_full'; end if;

  begin
    insert into public.team_applications (team_id, hackathon_id, user_id, message)
    values (p_team_id, v_hackathon_id, v_user, nullif(trim(p_message), ''));
  exception when unique_violation then
    raise exception 'already_applied';
  end;
end;
$$;

create or replace function public.withdraw_application(p_application_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_updated int;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'not_authenticated'; end if;

  update public.team_applications
  set status = 'withdrawn', decided_at = now(), decided_by = v_user
  where id = p_application_id and user_id = v_user and status = 'pending';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then raise exception 'application_not_found'; end if;
end;
$$;

-- Accept inserts the member as accepted directly: the application itself was
-- the hacker's consent, and this call is the team's.
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
  where team_id = v_app.team_id and status = 'accepted';
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

revoke execute on function public.team_up_board(uuid) from public, anon;
revoke execute on function public.apply_to_team(uuid, text) from public, anon;
revoke execute on function public.withdraw_application(uuid) from public, anon;
revoke execute on function public.respond_to_application(uuid, boolean) from public, anon;
grant execute on function public.team_up_board(uuid) to authenticated;
grant execute on function public.apply_to_team(uuid, text) to authenticated;
grant execute on function public.withdraw_application(uuid) to authenticated;
grant execute on function public.respond_to_application(uuid, boolean) to authenticated;

-- Joining via invite must clean up the same state as joining via
-- application. Extended accept_pending_membership with cleanup block
-- (base: 00045).
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

  update public.team_seekers
  set active = false, updated_at = now()
  where user_id = v_user_id and hackathon_id = v_hackathon_id and active;

  update public.team_applications
  set status = 'withdrawn', decided_at = now()
  where user_id = v_user_id and hackathon_id = v_hackathon_id
    and status = 'pending';
end;
$$;

revoke execute on function public.accept_pending_membership(uuid) from anon, public;
grant execute on function public.accept_pending_membership(uuid) to authenticated;
