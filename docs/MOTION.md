# Tokens de Movimento

A camada de movimento do Design System, em `src/styles/tokens/motion.css`
(importada por `src/app/globals.css`). Cor, tipografia e espaçamento já eram
token; easing, duração e stagger não eram — e é aí que o movimento mediano
entra sozinho, porque sem token o default do browser vence.

**Regra dura: nenhum valor de tempo ou curva solto no código.** Se você
escreveu um número de ms, um `cubic-bezier` ou um `ease-out`, está errado.

## Curvas

Registradas em `@theme`, então viram utilities do Tailwind (`ease-entrada`, …).

| Token | Valor | Quando |
|---|---|---|
| `ease-entrada` | `cubic-bezier(0.16, 1, 0.28, 1)` | reveal de texto, seção, imagem; troca de cor e foco |
| `ease-saida` | `cubic-bezier(0.7, 0, 0.84, 0)` | elemento saindo de cena |
| `ease-inout` | `cubic-bezier(0.76, 0, 0.24, 1)` | loop, hover longo, câmera, zoom de imagem, toggle |
| `ease-carimbo` | `cubic-bezier(0.2, 1.32, 0.36, 1)` | **objeto de papel** assentando: card, ticket, selo, badge, painel |
| `ease-mola` | `cubic-bezier(0.34, 1.24, 0.64, 1)` | levantar/deslocar no hover |

A marca é tipografia estampada. Papel não flutua, papel é **depositado**: por
isso o ataque é rápido e a cauda é longa, e só objeto físico tem overshoot —
tipografia nunca passa do ponto.

## Duração

Custom properties em `:root`. Use `duration-(--dur-media)` (sintaxe Tailwind v4).

| Token | Valor | Quando |
|---|---|---|
| `--dur-toque` | `0.13s` | `:active`, confirmação de toque |
| `--dur-instant` | `0.19s` | hover de cor, foco, troca de estado |
| `--dur-rapida` | `0.37s` | micro-interação **com** deslocamento |
| `--dur-media` | `0.82s` | reveal de seção |
| `--dur-lenta` | `1.25s` | hero, transição narrativa |

Cada degrau é ~2x o anterior, e os valores são deliberadamente não-redondos:
`200/400/600` é a assinatura de quem não mediu nada. O ponto da escala é que
exista **hierarquia de tempo** — um site em que tudo dura o mesmo não tem
ritmo, tem metrônomo.

## Stagger e distância

`--stagger-texto` `0.065s` · `--stagger-lista` `0.11s` · `--stagger-tile` `0.045s`
`--dist-curta` `12px` · `--dist-entrada` `26px` · `--dist-longa` `44px`
`--tilt-papel` `1.4deg`

Distância é hierarquia: o que vem de mais longe é o que a seção quer que você
olhe.

## Deriva e zoom de cena

`--deriva-curta` `3%` · `--deriva-media` `7%` · `--deriva-longa` `13%` · `--zoom-cena` `1.09`

A distância de entrada aplicada ao eixo do scroll. Mesma regra dos degraus: o
que anda mais é o que está mais fundo na cena. Em **%** da própria camada e
não em px — um valor absoluto vira salto no telefone e some no monitor de 27".

## As quatro camadas de movimento

| Camada | Onde | O que dispara |
|---|---|---|
| entrada | `.reveal`, `.hero-print`, `.press-sheet` | um observer, uma vez |
| ambiente | `.prizes-*`, `.bento-pulse` | ninguém — é o fundo respirando |
| **rolagem** | `src/styles/scroll.css` | a posição do scroll |
| **dedo** | `src/styles/interactions.css` | hover, active, focus |

### Rolagem (`src/styles/scroll.css`)

Tudo é `animation-timeline`, nunca um listener novo. É reversível de graça,
roda no compositor e, onde a API não existe, o `@supports` não entra e a
camada fica no estado de repouso — que é o desenho aprovado.

| Classe | O que faz |
|---|---|
| `cena-deriva-{curta,media,longa}` | paralaxe de camada de fundo (`+ cena-deriva-contra` inverte) |
| `cena-zoom` | camada que preenche o quadro e recua ao atravessá-lo |
| `cena-trilhos` | os trilhos do `SectionRails` sendo traçados |
| `cena-dobra` | o hero recuando ao entregar a página |
| `cena-carta` | a escada de cartas abrindo (`--carta-i` no call site) |
| `cena-assenta` | painel grande sendo prensado contra a mesa |
| `chrome-assenta` / `lp-regua` | o cabeçalho e a régua de progresso |

**Regra dura: cena de rolagem mexe em camada de fundo.** Texto e CTA não
derivam — o conteúdo é a coisa parada em relação à qual o resto se move.

**Gotcha:** `view()` mede contra o scrollport mais próximo, e `overflow: hidden`
**é** scrollport. Seção que hospeda cena usa `overflow-clip`.

### Dedo (`src/styles/interactions.css`)

Papel tem peso: nada flutua, nada pulsa. As coisas levantam um fio no hover
(`--ease-mola`) e **batem** no toque (`--dur-toque`) — a confirmação chega
antes do resultado da ação. Deslocamento fica atrás de `@media (hover: hover)`,
senão o `:hover` gruda depois do tap.

### Passagem entre páginas (`src/styles/rota.css`)

`src/app/(public)/template.tsx` remonta a cada rota, então a folha da prensa
sai de novo: mesmo gesto do primeiro frame, puxada para baixo, liberando o
topo primeiro. Server Component — a passagem não custa um byte de JS.

## Como usar no reveal

`<Reveal>` (`src/components/ui/reveal.tsx`) não recebe mais `delay` em ms.
Recebe `index` (a posição na família — o intervalo sai do token) e `tone`:

| `tone` | Para |
|---|---|
| `texto` | linhas de texto: anda pouco, entra apertado |
| `objeto` | padrão: um bloco de conteúdo |
| `papel` | card, ticket, selo — entra carimbado |
| `longe` | o que a seção quer que você olhe |

```tsx
{stats.map((s, i) => (
  <Reveal key={s.value} index={i + 1} tone="papel">…</Reveal>
))}
```

Quem anima em JS lê o token com `readMotionSeconds()` de `src/lib/motion.ts` —
animação em JS não pode ter a própria escala de tempo, ou as duas camadas
divergem em movimento reduzido.

## Movimento reduzido

**Não é um interruptor.** O que causa desconforto vestibular é deslocamento,
rotação e escala — não opacidade. Sob `prefers-reduced-motion`, os tokens de
distância vão a zero, as curvas de overshoot achatam e a escala de tempo
encolhe proporcionalmente. A orquestração inteira continua: a ordem, o
stagger, a hierarquia de tempo. A pessoa continua vendo a página se montar na
ordem que o conteúdo pede; só não é levada junto.

Só os loops decorativos infinitos param de vez — eles não têm estado final
para onde convergir.

## Gate

- [ ] `grep -rnE 'duration-[0-9]|duration-\[|cubic-bezier|\bease-(out|in|linear|in-out)\b' src` volta vazio (fora de `styles/tokens`; `linear` numa `animation-timeline` é a curva certa — a curva ali é a rolagem).
- [ ] Nem tudo tem a mesma duração — existe hierarquia de tempo.
- [ ] Toda transição de craft tem uma utility `ease-*` de token explícita.
- [ ] Movimento reduzido é uma versão pensada, não animação desligada.
- [ ] Cena de rolagem só em camada de fundo, e a seção que a hospeda usa `overflow-clip`.
- [ ] Todo alvo clicável tem `:hover` **e** `:active`.
