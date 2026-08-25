# Round 15 — The build blueprint: M1-M6 specs, test matrix, identity-loop blueprints

5 agents. Ground truth moved: the WIP is now COMMITTED (f037e63, working tree clean); `requireEditionAdminBySlug` is wired into every edition surface (landed standalone in fdda007); SectionKind is already the 5-kind union. Only the roles.test failure remains red.

## M1 — Composition base (agent 1; land now)
- Rewrite 00036 in place: the deferrable unique `(hackathon_id, position)`, the draft-gated RLS (`to anon, authenticated` + the hackathons.status <> 'draft' subquery), the touch trigger, DELETE the thumbnail_url block (→00040), the phases backfill subtitle uses `location_city` (exact-match to the page fallback).
- Type fixes: delete `thumbnail_url` from HackathonContent (only an optional local ref); the dead ScheduleRow local was resolved by the content-page rewrite; the dangling Editar links self-heal once rows seed.
- roles.test.ts:48 → add `adminFor: []`.
- Acceptance: 78 green, build green, pixel-identical pre/post, SQL spot-checks.
- **New risk**: `moveSection` (admin reorder) breaks after the unique lands — either ship the single-transaction reorder RPC with M1 or disable the buttons until M5.

## M2 — Deliverables path (agent 2; POST-event, before the next edition)
- 00037: `hackathons.deliverables jsonb` + `submissions.data jsonb` + the BACKFILL (jsonb_build_object from the current columns) + `grant update (data)`. Exact SQL given.
- 00041: `registration_config jsonb` (luma, min 2, max 4, requires_luma_confirmation true) backfilled for the seeded slug.
- 00038: the submit_team 5th-gen rewrite — the deliverables loop (the `column` marker routes to fixed columns, the boolean branch for github_access_granted, `missing_required_field:<key>`), `team_size_min` read from registration_config (coalesce 2). Exact SQL sketch given.
- 00042: the draft-leak fix (`hackathons_read` → using(status <> 'draft')) + the public_schedule draft gate.
- Code: `lib/deliverables.ts` (column marker + pure missingRequiredDeliverables), the generic editor renderer + data-merge save, the dashboard checklist from deliverables, the api/submit `startsWith` error map.
- Apply 00037 → 00041 → 00038; trigger = post-09/09 (no live submissions mutate mid-flight).

## M3-M6 (agent 3) — no migration collisions (00039, 00040, 00043, 00044/00045)
- M3 Prizes+partners (00039; drop prizePoolLabel regex; handcrafted solana backfill; editors + schemas) — M.
- M4 Archive (00040; thumbnail_url + media_type + kind remap; ATOMIC with the UI; favicon via plain img + remotePatterns; publish-guard exemption) — M.
- M5 Admin composition + roles + config (00043 move_section RPC; /admin/h/[slug]/pagina; createEdition; the grant-UI fix; the registration method branch; buildPhases/nextMilestone; schemas) — L.
- M6 Ops/polish (00044 notifications+outbox+SKIP LOCKED drain; 00045 edition_health + submissions_history + featured; ticker; bell; test matrix) — M.
- Total ≈ L+.

## Test matrix (agent 4) — 46 new → ~124 total, 13 files
- buildPhases (10): the deadline instant (09/09 15:00Z — submissao done / selecao current), N-phase, overrides, fallbacks. EVENT-CRITICAL.
- nextMilestone (8): the submitted-skip, both modes, instants. EVENT-CRITICAL.
- missingRequiredDeliverables (9): each missing field, whitespace≈null, fallback. EVENT-CRITICAL.
- schemas (10), contentAvailability (+3, incl. the non-aula publish-guard exemption), defaultEditionConfig (4), RENDERERS exhaustiveness (2, type-level).
- Integration marks (not unit-testable): the RPC itself, RLS, impersonation, cron, Resend — the deferred-probes register.

## Identity-loop blueprints (agent 5)
1. **Judge onboarding (M, HIGH)** — pending platform_roles by email (schema: nullable user_id + invited_email + status), handle_new_user ghost-link, judgeFor → /judge redirect, sendJudgeInvite.
2. **Tokenized invite-accept (S-M, HIGH, no schema)** — invite_token on insert, /invite/[token] route → accept_team_invite (already hardened), the email link, the wrong-email claim surfacing.
3. **Scoped-admin grant (S, LOW)** — drop the null-forcing in grantRole, fix the dup-check, UI hint. **The 13-surface requireEditionAdmin swap already landed** (fdda007) — the only remaining piece is the grant path.

## Where round 16 focuses
Runbook drills + data hygiene as research: the deliverability drill spec, the 09/10 flip drill, the agenda restoration, the browser QA checklist, the check-in design.
