# Cleanup audit — feat/auth-lp

Four parallel sweeps (dead code, legacy remnants, duplication + error
handling, docs/config drift) over 44 commits / 114 files. Every claim below
was verified by grep, by running the command, or against production — not
inferred. Some items were already being fixed while this was written
(`src/lib/dates.ts` and the `shadow-sticker` token now exist); re-check before
acting.

## Broken, not untidy

**1. CI cannot pass.** CI runs `pnpm install --frozen-lockfile`, but
`remark-gfm@^4.0.1` reached `package.json` via npm, so it landed in a stray
`package-lock.json` and never in `pnpm-lock.yaml`. Running CI's exact command
fails: *specifiers in the lockfile don't match specifiers in package.json*.
Delete `package-lock.json`, run `pnpm install`, gitignore it. **If you also add
`"packageManager": "pnpm@10.34.4"`, remove the `version: 9` input from
`pnpm/action-setup` in `.github/workflows/ci.yml`** or it fails with "Multiple
versions of pnpm specified".

**2. Migration 00047's race fix protects nothing.** It added `FOR UPDATE` to
`remove_team_member`, which has zero callers. Removal actually happens in
`src/app/api/team/member/route.ts` via a raw `.delete()` with read-then-write
checks and no row lock — and that route never checks whether a row was
deleted, so an RLS refusal returns `{ ok: true }`. Point the route at the RPC.

**3. `addMemberByEmail`'s middle read fails open.** Three sibling reads; two
were hardened with `logQueryError` + bail, the one between them was missed. On
failure the entire "already on another team" check is skipped (it is nested
inside `if (existingUser)`) — reopening the exact hole the neighbouring
comment documents as a past incident — and the insert writes `user_id: null`,
creating a ghost row for someone who **already has an account**. Ghost rows
only link via the signup trigger, which will never fire for them. Permanently
stuck. One-line fix, pattern already in the file twice.

**4. `getRegistration` (`src/lib/registration.ts:10`) drops its error.**
Returning null makes `isRegistrationComplete()` false, which gates six
redirects. One transient blip mid-event bounces a registered participant out
of their painel, unlogged. The fix is written 24 lines below it.

**5. Content ordering can jam permanently.** `moveSponsor` got an explicit
tie-renumber; its twin `moveContent` is still a plain swap, and neither
`position` column is unique. `createContent` computes the next position from a
read that drops its error, so a failure yields `position: 0` colliding with an
existing row — after which those two items can never be reordered.

**6. `ends_at` is a form field that lies.** Production has it populated
(`2026-09-12 09:00`), but `editionStage` still computes
`voting_closes_at ?? presential_at ?? submission_deadline_at`. The admin form
exposes "Encerramento" with help text promising a fallback that does not
exist. Wire it or remove the field.

## Dead code, safe to delete

The phase-timeline cluster only holds itself up — `src/lib/phase-copy.ts`,
`src/components/edition/phase-timeline.tsx`, `src/lib/phases.ts`, and
`phaseBoundaries` in `hackathon.ts` (~150 lines plus test assertions). Then
`src/hooks/use-entrance-animation.ts` (the only file in that directory),
`src/components/layout/nav-link.tsx`, the `SectionKind`/`HackathonSection`
types, `TIER_LABEL`, `isAdminFor`, `listContents`, `isVotingOpen` (test-only).

Dead props: `Card.accent`, `Badge.mono`, `ImageUpload.currentPath`,
`Countdown.placeholder`. Dead ternary at `submission/page.tsx:105` (both arms
`"neutral"`). Unused formatter locals that `tsc --noUnusedLocals` confirms.

`demo_video_url` has no form input but is still round-tripped through the
editor payload; `sanitizeUrl` nulls anything malformed, so a historical value
is silently wiped on the next save.

`accept_team_invite` has zero callers but is still `grant execute … to
authenticated` — a live SECURITY DEFINER surface with no consumer.

## `unwrap` sweep is half done — 33 reads still discard `error`

The tell that it is unfinished rather than deliberate: **seven files harden one
read and drop another in the same file**. Highest impact after #4 above: the
judges page's assignment read (a failure makes every project look unassigned,
so the organizer re-assigns judges who already have work — the exact scenario
the comment two queries earlier describes); `account/page.tsx` (all three reads
behind "minhas participações"); `admin/h/[slug]/page.tsx:60` (zeroes both ops
counters); `api/submit/route.ts:51` (silently skips the confirmation email);
`sponsors/actions.ts` delete preflight (orphans the storage file).

Five places hand-roll `logQueryError`'s message instead of calling it —
including one file that imports it seven lines away.

## Duplication

`clean()` exists seven times and **one copy adds `.toUpperCase()`** — same
name, same signature, different output. 29 `Intl.DateTimeFormat` declarations
across 16 files; no timezone disagreement, but ten constants named `DAY`
render three different formats. Two host allowlists (`renderable`,
`renderableThumbnail`) are each missing hosts the other has, and neither
matches `next.config.ts`. `formatSavedAt` and `formatSubmittedAt` are
byte-identical.

Queries duplicated where a shared reader belongs: the finalist-reveal query
(three copies, one never got the error fix), `listSponsors` (re-implemented in
the admin page because the lib hardcodes its client), cover-URL resolution
(four copies, documented once).

Markup: the pill nav exists four times and the fourth uses raw hex where
tokens exist — identical today, silently divergent the moment a token changes.
Fourteen hand-rolled empty states versus four uses of `EmptyState`. The
sticker shadow appears six times with four different values.

## Gating

`finalistas/actions.ts` uses a preflight check then writes with a bare row id,
while `content/` and `sponsors/` chain `.eq("hackathon_id", gate.hackathon.id)`
on every write per the documented rule. Not exploitable today, but it is the
weaker pattern for the same invariant. `moveContent` also declares a
`hackathonId` input it never reads.

## Docs describe systems that no longer exist

`README.md` is the most dangerous file: wrong event, `npm install`, six env
vars no code reads, `/invite/[token]` as live, flat routes that are all
`/h/[slug]/…`, a deleted Vercel cron, `vercel.json` "already present" when it
is `{}`, and **middleware at `/middleware.ts`** — the exact path CLAUDE.md
warns is silently ignored. Rewrite or delete.

Verified false in `CLAUDE.md`: the purple theme (it is cream `#f7eacb`),
Outfit headings (it is Archivo), "only three env vars exist" (seven are read),
`src/app/(app)/admin/actions.ts` (does not exist), `accept_team_invite` listed
as live.

`docs/HANDOFF.md` says "Head **00035**; repo and DB in step" — the repo is at
00047. `docs/PARTICIPANT-AUDIT.md` has blockers that are now closed but
unmarked. `docs/EDITION-DATES.md` describes a proposal that already shipped.

## Orphans

`hackathon_sections` is live in the database with RLS and a trigger and zero
readers — 00039 promised a later drop that never came. Migration 00042's
comment claims the `prize_summary` field is gone; it is still in
`edition-fields.ts` and still rendered. CI still injects
`INVITE_TOKEN_SECRET` and `CRON_SECRET`, neither of which exists in code.
`hackathons.metadata` is `{}` on the live edition and its only populated row
says `team_size_min: 1`, contradicting the 2 that 00029 enforces — so wiring
the hardcoded team-size constants to it would regress the rule.

Local only: `.claude/worktrees/` holds 2.5 GB across five stale worktrees.
Gitignored, but any repo-root grep will produce false "callers" from them.
