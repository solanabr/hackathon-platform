# Participant flow audit — pre-launch

Four parallel audits of team formation, submission, onboarding and
data-integrity/races, run at `626bfb2` before sharing the platform publicly.
Everything below was verified against the code or production, not inferred.

## Already fixed — do not redo

| Fix | Commit |
|---|---|
| Open redirect: `sanitizeRedirect` accepted `/\t/evil.com`, which resolves cross-origin. Now rejects control chars; has tests. | `c8c61ca` |
| Participants could INSERT `teams` with `is_finalist`/`placement` set and appear as public winners. Grant narrowed to 4 columns. | `72f442f` |
| `public_schedule` exposed draft editions' agenda to anon. | `72f442f` |
| Pessoas listed nobody — ambiguous FK embed rejected by PostgREST. | `840fc9b` |

## Blockers — each one loses a real entry

### 1. The 36-hour lockout

`registration_closes_at` is 07/09 23:59; `submission_deadline_at` is 09/09
12:00 (confirmed in production). In that window a leader can still add a
teammate, who is inserted as **accepted**, but every route bounces them
`/dashboard → /register → public landing`. They can never register, and
`submit_team` requires `luma_confirmed_at` on every accepted member — so the
team can never submit. Removing the member trips `team_too_small` instead.

Cheapest fix: move `registration_closes_at` to the submission deadline.
Alternative: exempt accepted members from the registration gate, or refuse
`addMemberByEmail` for anyone without a registration row.

### 2. Autosave reports success on a discarded write

`submission-editor.tsx` calls `.update(payload).eq("team_id", …)` with no
`.select()`. PostgREST answers 204 with an empty body, so the client sees
`error: null` even when RLS matched zero rows (verified against the live
API). After the cron locks at 12:01 the tab keeps painting "Salvo" over
writes that are being thrown away. Add `.select("id")` and treat an empty
array as failure. Same bug on the image save path.

### 3. No consent, and no way to accept an invite

`team/actions.ts` inserts `status: "accepted"` for anyone with an existing
account. That person is now blocked from creating their own team, and once
the team submits `leave_team` raises `team_locked` and the UI hides the
button entirely. A typo'd address does this to a real participant silently.

Worse, the *ghost* path has no recovery: `handle_new_user` (00025) is the
only code that flips pending → accepted, it fires once at signup, and it
skips when the team is full, locked, or when the user has pending rows in two
editions (`limit 1`, no `hackathon_id` partition). A skipped row stays
pending forever while still consuming a slot, and the UI promises a mechanism
that does not exist. `accept_team_invite` has zero callers.

Fix as one piece: insert `pending` for existing accounts too, and add a real
accept action that re-runs lock/capacity/registration checks, wired to the
"Entrar no time" button that currently does nothing.

### 4. Auto-lock publishes empty projects

`auto_lock_overdue` flips every overdue draft to `submitted` with none of
`submit_team`'s validation. A team that registered and never opened the form
becomes a blank public gallery card and gets public member profiles, and
enters the judging pool. Nothing gates team creation on the deadline either,
so a team created months later is promoted within 60 seconds. Gate the cron
on the same required fields, or add `project_name is not null` to the three
public views.

## High — fix before sharing the link

- **No `not-found.tsx` and no `error.tsx` anywhere.** A typo'd edition URL,
  a draft edition, or a non-judge hitting `/judge` shows Next's default
  English 404 with no header and no way back. Most likely first impression
  for a stranger.
- **Every auth failure is silent.** `auth/callback/route.ts` discards the
  error from `exchangeCodeForSession` and ignores Supabase's `?error=`; the
  `/auth` page takes no `searchParams`, so `error=auth_failed` renders
  nothing. Opening a magic link in a different browser gives a blank form
  forever.
- **`/auth` drops `next` for an already-authenticated visitor**, sending
  someone mid-registration to their painel instead.
- **No admin team-management surface.** No member removal, leader
  reassignment or team delete anywhere in `/admin`. Every repair during the
  event is hand-written SQL, and a dark leader strands a team.

## Races — all confirmed, none currently triggered in prod data

- `leave_team` and `remove_team_member` read `teams.locked` without `FOR
  UPDATE` (unlike `delete_team` and `transfer_team_leadership`, which lock),
  so a member can leave a team that just locked, leaving a submitted team
  with one member. `submit_team` takes no row lock at all.
- `addMemberByEmail` counts then inserts without a lock — two tabs push a
  team to 5 members; no constraint bounds team size.
- `handle_new_user`'s accept has the same unlocked `< 4` count.
- Double-submit: `submit()` awaits `save()` before disabling the button, so
  the confirm dialog can fire a second submission; `submit_team` reads
  `locked` without `FOR UPDATE`, so both can pass and two confirmation
  emails go out.
- `transfer_team_leadership` racing `remove_team_member` can leave
  `teams.leader_id` pointing at a non-member — unrecoverable without SQL.
  Nothing enforces `leader_id` ⇔ `is_leader`.

## Lower, but cheap

- Link fields are sanitized **client-side only**; `authenticated` holds the
  column grant, so arbitrary strings can be PATCHed and are rendered as raw
  `href`s on the public project page. Sanitize at render.
- Two tabs: autosave writes all columns from local state, so the last save
  reverts the other tab's work.
- "Preencha todos os campos obrigatórios (incluindo a imagem do projeto)" —
  the image has not been required since 00016.
- `/account` is where every new user lands (no `full_name` from OTP signup)
  and its only CTA walks them away from registration; arriving with `?next`
  shows no indication they are mid-flow.
- `team/page.tsx` and `team/new/page.tsx` bounce profile-incomplete users to
  `?next=…/register` regardless of where they were.
- `registerForHackathon` omits the draft and profile checks its own page
  makes.
- The landing CTA stays green past the countdown, then bounces silently.
- The header has no route to the painel, though `redirectPath` is computed
  on every render.
- A non-leader member can delete the team's cover image file.
- `anon` and `authenticated` still hold TRUNCATE on every public table
  (not reachable via PostgREST — hygiene).

## Verified clean — do not re-audit

Cross-team reads and writes (the member-scoped policies route through the
00005 SECURITY DEFINER helpers; no recursion, no leakage). All 12 SECURITY
DEFINER functions own `postgres` with pinned `search_path` and re-derive
`auth.uid()`. Uniqueness holds: one accepted membership and one registration
per (user, edition), both by unique index. Required fields agree across
editor, dashboard checklist and RPC. Deadline is half-open consistently in
all three layers. Non-leader read-only is enforced in four independent
places. Image upload paths are correctly team-prefixed. `src/middleware.ts`
is at the right path and `PUBLIC_ROUTES` matches the `(public)` group exactly.
