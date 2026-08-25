# Round 8 — Milestone-1 spec, event-ops runbooks, community, observability, security sweep

5 agents. Audit base: feat/home-lp-hub + live repo (WIP uncommitted).

## Milestone-1 spec (agent 1)
The smallest mergeable slice:
- **Rewrite 00036 in place** to the WIP's WORKING 5-kind contract (`markdown|phases|schedule|deliverables|prizes`) + `unique(hackathon_id, position) deferrable` + RLS `to anon, authenticated` with the `hackathons.status <> 'draft'` subquery + touch trigger + DELETE the thumbnail_url block (→00040) + backfill subtitle uses `location_city`.
- Fix `SectionKind` union (+`deliverables`), drop `thumbnail_url` from HackathonContent, delete the dead local `ScheduleRow` type + the dangling Editar links, fix roles.test.ts (`adminFor: []`).
- Acceptance: 78 tests green, build green, the edition page renders pixel-identically pre/post.
- NOT in M1: RPC rewrite, archive, the admin composition route, requireEditionAdmin wiring, hero/finalists/partners (M2/M3).
- Migration application: rewrite → apply → merge (one-directional; the page fallback makes a missing table safe-but-wrong, not fatal).

## Event-ops readiness (agent 2)
- **Operations runbook**: land ONLY the rewritten 00036 pre-event (00037-00041 deferred: 00038 rewrites the live submission path, 00040 is irreversible, 00037 must backfill submissions.data, 00041 before 00038); rotate the 3 leaked secrets; verify Resend (MX/SPF/DKIM/DMARC + test to non-owner); publish content per-session; onboard judges (sign in first, then grantRole, then assign); the 09/10 flip (set is_finalist → notify → RE-ASSIGN for round=final → flip status to judging → verify); delete @mock.test fixtures; confirm the cron lock on 09/09.
- **Event-day runbook**: check-in has NO path (manual Luma list — flagged); agenda = the content archive; operator publishes recordings live; Pitch Day = judges rate assigned finalists; winners = placement 1-4 → gallery pins once closed.
- **Ranking**: 1 Resend unverified, 2 mock fixtures public, 3 leaked secrets, 4 the 09/10 status flip, 5 judges not onboarded, 6 auto_lock force-publishing empty drafts, 7 a broken 00036 deploy, 8 final-round reassignment, 9 wrong NEXT_PUBLIC_SITE_URL, 10 check-in/agenda gaps.

## Community / growth (agent 3)
- **Non-leaders' public profiles show zero projects** — `/u/[id]` lists only leader-led projects while public_profiles admits every accepted member. Data-only fix computable TODAY: filter public_submissions by team_id IN (member's teams).
- Hall-of-fame needs only a post-event view (public_results: team_id, placement, hackathon_name, gated non-draft) — no new table.
- Retention loop ends at the mailbox (3 emails, no in-app); /conta never links to the user's own /u/[id].
- Gallery cards don't link avatars to profiles; stats band half-computable; no like/vote/comment (deferred by spec); eternal-challenge not representable (NOT NULL dates + RPC deadline).
- Scope: H1/S1 pre-event (data-only); hall-of-fame, stats, voting post-event.

## Observability (agent 4)
- **Zero stack**: no sentry/analytics/otel; no error.tsx/not-found.tsx; vercel.json `{}`. Every thrown error = the generic 500.
- **Ignored-error reads are the silent-death core**: `getTeamForHackathon` (4 queries, all `{data}`, error ignored) returns null on DB failure → a user with a team sees "crie seu time"; same in registration.ts. Log them.
- **The round-4 serviceRole crash is still live** (public landing 500s without the env key; placements vanish silently).
- Email unmeasurable; cron unobserved (pg_cron run details).
- **/api/health design**: probes (hackathon_sections, public_submissions via to_regclass), funnel counts, cron last_run, email failures. One curl answers DB-version + funnel + cron + email.

## Security sweep (agent 5)
- **Draft hackathon fully anon-readable (live probe)** — 00001 hackathons_read using(true) exposes bh-onchain-2026 incl. metadata + luma_url. Fix: using(status <> 'draft').
- **public_schedule leaks draft editions' content** (latent — no hackathons status gate; currently all rows are the published edition).
- WIP sections RLS repeats the draft leak; scoped-admin half-wired (links advertised, routes requireAdmin → redirect); /api/* redirect-to-auth confirmed.
- **project-images limits (5MB + MIME) set LIVE, not in migrations** — a fresh DB wouldn't have them.
- Checks passed: XSS safe (no rehype-raw, no dangerouslySetInnerHTML), write surface sound (00018 grant matches, guard trigger + leader policy), views gated, judge gates sound, storage uploads enforced, no secrets in source.

## Where round 9 focuses
Milestone sequencing (M1-M6 from all the designs), the E2E/runtime test strategy, the event content plan, the product-sense check for THIS community, and a known-unknowns registry for the review rounds.
