# Round 4 — Create flow, renderers, context builder, archive deep-spec, validation

5 agents, seeded by Round 3. Audit base: feat/home-lp-hub (live repo carries the uncommitted in-flight 00036 + sections.tsx; /tmp/audit-lp snapshot predates it).

## Create-edition flow (agent 1)
- **No create route exists**: `from("hackathons").insert` has zero matches; the admin empty state has no CTA. The first step of "compose an edition" is unbuildable.
- Design: `createEdition` (requireAdmin, slug + name + starts_at + submission_deadline_at, status defaults draft) redirecting to `/admin/h/{slug}`; **defaults materialized from CODE** (`lib/default-edition.ts`: sections template, deliverables, registration_config luma/min2/max4) — a DB seed won't cover new rows (00036 only seeds the existing slug). Reuse SLUG_RE + 23505 handling. `/admin/novo` page + "Nova edição" nav + empty-state CTA.
- SectionKind type-set collision (missing `deliverables`) blocks this flow.

## Section renderers (agent 2)
- Full per-type spec table (hero/timeline/schedule/prizes/content/partners/finalists/custom): props from ctx/config/body_md, LP-cream markup, data source, empty state.
- **Live code won't typecheck** (SectionKind union missing `deliverables` while `case "deliverables"` exists); in-flight uses `default: return null` (runtime blank) vs the exhaustive Record contract.
- Hero stays page chrome (needs viewer/auth state absent from ctx; sole h1).
- Markdown: react-markdown ^10.1.0 safe by default (no rehype-raw); MUST remap h1→h2/h2→h3 to protect the outline; wrap links target=_blank rel=noopener.
- Facts band (Quando/Onde/Prêmios) has no seed type — decide hero-chrome vs new type.

## Context builder (agent 3)
- **buildPhases is duplicated with drift**: public page and dashboard copies already diverge textually ("para nivelar todo mundo"/"até o prazo" only in one; selecao detail differs).
- **Two divergent milestone chains**: public countdownTarget = registration→submission→pitch (SKIPS finalists); dashboard hero = submission→finalists→pitch. During judging, an anon visitor sees "Pitch Day em" while a teammate sees "Finalistas saem em".
- **Wasted auth queries**: public authed ≈9, dashboard ≈17 (resolveAuthenticatedUserState not React.cache'd, runs liveDashboardPath = 3 queries, and the Header re-calls it via resolveRoleState in both layouts → duplicate getUser+profile).
- **Graceful degradation gap**: createServiceRoleClient THROWS when the env key is absent — the finalists read can crash the page (migration-not-applied scenario). Wrap in try/catch.
- Spec: `getEditionContext(slug)` two layers (cache()'d public base + viewer-gated reads keyed by userId string); `nextMilestone(h, now, {includeRegistration, submitted})` unified; one `now` per render; after: public ≈5, dashboard ≈14.

## Archive deep-spec (agent 4)
- **`external_url` conflates uploaded files and external links — `media_type` is load-bearing**: the detail page renders any external_url as "Abrir material"; documento vs link is indistinguishable today.
- **Evento can't publish without media** (guard rejects bare evento forever).
- **Kind remap touches 5 coupled places** (DB constraint, admin validation, CONTENT_KINDS, ContentKind type, KIND_LABEL duplicated in 2 files) — atomic deploy or the admin breaks.
- **`next/image` will THROW on YT/DuckDuckGo thumbnails**: remotePatterns allow only supabase/google/github — add patterns or render favicons as plain `<img>`.
- duration_minutes absent from public_schedule; live-now logic absent; thumbnail_url is arbitrary-https admin input (sanitizeUrl, not a host allowlist).

## Validation layer (agent 5)
- **Zero structural validation on prizes write** (sanitizeText only; renderers split/parse silently; a lowercase `us$` or changed separator breaks the card + total silently).
- **No contracts exist for the new sources anywhere** (no zod; the design lives only in the orchestration thread).
- **Backfill regex can't parse the shipped prize_summary** (items with no place/amount; unattached amounts) — migrate positionally, null amount when no US$ match, then assert the validator.
- **Sanitizers silently null malformed input** (sanitizeUrl returns null on failure; updateEdition saves null with "Salvo.") — structural violations must ERROR, not sanitize-to-null.
- `hackathons.metadata` overlaps the new sources (seeds prizes + team_size) and is never read — migrate or drop.
- Design: `lib/schemas.ts` hand-rolled validators (no zod dep), plugged into every admin write BEFORE the DB call, pt-BR per-field errors, mirroring the content actions' fail-on-invalid pattern.

## Where round 5 focuses
Ground-truth verification of the in-flight work (the live repo vs the snapshot), deploy + migration readiness (the unapplied 00032-00035 + the 00036-00041 plan + the deliverability risk), query-performance verification, the deliverables-driven editor + submissions data flow, and the test matrix for the whole refactor.
