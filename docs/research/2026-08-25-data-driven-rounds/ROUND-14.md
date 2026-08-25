# Round 14 — SQL verification: applied state, RLS probes, deferred probes

5 agents (3 landed; submit_team-paths + risk-verdict pending, appended when they land). Read-only + live REST probes.

## Applied-state probes (agent 1)
- **00032-00035 PROVED applied** (public_submissions 5 rows, teams.placement incl. AgroTrace=1, pending_membership_for_edition RPC, public_profiles 10 rows).
- **00036 NOT applied + untracked** (PGRST205; absent from the schema cache; not in git).
- **HIGH-IMPACT: 00036 unapplied but code expects it** — `src/lib/sections.ts` queries `hackathon_sections` and silently returns `[]` on PGRST205 → the edition page renders NO phases/schedule/deliverables/prizes until the migration lands. Not a crash — a visible regression.
- Draft leak re-confirmed (anon reads the full draft row); public_schedule clean; cron NEEDS-SQL.
- **Funnel**: 5 submitted + 3 draft submissions, 8 teams, 16 registrations, 10 profiles, 2 hackathons (1 published).
- **5 mock projects live in the public gallery** (10 @mock.test users).

## RLS impersonation probes (agent 2)
- Anon reads on submissions/teams/team_members/users/registrations/platform_roles → `[]` (RLS holds).
- **Draft leak CONFIRMED live** — hackathons_read using(true) exposes the full draft row.
- Public views gated as designed (no draft leaks through the views).
- Anon writes denied at the GRANT layer (42501, RLS not even reached).
- Static verdicts (authenticated): non-leader PATCH PROVED-BY-READING (00022 leader policy + 00018 column grants + 00025 trigger); judge assigned-only gate app-layer sound; submit_team leader paths correct; guard trigger sound; **the draft-leak fix (using status <> 'draft') is SAFE** — admins read via service-role/BYPASSRLS.
- Nit: public_submissions whitelists pitch_video_url/demo_video_url to anon (the unlisted-id protection assumption).

## Deferred-probes register (agent 3)
- The static half settles cleanly: 00022's WITH CHECK + 00025's trigger block status writes even from the leader; direct REST writes to submission_ratings impossible (RLS on, no policies).
- 12 deferred probes with exact SQL/browser commands for the operator: the migration-ledger head check (grounds everything), the cron.job check (the deadline's enforcement), the non-leader status-PATCH (the report's central security claim), the judge assigned-only drill, the 375px + 7-flow browser QA, the deliverability test, the finalists/placement check.
- Settle-now (max leverage): schema_migrations head, cron.job + run history, non-leader status-PATCH as authenticated.

## Pending (will append)
- submit_team paths end-to-end (the failure codes + the preorder verification).
- The risk-verdict upgrade (top-15 → PROVED/REFUTED/NEEDS-EXEC).

## Where round 15 focuses
The build blueprint: M1-M6 per-milestone specs (exact SQL, files, acceptance) + the test matrix + the identity-loop blueprints.
