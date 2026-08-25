# Round 6 — Home hub, dashboard composition, migration correctness, multi-edition ops, notifications

5 agents, seeded by Round 5. Audit base: feat/home-lp-hub (DB at 00035; in-flight 00036 + WIP red).

## Home hub (agent 1)
- **Ticker claims real deadlines, carries marketing copy**: `ticker-strip.tsx:2-4` documents deadline behavior; no edition page uses it; 3 of 4 items are static; the date formatters `TICKER_DAY`/`TICKER_TIME` (page.tsx:15-16) are defined and never used. The deadline data exists on hackathons. Fix: build ticker items server-side from live/upcoming editions, reusing the same next-deadline logic as the edition page.
- **Hero deck has no featured concept**: deck = `editions.slice(0,3)` from starts_at desc — finished editions will surface; no mechanism for an operator to claim the deck. Fix: `featured bool` on hackathons (or metadata.featured), order featured desc, admin toggle in the edition form.
- STEPS hardcodes "De 2 a 4 builders por time" (contradicts per-edition team_size); no stat band exists (good — the "facts not zero counts" lesson holds).

## Dashboard composition (agent 2)
- **Checklist source of truth split 3 ways** (dashboard REQUIRED, editor allRequiredFilled, RPC) — drift is silent when an edition adds a deliverable. One shared const + the RPC as authority.
- **No finalist panel on the painel**: `teams.is_finalist` is never read on the dashboard — the highest-stakes participant state has no panel (only /account + admin). A FinalistCard gated on the team's is_finalist.
- **Team size hardcoded at 2** in the dashboard + editor (silently disagrees with any edition whose minimum differs) — read min_team_size from metadata.
- nextMilestone is page-local (the ladder), rendered again in timeline/info-card/submitted-card — extract the contract.
- Phase labels/details are edition prose baked into the page (dates are data-driven via phaseBoundaries; the copy is not) — metadata overrides.
- Composition model: no config table needed — one shared deliverables const, nextMilestone helper, metadata for copy/min_team_size/teams_enabled, and a `teams_enabled` capability flag so a non-team edition drops the team card without code. Fixed chrome: auth gate, registration redirect, header, pending strip, luma chips, content card.

## Migration correctness (agent 3)
- **00038 ordering bug**: it reads `registration_config` but that's 00041, shipped LAST — 00038 would reference a nonexistent column. Land 00041 before 00038.
- **00038 would reject every live submission**: new `submissions.data = '{}'` (00037) means the deliverables loop fails all teams unless 00037 backfills data from current columns; `github_access_granted` is boolean — a trim(data->>'') check can't validate it (boolean branch needed).
- **Grant gap**: 00018 scopes UPDATE to a fixed column list — the leader's PATCH of `data` needs `grant update (data) on submissions to authenticated` in 00037.
- RLS draft-leak exact fix given (policy exists subquery on hackathons.status <> 'draft'); unique(hackathon_id, position) deferrable missing; thumbnail_url in the wrong migration (00036 → 00040); touch_updated_at missing; seeded subtitle hardcodes "Passo Fundo".

## Multi-edition operations (agent 4)
- **No cross-edition health view**: the admin index is a 2-metric card list (registrations + teams). Nothing flags an edition with 0 submissions, unpublished content, no judge assignments.
- Create-edition unbuilt (round 4 design); belongs in the admin index header → `/admin/nova`.
- Column-by-column computability mapped; recommendation: a service-role **`edition_health` SQL view** (one row per hackathon, all aggregate columns) keeping the dashboard at 2 round-trips instead of 2N+1.
- Template library: duplicate edition = copy hackathons row + contents rows (never roles/submissions) — no schema change.

## Notifications layer (agent 5)
- **Deliverability is the #1 blocker** (onboarding@resend.dev sandbox; .env.example has the placeholder).
- No notifications table — design given (notifications + email_outbox with FOR UPDATE SKIP LOCKED drain).
- `after()` is fire-and-forget with no retry — the outbox fixes both in-app + email durability.
- Event map: registration-confirmed (register/actions), content-published (content/actions on the flip), judge-assigned (judges/actions), team-complete (addMemberByEmail at min), submission-received better INSIDE the submit_team RPC (atomic), deadline reminders T-7/T-1 via a pg_cron RPC that ENQUEUES (cron can't send; the drain must be in-request or a pg_net/Vercel HTTP job).
- Bell in the header with an unread count; notification types platform-generic, copy overridable via metadata.

## Where round 7 focuses
The plumbing the refactor rests on: data-access/RLS patterns, edition-scoped roles, the submission lifecycle, the content lifecycle, and i18n/localization.
