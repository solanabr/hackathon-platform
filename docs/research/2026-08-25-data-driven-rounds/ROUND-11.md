# Round 11 — Review I: consolidation, direction map, open threads

3 agents (the first of the review rounds 11-13).

## The architecture as designed (agent 1)
- Data model: `hackathon_sections` (00036 rewritten: 8-kind type, unique(hackathon_id,position) deferrable, draft-gated RLS, touch trigger), `hackathon_partners` (00039), `notifications`+`email_outbox` (M6); jsonb `deliverables` (00037), `prizes` (00039), `registration_config` (00041), `submissions.data`; `getEditionContext` + exhaustive RENDERERS + buildPhases/nextMilestone + lib/schemas.
- Migrations 00036-00042; apply order 00037→00041→00038; milestones M1-M6 (~L+).
- Event-critical before 31 Aug: deliverability (E1, #1), settle WIP + land M1, apply M2 pre-09/09, content fixes (restore titles + speakers, Pitch Day card, mentoria publish exemption), judge onboarding, the 09/10 flip, rotate secrets, delete mock fixtures, set NEXT_PUBLIC_SITE_URL, check-in gap (manual).

## Direction map (agent 2)
8 options ranked. Recommended allocation for 14-20:
- R14 — SQL correctness + impersonation (event-blocking: M2 lands 09/09; converts PROVISIONAL → PROVED). Partially blocked on WIP settling — scope to the applied-migration state.
- R15 — Implementation blueprint + test suite folded in (per-milestone acceptance; the report's spine).
- R16 — Runbook drills + data hygiene (both event-side).
- R17 — Competitive deep-map (Colosseum/DoraHacks/Devfolio/Devpost/radiant/align).
- R18 — Community layer (hall-of-fame, trajectories, engagement).
- R19 — Product/UX vision (LP language, joy moments).
- R20 — Ultimate-report synthesis (chapters, the risk register upgraded from provisional to verdict).
- Rule: every round re-verifies against the working tree, not the snapshot.

## Open threads / never-examined surfaces (agent 3)
- **THE IDENTITY LOOP IS UNBUILDABLE (collectively missed)**: AGENTS.md documents `/invite/[token]` as a service-role call site but no such file exists; `accept_team_invite` has ZERO callers and the invite email has no token link; `grantRole` forces `hackathon_id: null` for admins so NO grant path can create a scoped admin — the WIP's `adminFor`/`requireEditionAdmin` is dead-on-arrival even after M5.
- Never-examined: role-manager/people (revokeRole error swallowed), avatar-upload (no server size/MIME check, orphaned object on failure), content-embed (non-nocookie iframe), painel-nav (hardcoded 4 tabs), new-team-form (unguarded client rpc, loading sticks on network throw), hero-deck (tablist without tabpanel), legal/regulamento (no page).
- Open threads: buildPhases table vs metadata (R3 design orphaned); prizes backfill (handcrafted, no design); check-in (never designed); speaker/content restoration; metadata jsonb overlap (migrate or drop, contradiction open); the same 7 fix-items re-flagged R5→R10 unverified (the flag-only weakness).
- Claims verified TRUE: the tsc errors, roles.test, OTP token_hash, unguarded submit fetch, 00036 gaps, the draft leak, zero error boundaries.
- WIP thread: still uncommitted + red; acceptance = commit rewritten 00036, 5-kind contract, roles.test fix, 78 green.

## The 5 must-get-right for the ultimate report
1. The event-critical ops list (deliverability, flip + in-app finalist panel, judges, content, 00036, fixtures, secrets, cron).
2. The architecture (sections/renderers/context/metadata escape-hatch; the role model incl. the unreachable scoped-admin tier).
3. The M1-M6 plan with apply ordering + data backfill (00038 must not reject everyone).
4. The risk register top-15 with "design-locked, not executed".
5. The identity-loop finding (the missed thing).

## Where round 12 focuses
Verify the identity-loop finding, refine the 14-20 allocation into concrete briefs, and weigh event vs report priorities.
