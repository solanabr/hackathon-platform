# Agent notes

Next.js 16 App Router-specific warnings for contributors (human or AI).

## Don't

- **Don't run `create-next-app`** — the project is scaffolded by hand; running the CLI here will fail (non-empty dir) or wipe configuration.
- **Don't add auth checks in `(app)/layout.tsx`** — middleware already gates auth. Layout-level checks cause redirect loops on token refresh.
- **Don't use `.single()`** on Supabase queries unless you've verified the row must exist. Use `.maybeSingle()` and handle null.
- **Don't introduce a service-role call from a client component.** The service role key must never reach the browser.
- **Don't add backwards-compatibility shims** for removed code. Delete cleanly.

## Do

- Use `createServerSupabaseClient()` from `src/lib/supabase/server.ts` for server components and route handlers. RLS handles auth.
- Use `createServiceRoleClient()` only in the wired places: role resolution (`src/lib/roles.ts`), role management (`/admin/pessoas` actions), cron lock (`/api/cron/lock-submissions`).
- Add `export const dynamic = 'force-dynamic'` on any new `(app)/*` page that reads auth state. Without it you'll cache a stale `auth.uid()` and redirect users to the wrong place.
- Mirror the pattern in `lib/user-state.ts` for any new gated page: call `requireUser()` server-side and redirect on missing profile fields.
- When adding fields to `submissions`, prefer additive SQL — the `submit_team` RPC and the `SubmissionEditor` component both reference field names directly.
