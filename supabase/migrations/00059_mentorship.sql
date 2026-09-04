-- Mentors were going to be a hardcoded list and the "one mentorship per team"
-- rule was going to live in the UI. Both become rows: an organizer adds a
-- mentor without a deploy, and the platform holds each team to one mentor per
-- track. Booking itself happens on the mentor's own scheduling page — the
-- platform only gates who gets to see that link and records the choice.
--
-- booking_url is the whole point of the gate: whoever holds the link takes a
-- slot, so it leaves the database in exactly one shape — the booking a team
-- already made, and only to that team's leader. The catalog never carries it.
-- That is why both tables run RLS with no policies at all (the
-- submission_ratings posture): a row policy protects rows, not columns, and a
-- leader allowed to select a mentor row is a leader allowed to select
-- booking_url. Member-facing access goes through the two functions below.
--
-- Mentors come in two tracks and a team may claim one of each, so the limit is
-- (team, track), not (team). The track is copied onto the booking by the RPC,
-- inside the transaction that reads the mentor; the admin UI never offers
-- track as an editable field, so the copy cannot drift.
--
-- Deliberately absent: capacity, a publish flag and a booking window. The
-- mentorship is a single day and the external agenda decides who actually gets
-- a slot. `available` is the manual off switch for a mentor whose agenda
-- filled, which is a different thing from counting.

create table public.hackathon_mentors (
  id uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references public.hackathons(id) on delete cascade,
  track text not null check (track in ('tecnico', 'negocios')),
  name text not null check (char_length(name) <= 120),
  specialty text check (specialty is null or char_length(specialty) <= 160),
  -- Rendered as an <a href> to every leader, and a scoped edition organizer is
  -- a lower-trust role than a global admin.
  booking_url text not null check (booking_url ~ '^https://'),
  available boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hackathon_mentors_edition_idx
  on public.hackathon_mentors (hackathon_id, track) where deleted_at is null;

create table public.mentorship_bookings (
  id uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references public.hackathons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  mentor_id uuid not null references public.hackathon_mentors(id) on delete restrict,
  track text not null check (track in ('tecnico', 'negocios')),
  -- public.users cascades from auth.users, so a not-null reference here would
  -- make deleting any user who ever booked abort the whole transaction.
  claimed_by uuid references public.users(id) on delete set null,
  claimed_at timestamptz not null default now(),
  released_at timestamptz,
  released_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Asserts the direction that matters: no releaser without a release. The
  -- inverse would permit a "released by X but not released" row, which the
  -- partial index below still counts as active.
  check (released_by is null or released_at is not null)
);

-- The whole product rule, in one index: a team holds at most one live claim
-- per track, and a released claim frees the track again.
create unique index mentorship_bookings_one_per_track
  on public.mentorship_bookings (team_id, track) where released_at is null;

create index mentorship_bookings_mentor_idx
  on public.mentorship_bookings (mentor_id) where released_at is null;

create index mentorship_bookings_edition_idx
  on public.mentorship_bookings (hackathon_id, claimed_at desc);

create trigger hackathon_mentors_touch_updated_at
  before update on public.hackathon_mentors
  for each row execute function public.touch_updated_at();

create trigger mentorship_bookings_touch_updated_at
  before update on public.mentorship_bookings
  for each row execute function public.touch_updated_at();

-- 00009's default privileges hand every new table select to anon and full DML
-- to authenticated, so the grant that matters here is a revoke. Granting select
-- to authenticated would be dead code anyway: RLS with no policies returns zero
-- rows to them regardless, and it would tell the next reader a read path exists.
revoke all on public.hackathon_mentors from anon, authenticated;
revoke all on public.mentorship_bookings from anon, authenticated;
grant all on public.hackathon_mentors to service_role;
grant all on public.mentorship_bookings to service_role;

alter table public.hackathon_mentors enable row level security;
alter table public.mentorship_bookings enable row level security;

-- One round trip for the whole screen; every visibility rule lives here.
-- Tolerant where team_up_board raises: unwrap() turns an exception into a 500,
-- and "you have no team" is normal flow for this page, not an error.
create or replace function public.mentorship_board(p_hackathon_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_team_id uuid;
  v_is_leader boolean := false;
  v_mentors jsonb := '[]'::jsonb;
  v_bookings jsonb := '[]'::jsonb;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'not_authenticated'; end if;

  -- The page checks these too, but the function is callable straight over
  -- PostgREST, where nothing checked anything.
  if not exists (
    select 1 from public.hackathons h
    where h.id = p_hackathon_id and h.status <> 'draft'
  ) then
    raise exception 'edition_not_found';
  end if;

  if not exists (
    select 1 from public.hackathon_registrations
    where user_id = v_user and hackathon_id = p_hackathon_id
  ) then
    raise exception 'not_registered';
  end if;

  select t.id, t.leader_id = v_user
  into v_team_id, v_is_leader
  from public.teams t
  join public.team_members m
    on m.team_id = t.id and m.user_id = v_user and m.status = 'accepted'
  where t.hackathon_id = p_hackathon_id;

  if v_team_id is null then
    return jsonb_build_object(
      'has_team', false, 'is_leader', false,
      'mentors', '[]'::jsonb, 'bookings', '[]'::jsonb
    );
  end if;

  -- No filter on the mentor beyond the id: a mentor a team already chose stays
  -- visible to that team whatever the admin does to the catalog afterwards.
  -- booking_url rides along only for the leader.
  select coalesce(jsonb_agg(row order by row->>'mentor_name'), '[]'::jsonb)
  into v_bookings
  from (
    select jsonb_build_object(
      'id', b.id,
      'track', b.track,
      'mentor_id', m.id,
      'mentor_name', m.name,
      'mentor_specialty', m.specialty,
      'booking_url', case when v_is_leader then m.booking_url else null end,
      'claimed_at', b.claimed_at,
      'claimed_by_name', u.full_name
    ) as row
    from public.mentorship_bookings b
    join public.hackathon_mentors m on m.id = b.mentor_id
    left join public.users u on u.id = b.claimed_by
    where b.team_id = v_team_id and b.released_at is null
  ) booked;

  -- Only the leader chooses, so only the leader receives the catalog — and the
  -- catalog never carries booking_url, or the link would be in the page payload
  -- before anyone confirmed anything.
  if v_is_leader then
    select coalesce(jsonb_agg(row order by row->>'name'), '[]'::jsonb)
    into v_mentors
    from (
      select jsonb_build_object(
        'id', m.id,
        'track', m.track,
        'name', m.name,
        'specialty', m.specialty
      ) as row
      from public.hackathon_mentors m
      where m.hackathon_id = p_hackathon_id
        and m.deleted_at is null
        and m.available
    ) catalog;
  end if;

  return jsonb_build_object(
    'has_team', true,
    'is_leader', v_is_leader,
    'mentors', v_mentors,
    'bookings', v_bookings
  );
end;
$$;

create or replace function public.book_mentorship(p_mentor_id uuid)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_mentor record;
  v_team_id uuid;
  v_leader uuid;
  v_id uuid;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'not_authenticated'; end if;

  select m.id, m.hackathon_id, m.track
  into v_mentor
  from public.hackathon_mentors m
  join public.hackathons h on h.id = m.hackathon_id and h.status <> 'draft'
  where m.id = p_mentor_id
    and m.deleted_at is null
    and m.available;

  if v_mentor.id is null then raise exception 'mentor_not_found'; end if;

  -- The team is resolved from the mentor's edition, never from the caller: a
  -- leader in two editions must not spend edition A's slot on edition B. The
  -- row lock serialises a double click; the partial unique index is the real
  -- backstop.
  select t.id, t.leader_id
  into v_team_id, v_leader
  from public.teams t
  join public.team_members m
    on m.team_id = t.id and m.user_id = v_user and m.status = 'accepted'
  where t.hackathon_id = v_mentor.hackathon_id
  for update of t;

  if v_team_id is null then raise exception 'no_team'; end if;
  if v_leader <> v_user then raise exception 'not_leader'; end if;

  begin
    insert into public.mentorship_bookings
      (hackathon_id, team_id, mentor_id, track, claimed_by)
    values (v_mentor.hackathon_id, v_team_id, v_mentor.id, v_mentor.track, v_user)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'already_booked';
  end;

  return v_id;
end;
$$;

revoke execute on function public.mentorship_board(uuid) from public, anon;
revoke execute on function public.book_mentorship(uuid) from public, anon;
grant execute on function public.mentorship_board(uuid) to authenticated;
grant execute on function public.book_mentorship(uuid) to authenticated;

-- Seeded here so the admin screen is not on the critical path the night before
-- the mentorship day: the feature works even if nobody opens /admin.
--
-- Marcelo Barella (técnico, AI e programação) is missing on purpose — his
-- booking link did not exist when this was written, and a mentor without an
-- agenda cannot be chosen. Add him from /admin/h/[slug]/mentorship the moment
-- the link arrives.
insert into public.hackathon_mentors (hackathon_id, track, name, specialty, booking_url)
select h.id, m.track, m.name, m.specialty, m.booking_url
from public.hackathons h
cross join (values
  ('tecnico',  'Ronaldo Pereira',   'Blockchain e Solana',
   'https://calendar.app.google/cXiWp61ByptQ5Lwg8'),
  ('tecnico',  'Douglas Alexandre', 'Blockchain e Solana',
   'https://cal.com/douglas-alexandre-nsd/mentorias-hackathon-da-solana'),
  ('negocios', 'Matheus Draau',     'Produto, negócios e pitch',
   'https://calendar.app.google/xG5SfJz8nw7KTDqT9'),
  ('negocios', 'Bernardo Nery',     'Produto, negócios e pitch',
   'https://calendar.app.google/2ytJGw4GjaahBR4i9'),
  ('negocios', 'Lucas Galvão',      'Negócios e jurídico',
   'https://calendar.app.google/nLeb4u4bAMdLKXZXA')
) as m(track, name, specialty, booking_url)
where h.slug = 'solana-cursor-passo-fundo-2026'
  and not exists (
    select 1 from public.hackathon_mentors x where x.hackathon_id = h.id
  );
