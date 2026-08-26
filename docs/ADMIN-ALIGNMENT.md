# Admin surface alignment

Audited at `0ffacbe`; all five code items closed by `636d227`:

1. Sub-page back links point at the edition (`31fff37`).
2. `AdminEditionNav` tabs on every edition admin page (`31fff37`).
3. Sticker cards, painel eyebrows, `border-ink` removed (`636d227`).
4. One shell width, `max-w-5xl` — the page editor keeps `max-w-6xl` for its
   side-by-side panes (`636d227`).
5. Sections system deleted; the pill is `Página` → the page_md editor
   (`f43d66e`).

## Still open (not code)

- Four content rows are literally titled "Em breve" and four speakers were
  erased; the archive and public schedule render that verbatim. Restore at
  `/admin/h/[slug]/content` before 31/08.
- `0 de 6 publicados` — the abertura needs its recording published after the
  live, and the mentoria (05/09) has no video, so the publish guard will
  block it unless relaxed for non-`aula` kinds.
