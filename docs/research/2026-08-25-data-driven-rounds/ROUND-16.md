# Round 16 — Runbook drills + data hygiene (as research)

5 agents. Event-day procedures written as testable drills.

## Deliverability drill (agent 1)
- The exact DNS records (Resend → superteam.com.br): MX (feedback-smtp.us-east-1.amazonses.com), SPF (`v=spf1 include:amazonses.com ~all` — merge, never two SPF), DKIM (resend._domainkey), DMARC (p=none). Verify with dig. **MX conflict caveat**: existing Workspace mail would be hijacked — check first, use a `mail.` subdomain if present.
- Env: RESEND_FROM = `Superteam Brasil <noreply@superteam.com.br>`, NEXT_PUBLIC_SITE_URL on Vercel.
- Test matrix: all 3 templates to a non-owner Gmail (invite CTA resolves, submission-received via after(), finalist).
- PASS/FAIL gate: domain Verified + 3 non-owner arrivals + CTAs resolve + logs clean. PASS → E1 refuted; FAIL → the reveal must not hinge on email.

## 09/10 finalist flip drill (agent 2) — 30-min timebox
1 Pick (triagem average) → 2 set is_finalist → 3 notify (idempotent) → 4 **re-assign judges for round=final** (assignments don't carry; the grid starts empty — skipping this = judges see nothing on Pitch Day) → 5 flip status to judging (the reveal gate — decoupled from the round switch, which keys only off finalists_announced_at) → 6 verify (public section, account chip, judge Final pill).
- Failure modes + recovery per step; dry-run pre-event against the two live test submissions; the drill must NOT assume the deferred in-app panel.

## Agenda restoration + data hygiene (agent 3)
- **PROBE**: pos 1 Abertura has real speakers (Draau, Quito, Nery); pos 2-5 are literally "Em breve" (speakers null) — the public landing renders these titles (the leak).
- Restore: pos 2 Cursor Night / Marcelo·Daniel; pos 3 Tema a definir / Solange; pos 4 Desenvolvimento em Solana / Kauê; pos 5 Business model + pitch / Aceleradora. Pitch Day card (pos 7, evento kind) — caveat: the public agenda filters kind !== 'evento' (render path needed).
- Mentoria exemption: gate only `kind === 'aula'` in the publish guard.
- **Mock deletion ORDER matters**: `delete from teams where leader_id in (mock users)` FIRST (teams.leader_id lacks cascade), then delete the users. Removes the 5 seeded submitted teams.
- The live test submissions (teste, Equipe Hacka, First) are DRAFTS — the 09/09 cron auto-lock flips them into the judged pool; flag to the judges.

## Browser QA checklist (agent 4)
- Tier 1 (breaks the event): the submit gate, the 800ms autosave, submit-during-autosave, the closed edition.
- Tier 2: the non-admin judge assigned-only, the admin spot-check, the picker/notify.
- Tier 3: the gallery pins, the painel countdown flip, 375px (deck fan, countdown, judge — no horizontal scroll, no dark-on-dark).
- Stale copy flagged: "incluindo a imagem do projeto" (image not required).

## Check-in design (agent 5)
- **PROVED high-impact**: the Screening "confirmed" count is SELF-ATTESTED (registerForHackathon sets luma_confirmed_at from a checkbox) — never cite it as physical presence.
- **PROVED**: no check-in path exists anywhere in code — manual is correct (runbook step 14), don't build pre-event.
- Manual: the Luma list (name, email, status, ticket, check-in) + the platform read-only (add name sort/filter to the screening table — should-fix before event day).
- Post-event automated: `checked_in_at timestamptz` + a service-role toggle in the screening table + per-team attendance (the §4.4 quorum — undocumented, operator interprets).

## Where round 17 focuses
The competitive deep-map (Colosseum, DoraHacks, Devfolio, Devpost, radiant, align) — the "ultimate" definition.
