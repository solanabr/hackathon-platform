> **Superseded.** The block system was scrapped entirely in favour of a
> pure-markdown document with the live sections rendered as page furniture.
> Kept for the reasoning about drift between the document and Conteúdos,
> which is why Programação is furniture rather than hand-written.

Page blocks, second pass — handover
===================================

Six blocks today: `phases`, `schedule`, `deliverables`, `prizes`,
`finalists`, `partners`. Only `deliverables` carries its content in the
document; the rest reach into the database, which is why the editor feels
inconsistent — you can edit the entregáveis where you see them, but not the
prizes right next to them.

The principle to settle on: **a block's JSON is content or formatting for
that block. Content that has no other home lives in the document. Content
that has its own admin and its own lifecycle stays there.** Page furniture is
not a block at all.

That resolves to four blocks, not six.

Drop `finalists` and `partners` as blocks
-----------------------------------------

Neither is composable and neither should be forgettable. The sponsor band
closes every edition page; the finalists grid appears when the announcement
date passes and is invisible before it. An organizer who never types
```partners``` should not silently lose the Realização and Apoiadores logos
they uploaded.

**Done when:** the page shell renders both after the document body —
finalists still gated on `isFinalistsVisible`, partners still from
`hackathon_sponsors` — and the two block cases are deleted from the registry
and the cheatsheet.

Move `prizes` into the document
-------------------------------

Prizes are the last user of `prize_summary`, the `·`-delimited string the
review flagged as load-bearing in three places. A prize whose text contains
`·` or ` - ` renders as garbage today, and no edition with a different reward
shape can express itself.

```prizes
[
  { "place": "1º Lugar", "detail": "US$1500 + Kit Solana & Cursor" },
  { "place": "Menção Honrosa", "detail": "US$150 + Mentoria" }
]
```

**One dependency to handle:** `prizePoolLabel(hackathon.prize_summary)` fills
the "Prêmios · US$ 3.000 em prêmios" cell in the facts strip at the top of
the page, which sits *above* the document and cannot read it. Give the
edition a `prize_pool` text field for that headline figure — it is a
marketing scalar that changes once per edition — and let the document own the
itemised list. Then `prize_summary` and the `·` parsing can go.

Keep `phases` as copy-in-document, dates from the edition
---------------------------------------------------------

Already half true — `config.items` overrides labels and details. Make it the
only way phase copy is set, so the block reads as content rather than as an
override of something invisible. Dates stay on the edition row, because they
are the operational fields the platform enforces (see `EDITION-DATES.md`).

`schedule` is the one that must stay a reader
---------------------------------------------

This is where I would not follow the rule, and the reason is drift.

The agenda lives in `hackathon_contents`, which has its own admin at
Conteúdos: per-item publish state, YouTube links, uploaded files, soft
delete. The public agenda is a projection of it. Writing the agenda as JSON
in the document means maintaining it in two places.

The concrete failure: on 31/08 an organizer publishes the abertura recording
in Conteúdos. The archive updates. The public agenda still shows whatever the
document says, and nobody notices until a participant asks why the site
disagrees with itself.

The version that honours the principle without duplicating: JSON on this
block configures presentation, not content.

```schedule
{ "phase": 1, "empty": "A agenda sai em breve." }
```

**Done when:** `schedule` accepts optional config and continues to read its
items from `hackathon_contents`, and the cheatsheet says plainly where the
items are edited so the organizer is not hunting.

Resulting vocabulary
--------------------

| Block | JSON carries | Items come from |
|---|---|---|
| `phases` | labels, details | dates from the edition row |
| `schedule` | presentation config | Conteúdos |
| `deliverables` | full content | the document |
| `prizes` | full content | the document |

Down from six to four; two own their content outright, two are configured.
`finalists` and `partners` become page furniture.

Trade-off worth naming
----------------------

Prizes as JSON is more typing than the `·` string it replaces, and a
malformed array renders nothing. The editor's preview and the JSON error the
save action already returns cover most of it, but the block cheatsheet should
ship a copyable skeleton for each JSON block so nobody starts from an empty
fence.
