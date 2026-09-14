# Campaign LP: World's Fair edits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the marketing team's annotated edits to the campaign landing page at `/` so every section sells the Crypto World's Fair with the real prizes, one CTA ("Quero participar"), a direct Colosseum link on step 2, a single Trilha Brasil card, and WhatsApp as the second action everywhere.

**Architecture:** The page is one server component, `src/app/(public)/page.tsx`, with copy in module-level consts and per-request values (`cadastroHref`, `colosseum.external_url`) computed in `HomePage()`. Edits stay in that file plus three small components (`event-ticket.tsx`, `cases-fan.tsx`, `bento-previews.tsx`). FAQ answers gain links, so the FAQ moves to a builder function in its own file with a unit test; everything else is copy and class changes verified by typecheck, lint, the existing suite and a headless-Chrome screenshot.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (`btn-cut` utilities, motion tokens), Vitest, headless Chrome for screenshots.

**Spec:** `/Users/thomgabriel/Desktop/Hackathon LP edit.pdf` (annotated screenshots, 8 pages) plus the owner's decisions on 2026-09-14: Trilha Brasil prize is **US$ 5 mil**, the WhatsApp link stays the one in code (`WHATSAPP_COMMUNITY_URL`), the Trilha Brasil destination is the Superteam Brasil Earn page for now. Prize and date facts come from `/Users/thomgabriel/Desktop/Crypto World's Fair Hackathon Rules.pdf`, section 5 and 14.

## Global Constraints

- UI copy in pt-BR; commits, branch, PR in English. No code comments unless they explain why.
- Motion: only tokens (`duration-(--dur-instant)`, `ease-entrada`), never raw ms or `ease-out`.
- Buttons use the existing `btn-cut` / `btn-cut-outline` / `btn-cut-quiet` classes and `TrackedCta`; every CTA keeps an `event` + `properties` pair.
- Any link to `/auth?next=…` opens the login dialog through `TrackedCta`; use `cadastroHref` for every "Quero participar".
- Outbound Colosseum link is `colosseum.external_url` from the DB (`https://colosseum.com/signup?ref=lp`), never hardcoded; tag it with `withPlatformUtm(url, { content, campaign: "colosseum-2026" })`.
- Prize facts (rules §14): tracks Solana, Tempo, Hyperliquid, Zcash = US$ 100 mil across 10 each; Ethereum L1, Base, Arbitrum, Robinhood Chain = US$ 25 mil across 5 each; Grand Champion US$ 30 mil; Public Goods US$ 5 mil; University US$ 5 mil; US$ 15 mil to each of the next 20 teams; total ≈ US$ 840 mil ("mais de US$ 800 mil"). Venture: US$ 2,5 mi, US$ 250 mil per team, at least 10 teams. Accelerator requires Solana integration.
- Dates (rules §5): 14 set 06:00 PT to 12 out 23:59 PT; winners by 5 Dec. The countdown target already equals that instant (`submission_deadline_at` = `2026-10-13T06:59:00Z`); do not change it.
- Do not print "só conta o que for construído entre 14 de setembro e 12 de outubro" anywhere.
- Branch: `feat/lp-worldsfair-edits` off `main`. One commit per task.

---

### Task 1: Ticket facts and the rules link

**Files:**
- Modify: `src/app/(public)/page.tsx:102-129` (`COLOSSEUM_FACTS`, `COLOSSEUM_NOTE`) and `:764-768` (mobile note)
- Modify: `src/components/campaign/event-ticket.tsx:244-249,303-307` (`TicketBack` `note` prop)
- Modify: `src/components/campaign/ticket-flip.tsx:43-46` (`note` prop type)

**Interfaces:**
- Produces: `TicketBack`/`TicketFlip` accept `note?: ReactNode` instead of `string`.

- [ ] **Step 1: Branch**

```bash
git checkout -b feat/lp-worldsfair-edits origin/main
```

- [ ] **Step 2: Replace the four facts and the note in `page.tsx`**

Replace lines 102-129 with:

```tsx
const COLOSSEUM_FACTS = [
  {
    figure: "8 trilhas",
    title: "Uma trilha por rede, mais os prêmios gerais",
    body: "Solana, Tempo, Hyperliquid e Zcash pagam US$ 100 mil entre os 10 melhores de cada rede. Ethereum, Base, Arbitrum e Robinhood Chain pagam US$ 25 mil entre os 5 melhores. Uma única submissão concorre à trilha da sua rede e aos prêmios gerais: US$ 30 mil para o campeão, US$ 15 mil para cada um dos 20 times de destaque, e prêmios de bem público e universitário.",
  },
  {
    figure: "US$ 2,5 mi",
    accent: true,
    title: "Do fundo do Colosseum, além de US$ 800 mil em prêmios",
    body: "Pelo menos 10 times entram no acelerador do Colosseum com US$ 250 mil de investimento cada. O acelerador pede integração com a Solana.",
  },
  {
    figure: "Projeto existente",
    title: "Da ideia à startup que já captou",
    body: "Vale tudo: uma ideia começando do zero ou uma startup que já levantou até R$ 3 milhões. Código antigo é válido, desde que o produto tenha alguma integração com uma blockchain.",
  },
  {
    figure: "Qualquer área",
    title: "DeFi, pagamentos, RWA, consumer, IA",
    body: "As trilhas são por rede, não por tema. Os jurados olham produto, tração e plano de distribuição. Sozinho ou em time, um time por pessoa.",
  },
];

const COLOSSEUM_RULES_URL = "https://colosseum.com/worldsfair";
```

Delete the `COLOSSEUM_NOTE` const and its comment.

- [ ] **Step 3: Pass a link as the note**

At the `TicketFlip` call (line ~729) replace `note={COLOSSEUM_NOTE}` with:

```tsx
note={
  <a
    href={COLOSSEUM_RULES_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="underline decoration-yellow decoration-2 underline-offset-4 hover:text-emerald-deep"
  >
    Regras completas em colosseum.com/worldsfair
  </a>
}
```

Replace the mobile note paragraph (lines ~764-768) body `{COLOSSEUM_NOTE}` with the same `<a>` element (same classes, same text).

- [ ] **Step 4: Widen the `note` prop type**

In `event-ticket.tsx` the `TicketBack` props: `note?: string;` → `note?: ReactNode;` and add `import type { ReactNode } from "react";` if the file does not already import it. Same in `ticket-flip.tsx` (`note?: string;` → `note?: ReactNode;`). Leave the rendering `<p>` as is; a ReactNode child renders fine.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit -p . && npx eslint 'src/app/(public)/page.tsx' src/components/campaign && npm test
```
Expected: no errors, all tests pass. Then with the dev server on 3000:
```bash
curl -s http://localhost:3000/ | grep -c 'colosseum.com/worldsfair'
```
Expected: `2` (desktop back + mobile note). Zero matches for `saem em 14 de setembro`.

- [ ] **Step 6: Commit**

```bash
git add src/app/(public)/page.tsx src/components/campaign/event-ticket.tsx src/components/campaign/ticket-flip.tsx
git commit -m "feat: ticket facts carry the World's Fair prizes and link to the rules"
```

---

### Task 2: One CTA label, hero and closing hierarchy

**Files:**
- Modify: `src/app/(public)/page.tsx:420` (`ctaLabel`), `:611-632` (hero CTAs), `:1305-1322` (closing CTAs)

- [ ] **Step 1: Label**

```tsx
const ctaLabel = state ? "Continuar meu cadastro" : "Quero participar";
```

- [ ] **Step 2: Hero: primary bigger, WhatsApp smaller**

Primary `TrackedCta` className (line ~620):
```
btn-cut inline-flex items-center whitespace-nowrap bg-emerald-deep px-9 py-4 text-base font-bold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark sm:px-12 sm:text-lg
```
WhatsApp `TrackedCta` className (line ~628):
```
btn-cut btn-cut-outline btn-cut-quiet inline-flex items-center px-6 py-3 text-sm font-semibold text-ink sm:whitespace-nowrap
```

- [ ] **Step 3: Closing: same hierarchy on the dark ground**

Primary (line ~1310):
```
btn-cut inline-flex items-center whitespace-nowrap bg-yellow px-9 py-4 text-base font-bold text-green-dark transition-colors duration-(--dur-instant) ease-entrada hover:bg-yellow-strong sm:px-12 sm:text-lg
```
WhatsApp (line ~1318): change `px-8 py-3.5 text-sm font-semibold` → `px-6 py-3 text-sm font-semibold` and drop `sm:px-10 sm:text-base`.

- [ ] **Step 4: Verify and commit**

```bash
npx eslint 'src/app/(public)/page.tsx' && curl -s http://localhost:3000/ | grep -o 'Quero participar' | wc -l
```
Expected: lint clean; count ≥ 2 (hero + closing; more after later tasks).

```bash
git add src/app/(public)/page.tsx
git commit -m "feat: hero and closing lead with Quero participar, WhatsApp as the quiet second"
```

---

### Task 3: Cases: shorter side text, "Pode ser você" opens the sign-up

**Files:**
- Modify: `src/components/home/cases-fan.tsx:6-17` (`CaseCard`), `:69-78` (`GlyphTile`)
- Modify: `src/app/(public)/page.tsx:90-95` (case item), `:779-812` (side text + `CasesFan` call)

**Interfaces:**
- Produces: `CaseCard.href?: string`; when set on a glyph card, the tile is a `TrackedCta` with `event="cta_clicked"`, `properties={{ cta: "cadastro", location: "cases" }}`.

- [ ] **Step 1: Type and tile**

In `cases-fan.tsx` add `href?: string;` to `CaseCard`, import `TrackedCta` from `@/components/ui/tracked-cta`, and replace `GlyphTile`:

```tsx
function GlyphTile({ item }: { item: CaseCard }) {
  const inner = (
    <>
      <div className="flex min-h-0 flex-1 items-center justify-center py-2">
        <QuestionGlyph className="h-full max-h-[12rem] w-auto text-yellow" />
      </div>
      <TileFooter item={item} />
    </>
  );
  const shell =
    "card-cut card-cut-dark flex h-full min-h-[17rem] flex-col p-6 sm:p-8 xl:p-9";
  return item.href ? (
    <TrackedCta
      href={item.href}
      event="cta_clicked"
      properties={{ cta: "cadastro", location: "cases" }}
      className={`${shell} transition-transform duration-(--dur-instant) ease-entrada hover:-translate-y-0.5`}
    >
      {inner}
    </TrackedCta>
  ) : (
    <div className={shell}>{inner}</div>
  );
}
```

- [ ] **Step 2: Give the "?" card the per-request href**

`CASES` is module-level and `cadastroHref` is per request, so inside `HomePage()` right after `cadastroHref` is defined:

```tsx
const cases = CASES.map((c) =>
  c.glyph ? { ...c, href: cadastroHref } : c,
);
```
and pass `cases` wherever `CASES` is passed to `CasesFan` (line ~781).

- [ ] **Step 3: Remove the first paragraph of the side text**

Delete the `<p>` at lines ~794-800 ("Um hackathon é uma competição…"). Keep the second paragraph.

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit -p . && npx eslint src/components/home/cases-fan.tsx 'src/app/(public)/page.tsx' && curl -s http://localhost:3000/ | grep -c 'Um hackathon é uma competição'
```
Expected: `0`.

```bash
git add src/components/home/cases-fan.tsx src/app/(public)/page.tsx
git commit -m "feat: the Pode ser você card opens the sign-up; drop the hackathon definition"
```

---

### Task 4: Three steps: subtitle, roles of each step, direct Colosseum link

**Files:**
- Modify: `src/app/(public)/page.tsx:401-417` (registration lookup), `:424-492` (`journey`), `:832-836` (subtitle)

- [ ] **Step 1: Drop the registration lookup**

Step 2 will always link to Colosseum, so `registered` is dead. Delete lines 401-417 (the `let registered` block) and the two imports it alone used: `createServerSupabaseClient` and `logQueryError` (check with `grep -n 'createServerSupabaseClient\|logQueryError' src/app/\(public\)/page.tsx` that nothing else uses them).

- [ ] **Step 2: Rewrite `journey`**

```tsx
const colosseumHref = colosseum?.external_url
  ? withPlatformUtm(colosseum.external_url, {
      content: "lp_jornada",
      campaign: "colosseum-2026",
    })
  : null;

const journey = [
  {
    marker: "Agora",
    title: "Crie sua conta na Superteam Brasil.",
    items: [
      "É por aqui que você recebe o apoio: mentorias, workshops e a Trilha Brasil",
      "Você pode contar sobre sua ideia e sua equipe agora ou depois",
      "Leva dois minutos",
    ],
    cta: (
      <TrackedCta
        href={cadastroHref}
        event="cta_clicked"
        properties={{ cta: "cadastro", location: "jornada" }}
        className="btn-cut inline-flex w-fit items-center whitespace-nowrap bg-yellow px-8 py-3.5 text-base font-bold text-green-dark transition-colors duration-(--dur-instant) ease-entrada hover:bg-yellow-strong"
      >
        <span>{ctaLabel}</span>
      </TrackedCta>
    ),
  },
  {
    marker: "O mais importante",
    title: "Faça a inscrição oficial no Colosseum.",
    items: [
      "É a plataforma do hackathon: sem ela, o projeto não concorre",
      "Cada integrante precisa ter uma conta lá",
      "Não precisa ter ideia nem time ainda",
    ],
    cta: colosseumHref ? (
      <TrackedCta
        href={colosseumHref}
        event="campaign_link_clicked"
        properties={{ target: "colosseum", location: "jornada" }}
        className="btn-cut btn-cut-outline inline-flex w-fit items-center whitespace-nowrap px-6 py-3 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]"
      >
        <span>Inscrever no Colosseum</span>
      </TrackedCta>
    ) : (
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
        Inscrições abrem em breve
      </p>
    ),
  },
  {
    marker: "Sempre",
    title: "Entre no grupo do WhatsApp.",
    items: [
      "Todas as novidades, datas e avisos saem por lá",
      "Workshops e mentorias ao vivo",
      "Onde quem chega sozinho encontra time",
    ],
    cta: (
      <TrackedCta
        href={WHATSAPP_COMMUNITY_URL}
        event="campaign_link_clicked"
        properties={{ target: "whatsapp", location: "lp" }}
        className="btn-cut btn-cut-outline inline-flex w-fit items-center whitespace-nowrap px-6 py-3 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]"
      >
        <span>Entrar no grupo do WhatsApp</span>
      </TrackedCta>
    ),
  },
];
```

- [ ] **Step 3: Subtitle**

Replace the `<p>` text at lines ~832-836 with:

```
Desde uma ideia até empresas já rodando, qualquer pessoa pode participar. Já tivemos ganhadores de todos os tipos. Para participar é muito simples:
```

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit -p . && npx eslint 'src/app/(public)/page.tsx' && curl -s http://localhost:3000/ | grep -o 'colosseum.com/signup?ref=lp[^"]*' | head -1
```
Expected: the signup URL with `utm_source=platform`, `utm_content=lp_jornada`, `utm_campaign=colosseum-2026` appended.

```bash
git add src/app/(public)/page.tsx
git commit -m "feat: step 2 links straight to Colosseum; steps say what each one is for"
```

---

### Task 5: Trilha Brasil as one card

**Files:**
- Modify: `src/app/(public)/page.tsx:36-39` (import), `:1072-1107` (card)
- Modify: `src/components/home/bento-previews.tsx:173-372` (delete `EarnPreview`, `LISTINGS`, `EARN_TABS`, `KIND_LABEL`, `EARN_URL`, `Listing` and the "Prêmio extra" block)

- [ ] **Step 1: Remove the fake feed**

In `bento-previews.tsx` delete the whole `TRILHA BRASIL` block (from the `EARN_URL` const through the end of `EarnPreview`). Remove `EarnPreview` from the import in `page.tsx`. Run `npx tsc --noEmit -p .`; if it reports now-unused helpers (`useRovingTabs`, `PreviewStage`, `CARD_OVER`) that only the feed used, delete those too.

- [ ] **Step 2: Replace the card body**

Replace lines ~1074-1106 (header + `<EarnPreview />` + button) with:

```tsx
<header className="relative p-5 pb-0 sm:p-6 sm:pb-0">
  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/80">
    Só para times brasileiros
  </p>
  <h3 className="mt-2 font-heading text-2xl font-black uppercase text-ink [font-stretch:115%]">
    Trilha Brasil
  </h3>
  <p className="mt-3 text-pretty text-sm leading-relaxed text-green-dark/70">
    Além dos prêmios da competição global, times brasileiros com projeto
    na Solana concorrem à Trilha Brasil: US$ 5 mil em prêmios e mentoria
    da Superteam Brasil, publicada no Superteam Earn. O mesmo projeto
    concorre nas duas.
  </p>
</header>
<div className="relative mx-5 mt-5 rounded-xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker sm:mx-6">
  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-deep">
    Superteam Earn
  </p>
  <p className="mt-2 font-heading text-lg font-bold leading-snug text-ink">
    Trilha Brasil · Colosseum 2026
  </p>
  <p className="mt-1 font-heading text-[2rem] font-black uppercase leading-none text-green-dark [font-stretch:115%]">
    US$ 5 mil
  </p>
  <p className="mt-2 text-sm text-ink/70">
    Submissão até 12 de outubro, junto com o Colosseum.{" "}
    <a
      href={withPlatformUtm("https://superteam.fun/earn/s/superteambr", {
        content: "lp_trilha_brasil",
        campaign: "colosseum-2026",
      })}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-emerald-deep underline underline-offset-2"
    >
      Ver no Earn
    </a>
  </p>
</div>
<div className="relative mt-auto flex p-5 pt-6 sm:p-6 sm:pt-7">
  <TrackedCta
    href={cadastroHref}
    event="cta_clicked"
    properties={{ cta: "cadastro", location: "trilha_brasil" }}
    className="btn-cut inline-flex w-fit items-center whitespace-nowrap bg-emerald-deep px-8 py-3.5 text-base font-bold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark"
  >
    <span>{ctaLabel}</span>
  </TrackedCta>
</div>
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit -p . && npx eslint 'src/app/(public)/page.tsx' src/components/home/bento-previews.tsx && npm test && curl -s http://localhost:3000/ | grep -c 'Landing page de protocolo DeFi'
```
Expected: `0`.

```bash
git add src/app/(public)/page.tsx src/components/home/bento-previews.tsx
git commit -m "feat: Trilha Brasil is one card with the US\$ 5 mil prize and an Earn link"
```

---

### Task 6: Recursos: big WhatsApp on top, four tiles

**Files:**
- Modify: `src/app/(public)/page.tsx:178-212` (`RESOURCES`), `:1134-1155` (tile grid)

- [ ] **Step 1: Trim `RESOURCES`**

Remove the "Grupo do WhatsApp" and "Superteam Earn" entries, leaving YouTube, Wiki, Academy, Discord in that order. If `CoinsIcon` is now unused, drop it from the phosphor import.

- [ ] **Step 2: Add the big WhatsApp CTA above the grid**

Insert before the `<ul className="mt-6 grid …">`:

```tsx
<TrackedCta
  href={WHATSAPP_COMMUNITY_URL}
  event="campaign_link_clicked"
  properties={{ target: "whatsapp", location: "recursos" }}
  className="btn-cut mt-6 inline-flex w-full items-center justify-center gap-2.5 bg-emerald-deep px-8 py-4 text-base font-bold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark"
>
  <WhatsappLogoIcon aria-hidden size={20} weight="bold" />
  <span>Entrar no grupo do WhatsApp</span>
</TrackedCta>
```
Change the grid `<ul>` classes `mt-6 … grid-cols-2 … sm:grid-cols-3` → `mt-4 … grid-cols-2 … sm:grid-cols-4`.

- [ ] **Step 3: Verify and commit**

```bash
npx eslint 'src/app/(public)/page.tsx' && curl -s http://localhost:3000/ | grep -o 'tile-recurso' | wc -l
```
Expected: `4`.

```bash
git add src/app/(public)/page.tsx
git commit -m "feat: recursos leads with the WhatsApp group, Earn tile removed"
```

---

### Task 7: FAQ with links and a centered WhatsApp button

**Files:**
- Create: `src/app/(public)/faq-items.tsx`
- Test: `src/lib/__tests__/faq-items.test.tsx`
- Modify: `src/app/(public)/page.tsx:213-262` (delete `FAQ_ITEMS`), `:1192` (use builder), `:1225-1244` (footer row)

**Interfaces:**
- Produces: `faqItems({ colosseumHref, earnHref, whatsappHref }: { colosseumHref: string | null; earnHref: string; whatsappHref: string }): { q: string; a: ReactNode }[]` — 12 items, same order as today.

- [ ] **Step 1: Write the failing test**

```tsx
// src/lib/__tests__/faq-items.test.tsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { faqItems } from "@/app/(public)/faq-items";

const links = {
  colosseumHref: "https://colosseum.com/signup?ref=lp",
  earnHref: "https://superteam.fun/earn/s/superteambr",
  whatsappHref: "https://chat.whatsapp.com/x",
};

describe("faqItems", () => {
  it("keeps twelve questions in two columns of six", () => {
    expect(faqItems(links)).toHaveLength(12);
  });

  it("links the official registration, the Earn listing and the group", () => {
    const html = faqItems(links).map((f) => renderToStaticMarkup(<>{f.a}</>)).join("");
    expect(html).toContain(links.colosseumHref);
    expect(html).toContain(links.earnHref);
    expect(html).toContain(links.whatsappHref);
  });

  it("prints the real prizes", () => {
    const html = faqItems(links).map((f) => renderToStaticMarkup(<>{f.a}</>)).join("");
    expect(html).toContain("US$ 800 mil");
    expect(html).toContain("US$ 5 mil");
    expect(html).not.toContain("sai em 14 de setembro");
  });

  it("falls back to plain text when Colosseum has no link yet", () => {
    const html = renderToStaticMarkup(<>{faqItems({ ...links, colosseumHref: null })[3].a}</>);
    expect(html).not.toContain("<a");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
npx vitest run src/lib/__tests__/faq-items.test.tsx
```
Expected: FAIL, module not found.

- [ ] **Step 3: Create the builder**

```tsx
// src/app/(public)/faq-items.tsx
import type { ReactNode } from "react";

const LINK =
  "font-semibold text-emerald-deep underline underline-offset-2 hover:text-green-dark";

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {children}
    </a>
  );
}

export function faqItems({
  colosseumHref,
  earnHref,
  whatsappHref,
}: {
  colosseumHref: string | null;
  earnHref: string;
  whatsappHref: string;
}): { q: string; a: ReactNode }[] {
  const colosseum = colosseumHref ? (
    <Ext href={colosseumHref}>inscrição oficial na Colosseum</Ext>
  ) : (
    "inscrição oficial na Colosseum"
  );
  return [
    {
      q: "Preciso saber programar?",
      a: "Não. Você também pode contribuir com design, comunicação, marketing ou negócios. A Colosseum permite a participação de pessoas sem formação técnica.",
    },
    {
      q: "Ainda não tenho uma ideia. Posso começar?",
      a: "Pode. Crie sua conta, indique suas habilidades e conheça a comunidade enquanto procura um projeto de que gostaria de participar.",
    },
    {
      q: "Preciso ter uma equipe formada?",
      a: "Não. Você pode começar sem uma equipe e indicar no cadastro que está procurando pessoas para construir com você.",
    },
    {
      q: "Criar a conta aqui já me inscreve no evento?",
      a: (
        <>
          Não. A conta é da plataforma da Superteam Brasil, onde você recebe o
          apoio. Depois, você precisa concluir sua {colosseum}. Mostramos esse
          próximo passo durante o cadastro.
        </>
      ),
    },
    {
      q: "Posso completar minhas informações depois?",
      a: "Sim. As informações complementares sobre sua ideia e sua equipe podem ser salvas e concluídas depois. A inscrição oficial e a entrega do projeto seguem os prazos do evento.",
    },
    {
      q: "Quanto custa?",
      a: "Nada. Criar a conta, participar da comunidade e entrar no hackathon são gratuitos.",
    },
    {
      q: "Preciso falar inglês?",
      a: "A submissão na Colosseum é em inglês. Toda a Trilha Brasil, as mentorias e o suporte da Superteam Brasil são em português.",
    },
    {
      q: "Quais são os prêmios?",
      a: "Mais de US$ 800 mil em prêmios: US$ 30 mil para o campeão geral, US$ 15 mil para cada um dos 20 times de destaque, prêmios de bem público e universitário, e as trilhas por rede, que pagam US$ 100 mil (Solana, Tempo, Hyperliquid, Zcash) ou US$ 25 mil (Ethereum, Base, Arbitrum, Robinhood Chain) entre os melhores de cada uma. Por cima disso, US$ 2,5 milhões do fundo do Colosseum: pelo menos 10 times entram no acelerador com US$ 250 mil cada.",
    },
    {
      q: "Ganhar o hackathon garante investimento?",
      a: "Não. Prêmios e investimento seguem processos diferentes. A entrada em um programa de aceleração ou investimento depende da avaliação e dos critérios de seleção.",
    },
    {
      q: "Preciso usar Solana no meu projeto?",
      a: "O evento aceita projetos de diferentes blockchains, incluindo Solana. A Superteam Brasil faz parte da comunidade Solana, mas essa edição da Colosseum é aberta a todas essas redes. A Trilha Brasil no Superteam Earn e o acelerador de US$ 250 mil pedem integração com a Solana.",
    },
    {
      q: "O que é a Trilha Brasil?",
      a: (
        <>
          US$ 5 mil em prêmios e mentoria da Superteam Brasil, só para times
          brasileiros com projeto na Solana, publicada no{" "}
          <Ext href={earnHref}>Superteam Earn</Ext>. Para concorrer, além de
          enviar o projeto na Colosseum, você submete o mesmo projeto no desafio
          da Trilha Brasil.
        </>
      ),
    },
    {
      q: "Posso entrar no grupo antes de criar minha conta?",
      a: (
        <>
          Sim. Você pode conhecer a comunidade pelo{" "}
          <Ext href={whatsappHref}>grupo do WhatsApp</Ext> e criar sua conta
          quando decidir avançar. Entrar no grupo não conclui a inscrição no
          hackathon.
        </>
      ),
    },
  ];
}
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run src/lib/__tests__/faq-items.test.tsx
```
Expected: 4 passed. If vitest complains about JSX in the test, the existing `page-doc-render.test.tsx` shows the config already handles `.tsx` tests.

- [ ] **Step 5: Wire it into the page**

Delete `FAQ_ITEMS` (lines ~213-262). Inside `HomePage()` after `colosseumHref` from Task 4:

```tsx
const faq = faqItems({
  colosseumHref,
  earnHref: withPlatformUtm("https://superteam.fun/earn/s/superteambr", {
    content: "lp_faq",
    campaign: "colosseum-2026",
  }),
  whatsappHref: WHATSAPP_COMMUNITY_URL,
});
```
and import `{ faqItems } from "./faq-items"`. Replace `[FAQ_ITEMS.slice(0, 6), FAQ_ITEMS.slice(6)]` with `[faq.slice(0, 6), faq.slice(6)]`. The answer `<p>` already renders `{f.a}`; `{f.a}` being a ReactNode is fine.

- [ ] **Step 6: Centered WhatsApp button under the FAQ**

Replace the footer `<div className="mt-10 flex flex-col items-start gap-4 sm:flex-row …">` block (lines ~1231-1242) with:

```tsx
<div className="mt-12 flex flex-col items-center gap-4 text-center">
  <p className="text-pretty font-heading text-lg font-bold leading-snug text-ink">
    Ficou faltando alguma? Todas as novidades saem no grupo.
  </p>
  <TrackedCta
    href={WHATSAPP_COMMUNITY_URL}
    event="campaign_link_clicked"
    properties={{ target: "whatsapp", location: "faq" }}
    className="btn-cut inline-flex items-center gap-2.5 whitespace-nowrap bg-emerald-deep px-10 py-4 text-base font-bold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark sm:px-14 sm:text-lg"
  >
    <WhatsappLogoIcon aria-hidden size={20} weight="bold" />
    <span>Entrar no grupo do WhatsApp</span>
  </TrackedCta>
</div>
```

- [ ] **Step 7: Verify and commit**

```bash
npx tsc --noEmit -p . && npx eslint 'src/app/(public)' && npm test
```
Expected: all green, test count is the previous total + 4.

```bash
git add src/app/(public)/faq-items.tsx src/lib/__tests__/faq-items.test.tsx src/app/(public)/page.tsx
git commit -m "feat: FAQ answers link Colosseum, Earn and the group; real prize figures"
```

---

### Task 8: Screenshots and PR

**Files:** none new.

- [ ] **Step 1: Full pass**

```bash
npx tsc --noEmit -p . && npx eslint src && npm test && npm run build
```
Expected: clean build.

- [ ] **Step 2: Screenshot desktop and phone**

```bash
S=$CLAUDE_JOB_DIR/tmp
C='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
"$C" --headless=new --disable-gpu --hide-scrollbars --window-size=1400,7000 --virtual-time-budget=15000 --screenshot=$S/lp-desktop.png http://localhost:3000/
"$C" --headless=new --disable-gpu --hide-scrollbars --window-size=400,9000 --virtual-time-budget=15000 --screenshot=$S/lp-phone.png http://localhost:3000/
```
Open both with Read, check: no stale copy (`14 de setembro` strip, fake Earn feed, "Criar conta"), all "Quero participar" buttons present, Recursos shows one big WhatsApp + 4 tiles, FAQ ends with a centered button. Send both files to the user with SendUserFile.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/lp-worldsfair-edits
gh pr create --base main --title "Campaign LP: marketing edits for the World's Fair launch" --body "$(cat <<'EOF'
Applies the team's annotated edits (Hackathon LP edit.pdf, 14 Sep) to the campaign LP.

- Ticket facts carry the rules' prizes: eight tracks with their amounts, US$ 800 mil in prizes, US$ 2,5 mi venture. The "regras saem em 14 de setembro" strip is a link to colosseum.com/worldsfair.
- One CTA label, "Quero participar", on hero, steps, Trilha Brasil and closing; WhatsApp is the smaller second button everywhere. The "Pode ser você" case card opens the sign-up.
- Step 2 links straight to Colosseum (tagged); the registration lookup that gated it is gone.
- Trilha Brasil is one card with the US$ 5 mil prize and an Earn link; the fake Earn feed is deleted.
- Recursos: big WhatsApp button on top, four tiles below.
- FAQ answers can carry links (Colosseum, Earn, WhatsApp) and print the real prizes; a centered WhatsApp button closes the section. `faqItems()` has unit tests.

Countdown target unchanged: it already equals 12 Oct 23:59 PT from the rules.

https://claude.ai/code/session_01NKy48B3pRPJWUYV57puyNP
EOF
)"
```

---

## Self-review

- Spec coverage: PDF p1 hero (T2), p1-2 ticket/prizes/existing project/strip (T1), p2 cases (T3), p3 steps (T4), p4-5 Trilha Brasil and Earn button (T5), p5 recursos (T6), p6-7 FAQ Q4/Q8/Q11 + centered button (T7), p7 closing buttons (T2), countdown (constraint, no change), p8 reference only.
- Placeholders: none; every step carries its code or command.
- Names: `cadastroHref`, `ctaLabel`, `colosseumHref` (T4) reused in T5 and T7; `faqItems` signature identical in test and page; `CaseCard.href` matches T3 tile.
