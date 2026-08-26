# Handoff — Superteam Brasil hackathon platform

State as of 2026-08-26. Branch `feat/home-lp-hub`, [PR #12](https://github.com/solanabr/hackathon-platform/pull/12) open as the umbrella. Everything committed and pushed, 75 tests, clean build.

## Event

**Hackathon Solana & Cursor**, Passo Fundo/RS. Fase 1 online opens **31/08**.
Inscrições até 07/09 23:59 · submissão 09/09 12:00 · finalistas 10/09 ·
Pitch Day 12/09 no UPF Parque. Prêmios US$ 3.000 (1500/900/450/150) + tokens
Cursor + Apollo.

## PR state

- **#12 is the umbrella** and the only open PR. It contains every commit from
  the closed #8 (`p2-platform`), #9 (`p2-ux`) and #10 (`p3-design`), plus: the
  LP light theme rollout, the homepage hub, the edition-page redesign, the
  judge/assignment enforcement fixes, and the audit fixes (`after()` email,
  `notifyFinalists` slug check, 00035).
- #8/#9/#10 were closed as superseded (commits verified contained via
  `merge-base --is-ancestor`). #11 (Apoiadores) merged to main. #6, #7 merged
  earlier.
- **The other agent may still be on `feat/p3-design`** in this same checkout.
  Its base is dead; anything new there must rebase onto `feat/home-lp-hub` or
  `main` after #12 lands. The shared checkout has twice been left mid-merge
  with conflict markers — check `git status` before trusting the working tree.

## Gates on #12

1. **Signed-in walk** of painel / judge / admin in the light theme. The known
   dark-era residue is fixed (all 36 `border-white-10` classes replaced with
   theme tokens, the judge rating panel flipped to the cream inset, dead
   dark-theme `edition-card`/`edition-gallery` deleted), but a human pass over
   the signed-in pages is still the gate.
2. **Delete the mock fixtures before 31/08**: the public gallery shows five
   fake projects. `delete from auth.users where email like '%@mock.test';`
   cascades everything.

## Database

Head was **00035** at this snapshot (now 00047 — invite consent, validated auto-lock, row-lock races); repo and DB in step; every migration live-verified.
Since the last handoff: 00025 (status-guard trigger + handle_new_user guards),
00026 (search_path pin), 00027 (avatars bucket), 00028 (regulamento prizes,
nullable finalists_count), 00029 (two-member minimum in submit_team),
00030 (development_starts_at splits Fase 1), 00031 (content soft delete +
`submission_assignments`), 00032 (public_submissions/profiles/team_members
views), 00033 (teams.placement), 00034 (pending_membership RPC),
00035 (draft filter on public_profiles).

## Design system (the LP language)

Cream `#f7eacb` ground, ink `#1b231d`, emerald `#008c4c`, yellow `#ffd23f`.
House moves: Archivo `[font-stretch:118-125%]` black caps display; the rotated
dark **stamp** for name second-lines; **sticker cards** with hard offset
shadows (`shadow-[NpxNpx_0_#1b231d]`); morth shapes via CSS mask
(`.morth` + `maskImage`) — few, large, corners only, never dark fills on
cream, never confetti; `TickerStrip` (platform copy on home only — removed
from edition page by request); yellow = fills only, never text on cream
(~1.2:1). Loader = symbol painting in via animated clip. Header is the
floating dark dock; footer is the mega band with the SVG-`textLength`
"SUPERTEAM" ghost (cannot clip).

## Judging model

Regulamento drives it: single 0-10 grade per judge per round
(`triagem`/`final`), average decides, ties flagged not auto-broken. Two judges
per project assigned **by hand** at `/admin/h/[slug]/judges`; a judge sees and
can rate only assigned projects (enforced in the action, not just the view);
admins bypass. **No real judge rows exist yet** — judges must sign in once
before `grantRole` can find them. Names: Cokinha, Marcelo, Apollo, Ronaldo
(emails still missing).

## Still open before the event

- Resend domain unverified (invites only reach devs@superteam.com.br).
- Content items unpublished; admin CRUD ready at `/admin/h/[slug]/content`.
- Three leaked secrets still need rotation (GitHub OAuth, Supabase service
  key, Resend key).
- Mobile only spot-checked (no horizontal scroll at 375px on home/edition).
- Regulamento gaps: wallet field for §8 payouts; §4.4 presence rule
  unrepresented.

## Hard-won gotchas (new since last handoff)

- Dev server serves stale modules constantly; `lsof -ti:3000 | xargs kill -9
  && rm -rf .next` before believing any "my change did nothing".
- The embedded browser pane lies below the fold when hidden (dvh collapses to
  0, stale tiles); verify via served HTML or DOM probes, not screenshots.
- `overflow-hidden` on sections clips sticker shadows — only keep it where
  shapes actually overflow.
- Tailwind `text-muted`/`text-ink` on dark fills are theme-relative: after a
  flip, audit every dark card for dark-on-dark.
- (retired) `prize_summary` parsing is gone — prizes are plain markdown in
  `page_md`; the column only feeds the hero prize chip as literal text.
