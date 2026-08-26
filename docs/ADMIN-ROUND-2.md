# Admin round 2 — handover

Round 1 (nav, sticker restyle, widths) is closed. This is what the admin
surface still gets wrong, found by using the pages rather than reading them.
Ordered by what costs an organizer most during the event.

Fixed already: the Pessoas list rendered empty because `platform_roles` has
two foreign keys to `users` (`user_id` and `granted_by`), so the bare
`users(email)` embed was ambiguous and PostgREST rejected the whole query
with PGRST201. The page swallowed the error and rendered zero rows, which
meant **no admin or judge was visible or revocable anywhere in the product**.
Disambiguated to `users!platform_roles_user_id_fkey(email)`. Worth reading as
a class of bug, not a one-off: several admin queries destructure `{ data }`
and never look at `error`, so a broken query is indistinguishable from an
empty table.

## 1. The status flip has no home

Flipping an edition to `judging` is the single point of failure of the whole
event — the public finalists section, the account chip and the reveal are all
gated on it. Today it is one option in a `<select>` labelled "Status", buried
in the middle of a long form, with no indication of what it triggers.

**Done when:** the edition overview has an explicit lifecycle control that
names the current stage, names what the next one turns on, and asks for
confirmation. It should be impossible to flip by accident and impossible to
forget on 10/09.

## 2. The overview answers identity, not operations

During the event an organizer needs: is the submission window open, how many
teams have submitted versus drafted, how many judges are assigned, how many
ratings are in. The page currently opens with the cover-image uploader and
then two raw tables.

**Done when:** a compact status band sits above the tables — window state,
submitted/total, judges assigned per round, ratings in — computed from the
same queries the page already runs.

## 3. Fixtures are indistinguishable from real people

The registration table lists 16 rows including the `@mock.test` seeds, with
nothing marking them. Someone will judge or count a fixture.

**Done when:** fixture rows are visually tagged, or a filter hides them, and
the count line separates real from seeded. (The rows themselves must be
deleted before 31/08 regardless.)

## 4. Prizes are still a delimited string

`Premiação` is one textarea whose format is "`1º Lugar - X · 2º Lugar - Y`",
with `Separe os itens com ·` as the only documentation. It is parsed by
`split("·")` then `split(" - ")` in the prizes block and in `prizePoolLabel`.
A prize containing either separator renders as garbage, and no edition with a
different reward shape (credits, equity, no cash) can express itself.

**Done when:** prizes are structured rows (place, amount, extras) in `jsonb`
with a per-row editor, and the string format is migrated away.

## 5. Small form defects

- `Número de finalistas` renders `0` while its own helper says it should be
  blank until the organization decides.
- `Regulamento` is an unlabelled empty field — it takes a URL, but nothing
  says so and nothing validates it.
- Save reports success without surfacing per-field validation.

## Still blocked on the owner

The four content rows titled "Em breve" cannot be fixed by an agent — the
real titles are the event's public agenda and guessing would publish wrong
information. The round-13 runbook recorded these fragments from before the
erasure, which need confirming before anyone writes them:

| Slot | Title fragment | Speaker fragment |
|---|---|---|
| 01/09 | Cursor Night | Marcelo / Daniel |
| 02/09 | Tema a definir | Solange |
| 03/09 | Solana | Kauê |
| 04/09 | business / pitch | Aceleradora |

Ask the owner to confirm these, then write them at
`/admin/h/[slug]/content`. A Pitch Day card for 12/09 is also missing, so the
public agenda ends at 05/09.
