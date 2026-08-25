# Round 2 — Data-driven models: deliverables, sections, archive, prizes, generalization

5 agents, each designing one data-driven system, seeded by Round 1. Audit base: feat/home-lp-hub.

## Deliverables (agent 1)
- Hardcoded in 5 places: RPC `00029:36-43`, dashboard `REQUIRED` (`dashboard/page.tsx:50-57`), editor `FormState`/`allRequiredFilled`, `api/submit/route.ts` error map, plus a static marketing block.
- `submit_team` reads `hackathons` but not deliverables — a new edition can't validate its own fields without editing the RPC. 3 generations of the same RPC body exist (00013/00016/00029).
- **Design**: `hackathons.deliverables jsonb` `[{key,label,type,required,hint?,placeholder?,max_length?}]`, types `text|url|textarea|checkbox|upload`; `submissions.data jsonb` for non-column keys. RPC loops required deliverables raising `missing_required_field:<key>`; route maps the key to the field label. Frontend: `REQUIRED` = `deliverables.filter(d=>d.required)`; dashboard + editor take the array as a prop.
- Stale copy caught: "incluindo a imagem do projeto" (image is optional since 00029). Dead columns: `pitch_url`, `demo_video_url` in the type.

## Sections composition (agent 2)
- The in-flight 00036 has a **type-set collision**: `kind = markdown|phases|schedule|deliverables|prizes` vs `SectionKind = markdown|phases|schedule|prizes` (missing `deliverables`) + a `case "deliverables"` in sections.tsx — will not typecheck. Adopt one contract now (migration uncommitted).
- Only 4 of 8 JSX blocks are wired into 00036; **finalists and partners/supporters still hardcoded** (`page.tsx:383-410, 412-533`; SUPPORTERS keyed by slug).
- Dangling admin link `page.tsx:365-374` → `/admin/h/[slug]/sections` (route doesn't exist).
- Missing `unique(hackathon_id, position)`; RLS `public_read` leaks draft-edition sections (needs the 00035/security_barrier precedent); seeded subtitle hardcodes "Passo Fundo, RS".
- `react-markdown ^10.1.0` ALREADY in deps (styled `.prose-lp`).
- **Design**: `hackathon_sections(id, hackathon_id FK, position, type check(hero|timeline|schedule|prizes|content|partners|finalists|custom), heading, body_md, config jsonb, visible, deleted_at, timestamps)`; `RENDERERS: Record<SectionType, (s, ctx) => ReactNode>`; page maps sorted visible sections; backfill 8 rows for the seeded edition.

## Content archive (agent 3)
- **The `link` kind is dead**: `external_url` only written by file upload; no admin input for a bare URL; publish guard requires video-or-file, so `evento` with no media can never be published.
- No thumbnails (grep: zero); list is a single-column `<ul>`; no filter/search.
- Availability conflates 3 states (live-now / upcoming / watchable / media-only).
- **Design**: add `thumbnail_url` + `media_type check('none','file','link')`; YouTube thumb derived server-side; links fall back to DuckDuckGo favicon at render; kind remap `workshop→aula, mentoria→live, material→documento` (exact ALTER given); "ao vivo" needs no new column (derive from kind+scheduled_at+duration).
- Archive components: `content-archive.tsx` (kind pills + search + card grid), `content-card.tsx`, `lib/content-thumbnail.ts`.

## Prizes + partners (agent 4)
- **Live bug**: `prizePoolLabel` regex-sums every "US$ N" → renders "US$ 3.200" on the live edition (pool is 3.000, regulamento 00028:15).
- **The tiered prizes card never tiers**: split on " - " but no seeded summary contains it → every card renders "Prêmio" + full body.
- `metadata->prizes` already models the structured data (`00001:79-86`, six rows summing 3.000) but is never read; `bh-onchain-2026` has no `prize_summary` so shows NO prizes card despite having structured data.
- Admin saves `prize_summary` with zero validation (typo silently breaks card + total).
- PARTNERS renders on every edition (not slug-keyed); SUPPORTERS is slug-keyed (code deploy to change).
- **Design**: `hackathons.prizes jsonb [{place, amount_usd?, note?, currency?}]` (place as string for note-only rows); pool = sum of amount_usd (drop regex); `hackathon_partners(id, hackathon_id, name, logo_path, role check(parceiro|apoiador), url, position)`; backfills from metadata->prizes and the hardcoded lists; admin editors with validation.

## Generalization map (agent 5)
- Team-size MIN also hardcoded in the RPC (`00029:49` `v_accepted < 2`) + 4 UI sites.
- Priority order: (1) phases timeline data-driven, (2) registration config (method luma/native/external + copy), (3) deliverables + team-size config, (4) edition page composition (partners, deck, deliverables, ticker), (5) nits.
- **`hackathons.metadata` jsonb is the ready-made escape hatch**: exists in schema (00001:58), never read anywhere in src — makes registration config + composition additive migrations instead of schema redesigns.

## Where round 3 focuses
Consolidate into a migration sequence plan (00036-00041), and design the four remaining data systems: phases timeline, registration+team-size config, the admin edition-composition surfaces, and the frontend rendering architecture that consumes all of it.
