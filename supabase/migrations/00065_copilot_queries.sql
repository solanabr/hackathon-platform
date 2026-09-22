-- One row per idea search on /guias/copilot. Only the fact that a user
-- searched is kept, never the text: the per-user daily cap reads it and it
-- doubles as usage telemetry. Service role only, like submission_ratings.
create table public.copilot_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('idea')),
  created_at timestamptz not null default now()
);

create index copilot_queries_user_recent_idx
  on public.copilot_queries (user_id, created_at desc);

alter table public.copilot_queries enable row level security;

revoke all on public.copilot_queries from anon, authenticated;
grant all on public.copilot_queries to service_role;
