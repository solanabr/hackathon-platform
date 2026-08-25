# Ultimate report — the data-driven audit of the STBR hackathon platform

20 rounds of the research pipeline (rounds 11-13 the review phase), every round saved under
`docs/research/2026-08-25-data-driven-rounds/ROUND-01..20.md`. This report is the executable
synthesis: an event runbook, a build plan, a risk verdict, and a product vision.

---

## Chapter 1 — Executive summary

**The verdict.** Twenty rounds found a hardcoded platform: roughly 30% of visible copy is data, 70% is code; edition structure, deliverables, prizes, and partners are JSX, not data [R1][R7]. The data-driven refactor is fully designed (migrations 00036-00042, milestones M1-M6) but deliberately deferred [R12]. The event needs four operational things: deliverability, content, judging, the finalist reveal [R12]. So the plan is two-track: an operator runbook for the event, M2-M6 after it [R12]. Done, the platform becomes the thin reliable layer between Luma and WhatsApp, the community's stage and memory, in the LP cream-and-emerald skin [R17][R19].

**Top 5 findings.**
1. Deliverability is the #1 risk; Resend runs on the sandbox, every email silently dies [R10-E1].
2. The finalist reveal hinges on a manual flip plus an unverified email, no in-app panel; one render gate closes it [R9][R10][R19].
3. The identity loop is unbuildable: no invite token link, `accept_team_invite` has zero callers, no scoped-admin grant path [R11][R12].
4. Data-drivenness is post-event; the M2 submission rewrite pre-09/09 risks rejecting live submissions [R12].
5. The LP direction was right: cream-and-emerald warmth, not the dark-arena capital pipeline [R19].

**The event verdict, verbatim:** "The event does not require data-drivenness, it requires deliverability, content, judging, and the finalist reveal." [R12][R13]

**The decisions.** 1. M2-M6 ship post-event; only M1 and the runbook land pre-launch [R12]. 2. The in-app finalist panel is the cheap high-impact build; the reveal must not hinge on email [R12][R19]. 3. Identity-loop scope: judge onboarding and the tokenized invite pre-event, the scoped-admin grant after [R13]. 4. Content restoration is operator data-entry plus the mentoria publish-guard exemption [R13]. 5. Delete the mock fixtures, flag the two live test submissions to the judges [R13].

## Chapter 2 — Event-critical operations

**The runbook (3 phases, 17 steps) [RUNBOOK].** Before launch, T-6 to T-1: 1. verify the Resend domain, set `RESEND_FROM`, test to a non-owner; 2. rotate the 3 leaked secrets; 3. set `NEXT_PUBLIC_SITE_URL`; 4. delete the `@mock.test` fixtures; 5. restore the content, positions 2-5 read "Em breve" and the 4 speakers were erased [R9]; 6. seed a Pitch Day card, otherwise the agenda ends 05/09; 7. publish the abertura with its recording; 8. onboard judges, sign in first, then grantRole, then assign projects; 9. confirm the pg_cron auto-lock. During: 10. publish each recording after the live; 11. the mentoria runs on WhatsApp and stays "em breve" without a publish-guard exemption [R9]; 12. confirm the close on 09/09; 13. the 09/10 flip: set is_finalist, notify, re-assign judges for round=final (assignments do not carry), flip status to judging (the reveal gate), verify [R16]; 14. Pitch Day check-in, manual Luma list, no path exists [R16]. Pitch Day and post: 15. final-round judging; 16. winners, placement 1-4, status closed, gallery pins; 17. decommission or template-duplicate, the create flow is unbuilt [R4].

**Pre-event risks (top 10) [R10].** 1. E1 Resend sandbox, all email lost. 2. O1 the reveal flip hinges on email. 3. W1 WIP red, uncommitted (now committed, see R15). 4. S1/S2 drafts anon-readable. 5. O2 agenda broken ("Em breve" leak, erased speakers). 6. S5 mock fixtures public. 7. D1 type-set collision, the build will not compile (now fixed, see R15). 8. D2 apply-before-merge, the page loses its sections. 9. D3 the 00038 rewrite rejects live submissions. 10. O4 service-role crash, the landing 500s.

**Who does what [R12].** Operator, non-delegable, about 2 days: Resend verify and test, secret rotation, judge emails, fixture deletion, SITE_URL, content restoration, the 09/10 flip. Other Claude: settle the WIP, land M1, the content-publish fixes, the identity-loop invite path. Post-event: M2-M6, including create-edition and template duplication [R4][RUNBOOK].

## Chapter 3 — The architecture

The architecture is layered: tables for edition composition, jsonb for edition configuration, views for the public surface, and one server-side rendering contract on top.

**Data model.** Four tables carry composition. `hackathon_sections` (position, type, heading, body_md, config jsonb, visible, deleted_at) with a deferrable unique(hackathon_id, position) and draft-gated RLS [R2][R15]. `hackathon_partners` (name, logo, role parceiro/apoiador, position) [R2]. From M6, `notifications` plus `email_outbox`, drained with FOR UPDATE SKIP LOCKED so the fire-and-forget after() gets retry [R6]. Four jsonb columns hold edition configuration: `deliverables` [{key,label,type,required,hint}], `prizes` [{place,amount_usd}], `registration_config` {method,url,copy,team_size_min/max}, and `submissions.data` for non-column values [R2][R3]. `metadata` looked like the ready-made escape hatch but is dead and overlaps these sources, so it gets migrated, not kept [R2][R4]. The views gate the public surface: public_schedule, public_submissions, public_profiles exist; public_results (team_id, placement, hackathon) and edition_health (one row per edition, all aggregates) are planned [R18][R6].

**Rendering.** getEditionContext(slug) fetches once in two layers: a cached public base plus viewer-gated reads keyed by userId [R4]. sections.tsx stays a server module mapping sorted visible sections to an exhaustive RENDERERS record, so a missing SectionType is a compile error, not a runtime blank [R3]. buildPhases and nextMilestone replace two duplicated copies that already disagree on whether finalists sit between submission and pitch [R4]. lib/schemas.ts plugs hand-rolled validators into every admin write before the DB call, because sanitize-to-null corrupts silently: a typo in prize_summary today breaks the card and the pool total with no error [R4].

**Roles.** Three tiers: platform admin, edition admin (composition, content, screening, judges, finalists for one edition), judge (assigned-only) [R7]. Enforcement lives in the action layer, no new RLS [R7]. The identity loop is the miss the review caught: accept_team_invite has zero callers, grantRole forces hackathon_id null so nothing can create a scoped admin, and judge onboarding dead-ends both before login and after [R12].

**Design system.** The LP language is the thesis: cream surfaces, emerald, fills-only yellow, morth blobs at full saturation, hard offset shadows, Archivo over Inter [R19]. Drift already exists (chrome morths at 7% opacity, the judge module violating accent discipline), so tokens get codified, not reinvented [R19].

## Chapter 4 — The build plan

Six milestones, roughly L+ solo effort, all post-event except M1 [R9][R12].

| M | Scope / files | Migrations | Acceptance | Effort |
|---|---------------|------------|------------|--------|
| M1 | Rewrite 00036 in place: deferrable unique, draft-gated RLS, touch trigger, thumbnail_url out to 00040, subtitle from location_city. SectionKind union, roles.test | 00036 rewrite | 78 green, build green, pixel-identical | M |
| M2 | Deliverables path: data backfill, RPC loop, boolean branch, draft-leak fix. Files: lib/deliverables.ts, editor renderer, dashboard checklist, api/submit map | 00037, 00041, 00038, 00042 | Submit path green; no team rejected | L |
| M3 | Prizes + partners: drop the regex, handcrafted backfill, editors + schemas | 00039 | Prize cards tier; pool sums | M |
| M4 | Archive: thumbnail_url, media_type, kind remap, contentAvailability, remotePatterns | 00040 atomic | Admin and public deploy together | M |
| M5 | Admin composition + roles + config: move_section, pagina route, createEdition, grant fix, method branch, buildPhases | 00043 | New edition composed end to end | L |
| M6 | Ops/polish: notifications + outbox, edition_health, submissions_history, featured, ticker, bell | 00044, 00045 | Bell + health view + tests green | M |

The apply order is load-bearing. 00036 is rewritten and applied first, or the edition page renders without phases, schedule, deliverables, or prizes [R14]. M2 then applies 00037, 00041, 00038 in that order: the RPC rewrite reads registration_config, so 00041 precedes it, and the data backfill must run first or the loop rejects every live team [R6][R9]. 00040 ships atomically with the archive UI; the kind constraint drop is irreversible [R3]. 00042 closes the draft leak on hackathons_read and public_schedule [R15]. M2's trigger is post-09/09: the seeded edition works on today's hardcoded deliverables, and shipping the RPC rewrite pre-event buys generalization at the risk of rejecting live submissions [R12].

Tests: 46 new to ~124 across 13 files [R15]. Event-critical units: buildPhases and nextMilestone at the deadline instant (09/09 15:00Z), missingRequiredDeliverables, schemas, contentAvailability, RENDERERS exhaustiveness. The RPC, RLS, impersonation, cron, and Resend stay integration marks in the deferred-probes register, not unit tests [R15].

Identity-loop blueprints [R15]: judge onboarding (M, HIGH) via pending platform_roles by email, ghost-link, and a /judge redirect; tokenized invite (S-M, no schema) via invite_token and an /invite/[token] route that finally gives the email an accept link; scoped-admin grant (S) by dropping the null-forcing in grantRole, the last piece since the 13-surface requireEditionAdmin swap landed in fdda007.

Community roadmap [R18]: the pre-event slice is the finalist panel (one render gate, teams.* already rides the painel snapshot [R19]), WhatsApp invites, and the data-only profile fixes. Post-M6: public_results, the hall-of-fame podium, likes, and only later voting, which stays out for 2026 per the judge-only regulamento [R18].

## Chapter 5 — The risk register

Round 10's list stays canonical; the verdicts fold in R15's ground truth (WIP committed, edition-admin swap landed) [R10][R14][R15].

| Risk | Verdict | Evidence | Owner |
|---|---|---|---|
| E1 Email deliverability (Resend sandbox) | STILL-OPEN | RESEND_FROM = onboarding@resend.dev sandbox; all mail lost until the domain verifies [R10][R14] | Operator |
| O1 Finalist reveal = email + manual flip | NEEDS-EXEC | Reveal gate is the status-to-judging flip, live status published; the panel is one render gate away [R14][R19] | Operator + dev |
| W1 WIP red tree | FIXED | WIP committed f037e63, tree clean; SectionKind is the 5-kind union; only roles.test (adminFor: []) red [R14][R15] | Dev |
| S1/S2 Draft edition anon-readable | NEEDS-EXEC | Draft leak live via hackathons_read using(true); status <> 'draft' fix proved safe, unapplied in 00042 [R14][R15] | Dev |
| O2 Agenda broken | NEEDS-EXEC | Positions 2-5 literally "Em breve", speakers erased, no Pitch Day card; runbook restore plan [R9][R16] | Operator |
| S5 Mock fixtures public | NEEDS-EXEC | 5 mock projects in the gallery (10 @mock.test users); delete teams before users [R14][R16] | Operator |
| D1 SectionKind type-set collision | FIXED | Union is now the 5-kind contract; typecheck passes [R15] | Dev |
| D2 00036 unapplied, code expects it | STILL-OPEN | sections.tsx returns [] on PGRST205; sections don't render until M1 lands [R14][R15] | Dev |
| D3 00038 rejects live submissions | MITIGATED-BY-DESIGN | M2 moved post-event; apply order 00037 to 00041 to 00038 + data backfill [R10][R12][R15] | Dev |
| O4 Service-role crash | STILL-OPEN | Round-4 crash still live without the env key; try/catch designed, unlanded [R4][R8] | Dev |
| O3 Mentoria/evento can't publish | NEEDS-EXEC | Publish guard demands video/file; mentoria runs on WhatsApp; kind === 'aula' exemption designed [R9][R16] | Dev + operator |
| O6 Judges not onboarded | NEEDS-EXEC | No invite email, no /judge redirect; sign-in-first workaround, runbook step 8 [R13] | Operator |
| O5 Silent-death ignored errors | STILL-OPEN | 8 silent reads turn DB failures into lies; error policy designed [R19] | Dev |
| S4 requireEditionAdmin dead | FIXED (grant path open) | Swap landed in fdda007 on every edition surface; grantRole still forces hackathon_id null, so scoped admins stay uncreatable [R11][R15] | Dev |
| O7 Team-size rules disagree (5 sites) | MITIGATED-BY-DESIGN | M2 reads team_size_min from registration_config (coalesce 2); live edition unaffected [R7][R15] | Dev |

**Design-locked, not executed.** Only the WIP commit landed execution: the SectionKind union, the edition-admin swap, the 00036 body (still unapplied). Everything else, the draft-leak fix, the deliverables path, the mentoria exemption, error boundaries, the service-role try/catch, the scoped-admin grant, is spec in M1-M6, not the DB or the tree [R10][R15]. Treat the table as work, not status.

**The PROVED security posture [R14].** Anon reads on submissions, teams, team_members, users, registrations, and platform_roles all return []; RLS holds; anon writes are denied at the grant layer (42501). The deny paths read correctly: non-leader PATCH is blocked by the 00022 leader policy plus the 00018 column grants and the 00025 trigger; judge assigned-only is sound at the app layer; submit_team leader paths and the guard trigger are correct; the draft-leak fix is safe because admins read via service-role/BYPASSRLS. The draft leak is the one open hole, confirmed live. The verdict stays provisional only for the operator-run authenticated probes [R9][R14].

**Known-unknowns and the deferred probes [R9][R14].** Applied state proved (00032-00035 applied, 00036 not), anon RLS behavior proved, static deny paths proved by reading. Still open: the pg_cron enforcement check (NEEDS-SQL) and the authenticated non-leader status-PATCH, the report's central security claim. 12 deferred probes with exact commands live in ROUND-14; settle-now three: schema_migrations head, cron.job run history, and that PATCH as an authenticated user. The browser tier (375px, the 7-flow QA) and the deliverability test are operator probes too [R16].

## Chapter 6 — The product vision: the community's own stage and memory

The thesis landed in round 17 and held through 19: this is not Colosseum's funding pipeline, DoraHacks' grants machine, or Devpost's global bazaar. It is the community's own stage and memory, the thin reliable layer between Luma and WhatsApp, in the LP's cream-and-emerald skin [R17][R19]. Luma owns ticketing, WhatsApp owns chatter, the platform owns the record: the permanent shareable artifact of gallery, finalists, and placements [R18].

Five pillars define it: the event runs flawlessly (the O1 reveal hinge, the self-attested Luma), participants feel seen (the finalist panel, which no page reads today), builders are discoverable (gallery plus profiles, but no cross-edition trajectory yet), the content is the living agenda, and the community is the moat [R17]. The north-star is finalists learning they made the cut in-app within an hour of the announcement, measured via the bell and the reveal click so it hedges email deliverability; the 3-year metric is the cross-edition return rate [R17][R18].

The community layer is mostly post-event and data-only. A `public_results` view gated on `is_finalist`, `placement NOT NULL`, and `status <> 'draft'` feeds both the hall-of-fame (`/resultados`) and per-profile trajectories, fixing the non-leader gap where profiles listed only leader-led projects [R18][R8]. The engagement loop is the bell: registration, submit inside the RPC, finalists, content-publish, team-add, plus T-7/T-1 reminders via pg_cron [R18]. Audience voting stays out for 2026 (the regulamento is judge-only); likes are the only safe add this cycle [R18]. Growth rides a `duplicateEdition` template RPC plus the `edition_health` view, so a new city edition is template plus metadata, no code [R18][R6].

The UX vision is one felt journey: Luma-honest signup, first-login routing, a WhatsApp team, autosave build, the emerald submit with share, the in-app finalist reveal, the hall-of-fame podium [R19]. Five feels carry it: the finalist panel, the Pitch Day card, WhatsApp-native invites, Luma honesty, operator check-in [R9][R19]. The mood is the thesis: the dark arena reads as a capital pipeline, the cream-and-emerald warmth reads as "we're all in this room" [R19].

Scope guard: no funding rails, marketplace, eternal challenge, on-chain voting, AI judging, bounties, or cofounder matching [R18]. The moat is the stage and memory, not the capital rails [R17][R18].

## Chapter 7 — Decisions and known-unknowns

Round 13 posed seven decisions; the user answered by making the rounds research-only, deferring the finalist panel and the content restoration, and continuing the report. The decisions, with the recommendation and the consequence where it landed [R13]:

1. Identity-loop scope. Build judge onboarding and the invite path pre-event, scoped-admin post-event. Deferred with the research-only scope.
2. WIP accept-gate. Commit at 78 green, not as-is. Moot for the report: the WIP landed committed at f037e63 with only roles.test red [R15].
3. Check-in. Manual Luma list; build post-event. Confirmed: no code path exists anywhere, manual is correct [R16].
4. Event-time budget. Rounds continue; M2 deprioritized pre-09/09. Confirmed: the event does not require data-drivenness, it requires deliverability, content, judging, and the reveal [R12].
5. Mock fixtures. Delete; flag the two live test submissions to the judges. The user said leave the two as-is [R9].
6. In-app finalist panel. Build pre-event so the reveal does not hinge on email. Deferred; the reveal now rides the runbook flip and email [R13][R16].
7. Content restoration. Operator data-entry plus the mentoria publish-guard exemption. Deferred [R13].

The known-unknowns split in two. Round 14's static probes settled the security half: 00032-00035 proved applied, 00036 not applied and untracked, the draft leak confirmed live, and the non-leader PATCH, judge gating, and guard trigger proved by reading [R14]. Still open for the operator: the migration-ledger head, the cron.job run history, the non-leader status-PATCH run as authenticated, the deliverability test to a non-owner inbox (E1 stays open), and the judge onboarding drill [R14][R16][R9]. The browser items wait on the pre-event pass: 375px fan/painel/judge, focus and keyboard, reduced-motion, contrast [R9].

What this report does not decide, because they are product calls, are the owner's: the draft-leak acceptance (when 00042 lands), the community scope (audience voting, the eternal challenge), and the i18n line (per-edition copy now, chrome translation later, no locale routing mid-refactor) [R9][R7].

---

*The audit is research-only by the owner's directive. The runbook (RUNBOOK.md) is the operator's; the milestones (Chapter 4) are the implementer's; the verdicts (Chapter 5) are what the report proves. Do not mistake the architecture for the event.*
