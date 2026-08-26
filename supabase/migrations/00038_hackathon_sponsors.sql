-- Realização and Apoiadores were a hardcoded array plus a Record keyed by
-- edition slug in the page file, so a new edition could not add a logo
-- without a deploy. Sponsors become rows with an uploaded image.
--
-- image_path takes either a storage path in the sponsor-logos bucket or a
-- '/'-prefixed public path, the same convention hackathons.cover_image_path
-- already uses — that lets the seed below point at the logos already shipped
-- in /public so this migration changes nothing visually.

create table if not exists public.hackathon_sponsors (
  id uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references public.hackathons(id) on delete cascade,
  tier text not null check (tier in ('realizacao', 'apoiador')),
  name text,
  image_path text not null,
  url text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists hackathon_sponsors_edition_idx
  on public.hackathon_sponsors (hackathon_id, tier, position);

grant select on public.hackathon_sponsors to anon, authenticated;
grant all on public.hackathon_sponsors to service_role;

alter table public.hackathon_sponsors enable row level security;

-- Draft editions stay private, the lesson 00037 had to re-learn on sections.
-- Writes go through admin server actions with the service role.
drop policy if exists hackathon_sponsors_public_read on public.hackathon_sponsors;
create policy hackathon_sponsors_public_read on public.hackathon_sponsors
  for select using (
    exists (
      select 1 from public.hackathons h
      where h.id = hackathon_id and h.status <> 'draft'
    )
  );

insert into storage.buckets (id, name, public)
values ('sponsor-logos', 'sponsor-logos', true)
on conflict (id) do nothing;

-- No SVG: the bucket is world-readable and a hostile SVG carries script.
update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'sponsor-logos';

drop policy if exists "sponsor_logos_public_read" on storage.objects;
create policy "sponsor_logos_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'sponsor-logos');

-- Seed the live edition with the logos the page hardcoded until now.
insert into public.hackathon_sponsors (hackathon_id, tier, name, image_path, position)
select h.id, s.tier, s.name, s.image_path, s.position
from public.hackathons h
cross join (values
  ('realizacao', 'Solana',              '/brand/events/solana-light.png',              0),
  ('realizacao', 'Cursor',              '/brand/events/cursor-light.png',              1),
  ('realizacao', 'Superteam Brasil',    '/brand/stbr/logo/horizontal-offwhite.svg',    2),
  ('apoiador',   'UPF',                 '/brand/events/upf-light.png',                 0),
  ('apoiador',   'UPF Parque',          '/brand/events/upf-parque-light.png',          1),
  ('apoiador',   'Passo Fundo Valley',  '/brand/events/passo-fundo-valley-light.png',  2),
  ('apoiador',   'Apollo',              '/brand/events/apollo-light.png',              3),
  ('apoiador',   'Vértice',             '/brand/events/vertice-light.png',             4)
) as s(tier, name, image_path, position)
where h.slug = 'solana-cursor-passo-fundo-2026'
  and not exists (
    select 1 from public.hackathon_sponsors x where x.hackathon_id = h.id
  );
