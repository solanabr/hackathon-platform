-- Final form of the page document: everything hand-written markdown, no
-- markers. The timeline and the agenda are prose the organizer edits in
-- the page editor; only the finalists grid and the sponsor band render
-- outside the document. Content seeded from the data the marker visuals
-- showed, so the page tells the same story.

update public.hackathons
set page_md = '## Como o hackathon acontece

Duas fases. A primeira online, a segunda presencial em Passo Fundo, RS.

| Fase | Quando | O que acontece |
| --- | --- | --- |
| Fase 1 · capacitação | 31/08 a 04/09 | Minicursos e conteúdos preparatórios para nivelar todo mundo. Monte seu time nesse período. |
| Desenvolvimento e submissão | 05/09 a 09/09, 12h | Mentoria no dia 5. O líder envia deck, vídeo e repositório até o prazo. |
| Seleção | 10/09 | As equipes classificadas são anunciadas por e-mail. |
| Fase 2 · presencial | 12/09 | Pitch Day: apresentação para a banca e premiação. |

## Programação

As gravações ficam disponíveis na plataforma depois de cada encontro.

| Data | Encontro |
| --- | --- |
| 31/08, 19h | Abertura do hackathon — Matheus Draau (STBR), Luciano Quito (Apollo) e Bernardo Nery (STBR) |
| 05/09 | Mentorias 1:1 — 15 minutos com os mentores, além de suporte direto pelos grupos de WhatsApp |

## O que seu time entrega

Até 9 de setembro às 12:00.

| Entregável | Limite | Observação |
| --- | --- | --- |
| Pitch deck | 10 slides | Quem passar do limite é desclassificado. |
| Vídeo demo | 3 minutos | Mostre o produto funcionando. |
| Código no GitHub | 1 repositório | Pode ser privado, com acesso para os jurados. |

## Premiação

| Colocação | Prêmio |
| --- | --- |
| 1º Lugar | US$1500 + Kit Solana & Cursor + Mentoria com Apollo |
| 2º Lugar | US$900 + Mentoria com Apollo |
| 3º Lugar | US$450 + Mentoria com Apollo |
| Menção Honrosa | US$150 + Mentoria com Apollo |
'
where slug = 'solana-cursor-passo-fundo-2026';
