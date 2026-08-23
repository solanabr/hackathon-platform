-- Regulamento sections 2 and 3 split Fase 1 in two: minicursos from 31/08 to
-- 04/09, then development and submission from 05/09 (with mentoring that day)
-- to the deadline on 09/09. The timeline showed one block running to the
-- registration close, which is a different date and a different thing.
alter table public.hackathons
  add column if not exists development_starts_at timestamptz;

comment on column public.hackathons.development_starts_at is
  'Start of the build phase. Splits Fase 1 into capacitação and desenvolvimento.';

update public.hackathons
set development_starts_at = '2026-09-05T00:00:00-03:00'
where slug = 'solana-cursor-passo-fundo-2026';
