-- The edition LP hardcoded its story (phases, schedule placement, prize
-- band) in JSX, so every future hackathon would inherit this edition's page.
-- Sections make the page composable per edition: an ordered list of blocks,
-- each with a kind-specific renderer. Markdown is the free-form kind; the
-- structured kinds keep the current styled rendering.

create table if not exists public.hackathon_sections (
  id uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references public.hackathons(id) on delete cascade,
  position integer not null default 0,
  kind text not null check (kind in ('markdown', 'phases', 'schedule', 'deliverables', 'prizes')),
  title text,
  subtitle text,
  body_md text,
  config jsonb not null default '{}'::jsonb,
  visible boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hackathon_sections_hackathon_idx
  on public.hackathon_sections (hackathon_id, position);

-- The 00009/00010 default privileges cover new tables, but stay explicit for
-- parity with the rest of the schema.
grant select on public.hackathon_sections to anon, authenticated;
grant all on public.hackathon_sections to service_role;

alter table public.hackathon_sections enable row level security;

-- Public read of live blocks only; the page itself 404s draft editions.
-- All writes go through admin server actions with the service role.
create policy hackathon_sections_public_read on public.hackathon_sections
  for select using (visible = true and deleted_at is null);

-- Rich previews for the Conteúdos archive. Videos derive their thumbnail
-- from youtube_id; material/link rows can carry an explicit image.
alter table public.hackathon_contents
  add column if not exists thumbnail_url text;

-- Seed the live edition with the sections its page renders today, so the
-- rollout is invisible to participants.
insert into public.hackathon_sections (hackathon_id, position, kind, title, subtitle, config)
select
  h.id,
  1,
  'phases',
  'Como o hackathon acontece',
  'Duas fases. A primeira online, a segunda presencial em Passo Fundo, RS.',
  '{}'::jsonb
from public.hackathons h
where h.slug = 'solana-cursor-passo-fundo-2026'
  and not exists (
    select 1 from public.hackathon_sections s
    where s.hackathon_id = h.id and s.kind = 'phases'
  );

insert into public.hackathon_sections (hackathon_id, position, kind, title, subtitle, config)
select
  h.id,
  2,
  'schedule',
  'Programação da Fase 1',
  'As gravações ficam disponíveis na plataforma depois de cada encontro.',
  '{}'::jsonb
from public.hackathons h
where h.slug = 'solana-cursor-passo-fundo-2026'
  and not exists (
    select 1 from public.hackathon_sections s
    where s.hackathon_id = h.id and s.kind = 'schedule'
  );

insert into public.hackathon_sections (hackathon_id, position, kind, title, subtitle, config)
select
  h.id,
  3,
  'deliverables',
  'O que seu time entrega',
  null,
  '{"items": [
    {"value": "10", "unit": "slides", "label": "Pitch deck", "note": "Quem passar do limite é desclassificado."},
    {"value": "3", "unit": "minutos", "label": "Vídeo demo", "note": "Mostre o produto funcionando."},
    {"value": "1", "unit": "repositório", "label": "Código no GitHub", "note": "Pode ser privado, com acesso para os jurados."}
  ]}'::jsonb
from public.hackathons h
where h.slug = 'solana-cursor-passo-fundo-2026'
  and not exists (
    select 1 from public.hackathon_sections s
    where s.hackathon_id = h.id and s.kind = 'deliverables'
  );

insert into public.hackathon_sections (hackathon_id, position, kind, title, subtitle, config)
select
  h.id,
  4,
  'prizes',
  'Premiação',
  null,
  '{}'::jsonb
from public.hackathons h
where h.slug = 'solana-cursor-passo-fundo-2026'
  and not exists (
    select 1 from public.hackathon_sections s
    where s.hackathon_id = h.id and s.kind = 'prizes'
  );
