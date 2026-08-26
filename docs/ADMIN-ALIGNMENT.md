# Admin surface alignment — handover

The edition admin (`/admin/h/[slug]/*`) predates the LP theme, the painel
rebuild, and the page_md work. It is the last surface that still looks and
navigates like the old product. This is what is wrong and what closing it
looks like, ordered by how much it hurts an organizer during the event.

Audited at `0ffacbe`. Phase 2 (page_md) was in flight in a parallel session;
items 1 and 5 below depend on how that lands.

## 1. Sub-pages send you back to the wrong place

`content`, `judges`, and `finalistas` all render
`<BackLink href="/admin" label="Administração" />` — they jump over the
edition and land on the global list. Only `sections` and `sponsors` (the two
newest) go back to `/admin/h/[slug]`.

An organizer publishing a recording mid-event hits back and loses the edition
they were working in, then has to re-enter through the list.

**Done when:** every `/admin/h/[slug]/*` sub-page's back link points at
`/admin/h/${slug}` with the edition name as the label, matching the painel.

## 2. There is no way to move between admin sections

The six destinations (Página/Seções, Conteúdos, Marcas, Jurados, Finalistas,
Ver página) exist only as pills on the edition overview. From inside any
sub-page the only route to a sibling is back-then-forward.

The painel already solved this with `PainelNav` — a tab row repeated on every
painel page.

**Done when:** an `AdminEditionNav` component mirrors `PainelNav`
(`src/components/edition/painel-nav.tsx`) and renders on all six pages, with
the current one marked `aria-current="page"`.

## 3. Admin looks like a different product

Ten of the eleven components in `src/components/admin/` still use the legacy
`Card` (hairline border, soft emerald glow) and `border-ink/10`, while the
public pages and painel moved to the sticker language — `border-2
border-green-dark` plus a hard offset shadow. `Card` already takes a
`sticker` prop; admin never adopted it.

**Done when:** admin cards use `sticker`, section headers use the mono
eyebrow + heading pattern the painel uses, and `border-ink/10` is gone from
`src/components/admin/`.

## 4. Container widths are arbitrary

`max-w-3xl` on the edition overview, content, judges, finalistas and sponsors;
`max-w-4xl` on sections and `/admin`. The registration and team tables on the
overview are the densest content in the app and sit in the narrowest
container, so they scroll horizontally for no reason.

**Done when:** one width for the admin shell (`max-w-5xl` suits the tables),
applied consistently.

## 5. "Seções" dies with Phase 3

Phase 3 deletes the sections system. The `Seções` pill on the edition
overview and the whole `/admin/h/[slug]/sections` route go with it.

**Done when:** the pill reads `Página` and points at the new page_md editor,
`/admin/h/[slug]/sections` is deleted (or redirects), and
`src/components/admin/section-row.tsx` is removed.

## Not code

- Four content rows are still literally titled "Em breve" and four speakers
  were erased; the archive and the public schedule both render that verbatim.
  Restore them at `/admin/h/[slug]/content` before 31/08.
- `0 de 6 publicados` — the abertura needs its recording published after the
  live, and the mentoria (05/09) has no video, so the publish guard will
  block it unless the guard is relaxed for non-`aula` kinds.

## Ordering suggestion

1 and 2 are the ones an organizer feels during the event and are independent
of Phase 2/3 — they can land first. 3 and 4 are cosmetic and safe any time. 5
must follow Phase 3.
