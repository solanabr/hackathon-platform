# Round 12 — Review II: identity-loop verification, refined briefs, event-vs-report weighting

3 agents.

## Identity-loop verification (agent 1) — PROVED end-to-end
- **The invite email has no accept link** (CTA = the edition page; no token); **a different-email sign-in is a permanent dead-end** (ghost row never links); **`accept_team_invite` has ZERO callers**; **the copy promises acceptance the mechanism can't do** ("A entrada é confirmada assim que você mantiver a inscrição completa" — no accept action exists).
- **No grant path creates a scoped admin** (grantRole hardcodes hackathon_id null for admin; requireEditionAdmin has zero callers so a manual row gates nothing).
- **Judge onboarding dead-ends**: un-grantable before first login, undiscoverable after (no /judge redirect/banner).
- Fix shapes ranked by 09/10 impact: (1) judge onboarding (grant by email to pending + post-login /judge redirect), (2) tokenized invite (/invite/[token] → accept_team_invite — already hardened), (3) scoped-admin grant + requireEditionAdmin swap.

## Round 14-20 briefs (agent 2)
- R14 SQL correctness/impersonation (runs now; split immediate + deferred-scope; not blocked on WIP).
- R15 Blueprint + test suite (waits on WIP + decisions; M1-M2 + identity-loop blueprints + test placement).
- R16 Runbook drills + data hygiene (pre-event; deliverability drill, 09/10 flip drill, agenda restoration, Playwright 375px + 7-flow QA).
- R17 Competitive map / R18 Community / R19 UX vision (report-only, during/after the event).
- R20 Synthesis: 7 chapters (executive summary, event-critical ops, architecture, M1-M6 plan, risk register, community/product vision, known-unknowns → decisions).
- **7 decisions needed before R14**: identity-loop scope/timing, WIP accept-gate, check-in, event-time budget, mock-fixture deletion, in-app finalist panel in M2?, content-restoration owner.

## Event vs report (agent 3) — the honest weighting
- Operator (not delegable): Resend verify + RESEND_FROM + test, secrets, judge emails, fixtures, SITE_URL, content restoration, 09/10 flip. ~2 days of attention.
- Other Claude: settle WIP → land M1 + content-publish fixes + the identity-loop invite path.
- Rounds: continue auditing the DESIGN, never the red tree.
- **KEY RECOMMENDATION — DEPRIORITIZE M2 pre-event**: the seeded edition works on today's hardcoded deliverables; shipping the submit_team rewrite pre-09/09 buys generalization at the risk of rejecting live submissions. M2-M6 execute POST-event.
- **"The event does not require data-drivenness — it requires deliverability, content, judging, and the finalist reveal."** The report's verdict must say this so no future round mistakes the architecture for the event.
- In-app finalist panel (cheap, S) so the 09/10 reveal doesn't hinge on email.

## Where round 13 focuses (final review)
The definitive R14-20 plan with acceptance, the user-decision brief, and the distilled operator runbook.
