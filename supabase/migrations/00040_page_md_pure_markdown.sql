-- The block system is gone: page_md is pure markdown, and the live sections
-- (phases, programação, premiação, finalistas, marcas) are page furniture
-- rendered by the shell after the document. The live edition's document
-- shrinks to the only content that has no other home — the entregáveis,
-- now a markdown table instead of a fenced JSON block.

update public.hackathons
set page_md = '## O que seu time entrega

Até 9 de setembro às 12:00.

| Entregável | Limite | Observação |
| --- | --- | --- |
| Pitch deck | 10 slides | Quem passar do limite é desclassificado. |
| Vídeo demo | 3 minutos | Mostre o produto funcionando. |
| Código no GitHub | 1 repositório | Pode ser privado, com acesso para os jurados. |
'
where slug = 'solana-cursor-passo-fundo-2026'
  and page_md like '%```%';
