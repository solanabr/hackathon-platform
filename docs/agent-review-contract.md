# Review contract — builder and reviewer

Two agents work this repository at the same time. This file is the protocol they
both follow. It exists so neither has to guess what the other is doing.

## Roles

**Builder.** Implements the phase plans in `docs/superpowers/plans/`. Owns every
feature branch and every commit on it. The only agent that writes application code.

**Reviewer.** Reads what the builder pushes, reviews it, and writes findings on the
pull request. Never pushes to a builder branch, never merges, never edits application
code. Its output is review comments — nothing else.

The human owns merges.

## The loop

1. Builder finishes a task from the plan and commits with a conventional message.
2. Builder pushes and opens a PR when the branch has at least one complete task.
   A draft PR opened early is fine and preferred — the reviewer can start sooner.
3. Reviewer picks up the push, reviews the diff, and posts findings as a PR review.
4. Builder reads the findings, fixes what needs fixing, and replies on each thread —
   either "fixed in `<sha>`" or why it is not a defect.
5. Reviewer re-reviews only what changed and resolves the threads it agrees are done.
6. When no blocking findings remain, the reviewer says so in a final comment. The
   human merges.

The builder does not wait for a review to keep working. Reviews land asynchronously;
carry on with the next task and address findings when they arrive.

## Severity, and what each one means

The reviewer labels every finding with exactly one of these.

- **blocker** — merging this breaks something: data loss, a security hole, a route
  that 500s, a silent failure in a user-facing path. Must be fixed before merge.
- **should-fix** — a real defect with a bounded blast radius, or a deviation from the
  spec that will cost more later than now. Fix in this PR unless there is a reason
  not to; say the reason on the thread.
- **nit** — style, naming, a stale identifier. Fix it or decline it. Either is fine,
  but reply so the thread can close.

A finding without a reproduction path is a question, not a finding. The reviewer
states how it fails, not that it smells wrong.

## What the reviewer checks, in order

1. **Does it break at runtime?** Dropped columns still referenced in code, renamed
   identifiers with no counterpart, RLS that returns zero rows to the caller that
   needs them, redirect loops.
2. **Does it match the spec and plan?** Deviations are allowed and often right — but
   they get called out so the spec gets updated instead of quietly diverging.
3. **Do the tests cover what can silently break?** This repo's vitest suite only
   covers pure functions. Anything crossing the database boundary has no automated
   net, so it gets read by eye.
4. **Reuse and simplification.** Last, and only where it is worth the churn.

## Rules that are not negotiable

- The reviewer never pushes to a branch it is reviewing, and never runs `git commit`
  in the builder's working tree. Both agents share one checkout; the reviewer works
  from a separate `git worktree`.
- The builder never force-pushes a branch that has open review threads. The threads
  lose their anchors and the conversation is gone.
- Neither agent merges. Neither agent applies a database migration to production.
- Secrets stay out of commits. `.env.local` is gitignored and stays that way.

## CI

`.github/workflows/ci.yml` runs `pnpm test` and `pnpm run build` on every pull
request. The build is what catches type errors — it is the gate that matters here,
because the test suite deliberately does not reach the database.

A red build on a stacked branch mid-phase is expected: a branch that removes an
export before its consumers are migrated will not compile. Say so in the PR body
when it applies, and note which task closes it.

## Conventions both agents follow

Repository conventions live in `CLAUDE.md` and win over anything here. The ones that
come up most in review:

- UI copy in pt-BR, code and identifiers in English.
- No code comments unless they explain a why.
- `.maybeSingle()`, never `.single()`.
- Every `(app)/` page exports `dynamic = "force-dynamic"`.
- New tables need explicit grants — this database lineage lost its default privileges.

Commit and PR writing follows the house style: conventional prefix, short imperative
subject, body only when the why is not obvious from the diff. No status emoji, no
checklist theatre, no restating the diff in prose.
