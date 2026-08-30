# Team-up: find teammates and teams

DoraHacks-style two-sided matchmaking board per edition. Teams post open
roles; solo hackers post availability. Both directions end in the existing
consensual-membership machinery instead of a chat we don't have:

- **Team recruits → hacker applies.** Leader accepts an application and the
  hacker becomes an accepted member in one step (the application itself is the
  hacker's consent).
- **Hacker posts availability → leader invites.** Reuses the existing pending
  invite + `accept_pending_membership` flow untouched.

DoraHacks resolves matches through DMs and free-text roles; we resolve them
through structured apply/invite, a fixed role taxonomy, and profile-driven
contact info.

## Decisions (settled with the user)

- Board access: **login + registration in the edition** required.
- Hacker cards show **profile data** (name, avatar, headline, GitHub, Twitter,
  LinkedIn, Telegram). No per-post contact field. Going "available" requires a
  complete-enough profile; the UI sends incomplete users to `/account` first.
- Emails: leader gets a Resend email on new application. Invite emails already
  exist.

## Data model — migration 00051

Three new tables. No changes to the hardened `teams` grants.

### `team_openings` (1:1 with team)

- `team_id` uuid PK → `teams(id)` on delete cascade
- `hackathon_id` uuid not null → `hackathons(id)` (denormalized for board reads)
- `roles` text[] not null, check `cardinality(roles) between 1 and 6`
- `note` text, check `char_length(note) <= 280`
- `active` boolean not null default true
- `created_at` / `updated_at`

RLS: leader of the team (via `teams.leader_id = auth.uid()`) may
insert/update/delete/select their own row. Board reads go through the RPC.

### `team_seekers` (availability posts)

- `id` uuid PK
- `hackathon_id` uuid not null → hackathons
- `user_id` uuid not null → users; unique `(hackathon_id, user_id)`
- `roles` text[] not null, same cardinality check
- `note` text, check `char_length(note) <= 280`
- `active` boolean not null default true
- `created_at` / `updated_at`

RLS: owner full CRUD on own rows (`user_id = auth.uid()`). Board reads via RPC.

### `team_applications`

- `id` uuid PK
- `team_id` uuid not null → teams on delete cascade
- `hackathon_id` uuid not null → hackathons
- `user_id` uuid not null → users
- `message` text, check `char_length(message) <= 500`
- `status` text check in `('pending','accepted','declined','withdrawn')`,
  default `'pending'`
- `created_at`, `decided_at`, `decided_by` uuid
- Partial unique index `(team_id, user_id) where status = 'pending'`

RLS: applicant selects own rows. Leader reads their team's applications with
the service role after a leader check in the server action (pattern 2), so no
teams-join select policy (avoids the RLS recursion class from 00005).

All three tables: explicit grants to `authenticated`/`service_role` per the
00009/00010 convention, RLS enabled.

## RPCs — SECURITY DEFINER, `set search_path = public, pg_temp`

### `team_up_board(p_hackathon_id uuid)`

Gate: caller has a row in `hackathon_registrations` for the edition, else
raise `not_registered`. Returns two JSON sets:

- `teams`: active openings whose team is unlocked and has < 4 accepted
  members. Fields: team id, name, description, roles, note, accepted count,
  leader name + avatar.
- `seekers`: active posts whose owner has no accepted membership in the
  edition. Fields: user id, full_name, avatar_url, headline, roles, note,
  github_url, twitter_url, linkedin_url, telegram_handle.

One round trip; all visibility filtering lives here.

### `apply_to_team(p_team_id uuid, p_message text)`

Checks, in order: authenticated; registered in the team's edition; no
accepted membership in the edition; opening exists and `active`; team
unlocked and < 4 accepted; no duplicate pending application. Inserts the
application. Error strings follow the existing `team_locked`/`team_full`
convention.

### `withdraw_application(p_application_id uuid)`

Owner + pending only → status `withdrawn`.

### `respond_to_application(p_application_id uuid, p_accept boolean)`

Caller must be the team's leader; application must be pending. On accept,
inside one transaction with `select ... from teams ... for update`:

1. Re-check lock, capacity, applicant not on another accepted team.
2. Insert `team_members` row: `user_id`, `invited_email` = applicant's email,
   `is_leader` false, `status 'accepted'`, `accepted_at now()`.
3. Mark application `accepted` (`decided_at`, `decided_by`).
4. Deactivate the applicant's `team_seekers` post for the edition.
5. Withdraw their other pending applications in the edition.

On decline: mark `declined` only.

### `accept_pending_membership` (extend, same migration)

After a successful accept, also deactivate the caller's seeker post and
withdraw their pending applications for that edition — joining via invite
must clean up the same state as joining via application.

## Role taxonomy

`src/lib/team-up.ts` exports the fixed list (stored keys, pt-BR labels):

`frontend`, `backend`, `fullstack`, `contracts` (Smart Contracts / Solana),
`design`, `product` (Produto / Negócios), `pitch` (Pitch / Vídeo), `data`
(Dados / IA).

Server actions validate `roles ⊆ taxonomy`; the DB only checks cardinality.

## Profile completeness gate

`isProfileCompleteForTeamUp(user)` in `src/lib/team-up.ts`: requires
`full_name`, `headline`, and `telegram_handle`. Enforced in the
create/activate seeker server action and reflected in the UI (card links to
`/account` with copy explaining why). GitHub/Twitter/LinkedIn shown when
present but not required.

## Server actions — `src/app/(app)/h/[slug]/team-up/actions.ts`

All gate on `requireUser()`; RPC-backed ones use the user-scoped client.

- `upsertOpening` / `setOpeningActive` — leader check (service role read),
  writes `team_openings` (roles validated against taxonomy).
- `upsertSeekerPost` / `setSeekerActive` — completeness gate, writes own row.
- `applyToTeam` / `withdrawApplication` — thin RPC wrappers, pt-BR error map.
- `respondToApplication` — RPC wrapper; used from the team page.
- `inviteSeeker(teamId, userId)` — resolves the seeker's email with the
  service role, then delegates to the existing `addMemberByEmail` logic
  (shared helper extracted, not duplicated), so invites keep the pending →
  accept flow and its email.
- On successful `applyToTeam`, send the application email to the leader via
  `after()` (non-blocking, failure logged, never fails the action).

## Email

One new template in `src/lib/email.ts`: `sendApplicationReceived` — applicant
name, roles, message excerpt, link to the team page. Same Resend plumbing and
env fallbacks as `sendTeamInvite`.

## UI

### `/h/[slug]/team-up` (app group, force-dynamic)

Gates like the painel: `requireUser`, registration complete else redirect to
`/h/[slug]/register`. Closed state (board hidden, "Formação de times
encerrada") once the submission window closes.

Layout in the LP language (sticker cards, pill tabs): two columns on desktop,
tabs on mobile — **Times recrutando** and **Quem está disponível**.

- Top strip = *your* state: teamless → seeker post editor (or completeness
  CTA) + your pending applications with withdraw; leader → shortcut to your
  recruiting settings on the team page.
- Team card: name, roles as chips, note, member count (`3/4`), leader
  avatar, **Candidatar-se** button (opens message field). Own team and
  already-applied states handled.
- Seeker card: avatar, name → public profile link, headline, roles chips,
  note, contact icons (Telegram/GitHub/Twitter/LinkedIn). Leaders see
  **Convidar**.

### Team page additions

Leader-only **Recrutamento** section: active toggle, role chips selector,
note. Below it, **Candidaturas** list (name → profile, roles, message,
accept/decline). Members see nothing new.

### Entry points

- `PainelNav`: new tab `team-up`, label **Encontrar time**.
- Painel: teamless CTA card linking to the board.

## Lifecycle rules

- Full (4 accepted) or locked teams never appear on the board; the RPC
  filters, no state to maintain.
- Seekers with an accepted membership are filtered out server-side even if a
  stale post is active (belt and braces on top of the cleanup writes).
- Pending applications to a team that fills or locks stay pending;
  `respond_to_application` re-checks and fails with the standard errors.
- Board and all mutating RPCs live inside the submission window; after the
  deadline the page renders the closed state.

## Testing

- Unit (vitest, `src/lib/__tests__/`): taxonomy validation, profile
  completeness, any board-shaping helpers.
- RLS/RPC verification **by impersonation** in SQL before launch: prove a
  non-leader cannot respond, a non-registered user cannot read the board, an
  applicant cannot accept themselves, and the accept path enforces capacity.
- Migration applied via Supabase MCP only after explicit approval.

## Out of scope (v1)

- Chat/DMs, free-text roles, notifications beyond the one email, admin
  moderation UI, browsing across editions.
