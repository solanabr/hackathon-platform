-- External editions: rows that live in the gallery like any edition but whose
-- pages live elsewhere. external_url set = the hub card and hero deck link
-- out, and /h/[slug] forwards to it. Everything else (dates, cover, status)
-- uses the existing machinery.
alter table public.hackathons add column if not exists external_url text;
