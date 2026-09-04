# Superteam Brasil — Hackathon Platform

Next.js 16 App Router, TypeScript, Tailwind v4, Supabase. Multi-edition hackathon platform for Superteam Brasil (born as the BH Onchain submission flow); current live edition is Hackathon Solana & Cursor, Sep 2026.

## Quick reference

- `npm run dev` — start dev server
- `npm test` — run vitest tests
- `npm run build` — production build (catches type errors)

## Architecture

- **Route groups:** `(public)/` = no auth, `(app)/` = auth required. Middleware gates auth — do NOT add auth checks in `(app)/layout.tsx` (causes redirect loops). The middleware **must** live at `src/middleware.ts`: this project keeps its app in `src/`, and a `middleware.ts` at the repo root is silently ignored, which leaves every protected route rendering a 404 instead of redirecting to `/auth`.
- **Supabase clients:**
  - `createClient()` (browser) — user-scoped, RLS-enforced.
  - `createServerSupabaseClient()` (server) — same scoping, used in server components and route handlers.
  - `createServiceRoleClient()` — bypasses RLS. Used by admin server actions (gated by `requireAdmin()`), cross-team reads in `/admin`, cron auto-lock, and the team-leader manual add-member action.
- **Cross-table mutations** route through one of two patterns:
  1. `SECURITY DEFINER` RPCs with explicit `auth.uid()` checks — `create_team_with_leader`, `accept_pending_membership`/`decline_pending_membership`, `submit_team`, `leave_team`, `remove_team_member`, `transfer_team_leadership`, `delete_team`. Used by member-facing flows.
  2. Server actions that gate on `requireUser()` / `requireAdmin()` / `requireEditionAdmin(hackathonId)` / `requireEditionAdminBySlug(slug)` then write with `createServiceRoleClient()`. An `admin` row in `platform_roles` with a NULL `hackathon_id` is global; with an id it scopes the person to that one edition (organizer) — everything under `/admin/h/[slug]` gates on the edition variants, never bare `requireAdmin()`. `requireEditionAdminBySlug` returns the resolved hackathon: every service-role mutation in a slug-gated action MUST filter on `gate.hackathon.id` as well as the row id, or a scoped admin of edition A can write to edition B by passing B's row ids.
  Single-table RLS handles everything else.
- **Auto-rows via triggers:** inserting a team creates the submission row and the leader's `team_members` row. Inserting an `auth.users` row creates the mirror `users` row **and** auto-links any pending `team_members` ghost rows (`user_id is null`, matching `invited_email`) — see migration 00012.

## Conventions

- **Language:** UI copy in Portuguese (pt-BR). Routes and code in English.
  **Anything written into git or GitHub is English** — commits, branch names, PR
  titles and bodies, review comments. pt-BR is only for what a participant reads.
- **Brand:** the LP language — cream ground, ink, emerald, Superteam yellow; sticker cards (`border-2 border-green-dark` + `shadow-sticker`), pill navs via `PillLink`. Tokens are in `@theme` in `src/app/globals.css`.
- **Typography:** Archivo headings, Inter body — both via `next/font/google`.
- **Query errors are never swallowed:** destructure `error` and route it through `unwrap()` (log + throw) or `logQueryError()` from `src/lib/supabase/unwrap.ts`; mutations return `{ ok: false }`.
- **Date formatting:** named `Intl` formatters live in `src/lib/dates.ts` (`DAY_MONTH`, `TIME_HM`, `stripPeriods`, …) — don't hand-roll new ones.
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
- Luma "verification" is self-attestation (`hackathon_registrations.luma_confirmed_at`; the old `users.luma_registered_at` column is gone). Cross-reference manually with a CSV export from the Luma organizer dashboard.
- Auto-lock runs as a `pg_cron` job inside Postgres (`lock-overdue-submissions`, every minute), not as an HTTP endpoint. The deadline itself is enforced by `submit_team` and the submissions update policy; the job only materialises the locked state.
- **Three required env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (plus optional `RESEND_API_KEY`/`RESEND_FROM`/`NEXT_PUBLIC_SITE_URL` for email). Admin and judge are rows in `platform_roles`, not an env allowlist — grant them at `/admin/people`.
- **`submission_ratings` table** has RLS enabled but **no policies** — only `service_role` can touch it. Mutations route through `src/app/(app)/judge/actions.ts` (gated by `requireJudge` + the per-round assignment check). Don't query it from the browser client; you'll silently get zero rows.
- **`hackathon_mentors` / `mentorship_bookings`** have RLS enabled with **no policies** either: `booking_url` is the privilege the whole feature gates, and a row policy protects rows, not columns. Member-facing access goes through the `mentorship_board` / `book_mentorship` RPCs (migration 00059), admin writes through the service role. The catalog the board returns deliberately omits `booking_url` — the link is revealed only in the bookings a team already made, and only to that team's leader. Querying either table from a user-scoped client returns zero rows.
- **Manual add-member flow** always inserts `status='pending'`: existing accounts accept/decline on the team page (`accept_pending_membership`); unknown emails become ghost rows (`user_id is null`) that `handle_new_user` links and auto-accepts per edition at signup. No token-based invites exist anymore.
- **Form alignment with the regulamento:** the form has ONE required video field (`pitch_video_url`, labelled "Vídeo de apresentação (demo)"). The `demo_video_url` column still exists on the table for historical data but is no longer required by the form or by `submit_team` (migration 00013).
- **The edition page is one markdown document** (`hackathons.page_md`, edited at `/admin/h/[slug]/page`). The old per-section system, block markers and `prize_summary` parsing are gone — prizes are plain markdown in the document; only Finalistas (date-gated) and the sponsor band render outside it. Retired date columns (`development_starts_at`, `presential_at`, `voting_*`) and unread `ends_at` stay in place until the post-event cutover (docs/EDITION-DATES.md).

## Testing

- Unit tests in `src/lib/__tests__/`. Covers sanitizers, hackathon date helpers, finalists ranking and page-doc parsing.
- No DB integration tests — RPCs are exercised manually before the event. Add tests around `submit_team` validation if the event runs again.
