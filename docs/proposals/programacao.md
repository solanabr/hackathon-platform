# Programação — new table for the edition document

Replace the `## Programação` section in the page editor
(`/admin/h/solana-cursor-passo-fundo-2026/page`) with the block below.

It goes from 2 columns to 5. The renderer reads them positionally:

| Column | Renders as |
| --- | --- |
| Data | Day rail — day number, weekday, time. Weekday is derived from the edition's year, never typed. |
| Tipo | Small grey label above the title |
| Encontro | Card title |
| Quem | Speakers, in emerald |
| Descrição | Body text |

Every column past `Data` is optional: an empty cell renders nothing at all,
no placeholder and no gap. Line 3 below is deliberately left without a
description to show that.

Written as `Data | ... | Descrição`, any table whose first column holds dates
and has four or more columns renders as schedule cards. Drop back to two
columns and it renders as the simple agenda rows instead — nothing breaks.

---

## Programação

As gravações ficam disponíveis na plataforma depois de cada encontro.

| Data | Tipo | Encontro | Quem | Descrição |
| --- | --- | --- | --- | --- |
| 31/08 19h | Aula | Abertura do hackathon | Matheus Draau (STBR) · Luciano Quito (Apollo) · Bernardo Nery (STBR) | |
| 01/09 19h | Aula | Cursor Night | Marcelo (Cursor Ambassador) | |
| 02/09 19h | | Em breve | | |
| 03/09 19h | | Em breve | | |
| 04/09 19h | | Em breve | | |
| 05/09 | Mentoria | Mentorias 1:1 | | 15 minutos com os mentores, além de suporte direto pelo grupo de WhatsApp |

---

# Highlighted lines (callout)

Any line written as a blockquote renders as a yellow card, the same yellow the
winning place uses. It is the document's way of saying "this is the one thing
in this section you must not miss", and it works in every section.

For the deliverables deadline, prefix the existing line with `> `:

```markdown
## O que seu time entrega

> Entrega até 9 de setembro às 12:00.

| Entregável | Limite | Observação |
```

Without the `>` it stays an ordinary paragraph, so nothing breaks if it is
left as it is.
