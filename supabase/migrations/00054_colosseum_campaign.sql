-- Colosseum pre-registration campaign: capture a contact channel for
-- followup (WhatsApp) and seed the edition row the campaign registers
-- people into. Status stays 'draft' — no public edition page yet, so
-- placeholder dates are fine; nothing reads them while draft.
alter table public.users add column if not exists whatsapp text;

insert into public.hackathons (
  slug, name, status, starts_at, submission_deadline_at
)
select
  'colosseum-2026',
  'Colosseum Global Hackathon 2026',
  'draft',
  now(),
  now() + interval '1 year'
where not exists (
  select 1 from public.hackathons where slug = 'colosseum-2026'
);
