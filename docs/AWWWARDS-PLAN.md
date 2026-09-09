# Plano de implementação — submissão Awwwards

**Alvo:** `hackathon.superteam.com.br` (LP do Colosseum)
**Rubrica real:** Design 40% · Usability 30% · Creativity 20% · Content 10%
**Processo:** mín. 18 jurados; os 3 votos mais distantes da média são descartados.
**Escrito em:** 9 set 2026 · evento roda 14 set – 12 out 2026

---

## 0 · A ambiguidade decisiva (ler antes do resto)

Design + Usability = **70%** da nota. Creativity é 20%. Isso derruba a intuição de
que Awwwards premia efeito: premia ofício e experiência, e usa criatividade como
desempate. É boa notícia para esta página, porque a base já é forte.

Três fatos que o plano precisa absorver:

1. **O júri é internacional e a página é pt-BR.** A maioria dos ~18 jurados não lê
   português. Isso não custa só os 10% de Content — contamina Usability, porque um
   jurado que não entende o texto não consegue julgar fluxo. É o item de maior
   alavancagem por esforço no plano inteiro.
2. **A página tem prazo de validade.** Depois de 12 out ela vira um link de campanha
   encerrada. Awwwards julga durante 5 dias e o site fica no perfil para sempre.
   Submeter uma LP que vai apodrecer é queimar a submissão.
3. **Categoria dura.** LP de cadastro compete com portfólio de estúdio e site
   experimental. Dá para ganhar — mas só com momentos autorais, não com uma
   sequência de seções bem-feitas.

**Posição:** o caminho realista é **Honorable Mention agora, SOTD depois**. As Fases
0–1 são obrigatórias para qualquer submissão e devem estar de pé antes de 14 set,
porque também servem à conversão. A Fase 2 é o que separa HM de SOTD e não cabe em
5 dias. A submissão em si deve esperar a página estar estável e bilíngue.

---

## 1 · Onde estamos, medido

Lighthouse mobile, build de produção, 9 set 2026:

| Categoria | Hoje | Alvo de submissão |
|---|---|---|
| Accessibility | **90** | ≥ 98 |
| Best Practices | **73** | ≥ 95 |
| SEO | **92** | 100 |

Falhas concretas, não impressões:

- **8 violações de contraste WCAG AA.** Nav da LP em `text-ink/60` sobre creme dá
  4.03:1 (mínimo 4.5). Badge creme sobre esmeralda dá 3.62:1. Texto sobre ink dá 4.38:1.
- **`<dl>` malformado nas duas grids de stats da Solana** — os `<dt>`/`<dd>` não estão
  agrupados. Quebra a árvore de acessibilidade (score agentic browsing: 33).
- **2 erros de console no load** — query do Supabase falhando e RDStation devolvendo 400.
- **robots.txt inválido** — não existe arquivo nem rota, o Next devolve o HTML da home.
- **Sem sitemap.**
- **Cookies de terceiros** (Meta Pixel) disparando antes de consentimento.

Estrutura (auditoria visual, desktop 1440 + mobile 390):

- Grid 2×2 de stats da Solana: quatro cards de peso idêntico em simetria perfeita.
  Sem hierarquia — o jurado lê "template".
- Headline de Cases centralizada, com buraco óptico na linha "SOLANA".
- Entrada do pin da Jornada ainda abre com ~160px de kraft vazio.
- Quadrante superior direito do hero morto.
- Mobile é redução do desktop, não composição própria. A Jornada em pin é `lg:` only
  e vira lista simples no celular — e é no celular que a maioria do júri abre.

Movimento: **resolvido em 9 set.** Tokens em `src/styles/tokens/motion.css`, zero valor
mágico em `src/`, reduced-motion como versão pensada, e um momento autoral no hero
(a impressão da manchete). Ver `docs/MOTION.md`. Isso é fundação, não diferencial.

---

## FASE 0 · Elegibilidade — bloqueia tudo
**Peso:** Usability (30%) · **Tamanho:** P · **Antes de:** 14 set

Awwwards não julga o que abre com erro no console.

| # | Ação | Arquivo | Pronto quando |
|---|---|---|---|
| 0.1 | Subir `text-ink/60` → `/75` no nav e revisar os 8 pares reprovados | `lp-section-nav.tsx`, `page.tsx`, tokens | axe zera contraste |
| 0.2 | Reagrupar as duas `<dl>` de stats em pares `<div><dt><dd></div>` | `page.tsx` (SOLANA_STATS ×2) | `definition-list` e `dlitem` passam |
| 0.3 | Tratar a falha de `getHackathonBySlug` sem `console.error` no cliente | `src/lib/hackathon.ts` | console limpo no load |
| 0.4 | Corrigir o 400 do RDStation ou remover o script | `analytics/` | console limpo |
| 0.5 | Criar `src/app/robots.ts` e `src/app/sitemap.ts` | novos | SEO 100 |
| 0.6 | Gatear Meta Pixel atrás do consentimento | `consent/` | sem cookie de 3º antes do opt-in |
| 0.7 | Corrigir o lint pré-existente (`setState` em effect) | `auth-dialog.tsx:45` | `npm run lint` limpo |

**Gate:** A11y ≥ 98 · Best Practices ≥ 95 · SEO 100 · zero erro de console · lint limpo.

---

## FASE 1 · Design — 40% da nota
**Tamanho:** M · **Antes de:** 14 set (o que der) / resto pós-evento

Este é o balde mais pesado e é onde a página já é competitiva. O trabalho é tirar
os três pontos onde ela cai para a média.

- **1.1 — Medir os tokens nas 3 referências.** Os valores em `motion.css` são o padrão
  documentado ajustado ao caráter da marca, não medidos. Abrir os 3 sites do
  Benchmarking no DevTools (aba Animations), extrair easing/duração/stagger reais e
  substituir. São 10 números num arquivo e o site inteiro se move junto. **Bloqueado:
  preciso dos 3 sites.**
- **1.2 — Quebrar a simetria do grid de stats.** Um dos quatro números é o argumento
  (33B de transações); os outros três são apoio. Dar escala e posição diferentes,
  não quatro caixas iguais.
- **1.3 — Dar tensão à headline de Cases.** Sair do centralizado por default; resolver
  o buraco da linha "SOLANA" com os tiles inline.
- **1.4 — Fechar a entrada do pin da Jornada.** Os 160px restantes.
- **1.5 — Ocupar o quadrante morto do hero** ou assumi-lo como negativo deliberado
  (decisão, não acidente).
- **1.6 — Declarar o sistema:** grid, escala tipográfica com razão fixa, escala de
  espaçamento. Hoje existem por hábito, não por regra.

**Gate:** cada seção passa no checklist anti-slop do workflow, com print e arquivo:linha.

---

## FASE 2 · Creativity — 20%, e o que separa HM de SOTD
**Tamanho:** G · **Pós-evento**

A página tem hoje **um** momento autoral (a impressão do hero) e uma seção pinada.
Sites de SOTD têm 3–5. Candidatos — **escolher 3, não 5**:

| | Momento | Por que funciona | Custo |
|---|---|---|---|
| a | **O ticket atravessa a página.** Ele é a metáfora e hoje aparece só no hero. Vira o card de cada passo, vira o CTA final. | Continuidade narrativa é o que jurado chama de "direção". Reusa asset existente. | M |
| b | **Camada sonora.** 3–4 SFX de papel/carimbo amarrados aos beats, com toggle visível. | Etapa 5 do workflow, hoje inexistente. Quase ninguém faz. Alto diferencial. | M |
| c | **Transição de página real** entre LP → `/h/[slug]` → `/pre-registro`. | Hoje corta seco. Jurado clica em tudo. | M |
| d | **Preloader de marca.** `animate-brand-fill` já existe e não é usado na LP. | Barato, e é o primeiro frame que o jurado vê. | P |
| e | **Moeda Solana interativa** (arrastar/girar) ou migrar para WebGL. | Hoje é proeza de CSS que ninguém percebe. Ou fica visível, ou fica mais barata. | G |

**Recomendação: a + b + d.** São os três que reforçam a mesma ideia (papel, impressão,
carimbo) em vez de somar efeitos independentes. (e) é o mais caro e o menos alinhado.

**Gate:** cada momento com função narrativa declarada, fallback, modo reduzido e
custo de frame medido.

---

## FASE 3 · Usability — 30%
**Tamanho:** M · **Pós-evento**

- **3.1 — Mobile como composição própria.** Awwwards tem score de mobile separado e o
  júri abre no celular. Hoje mobile é redução; a Jornada perde o pin e vira lista.
- **3.2 — Percurso completo de teclado**, com foco visível em cada parada.
- **3.3 — Trace de performance:** LCP, INP, CLS com throttling móvel. O `rAF` do
  `JourneyPin` e o `SolanaCoin` em `preserve-3d` são os suspeitos.
- **3.4 — Avaliar Lenis** — só se o trace mostrar um problema real de scroll. Não por default.

**Gate:** LCP < 2.5s e CLS < 0.1 em mobile throttled · página inteira operável no teclado.

---

## FASE 4 · Content (10%) + submissão
**Tamanho:** M · **Pós-evento, antes de submeter**

- **4.1 — Versão EN.** O maior ganho por esforço do plano. Mínimo: hero, as 4 seções
  e o FAQ. Decidir entre `/en` ou toggle.
- **4.2 — Decidir o pós-evento.** A página não pode virar "inscrições encerradas" vazio.
  Vira retrospectiva com os projetos vencedores? Essa decisão é de produto e precisa
  ser tomada antes de submeter.
- **4.3 — Kit de submissão:** thumbnail 1200×900, descrição em inglês, créditos, tags,
  OG verificado.

---

## Riscos

| Risco | Prob. | Mitigação |
|---|---|---|
| Fases 0–1 competem com a campanha que abre em 14 set | Alta | Fase 0 também serve à conversão; Fase 1 fatiada, só o que couber |
| Página apodrece após 12 out e a submissão fica ruim | Alta | Decisão 4.2 tomada **antes** de submeter, não depois |
| Fase 2 vira soma de efeitos independentes | Média | Máx. 3 momentos, todos reforçando a mesma ideia |
| Tokens de movimento seguem sem medição e o site fica "premium genérico" | Média | 1.1 é bloqueante e barato — só faltam os 3 sites |
| Um momento novo estoura o budget de frame no mobile | Média | Medir antes de aceitar; o workflow manda remover efeito sem ganho |

---

## Decisões que dependem da Laura

1. **Rota:** Fases 0–1 antes de 14 set e submissão depois do evento (recomendado), ou
   empurrar tudo e submeter agora?
2. **Os 3 sites de referência** para medir os tokens de movimento (bloqueia 1.1).
3. **Quais 3 momentos** da Fase 2 — minha recomendação é ticket + som + preloader.
4. **O que a página vira depois de 12 out** (bloqueia a submissão).
