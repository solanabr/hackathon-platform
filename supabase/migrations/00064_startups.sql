-- Founder onboarding (/startup-registration): one startup per founder
-- account. A startup outlives any single edition, so the row is keyed on the
-- user, not the hackathon; hackathon_id only records which campaign brought
-- the founder in (set once on first insert, from getHackathonBySlug(COLOSSEUM_SLUG)
-- in the server action) and is not part of the key.
-- Like campaign_interest, the form saves half-filled and completed_at is the
-- only "done" signal. Cargo and tipo de trabalho describe the person, so
-- they land on users like location did.
alter table public.users add column if not exists job_title text;
alter table public.users add column if not exists work_type text
  check (work_type is null or work_type in ('engineer', 'creator', 'business', 'investor', 'policy_law_tax', 'not_provided'));

create table public.startups (
  user_id uuid primary key references public.users(id) on delete cascade,
  hackathon_id uuid references public.hackathons(id) on delete set null,
  name text,
  one_liner text,
  vertical text check (vertical is null or vertical in (
    'stablecoins', 'payments', 'rwa', 'institutional', 'ai', 'gaming', 'infra', 'dev_tooling',
    'depin', 'wallets', 'consumer', 'defi', 'desci', 'daos', 'socialfi', 'security', 'creators',
    'quantum', 'biotech', 'robotics', 'climate', 'space', 'hardware', 'fintech', 'crypto', 'other'
  )),
  stage text check (stage is null or stage in (
    'early', 'bootstrapped', 'raising_preseed', 'preseed_closed', 'raising_seed', 'seed_closed',
    'raising_a', 'a_closed', 'exited', 'wound_down'
  )),
  website text,
  pitch_deck_url text,
  twitter text,
  logo_url text,
  hiring text check (hiring is null or hiring in ('yes', 'no', 'not_sure')),
  target_customers text check (target_customers is null or target_customers in ('b2c', 'b2b', 'institutions', 'government', 'other')),
  token_launch text check (token_launch is null or token_launch in ('live', 'future', 'no', 'not_sure')),
  tech_team text check (tech_team is null or tech_team in ('in_house', 'out_house', 'mixed_with_cto', 'mixed_without_cto', 'none')),
  heard_from text,
  help_needed text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger startups_touch_updated_at
  before update on public.startups
  for each row execute function public.touch_updated_at();

alter table public.startups enable row level security;

create policy startups_select_own on public.startups
  for select using (user_id = auth.uid());
create policy startups_insert_own on public.startups
  for insert with check (user_id = auth.uid());
create policy startups_update_own on public.startups
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 00009/00010 restored the default privileges, but the grants stay explicit
-- so a fresh project without them behaves the same. No delete for anyone but
-- the service role.
revoke all on public.startups from anon;
grant select, insert, update on public.startups to authenticated;
grant all on public.startups to service_role;
