-- Colosseum interest form: after the registration itself (the campaign KPI,
-- which stays on hackathon_registrations), the person tells us where they
-- stand — project, team, stage — in a step they can leave half-filled and
-- come back to. Kept off the registration row so a partial save never
-- touches the funnel and completed_at is the only "done" signal.
-- Cidade/Estado is profile data, so it lands on users like whatsapp did.
alter table public.users add column if not exists location text;

create table public.campaign_interest (
  hackathon_id uuid not null references public.hackathons(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  has_project text check (has_project in ('yes', 'idea_no_team', 'no_want_team')),
  looking_for_team boolean,
  project_name text,
  one_liner text,
  stage text check (stage is null or stage in ('idea', 'prototype', 'mvp', 'users')),
  team_size int check (team_size is null or team_size between 1 and 20),
  project_url text,
  project_socials text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (hackathon_id, user_id)
);

create trigger campaign_interest_touch_updated_at
  before update on public.campaign_interest
  for each row execute function public.touch_updated_at();

alter table public.campaign_interest enable row level security;

create policy campaign_interest_select_own on public.campaign_interest
  for select using (user_id = auth.uid());
create policy campaign_interest_insert_own on public.campaign_interest
  for insert with check (user_id = auth.uid());
create policy campaign_interest_update_own on public.campaign_interest
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 00009/00010 restored the default privileges, but the grants stay explicit
-- so a fresh project without them behaves the same. No delete for anyone but
-- the service role.
revoke all on public.campaign_interest from anon;
grant select, insert, update on public.campaign_interest to authenticated;
grant all on public.campaign_interest to service_role;
