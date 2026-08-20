-- Multi-edition: per-event registration, generic content, DB roles.

alter table hackathons
  add column tagline                text,
  add column status                 text not null default 'draft'
      check (status in ('draft','published','submissions_open','judging','closed')),
  add column cover_image_path       text,
  add column location_name          text,
  add column location_city          text,
  add column registration_closes_at timestamptz,
  add column finalists_announced_at timestamptz,
  add column voting_opens_at        timestamptz,
  add column voting_closes_at       timestamptz,
  add column finalists_count        integer not null default 20,
  add column prize_summary          text,
  add column rules_url              text,
  add column community_url          text,
  add column updated_at             timestamptz not null default now(),
  drop column is_active;

create trigger hackathons_touch_updated_at
  before update on hackathons
  for each row execute function touch_updated_at();

create table hackathon_registrations (
  id                uuid primary key default gen_random_uuid(),
  hackathon_id      uuid not null references hackathons(id) on delete cascade,
  user_id           uuid not null references users(id) on delete cascade,
  registered_at     timestamptz not null default now(),
  luma_confirmed_at timestamptz,
  terms_accepted_at timestamptz,
  unique (hackathon_id, user_id)
);

create index hackathon_registrations_user_idx
  on hackathon_registrations(user_id);

create table hackathon_contents (
  id               uuid primary key default gen_random_uuid(),
  hackathon_id     uuid not null references hackathons(id) on delete cascade,
  kind             text not null
      check (kind in ('aula','workshop','mentoria','material','link','evento')),
  title            text not null,
  speaker          text,
  description      text,
  youtube_id       text,
  external_url     text,
  location         text,
  scheduled_at     timestamptz,
  duration_minutes integer,
  position         integer not null default 0,
  published        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index hackathon_contents_hackathon_idx
  on hackathon_contents(hackathon_id, position);

create trigger hackathon_contents_touch_updated_at
  before update on hackathon_contents
  for each row execute function touch_updated_at();

create table platform_roles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  role         text not null check (role in ('admin','judge')),
  hackathon_id uuid references hackathons(id) on delete cascade,
  granted_by   uuid references users(id),
  granted_at   timestamptz not null default now(),
  unique (user_id, role, hackathon_id),
  constraint judge_requires_hackathon
    check (role <> 'judge' or hackathon_id is not null)
);

create index platform_roles_user_idx on platform_roles(user_id);

-- NULL hackathon_id (admin) is exempt from the composite unique above, so a
-- second grant would insert a duplicate row. Dedupe admins explicitly.
create unique index platform_roles_admin_uk
  on platform_roles(user_id, role)
  where hackathon_id is null;

alter table teams
  add column is_finalist          boolean not null default false,
  add column finalist_notified_at timestamptz;

alter table submissions
  add column pitch_deck_url        text,
  add column github_access_granted boolean not null default false;

alter table submission_ratings rename column admin_id to judge_id;

alter index submission_ratings_admin_id_idx
  rename to submission_ratings_judge_id_idx;

alter table submission_ratings
  add column round  text not null default 'triagem'
      check (round in ('triagem','final')),
  add column scores jsonb;

alter table submission_ratings drop constraint submission_ratings_pkey;
alter table submission_ratings
  add primary key (submission_id, judge_id, round);

alter table users
  drop column luma_registered_at,
  drop column age_attestation_at;

alter table hackathon_registrations enable row level security;
alter table hackathon_contents      enable row level security;
alter table platform_roles          enable row level security;

create policy hackathon_registrations_select_own on hackathon_registrations
  for select using (user_id = auth.uid());
create policy hackathon_registrations_insert_own on hackathon_registrations
  for insert with check (user_id = auth.uid());
create policy hackathon_registrations_update_own on hackathon_registrations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy hackathon_contents_select_published on hackathon_contents
  for select to authenticated using (published);

create policy platform_roles_select_own on platform_roles
  for select using (user_id = auth.uid());

grant select, insert, update on hackathon_registrations to authenticated;
grant select                 on hackathon_contents      to authenticated;
grant select                 on platform_roles          to authenticated;
grant all on hackathon_registrations, hackathon_contents, platform_roles to service_role;

-- Public schedule: the edition landing is a public page (anon client). The
-- view keeps youtube_id/external_url out of anon reach — an unlisted video is
-- only protected because its id never leaks. All rows are visible: the dates
-- are public information even before the recordings exist.
create view public_schedule as
select
  id, hackathon_id, kind, title, speaker, description,
  scheduled_at, location, position, published
from hackathon_contents;

alter view public_schedule enable row level security;

create policy public_schedule_select_anon on public_schedule
  for select to anon;
create policy public_schedule_select_auth on public_schedule
  for select to authenticated;

grant select on public_schedule to anon, authenticated;
grant all on public_schedule to service_role;

create or replace function public.submit_team(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_leader_id uuid;
  v_locked boolean;
  v_deadline timestamptz;
  v_hackathon_id uuid;
  v_sub public.submissions%rowtype;
  v_missing_luma int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select t.leader_id, t.locked, t.hackathon_id, h.submission_deadline_at
    into v_leader_id, v_locked, v_hackathon_id, v_deadline
  from public.teams t
  join public.hackathons h on h.id = t.hackathon_id
  where t.id = p_team_id;

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
$$;

revoke execute on function public.submit_team(uuid) from anon, public;
grant  execute on function public.submit_team(uuid) to authenticated;
