# Round 9 — Milestone sequencing, E2E strategy, content plan, product sense, known-unknowns

5 agents.

## Milestone sequencing (agent 1)
- **M1 — Composition base (land now, M effort)**: rewrite 00036 (unique deferrable, draft-gated RLS, touch trigger, delete thumbnail_url block, subtitle from location_city) + SectionKind fix + page fixes + roles.test. 78 tests green, pixel-identical.
- **M2 — Deliverables submission path (09/09 critical, L effort)**: apply order 00037 → 00041 → **00038** (the round-6 ordering fix — 00038 reads registration_config). 00037: deliverables + submissions.data + **backfill from current columns** + `grant update (data)`. 00038: the RPC loop + team_size coalesce + boolean branch. Plus 00042: the hackathons_read draft-leak fix. NOT in M2: archive/prizes/notifications.
- **M3 — Prizes + partners (M)**: 00039 + renderers + admin editors.
- **M4 — Archive (M)**: 00040 + the UI atomically (irreversible kind drop) + contentAvailability + remotePatterns fix.
- **M5 — Admin composition + roles + config (L)**: move_section RPC, /admin/h/[slug]/pagina, createEdition, requireEditionAdmin swap (13 surfaces), grant-UI fix, form method branch, buildPhases/nextMilestone, lib/schemas.
- **M6 — Ops/polish (post 09/10, M)**: notifications + outbox, edition_health view, home ticker/featured, submissions_history, test matrix.
- Total ≈ L+ (~6 weeks solo). Phases-as-metadata (not the normalized table) is the chosen shape — deliberate.

## E2E / runtime strategy (agent 2)
- No Playwright; all tests pure lib. CI is unit+build with placeholder envs.
- Split: **Playwright = UI/state** (autosave debounce, hydration, redirects, disabled buttons — only a browser can catch the direct client `.update()`), **MCP/direct-SQL = RLS/RPC** (submit_team failure codes, assignment gating, the cron auto-lock).
- Critical paths ranked: judge assigned-only (never-walked, highest risk), submission→lock→finalists, registration gate (closed), admin page, gallery+painel.
- Test data: a dedicated e2e edition (closed dates) + @e2e.test users — NOT the @mock.test fixtures (deleted pre-launch).
- 7-flow manual QA checklist for the pre-event browser pass (fresh sign-in → register → team → submit/autosave → non-admin judge → admin → gallery).
- Mobile: Playwright 375px asserts no horizontal scroll (the hero-deck fan extends 21.5%); real device for touch/safe-area.

## Event content plan (agent 3)
- **The "Em breve" titles LEAK to the public landing**: positions 2-5 now literally have title "Em breve" with null speaker/description — the seed's real titles were erased (probe). Restore the real titles; mask via the chip, not the DB.
- **The mentoria can NEVER be published** (publish guard requires video/file; it runs over WhatsApp) — stuck "em breve" forever. Exempt non-aula kinds.
- **The agenda ends 05/09** — Pitch Day (12/09) has no content row; the evento kind is filtered out of the public schedule. Seed a Pitch Day card.
- **The 4 speakers were erased** (Marcelo/Daniel, Solange, Kauê, Aceleradora) — the agenda's selling points.
- No auto-publish at scheduled_at (two manual steps per session); duration_minutes stored but rendered nowhere; quality gap (null descriptions, no thumbnails).

## Product sense (agent 4)
- **Read**: the platform is "the thin reliable layer between Luma (who's registered) and WhatsApp (where the community talks)". It owns content-behind-login, the roster, submission, screening/finalists, results. Its job is to be the record-keeper so the event doesn't live in WhatsApp threads.
- **Finalist moment is the biggest miss**: no participant page reads teams.is_finalist; the reveal depends on a (unverified) email + a manual status flip. If either fails, finalists learn nothing in-app.
- Frictions: Luma hop under-explained (no approval caveat, generic link), email-keyed team invites vs WhatsApp reality (no paste-ready invite, mismatched GitHub email never links), no WhatsApp affordance on the landing.
- Operator: NO check-in/presence anywhere (regulamento §4.4 unrepresented); health view + content admin are good.
- **5 things that feel ultimate**: (1) in-app finalist state (10/09), (2) Pitch Day card (agenda/address/what-to-bring), (3) WhatsApp-native team invites, (4) Luma honesty (official signup + approval caveat), (5) operator check-in.

## Known-unknowns registry (agent 5)
22 items across 5 types:
- **Needs SQL** (the impersonation pass): non-leader PATCH denial, RPC leader paths, judge assigned-only, pg_cron job, the applied-migration state, guard trigger team-size, the draft-leak fix effect.
- **Needs browser**: 375px fan/painel/judge, focus/keyboard, ticker/deck under reduced-motion, contrast/skip links.
- **Needs the live event**: the two test submissions (owner call — user said leave-as-is), participant behavior, email deliverability, judge onboarding drill.
- **Needs a product decision**: anon draft read, community scope, eternal-challenge, audience voting, i18n line, create-edition pre-event.
- **Needs the WIP to settle**: SectionKind union, unique, RLS gate, thumbnail move, requireEditionAdmin wiring, baseline drift.
- **BLOCK items**: non-leader PATCH, judge assigned-only, pg_cron, 00036 state, 375px painel, test-data call, deliverability, judge onboarding, WIP settle.
- **Round 8's security verdict is PROVISIONAL** until the impersonation runs; the audit snapshot trails the live tree — future rounds must re-verify against the working tree.

## Where round 10 focuses
Working-tree re-verification (baseline drift), SEO/share surfaces, auth edge cases, error/edge UX, and the consolidated cross-cutting risk register.
