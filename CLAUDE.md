# BH Onchain Hackathon — Submission Platform

Next.js 16 App Router, TypeScript, Tailwind v4, Supabase. Submission flow for the Hackathon BH Onchain (Solana Superteam track, May 2026).

## Quick reference

- `npm run dev` — start dev server
- `npm test` — run vitest tests
- `npm run build` — production build (catches type errors)
- Design spec: `docs/superpowers/specs/2026-05-14-bh-onchain-submission-design.md`

## Architecture

- **Route groups:** `(public)/` = no auth, `(app)/` = auth required. Middleware gates auth — do NOT add auth checks in `(app)/layout.tsx` (causes redirect loops). The middleware **must** live at `src/middleware.ts`: this project keeps its app in `src/`, and a `middleware.ts` at the repo root is silently ignored, which leaves every protected route rendering a 404 instead of redirecting to `/auth`.
- **Supabase clients:**
  - `createClient()` (browser) — user-scoped, RLS-enforced.
  - `createServerSupabaseClient()` (server) — same scoping, used in server components and route handlers.
  - `createServiceRoleClient()` — bypasses RLS. Used by admin server actions (gated by `requireAdmin()`), cross-team reads in `/admin`, cron auto-lock, and the team-leader manual add-member action.
- **Cross-table mutations** route through one of two patterns:
  1. `SECURITY DEFINER` RPCs with explicit `auth.uid()` checks — `create_team_with_leader`, `accept_team_invite`, `submit_team`. Used by member-facing flows.
  2. Server actions that gate on `requireUser()` / `requireAdmin()` then write with `createServiceRoleClient()` — `addMemberByEmail`, `upsertRating`, `deleteRating`. Used when the gate lives in env (admin allowlist) or when the validation is simpler than the RPC overhead.
  Single-table RLS handles everything else.
- **Auto-rows via triggers:** inserting a team creates the submission row and the leader's `team_members` row. Inserting an `auth.users` row creates the mirror `users` row **and** auto-links any pending `team_members` ghost rows (`user_id is null`, matching `invited_email`) — see migration 00012.

## Conventions

- **Language:** UI copy in Portuguese (pt-BR). Routes and code in English.
  **Anything written into git or GitHub is English** — commits, branch names, PR
  titles and bodies, review comments. pt-BR is only for what a participant reads.
- **Brand:** BH Onchain purple background + gradient with Superteam BR yellow/emerald accents. Tokens are in `@theme` in `src/app/globals.css`.
- **Typography:** Outfit headings, Inter body — both via `next/font/google`.
- **Supabase queries:** use `.maybeSingle()` over `.single()` — `.single()` throws on 0 rows.
- **Dynamic pages:** every `(app)/` page exports `dynamic = 'force-dynamic'`.
- **No code comments** by default. If you write one, explain WHY, not WHAT.

## Gotchas

- `create-next-app` fails in non-empty dirs. The project was scaffolded by hand (mirroring `superteam-maker`'s approach).
- **The DB was repurposed from `supabase-solana-lms`**, which dropped the `ALTER DEFAULT PRIVILEGES` rows that normally auto-grant `anon`/`authenticated`/`service_role` on every new table. Migrations 00009/00010 restore them explicitly. If you ever fork to a fresh Supabase project, those two migrations become no-ops but should still run for parity. Symptom of missing grants: every PostgREST call 403s with "permission denied for table X" *before* RLS even runs.
- Supabase Auth doesn't backfill the `users` mirror table for accounts that existed before the trigger was added. For a fresh project this won't bite, but if you re-apply migrations to a DB with pre-existing auth users:
  ```sql
  INSERT INTO public.users (id, email)
  SELECT id, email FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id);
  ```
- `tsconfig.json` and `next-env.d.ts` are managed by Next.js — let it rewrite them on build.
- Image upload uses the public `project-images` bucket. RLS policy keys upload paths to `{team_id}/...`, so callers MUST prefix the team id (the `ImageUpload` component does this).
- Luma "verification" is self-attestation (`users.luma_registered_at`). Cross-reference manually with a CSV export from the Luma organizer dashboard.
- Auto-lock runs as a `pg_cron` job inside Postgres (`lock-overdue-submissions`, every minute), not as an HTTP endpoint. The deadline itself is enforced by `submit_team` and the submissions update policy; the job only materialises the locked state.
- **Only three env vars exist:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Admin and judge are rows in `platform_roles`, not an env allowlist — grant them at `/admin/people`.
- **`submission_ratings` table** has RLS enabled but **no policies** — only `service_role` can touch it. All mutations route through the server actions in `src/app/(app)/admin/actions.ts`, which gate on `requireAdmin()`. Don't try to query it from the browser client; you'll silently get zero rows.
- **Manual add-member flow** creates "ghost" `team_members` rows (`user_id is null`, `status='pending'`) when the email isn't registered yet. The `handle_new_user` trigger links them on signup. The legacy `/invite/[token]` page was removed in the multi-edition rework; no token-based invites exist anymore.
- **Form alignment with the regulamento:** the form has ONE required video field (`pitch_video_url`, labelled "Vídeo de apresentação (demo)"). The `demo_video_url` column still exists on the table for historical data but is no longer required by the form or by `submit_team` (migration 00013).

## Testing

- Unit tests in `src/lib/__tests__/`. Covers token sign/verify + URL/text/email sanitizers.
- No DB integration tests — RPCs are exercised manually before the event. Add tests around `submit_team` validation if the event runs again.
