-- The document owns the whole page story: headings and copy are prose in
-- page_md, and a marker line (```phases```, ```schedule```) drops the
-- matching live visual in place. Prizes are plain markdown here too — the
-- prize_summary form field is gone, the document is the single place an
-- organizer writes them. Only finalists (date-gated) and the sponsor band
-- stay outside the document.

update public.hackathons
set page_md = '## Como o hackathon acontece

Duas fases. A primeira online, a segunda presencial em Passo Fundo, RS.

```phases```

## Programação

As gravações ficam disponíveis na plataforma depois de cada encontro.

```schedule```

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
