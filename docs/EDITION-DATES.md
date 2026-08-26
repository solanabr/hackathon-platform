# Edition dates — split operations from narrative

The Datas section of the edition form has eight datetime fields. Four are
enforced by the platform; the rest are one edition's story wearing the costume
of configuration. A future edition that is online-only, has no Pitch Day, or
never opens public voting has to fill in fields that mean nothing to it.

The rule: **the platform's date model ends at the finalists announcement.**
Everything after that is narrative and belongs in the page document.

## What each field actually does

Counted at `840fc9b`.

| Field | Enforced? | What breaks without it |
|---|---|---|
| `starts_at` | yes | edition ordering, `editionStage` "upcoming", Fase 1 start |
| `registration_closes_at` | yes | `isRegistrationOpen` gates the register flow |
| `submission_deadline_at` | **hard** | `submit_team` rejects, pg_cron auto-lock fires on it |
| `finalists_announced_at` | yes | `isFinalistsVisible` gates the whole reveal |
| `development_starts_at` | no | only splits the Fase 1 card in the phase timeline |
| `presential_at` | display | Pitch Day countdown, Fase 2 card, `editionStage` end |
| `voting_opens_at` | **dead** | nothing — see below |
| `voting_closes_at` | no | only the first fallback for "edition ended" |

`isVotingOpen()` in `src/lib/hackathon.ts` has **zero callers in production
code** — only the test file references it. There is no voting feature: judges
rate and admins pick finalists. The two voting columns are vestigial from an
earlier design and today only serve as an "edition ended" fallback inside
`editionStage`, which is not what their names say.

## Proposed model

Keep four operational dates plus one explicit end:

- `starts_at`
- `registration_closes_at`
- `submission_deadline_at`
- `finalists_announced_at`
- `ends_at` *(new, optional)* — the one date meaning "this edition is over",
  which is what `editionStage` actually wants. Optional: an online-only
  edition ends at the announcement, one with a live final sets it. Backfill
  from `presential_at ?? voting_closes_at ?? finalists_announced_at`.

Retire from the form:

- `voting_opens_at`, `voting_closes_at` — delete `isVotingOpen` with them.
- `presential_at` — its operational half becomes `ends_at`; its narrative half
  ("Pitch Day, 12/09, UPF Parque") is a line in the page document and, if the
  phase timeline should still show it, a `phases` block config entry.
- `development_starts_at` — purely a timeline split; move it into the `phases`
  block config where the rest of the phase copy already lives.

That takes the form from eight datetime inputs to five, and every remaining
one is something the platform will actually refuse to ignore.

## Why the labels have to move too

`presential_at` currently drives a countdown labelled "Pitch Day em". Pitch
Day is this regulamento's word. With `ends_at` the countdown label comes from
the edition's own content rather than being hardcoded, which is the same fix
already applied to the homepage ticker and the hub copy.

## Sequencing and risk

The migration is additive and safe: add `ends_at`, backfill, leave the old
columns in place. The code change is not trivial — `presential_at` is read in
six files including the LP countdown, the painel hero precedence, the judge
deadline and `editionStage`.

**Do the migration and the `ends_at` backfill now; do the code cutover after
12/09.** Swapping the countdown precedence and `editionStage` in the week a
live edition is counting down to its own deadline buys nothing and risks the
one number every participant is watching. Dropping the retired columns comes
last, once nothing reads them.
