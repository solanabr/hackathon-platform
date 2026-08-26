-- 00036's public-read policy checked only visible/deleted, so the sections of
-- a draft edition were world-readable via raw PostgREST before announcement —
-- the same draft-leak shape 00032/00035 closed on the public views. Gate on
-- the edition's status like everything else public.

drop policy if exists hackathon_sections_public_read on public.hackathon_sections;

create policy hackathon_sections_public_read on public.hackathon_sections
  for select using (
    visible = true
    and deleted_at is null
    and exists (
      select 1 from public.hackathons h
      where h.id = hackathon_id and h.status <> 'draft'
    )
  );
