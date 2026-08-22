-- The official regulamento names no number of finalists, only "as equipes com
-- melhor avaliação". The column defaulted to 20, and the public page was
-- promising "Os 20 finalistas" on that basis. Make "not decided yet" a state the
-- schema can hold, and clear the invented number.
alter table public.hackathons
  alter column finalists_count drop not null,
  alter column finalists_count drop default;

update public.hackathons
set finalists_count = null
where slug = 'solana-cursor-passo-fundo-2026';

-- Prizes as written in section 8: US$ 3.000 split across the top four, Cursor
-- tokens (not credits) for the top three, kit for first, Apollo mentoring for
-- the top four. The previous copy also promised Cursor credits to every team,
-- which appears nowhere in the regulamento.
update public.hackathons
set prize_summary = 'US$ 3.000 em dinheiro, divididos entre os quatro primeiros · US$ 200 em tokens da Cursor para os três primeiros · kit Solana e Cursor para o 1º lugar · mentoria com a Apollo para os quatro primeiros'
where slug = 'solana-cursor-passo-fundo-2026';
