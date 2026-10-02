-- The founder's Colosseum submission, kept on the startup row so the team can
-- follow it and send feedback. Every column is optional: the row is updated as
-- the submission takes shape, and the existing own-row policies cover it.
alter table public.startups
  add column if not exists submission_status text
    check (submission_status is null or submission_status in ('not_started', 'draft', 'submitted')),
  add column if not exists colosseum_url text,
  add column if not exists description text,
  add column if not exists github_url text,
  add column if not exists pitch_video_url text,
  add column if not exists demo_video_url text,
  add column if not exists tracks text[] not null default '{}'
    check (tracks <@ array[
      'solana', 'tempo', 'hyperliquid', 'zcash', 'ethereum', 'base', 'arbitrum', 'robinhood',
      'university', 'public_goods'
    ]::text[]),
  add column if not exists prior_work text,
  add column if not exists traction text,
  add column if not exists team_size int check (team_size is null or team_size between 1 and 20),
  add column if not exists team_registered boolean,
  add column if not exists submission_notes text,
  add column if not exists submission_updated_at timestamptz;
