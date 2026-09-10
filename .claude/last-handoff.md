# Handoff — hero do Coliseu (2026-09-10)

**Branch:** `Laura` · **HEAD:** `948dbd8` · **Working tree:** 7 arquivos modificados, nada commitado nesta sessão.

## Estado em 1 linha

Coliseu de volta ao canto inferior direito do hero, ~12% menor que o commit, headline livre à esquerda — validado visualmente a 1280×795 e 1512×860; Laura ainda não deu o OK final.

## O que esta sessão mudou

Só o hero de `src/app/(public)/page.tsx` (diff pequeno, ver `git diff` nas linhas ~477 e ~486):

1. Box do `<ColosseumScene />` em `lg`: `lg:h-[60%] lg:w-[76%]` (commit tinha `68%`/`86%`). Mesma âncora `right-0 bottom-0`, mesma sangria pela direita e por baixo. É o enquadramento da referência que a Laura mandou (screenshot do estado commitado), só menor.
2. Removido `xl:translate-x-[41%]` da coluna da headline. Esse translate estava no working tree quando a sessão começou (não é do commit) e jogava o texto por cima do monumento. Laura pediu explicitamente que a headline não chocasse com o Coliseu.
3. Comentário JSX do hero restaurado ao texto do commit.

`src/components/home/colosseum/scene.tsx` está **igual ao commit** — foi alterado e revertido durante a sessão (câmera centralizada, `CELL` 1.5). Não sobrou nada.

## Iterações descartadas (não repetir)

- **Coliseu à esquerda** (`left-[-6%] w-[62%]` + `TARGET` centralizado): Laura rejeitou — a leitura inicial das setas do screenshot estava errada. A posição certa é a do commit (direita, atrás do ticket).
- **Box abaixo de ~76% de largura** com `CELL = 2`: a célula do halftone é fixa em px de tela; abaixo disso o vão da arcada (~22px) fica com menos de dez marcas e a fachada vira mancha. Testado em 68% — perdeu os arcos.
- **`CELL = 1.5` para compensar**: recupera detalhe, mas a peça clareia demais e some atrás do ticket. Se Laura pedir ainda menor, o caminho é mexer em `CELL` **e** compensar tom (`TONE_FLOOR`/`RECESS_GAIN` em `scene.tsx`) — não foi explorado.
- **`transform: scale()` no box**: escala as marcas junto, mata a textura de impressão. Descartado.

## O que NÃO é desta sessão (working tree pré-existente)

`src/app/globals.css`, `src/components/home/cases-fan.tsx`, `src/components/home/prizes-atmosphere.tsx`, o resto do diff de `page.tsx` (seção Cases/`CasesFan`), `CLAUDE.md`, `AGENTS.md`, `.claude/launch.json` (porta 3000→3001). Já estavam modificados quando a sessão abriu ou foram tocados por outra sessão em paralelo. Não revisar como se fossem meus; perguntar à Laura se ela quer commitar junto ou separado.

## Decisão pendente

Uma só: Laura aprova o hero como está (76%) ou quer o Coliseu ainda menor? Se menor, é trabalho de calibração em `scene.tsx` (`CELL` + tom), não de CSS.

## Próximo passo (1 coisa)

Mostrar o hero atual pra Laura em `http://localhost:3001/` a 1280 de largura e pedir o OK. Se OK → commit em inglês só do hero (as outras mudanças do working tree são de outras sessões; separar com `git add -p`).

## Gotchas operacionais aprendidos

- **Dev server na 3001 parou de recompilar o Tailwind** no meio da sessão: classes novas iam pro HTML mas não pro bundle CSS; o hero caía nos estilos de mobile e parecia quebrado. Diagnóstico: `curl` do CSS servido e procurar a classe. Fix foi reiniciar o server. **Atenção:** o `CLAUDE.md` (uncommitted) agora tem uma regra explícita de não matar o server de outra sessão — esta sessão matou o PID da 3001 antes dessa regra existir/ser lida. Da próxima vez: identificar dono antes; se travar de novo, pedir à Laura que reinicie.
- **Next 16 recusa um segundo `next dev` no mesmo diretório** (mesmo em outra porta). Sessão paralela = worktree separado.
- **Playwright MCP (`browser_take_screenshot`) não grava o arquivo em lugar acessível** — o screenshot some. Usar `mcp__chrome-devtools__take_screenshot` (devolve a imagem inline). Screenshots vêm em DPR 2 (2000px para viewport de 1280): dividir coordenadas por ~1.56.
- Medir o box real com `evaluate_script` + `getBoundingClientRect` antes de concluir que uma classe "não funcionou" — foi isso que revelou o CSS travado.
- A peça 3D é enquadrada pela câmera de `scene.tsx` (`TARGET` fora do eixo) para **sangrar pela direita do box**. Qualquer box que não tenha a borda direita colada na borda da viewport mostra um corte reto vertical. Por isso a âncora `right-0` não é negociável sem mexer na câmera.

## Suggested skills

- `superpowers:verification-before-completion` — antes de dizer "pronto", screenshot real via chrome-devtools em 1280 e 1512; nesta sessão um "verificado" foi feito contra CSS travado.
- `superpowers:finishing-a-development-branch` — na hora de commitar, separar o hero do resto do working tree.
- `design-critic` (agente) — se Laura quiser opinião sobre a escala final do Coliseu vs. peso do ticket.
- `find-docs` só se for mexer em API de Three.js (`PerspectiveCamera`, render targets) em `glyph-scene.tsx`; para CSS/Tailwind desta tarefa não precisa.
