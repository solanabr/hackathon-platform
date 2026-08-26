# Edition page template

Starting point for a new edition's `page_md`. Copy the body below into the
page editor (`/admin/h/<slug>/page`) and adjust the prose. Everything is
markdown; the fenced blocks pull live data:

| Block | Renders | JSON body |
| --- | --- | --- |
| ```` ```phases``` ```` | phase timeline from the edition's dates | optional `[{"key","label","detail"}]` copy overrides |
| ```` ```schedule``` ```` | the published schedule (Conteúdos) | — |
| ```` ```deliverables``` ```` | big-number cards | required `[{"value","unit","label","note"}]` |
| ```` ```prizes``` ```` | prize panel from `prize_summary` | — |
| ```` ```finalists``` ```` | finalists grid, only after announcement | — |
| ```` ```partners``` ```` | Realização/Apoiadores strip (Marcas admin) | — |

---

## Como o hackathon acontece

Duas fases. A primeira online, a segunda presencial.

```phases```

## Programação

As gravações ficam disponíveis na plataforma depois de cada encontro.

```schedule```

## O que seu time entrega

Confira os entregáveis e o prazo de submissão.

```deliverables
[
  {"value": "10", "unit": "slides", "label": "Pitch deck", "note": "Quem passar do limite é desclassificado."},
  {"value": "3", "unit": "minutos", "label": "Vídeo demo", "note": "Mostre o produto funcionando."},
  {"value": "1", "unit": "repositório", "label": "Código no GitHub", "note": "Pode ser privado, com acesso para os jurados."}
]
```

## Premiação

```prizes```

```finalists```

```partners```
