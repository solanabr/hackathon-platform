/** Starting document for an edition that has no page_md yet. Markdown plus
 *  section markers: a line reading ```phases``` or ```schedule``` drops the
 *  matching live visual there — headings and copy around it belong to the
 *  document. Finalists and the sponsor band render after the document on
 *  their own. */
export const DEFAULT_PAGE_MD = `## Como o hackathon acontece

Duas fases. A primeira online, a segunda presencial.

\`\`\`phases\`\`\`

## Programação

As gravações ficam disponíveis na plataforma depois de cada encontro.

\`\`\`schedule\`\`\`

## O que seu time entrega

Confira os entregáveis e o prazo de submissão.

| Entregável | Limite | Observação |
| --- | --- | --- |
| Pitch deck | 10 slides | Quem passar do limite é desclassificado. |
| Vídeo demo | 3 minutos | Mostre o produto funcionando. |
| Código no GitHub | 1 repositório | Pode ser privado, com acesso para os jurados. |

## Premiação

| Colocação | Prêmio |
| --- | --- |
| 1º Lugar | ... |
| 2º Lugar | ... |
`;
