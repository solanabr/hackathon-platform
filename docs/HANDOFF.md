# Handoff — Superteam Brasil hackathon platform

State as of 2026-08-21. Branch `feat/lp-redesign`, [PR #6](https://github.com/solanabr/hackathon-platform/pull/6), 17 commits, everything pushed.

## What this is

Multi-edition hackathon platform for Superteam Brasil. First edition is the
**Hackathon Solana & Cursor**, Passo Fundo/RS.

| | |
|---|---|
| Fase 1 online | 31/08 to 07/09, six content items |
| Inscrições close | 07/09 23:59 |
| Submission deadline | **09/09 12:00** |
| Finalists announced | 10/09 |
| Pitch Day, in person | 12/09, UPF Parque, judging 14:00 to 17:30 |
| Prizes | US$ 3.000 plus Cursor credits, merch, Apollo pre-incubation |

Spec: `docs/superpowers/specs/2026-08-20-stbr-hackathon-platform-design.md`
Phase 1 plan: `docs/superpowers/plans/2026-08-20-stbr-hackathon-platform-phase-1.md`
Flow audit: `docs/research/2026-08-21-participant-flow-audit.md`

## Environment

Supabase project `dqxeukfkjnoqljovkage` (name: hackathon-platform). Database is at
migration **00024**; repo files and database are in step. 00013 is deliberately
absent — it only redefined `submit_team` and 00014/00015 supersede it.

Six env vars, nothing else is read by the code:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY     server only, bypasses RLS
RESEND_API_KEY
RESEND_FROM
NEXT_PUBLIC_SITE_URL
```

Admin and judge are rows in `platform_roles`, not env. Both of Gabriel's accounts
(`gabriel.thom02@gmail.com`, `gabriel.thom04@gmail.com`) hold global admin rows.

Auto-lock runs as a `pg_cron` job (`lock-overdue-submissions`, every minute), not an
HTTP endpoint. The deadline itself is enforced by `submit_team` and the submissions
update policy; the job only materialises the locked state.

## Blocking before 31/08

1. **Resend domain is not verified.** On `onboarding@resend.dev` the API refuses any
   recipient except `devs@superteam.com.br` (verified: 403 validation_error). Every
   real team invite will fail until a domain is verified at resend.com/domains and
   `RESEND_FROM` points at it. DNS propagation is the long pole.
2. **Content is unpublished.** All six items are `published = false`. Fase 1 is
   entirely content, so participants see "em breve" for everything until an admin
   publishes each one at `/admin/h/[slug]/content` with its YouTube link or file.
3. **Rotate three secrets.** The GitHub OAuth client secret, the Supabase
   `sb_secret_...` service key and the Resend API key were all pasted into a chat
   transcript.
4. **Nobody has used this on a phone.** Every check so far was a build, a unit test,
   direct SQL, or a desktop browser.

## Open questions nobody has answered

From the list sent to Bernardo: judge emails (the four are Cokinha, Marcelo, Apollo,
Ronaldo), the evaluation criteria and their weights, and whether non-finalists get a
notification. These block Phases 3 and 4, not Phase 1.

## Not built

- Judge voting screen. `requireJudge()` exists and has zero callers.
- Finalist selection and the finalist email. `teams.is_finalist` and
  `finalist_notified_at` exist and are read by nothing.
- Project directory and hall of fame (the Colosseum-shaped surfaces). Both need data
  that does not exist until after 09/09.
- Submission-received and finalist emails. Only the team invite is wired.

## Conventions that bit us

- **Routes are English, UI copy is pt-BR.** The plan originally used pt-BR routes,
  contradicting `CLAUDE.md`; renamed in `b03042b`.
- **Everything in git and GitHub is English** — commits, PR text, review comments.
- One surface treatment: `Card` from `components/ui/card`, plus `SectionCard`,
  `StatusChip`, `CheckRow`. Do not reintroduce ad-hoc `bg-surface-raised/70`.
- Verify RLS by impersonating a real user, never by reading the policy:
  `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}'`.
- The dev server serves stale modules after edits written outside the editor. If a
  change does not appear, restart it before debugging anything else.

## Recent bug pattern worth remembering

Four bugs in this branch were invisible to builds and tests and only surfaced when a
human clicked through: the admin link that did not exist, the crash on a missing
service key, teammate registration state reading false for everyone, and any member
being able to edit the submission. Two of them were features reporting the *opposite*
of the truth. Type checks and unit tests do not reach the database boundary.
