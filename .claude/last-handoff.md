# Handoff — performance da LP (2026-09-10)

**Branch:** `Laura` · **Working tree:** tudo commitado nesta sessão.

## Estado em 1 linha

A home ficou 2,5x menor em HTML e parou de repintar à toa: chapas grandes viraram arquivo, a cena 3D só pinta quando a câmera anda, e as camadas que rodavam na thread principal a cada quadro passaram para o compositor.

## O que mudou

1. **Chapas como arquivo** (`components/home/plates.ts` + `app/halftone/[plate]/route.ts`). Coliseu 2D, textura do fechamento e esfera da rede saem do HTML e viram `/halftone/<nome>-<hash>.svg`, aplicadas como `mask-image` pelo `<Plate>` (`components/home/plate.tsx`, classes `.chapa*` no globals). A cor continua sendo `currentColor` do chamador. Cache `immutable`, hash no nome. `ColosseumScene` agora recebe `backdrop` por prop (o gerador é só servidor).
   - HTML da home: 1,33 MB → 535 kB. Nós no DOM: 4394 → 1490. Segmentos de streaming `S:*`: 1437 → 29.
2. **`GlyphScene`**: só renderiza quando a pose da câmera muda mais que `POSE_EPSILON` (0.00025 rad ≈ meio pixel); posição do host medida no resize/IO em vez de `getBoundingClientRect` por quadro.
3. **`HalftoneImage`**: teto de pixels (`maxPixels`, 4,5 M) derruba o DPR da chapa da arena; a pintura é fatiada em `setTimeout(0)` com contador de geração, em vez de uma tarefa longa.
4. **`SolanaCoin`**: rect relido dentro do rAF (flag `stale`), não no listener de scroll — era o único forced reflow do trace. `.coin-cast` ganhou `will-change: transform`.
5. **CSS**: `.cena-dobra` perde tinta por um véu `::after` (creme, opacidade 0→0.72) com `view-timeline: --dobra`, e não por opacidade da seção; `.bilhete-luz` varre por `transform` (largura 220%) em vez de `background-position`; `.bento-pulse` anima `transform`/`opacity` num `::after` em vez de `box-shadow`.

## Medidas (Chrome, 1440×900, M4 Pro, dev server)

- Scroll roteirizado de 9 s pela página inteira: pior quadro 50 ms → 17 ms; quadros acima de 34 ms: 2 → 0.
- `npm test` 198/198, `tsc` limpo, `npm run build` ok (as três chapas saem como SSG). Lint: 10 erros pré-existentes (draco vendorizado e `auth-dialog.tsx`), nenhum nos arquivos tocados.

## O que NÃO é do código

- **Supabase local (127.0.0.1:54321) está fora do ar** e Docker não está rodando. Cada chamada de auth/dados no SSR espera retries: `/termos` leva 1,6 s e a home 7 s de TTFB efetivo, com o loading skeleton na tela. É a maior parte do "travando" em dev. Subir o Supabase (ou apontar `.env.local` para o projeto hospedado) resolve.
- A máquina estava com load average 46 no início da sessão (outros processos). Medir de novo antes de atribuir lentidão à página.

## Próximo passo

Subir o Supabase e sentir a página de novo. Se ainda engasgar em algum ponto específico (voo do bilhete, jornada), gravar um trace com `chrome-devtools` naquele trecho — o resto do documento já está limpo.

## Gotchas

- Mudou um risco numa chapa → a URL muda sozinha (hash). Não há nada para invalidar.
- O `Plate` recebe a máscara por `style` inline; um `[mask-image:...]` do Tailwind no mesmo elemento perderia. Por isso `CtaHalftone` é um invólucro (máscara radial do chamador) com o `Plate` dentro.
- `.cena-dobra::after` cobre a seção inteira; a peça em voo (z-30, filha de `#colosseum`) continua acima dele.
