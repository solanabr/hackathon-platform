# Round 13 — Review III: the definitive plan, the decisions, the runbook

3 agents. The review phase (11-13) closes.

## The definitive R14-20 plan (agent 1)
- **R14 — SQL verification + impersonation** (pre-event): draft-leak probes, non-leader PATCH denial, submit_team leader paths, judge assigned-only, pg_cron, the top-15 risks upgraded from provisional to PROVED/REFUTED/NEEDS-EXEC. Acceptance: every finding cited to a live probe; zero flag-only carryovers.
- **R15 — Blueprint + test suite** (the report's spine): M1 (rewrite 00036, SectionKind, roles.test → 78 green, pixel-identical), M2 (00037→00041→00038, backfill, boolean branch, 00042) with the post-event trigger, M3-M6 skeletons, the +40-50 test matrix, the identity-loop blueprints ranked by 09/10 impact. Acceptance: each milestone has a verifiable done-state; builds on the applied state, never the red tree.
- **R16 — Runbook drills + data hygiene** (pre-event): deliverability drill, 09/10 flip drill, agenda restoration, Playwright 375px + 7-flow QA. Acceptance: every drill recorded; runbook copy-paste executable.
- **R17 — Competitive map / R18 — Community / R19 — UX vision** (report-only, parallel-safe).
- **R20 — Synthesis** → ULTIMATE-REPORT.md, 7 chapters, executable without the round docs, the event-vs-report verdict verbatim.
- Event cutoff: R14 + R15-M1M2 + R16 pre-31 Aug; the rest during/after. Fallback: ship R14+R16+R15-M1M2, drop R17-19, R20 degrades to chapters 1-5.
- The report's promise: a build plan (M1-M6 + apply order), an event runbook (drill-evidenced), a risk verdict (not provisional), a product vision (WhatsApp-native, competitively grounded) — and the warning not to mistake the architecture for the event.

## The 7 decisions (agent 2) — see the decision brief in this round's output
1. Identity-loop scope (judge onboarding + invite path pre-event; scoped-admin post-event).
2. WIP accept-gate (commit at 78 green, not as-is).
3. Check-in (manual Luma list; build post-event).
4. Event-time budget (rounds continue; M2 deprioritized pre-09/09).
5. Mock fixtures + the two live test submissions (delete fixtures; flag the two to judges).
6. In-app finalist panel (build pre-event — the reveal shouldn't hinge on email).
7. Content restoration (operator data-entry + the mentoria publish-guard exemption).

## The distilled operator runbook (agent 3) — 3 phases, 17 steps
**Before launch (T-6 to T-1):** 1 Resend domain verify + RESEND_FROM + non-owner test; 2 rotate the 3 secrets; 3 NEXT_PUBLIC_SITE_URL on Vercel; 4 delete @mock.test fixtures (`delete from auth.users where email like '%@mock.test';`); 5 restore content (titles, 4 speakers, descriptions); 6 seed a Pitch Day card; 7 publish the abertura; 8 onboard judges (emails → sign in → grantRole → assign; the workaround, not a fix); 9 confirm the cron auto-lock (job `lock-overdue-submissions`).
**During the event:** 10 publish each session's recording after the live; 11 the mentoria handling (WhatsApp; publish FAQ/slides or exempt); 12 09/09 — confirm the cron lock ran; 13 09/10 — the flip sequence (set is_finalist → notify → re-assign round=final → status to judging → verify the public section); 14 Pitch Day check-in (manual Luma list).
**Pitch Day + post:** 15 final-round judging; 16 winners (placement 1-4 → status closed → gallery pins); 17 decommission or the next edition (template duplication).
- The 09/10 reveal shows in-app only if the S-fix panel lands (no page reads teams.is_finalist today) — the runbook doesn't assume it.

## What rounds 11-13 settled
Event-vs-report verdict (the event needs deliverability/content/judging/reveal, not data-drivenness; M2 post-event); the identity loop PROVED unbuildable; the risk register design-locked-not-executed; M1-M6 with apply order (00041 before 00038); re-verify the working tree, never touch the red tree.
