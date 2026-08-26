# Superteam Brasil — Hackathon Platform

Multi-edition hackathon platform for [Superteam Brasil](https://br.superteam.fun): public edition pages, registration, team formation, submissions with deadline lock, and judging. Current live edition: **Hackathon Solana & Cursor** (Passo Fundo/RS, Sep 2026).

## Quick start

```bash
npm install
cp .env.example .env.local        # fill values
npm run dev                       # http://localhost:3000
```

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build (catches type errors) |
| `npm test` | Vitest once |
| `npm run lint` | ESLint |

## Tech stack

Next.js 16 App Router + React 19 + TypeScript · Supabase (Postgres, Auth, RLS, Storage, pg_cron) · Tailwind v4 (`@theme` tokens, no config file) · Resend for email · Vitest · Vercel.

## Environment variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | User-scoped client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key (admin actions, cross-team reads) |
| `RESEND_API_KEY` / `RESEND_FROM` | Optional — without them emails log to the console |
| `NEXT_PUBLIC_SITE_URL` | Optional canonical URL for links in emails |

Admin and judge are **rows in `platform_roles`**, granted at `/admin/people` — not env allowlists. An `admin` row with NULL `hackathon_id` is global; with an id it scopes the person to that one edition.

## Architecture

- `(public)/` — home hub, edition landing (`/h/[slug]`), projects gallery, auth. The edition page body is **hand-written markdown** (`hackathons.page_md`, edited at `/admin/h/[slug]/page`); finalists and the sponsor band render after the document on their own.
- `(app)/` — auth-gated: painel (`/h/[slug]/dashboard|team|submission|content`), account, `/judge`, `/admin`. Middleware at `src/middleware.ts` gates auth — never add checks in `(app)/layout.tsx` (redirect loops), and the file must live under `src/` or every protected route 404s.
- Cross-table mutations: SECURITY DEFINER RPCs for member-facing flows (`create_team_with_leader`, `accept_pending_membership`, `submit_team`, `leave_team`, …) and service-role server actions gated by `requireAdmin()` / `requireEditionAdminBySlug(slug)` for admin flows — every slug-gated write also filters on the gated `hackathon_id`.

### Team lifecycle

Leader creates the team (blocked after the submission deadline); adds members by email — existing accounts get a **pending invite** they accept or decline on the team page, unknown emails become ghost rows auto-linked at signup. Teams have 2–4 accepted members. The leader submits via `submit_team` (validates required fields, Luma confirmation on every member, locks the team). A `pg_cron` job (`lock-overdue-submissions`, every minute) locks overdue teams; drafts are only promoted to `submitted` when they pass the same required-field validation.

### Judging

Two rounds in `submission_ratings` (`triagem`/`final`), one 0–10 grade per judge per round. Judges see only projects assigned to them at `/admin/h/[slug]/judges`; averages drive the finalist picker at `/admin/h/[slug]/finalistas`. The edition status flip to `judging` (lifecycle control on the admin overview) is what releases the public finalists section once `finalists_announced_at` passes.

### Luma

Registration is self-attested (`hackathon_registrations.luma_confirmed_at`); cross-reference manually with a CSV export from the Luma organizer dashboard.

## Supabase setup

Apply `supabase/migrations/` in order (CLI or SQL editor). See CLAUDE.md's gotchas — notably the restored default grants (00009/00010) and the pre-existing-users backfill.

## Conventions

- UI copy in **pt-BR**; code, routes and everything in git in **English**.
- `.maybeSingle()` over `.single()`; every `(app)/` page exports `dynamic = "force-dynamic"`.
- Query errors are never swallowed: `unwrap()`/`logQueryError()` from `src/lib/supabase/unwrap.ts`.
- No code comments by default; when needed, explain WHY.
- Design language: cream/ink/emerald/yellow LP tokens in `globals.css`, sticker cards (`border-2 border-green-dark` + `shadow-sticker`), pill navs via `PillLink`.
