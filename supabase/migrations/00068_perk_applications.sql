-- Partner perks (/perks/helius): builders apply on the site and the
-- Superteam Brasil team vets each request by hand before sending the
-- partner's activation code. One application per person per perk, editable
-- until it is reviewed. Name and WhatsApp live on users, as in the startup
-- form; e-mail comes from the login.
create table public.perk_applications (
  id uuid primary key default gen_random_uuid(),
  perk text not null check (perk in ('helius')),
  user_id uuid not null references public.users(id) on delete cascade,
  project_name text not null,
  project_summary text not null,
  usage_plan text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (perk, user_id)
);

create trigger perk_applications_touch_updated_at
  before update on public.perk_applications
  for each row execute function public.touch_updated_at();

alter table public.perk_applications enable row level security;

create policy perk_applications_select_own on public.perk_applications
  for select using (user_id = auth.uid());
create policy perk_applications_insert_own on public.perk_applications
  for insert with check (user_id = auth.uid());
create policy perk_applications_update_own on public.perk_applications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The default privileges from 00009/00010 also hand authenticated DELETE and
-- TRUNCATE, and TRUNCATE ignores RLS: revoke everything, then grant back only
-- what the form needs. No delete for anyone but the service role.
revoke all on public.perk_applications from anon, authenticated;
grant select, insert, update on public.perk_applications to authenticated;
grant all on public.perk_applications to service_role;
