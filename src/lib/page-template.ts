/** Starting document for an edition that has no page_md yet. Kept in sync
 *  with docs/templates/edition-page.md, which documents the block syntax. */
export const DEFAULT_PAGE_MD = `## Como o hackathon acontece

Duas fases. A primeira online, a segunda presencial.

\`\`\`phases\`\`\`

## Programação

As gravações ficam disponíveis na plataforma depois de cada encontro.

\`\`\`schedule\`\`\`

## O que seu time entrega

Confira os entregáveis e o prazo de submissão.

\`\`\`deliverables
[
  {"value": "10", "unit": "slides", "label": "Pitch deck", "note": "Quem passar do limite é desclassificado."},
  {"value": "3", "unit": "minutos", "label": "Vídeo demo", "note": "Mostre o produto funcionando."},
  {"value": "1", "unit": "repositório", "label": "Código no GitHub", "note": "Pode ser privado, com acesso para os jurados."}
]
\`\`\`

## Premiação

\`\`\`prizes\`\`\`

\`\`\`finalists\`\`\`

\`\`\`partners\`\`\`
`;
