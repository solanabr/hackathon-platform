-- Removing content was immediate and permanent, including for participants
-- part-way through a course. Keep the row and hide it instead.
alter table public.hackathon_contents
  add column if not exists deleted_at timestamptz;

-- Both participant-facing paths are covered centrally: the RLS policy for the
-- gated table, and the view for the schedule everyone can read.
drop policy if exists "hackathon_contents_select_published" on public.hackathon_contents;
create policy "hackathon_contents_select_published"
  on public.hackathon_contents for select to authenticated
  using (published and deleted_at is null);

create or replace view public.public_schedule as
  select id, hackathon_id, kind, title, speaker, description, scheduled_at, location, "position"
  from public.hackathon_contents
  where deleted_at is null;

-- Regulamento 7.1: each project is scored by two judges in the triagem round.
-- Admins pick the pairs by hand, so the assignment is a row, not a rule.
create table if not exists public.submission_assignments (
  submission_id uuid not null references public.submissions(id) on delete cascade,
  judge_id      uuid not null references public.users(id) on delete cascade,
  round         text not null default 'triagem' check (round in ('triagem','final')),
  assigned_by   uuid references public.users(id) on delete set null,
  assigned_at   timestamptz not null default now(),
  primary key (submission_id, judge_id, round)
);

create index if not exists submission_assignments_judge_idx
  on public.submission_assignments(judge_id, round);

-- Same posture as submission_ratings: no policies, so only the service role
-- reaches it and every write goes through an action that gates on requireAdmin.
alter table public.submission_assignments enable row level security;

grant select, insert, update, delete on public.submission_assignments to service_role;
