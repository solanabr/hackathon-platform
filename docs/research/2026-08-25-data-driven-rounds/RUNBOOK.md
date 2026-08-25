# Operator runbook — Hackathon Solana & Cursor (31 Aug - 12 Sep 2026)

The distilled runbook from the 20-round audit (rounds 11-13 of docs/research/2026-08-25-data-driven-rounds).
Three phases, 17 steps. Everything here is operator work — no code changes required (flagged exceptions noted).

## Before launch (T-6 to T-1)

1. **Email deliverability (the #1 risk)** — verify `superteam.com.br` in Resend (MX/SPF/DKIM/DMARC), set `RESEND_FROM=Superteam Brasil <...@superteam.com.br>` in `.env.local` + Vercel, send a test invite to a NON-owner address. Until this, every invite/submission/finalist email is silently lost (sandbox `onboarding@resend.dev` only reaches the owner).
2. **Rotate the 3 leaked secrets** — GitHub OAuth (regenerate in GitHub → paste in Supabase), the service role key (new value in Vercel → redeploy → disable old in Supabase), Resend key.
3. **Set `NEXT_PUBLIC_SITE_URL`** on Vercel to the production URL — email links fall back to localhost without it.
4. **Delete the mock fixtures** — `delete from auth.users where email like '%@mock.test';`. The two live test submissions stay (owner call) — flag them to the judges so they're not judged/placed as real entries.
5. **Restore the content** — the positions 2-5 titles are literally "Em breve" (the real titles + 4 speakers were erased from the DB): restore the titles (Cursor Night, Tema a definir, Solana/Kauê, business/pitch), the speakers (Marcelo/Daniel, Solange, Kauê, Aceleradora), and descriptions. These are the public agenda's selling points.
6. **Seed a Pitch Day card** (12/09) so the agenda doesn't end at 05/09.
7. **Publish the abertura** (31/08) with its recording.
8. **Onboard the judges** — each judge must sign in once first (grantRole requires an existing user), then grant the role in Admin > Pessoas, then assign projects (2/project) in Admin > Jurados. Today there is no judge-invite email and no /judge redirect after login — the sign-in-first order is the workaround. **(The audit recommends building the judge-onboarding + in-app finalist panel before the event.)**
9. **Confirm the cron auto-lock** — job `lock-overdue-submissions` should run every minute via pg_cron (00024). Verify with SQL: `select jobname, schedule, active from cron.job;`

## During the event (31 Aug - 12 Sep)

10. **Publish each session's recording after the live** — two steps per session (save the video, then Publicar). A forgotten publish leaves "em breve" forever.
11. **The mentoria (05/09)** runs over WhatsApp — the publish guard requires a video/file, so it stays "em breve" unless the guard is exempted for non-aula kinds or a follow-up file is published. **(The audit recommends the mentoria exemption.)**
12. **09/09 — confirm the submission close** — the cron lock should have flipped drafts to submitted at 12:00 BRT; verify no team is stuck.
13. **09/10 — the finalist flip (the single point of failure)** — in order: set `is_finalist` on the selected teams, run "Notificar finalistas" (idempotent), **re-assign the judges for round=final** (assignments don't carry across rounds), then **flip the edition status to `judging`** — the public finalists section and the account chip are gated on it, so without the flip nothing shows. Verify the public section renders. **(The audit recommends the in-app finalist panel so the reveal doesn't hinge on email.)**
14. **Pitch Day check-in (12/09)** — no check-in path exists; use the Luma list / a spreadsheet manually.

## Pitch Day + post

15. **Final-round judging** — judges rate their assigned finalists; the final average decides the winners.
16. **Winners** — set placement 1-4 in Admin > Finalistas, flip the edition status to `closed`, verify the gallery pins 1º/2º/3º.
17. **Decommission or next edition** — the create-edition flow is unbuilt (seed-only today); the audit's M5 milestone adds it plus the template duplication.
