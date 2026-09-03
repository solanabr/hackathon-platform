import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  InfoIcon,
  TelegramLogoIcon,
  WarningIcon,
  WhatsappLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { CopyCode } from "./copy-code";

export const metadata: Metadata = {
  title: "Do Earn ao Pix: como receber sua grant em reais",
  description:
    "Passo a passo completo: criar sua conta no Superteam Earn, sacar para sua wallet, converter USDG em USDC e transformar tudo em reais via Pix.",
  openGraph: {
    title: "Do Earn ao Pix · Guia prático da Superteam Brasil",
    description:
      "Cinco passos, cerca de 30 minutos, custo zero: do cadastro no Superteam Earn até os reais caírem no seu Pix.",
    images: [{ url: "/guias/do-earn-ao-pix/og.png", width: 1200, height: 630 }],
  },
};

const COUPON = "SUPERTEAMBRASIL";
const JUP_SOL = "https://jup.ag/swap?sell=2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH&buy=So11111111111111111111111111111111111111112";
const JUP_USDC = "https://jup.ag/swap?sell=2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH&buy=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const FOUR_P_SUPPORT = "https://wa.me/551151289991";

const SHOT_SIZES: Record<string, [number, number]> = {
  "p03-0": [372, 357],
  "p03-1": [344, 357],
  "p03-2": [378, 305],
  "p03-3": [378, 273],
  "p03-4": [320, 357],
  "p03-5": [190, 357],
  "p04-0": [820, 221],
  "p04-1": [764, 221],
  "p04-2": [776, 301],
  "p05-0": [316, 421],
  "p05-1": [364, 415],
  "p05-2": [366, 403],
  "p05-3": [366, 383],
  "p05-4": [250, 421],
  "p06-0": [442, 833],
  "p06-1": [442, 743],
  "p07-0": [378, 399],
  "p07-1": [316, 581],
  "p07-2": [346, 581],
  "p08-0": [306, 659],
  "p08-1": [482, 539],
  "p09-0": [384, 111],
  "p09-1": [368, 361],
  "p09-2": [384, 259],
  "p09-3": [384, 189],
  "p09-4": [232, 361],
  "p09-5": [340, 361],
  "p10-0": [876, 153],
  "p10-1": [368, 681],
  "p11-0": [378, 693],
  "p11-1": [380, 509],
  "p11-2": [378, 729],
  "p12-0": [276, 459],
  "p12-1": [274, 467],
  "p12-2": [274, 463],
  "p12-3": [274, 459],
};

const STEPS = [
  { n: 1, title: "Criar sua conta no Superteam Earn", sub: "Cadastro, verificação por email e perfil de Talent." },
  { n: 2, title: "Instalar a Phantom Wallet", sub: "Sua carteira Solana, onde a grant fica guardada." },
  { n: 3, title: "Sacar do Earn para a Phantom", sub: "Transferir o USDG da grant para sua carteira." },
  { n: 4, title: "Trocar USDG por USDC no Jupiter", sub: "Swap rápido e sem taxa de plataforma." },
  { n: 5, title: "Vender por Pix na 4P Finance", sub: "Cadastro, cupom, dados da venda e envio do USDC." },
];

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold text-emerald underline decoration-2 underline-offset-4 hover:text-green-dark"
    >
      {children}
    </a>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mt-6 space-y-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald font-mono text-xs font-bold text-surface">
            {i + 1}
          </span>
          <p className="leading-relaxed text-ink/90">{item}</p>
        </li>
      ))}
    </ol>
  );
}

function Callout({ tone, title, children }: { tone: "info" | "warn" | "danger" | "ok" | "soft"; title?: string; children: ReactNode }) {
  const styles = {
    info: "border-green-dark bg-green text-surface",
    warn: "border-green-dark bg-green-dark text-surface",
    danger: "border-red-700 bg-red-700 text-surface",
    ok: "border-emerald/40 bg-emerald/10 text-ink",
    soft: "border-yellow bg-yellow/25 text-ink",
  }[tone];
  const icon =
    tone === "info" ? <InfoIcon size={20} weight="bold" aria-hidden /> : tone === "ok" || tone === "soft" ? null : <WarningIcon size={20} weight="fill" aria-hidden />;
  return (
    <div className={`mt-6 flex gap-4 rounded-2xl border-2 px-5 py-4 ${styles}`}>
      {icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow text-green-dark">{icon}</span>
      )}
      <div className="text-sm leading-relaxed sm:text-base">
        {title && <p className="mb-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-yellow">{title}</p>}
        {children}
      </div>
    </div>
  );
}

function Shots({ items, cols = 3 }: { items: Array<[string, string, boolean?]>; cols?: 2 | 3 | 4 }) {
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols];
  return (
    <div className={`mt-8 grid gap-4 ${grid}`}>
      {items.map(([file, caption, censored]) => {
        const [w, h] = SHOT_SIZES[file];
        return (
          <figure key={file} className="flex flex-col overflow-hidden rounded-2xl border-2 border-green-dark bg-surface-raised shadow-sticker">
            <div className="flex flex-1 items-center justify-center bg-surface-deep/60 p-4">
              <Image src={`/guias/do-earn-ao-pix/${file}.webp`} alt="" width={w} height={h} className="max-h-72 w-auto max-w-full rounded-lg" />
            </div>
            <figcaption className="flex items-center justify-between gap-3 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-green">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-yellow" />
                {caption}
              </span>
              {censored && <span className="rounded-full bg-green-dark px-2 py-0.5 text-[9px] text-yellow">censurado</span>}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function StepHeader({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="scroll-mt-28" id={`passo-${n}`}>
      <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
        {STEPS.map((s) => (
          <span
            key={s.n}
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] ${
              s.n < n ? "border-emerald bg-emerald text-surface" : s.n === n ? "border-yellow bg-yellow text-green-dark" : "border-green-dark/30 text-muted"
            }`}
          >
            {s.n}
          </span>
        ))}
        <span className="ml-2">Passo {n} de 5</span>
      </div>
      <h2 className="mt-4 flex items-start gap-4 font-heading text-3xl font-black tracking-tight text-ink [font-stretch:110%] sm:text-4xl">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow text-2xl text-green-dark sm:h-14 sm:w-14">{n}</span>
        <span className="pt-1.5">{children}</span>
      </h2>
    </div>
  );
}

function Sub({ n, children, hint }: { n: string; children: ReactNode; hint?: string }) {
  return (
    <h3 className="mt-10 flex flex-wrap items-baseline gap-x-3 font-heading text-xl font-black text-ink sm:text-2xl">
      <span className="text-emerald">{n}</span>
      {children}
      {hint && <span className="text-sm font-normal text-muted">({hint})</span>}
    </h3>
  );
}

export default function GuiaEarnPixPage() {
  return (
    <div>
      <section className="px-4 pt-10 sm:px-6 sm:pt-14">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald">Guia prático</p>
          <h1 className="mt-4 font-heading font-black uppercase leading-[0.95] tracking-tight text-ink">
            <span className="block text-5xl [font-stretch:120%] sm:text-7xl">Do Earn</span>
            <span className="mt-3 inline-block -rotate-1 bg-green-dark px-4 py-1.5 text-3xl text-yellow [font-stretch:110%] sm:text-5xl">
              ao Pix
            </span>
          </h1>
          <p className="mt-6 font-heading text-xl font-bold text-ink sm:text-2xl">Como receber sua grant em reais</p>
          <p className="mt-3 max-w-2xl text-pretty text-lg leading-relaxed text-ink/80">
            Passo a passo completo: criar sua conta no Superteam Earn, sacar para sua wallet, converter USDG em USDC e
            transformar tudo em reais via Pix.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
            {[
              ["5", "passos"],
              ["~30", "minutos"],
              ["R$ 0", "de custo"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border-2 border-green-dark bg-surface-raised px-4 py-4 shadow-sticker sm:px-6">
                <dt className="font-heading text-3xl font-black text-ink sm:text-4xl">{v}</dt>
                <dd className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald sm:text-xs">{l}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald">O caminho do dinheiro</p>
          <ol className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold">
            {["Superteam Earn", "Phantom Wallet", "USDG", "USDC · Jupiter", "Pix · 4P"].map((s, i, arr) => (
              <li key={s} className="flex items-center gap-2">
                <span className={`rounded-full border-2 border-green-dark px-3 py-1.5 ${i === arr.length - 1 ? "bg-yellow text-green-dark" : "bg-surface-raised text-ink"}`}>{s}</span>
                {i < arr.length - 1 && <ArrowRightIcon size={14} weight="bold" className="text-green-dark/40" aria-hidden />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="px-4 sm:px-6">
        <article className="mx-auto max-w-4xl">
          {/* Overview */}
          <section className="py-16 sm:py-20">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald">Visão geral</p>
            <h2 className="mt-2 font-heading text-3xl font-black uppercase tracking-tight text-ink [font-stretch:118%] sm:text-4xl">O que você vai fazer</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink/80">
              Cinco passos, do cadastro no Superteam Earn até os reais caírem no seu Pix. Siga na ordem, cada passo
              depende do anterior.
            </p>
            <ol className="mt-8 space-y-3">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <a
                    href={`#passo-${s.n}`}
                    className={`flex items-center gap-4 rounded-2xl border-2 border-green-dark px-5 py-4 shadow-sticker transition-transform duration-150 hover:-translate-y-0.5 ${
                      s.n === 5 ? "bg-green-dark text-surface" : "bg-surface-raised text-ink"
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-lg font-black ${s.n === 5 ? "bg-yellow text-green-dark" : "bg-emerald text-surface"}`}>
                      {s.n}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-heading text-lg font-bold">{s.title}</span>
                      <span className={`block text-sm ${s.n === 5 ? "text-surface/70" : "text-muted"}`}>{s.sub}</span>
                    </span>
                    <ArrowRightIcon size={18} weight="bold" className="shrink-0 opacity-60" aria-hidden />
                  </a>
                </li>
              ))}
            </ol>
            <Callout tone="info" title="Dica pra não errar">
              Cada passo tem prints numerados. Siga na ordem e confira sempre o início e o fim dos endereços antes de
              confirmar.
            </Callout>
          </section>

          {/* Step 1 */}
          <section className="border-t-2 border-green-dark/10 py-16">
            <StepHeader n={1}>Criar sua conta no Superteam Earn</StepHeader>
            <Steps
              items={[
                <>Acesse <Ext href="https://superteam.fun/earn">superteam.fun/earn</Ext> e clique em “Sign Up”. Escolha “Continue with Email” (ou Google).</>,
                <>Digite seu email e o <strong>código de verificação (OTP)</strong> de 6 dígitos que chega no email (remetente Privy). Expira em 10 minutos.</>,
                <>Na tela de escolha, selecione <strong>“Continue as Talent”</strong>, <strong className="text-red-700">nunca “Sponsor”</strong>.</>,
                <>Complete o perfil (nome, username, localização, skills) e clique em “Create Profile”.</>,
              ]}
            />
            <Callout tone="soft">
              A conta do Earn já vem com uma <strong>wallet embutida</strong>, é nela que a grant chega.
            </Callout>
            <Shots
              items={[
                ["p03-0", "Tela de login"],
                ["p03-1", "Digitar o código (OTP)"],
                ["p03-2", "Email com o código"],
                ["p03-3", "Talent, nunca Sponsor"],
                ["p03-4", "Completar o perfil"],
                ["p03-5", "Wallet do Earn"],
              ]}
            />
          </section>

          {/* Step 2 */}
          <section className="border-t-2 border-green-dark/10 py-16">
            <StepHeader n={2}>Instalar a Phantom Wallet</StepHeader>
            <p className="mt-6 leading-relaxed text-ink/90">
              A Phantom é sua carteira na rede <strong>Solana</strong>, é nela que a grant fica guardada. Instale a
              extensão oficial no seu navegador.
            </p>
            <Callout tone="warn" title="Aviso importante">
              A Phantom mostra uma <strong>frase secreta de 12 palavras</strong>. Anote no papel e guarde em local
              seguro. <strong className="text-yellow">Nunca digite em nenhum site e nunca envie para ninguém</strong>,
              nem para mim. Quem tem a frase, tem o dinheiro.
            </Callout>
            <Steps
              items={[
                <>Instale a extensão oficial pela <Ext href="https://phantom.com/">phantom.com</Ext> (procure o selo azul de verificado na <Ext href="https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa">Chrome Web Store</Ext>).</>,
                <>Confirme com <strong>“Add extension”</strong> e clique em <strong>“Create a New Wallet”</strong>.</>,
              ]}
            />
            <Shots
              cols={3}
              items={[
                ["p04-0", "Extensão oficial na Chrome Web Store"],
                ["p04-1", "Confirmar com “Add extension”"],
                ["p04-2", "Tela inicial da Phantom, “Create a New Wallet”"],
              ]}
            />
            <Sub n="2.1">Criar a wallet e guardar sua frase</Sub>
            <Steps
              items={[
                <>Selecione <strong>“Create a Recovery Phrase Wallet”</strong> e crie uma <strong>senha de desbloqueio</strong>.</>,
                <>Anote a <strong>frase de 12 palavras</strong> no papel e finalize (lembre do aviso: nunca compartilhe).</>,
                <>Escolha um <strong>username</strong>.</>,
                <>Copie o <strong>endereço Solana</strong> (nome da conta → rede Solana). Começa com letras e números, ex.: 7xKt…9fQz.</>,
              ]}
            />
            <Shots
              items={[
                ["p05-0", "Create a wallet"],
                ["p05-1", "Criar senha"],
                ["p05-2", "Frase de recuperação", true],
                ["p05-3", "Escolher username"],
                ["p05-4", "Copiar endereço Solana"],
              ]}
            />
          </section>

          {/* Step 3 */}
          <section className="border-t-2 border-green-dark/10 py-16">
            <StepHeader n={3}>Sacar do Earn para a Phantom</StepHeader>
            <Steps
              items={[
                <>No Earn: <strong>foto de perfil → Wallet → “Withdraw”</strong>. Escolha o token <strong>USDG</strong> e o valor.</>,
                <>Cole o <strong>endereço Solana</strong> da Phantom e confirme. Confira sempre o início e o fim do endereço.</>,
                <>Em segundos o saldo aparece na Phantom em <strong>USDG</strong> (Global Dollar).</>,
              ]}
            />
            <Callout tone="danger">
              <strong>Confira sempre o começo e o fim do endereço antes de confirmar.</strong> Transferências em cripto
              não têm estorno, e isso vale pra toda vez que você enviar.
            </Callout>
            <Shots cols={2} items={[["p06-0", "Botão Withdraw na wallet do Earn"], ["p06-1", "USDG recebido na Phantom"]]} />
          </section>

          {/* Step 4 */}
          <section className="border-t-2 border-green-dark/10 py-16">
            <StepHeader n={4}>Trocar por USDC e guardar um pouco de SOL</StepHeader>
            <p className="mt-6 leading-relaxed text-ink/90">
              A grant chega em <strong>USDG</strong>. No Jupiter você faz <strong>duas trocas</strong> rápidas e sem
              taxa: primeiro guarda um pouquinho de <strong>SOL</strong> (a “gasolina” da rede, usada pra enviar lá no
              fim) e troca o resto por <strong>USDC</strong>. Assim você paga as taxas sozinho, sem precisar pedir SOL
              pra ninguém.
            </p>
            <Steps
              items={[
                <>Abra <Ext href="https://jup.ag/swap">jup.ag/swap</Ext>, clique em “Connect Wallet” e escolha a Phantom.</>,
                <><strong>Gás primeiro:</strong> troque uma <strong>pequena parte</strong> do USDG por <strong>SOL</strong>, cerca de <strong>$1 (um dólar)</strong> já é o suficiente. No Jupiter, escolha SOL no campo de baixo (ou use <Ext href={JUP_SOL}>este atalho</Ext>) e clique em “Swap”.</>,
                <>Agora troque <strong>todo o resto do USDG por USDC</strong> (ou use <Ext href={JUP_USDC}>este atalho</Ext>): clique em “Swap” e confirme na Phantom (“Confirm”).</>,
                <>Pronto: a carteira fica com <strong>um pouco de SOL</strong> (pro gás) e o <strong>USDC</strong> pra vender.</>,
              ]}
            />
            <Shots
              items={[
                ["p07-0", "As trocas no Jupiter (SOL e USDC)"],
                ["p07-1", "Confirmar na Phantom"],
                ["p07-2", "USDC disponível na Phantom"],
              ]}
            />
          </section>

          {/* Step 5 */}
          <section className="border-t-2 border-green-dark/10 py-16">
            <StepHeader n={5}>Vender por Pix na 4P Finance</StepHeader>
            <p className="mt-6 leading-relaxed text-ink/90">
              Aqui você vende o USDC e recebe em <strong>reais no seu Pix</strong>. Na primeira vez, a 4P pede uma
              verificação rápida de identidade, seis etapas curtas, <strong>só na primeira venda</strong>.
            </p>

            <Sub n="5.1" hint="só na 1ª vez">Criar sua conta na 4P</Sub>
            <Steps
              items={[
                <>Acesse <Ext href="https://4p.finance/vender-criptomoedas-e-receber-com-pix">4p.finance</Ext> pelo computador. Se abrir uma janela sugerindo o app, feche e siga pelo site mesmo.</>,
                <>Crie conta com email e senha (mín. 6 caracteres, com maiúscula, minúscula, número e símbolo).</>,
                <>Confirme pelo <strong>email de boas vindas</strong> (“Concluir cadastro”).</>,
              ]}
            />
            <Shots cols={2} items={[["p08-0", "Cadastro (email e senha)"], ["p08-1", "Email de boas vindas"]]} />

            <Sub n="5.1" hint="continuação">Dados pessoais, verificação e documentos</Sub>
            <Steps
              items={[
                <>Em “Dados pessoais”: Pessoa física, <strong>CPF e telefone</strong> → “Solicitar código”.</>,
                <>Verifique por <strong>WhatsApp</strong> (mais rápido) ou SMS e digite os 6 dígitos.</>,
                <>Preencha o <strong>endereço</strong>. Depois faça a <strong>Selfie</strong> e o Documento em local iluminado, se a câmera estiver bloqueada, libere no cadeado do navegador (dá pra fazer pelo celular via SMS).</>,
              ]}
            />
            <Shots
              items={[
                ["p09-0", "Dados pessoais", true],
                ["p09-1", "WhatsApp ou SMS"],
                ["p09-2", "Digitar o código"],
                ["p09-3", "Endereço", true],
                ["p09-4", "Selfie de verificação"],
                ["p09-5", "Liberar a câmera"],
              ]}
            />

            <Sub n="5.2">Iniciar a venda e aplicar o cupom</Sub>
            <div className="mt-6 flex flex-col gap-5 rounded-2xl border-2 border-green-dark bg-emerald p-5 text-surface shadow-sticker sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-yellow">Cupom da Superteam Brasil</p>
                <p className="mt-1 text-sm leading-relaxed sm:text-base">
                  No campo de cupom, use o código ao lado. Ele derruba a taxa de 3% para <strong>2,5%</strong>.
                </p>
              </div>
              <CopyCode code={COUPON} />
            </div>
            <p className="mt-6 leading-relaxed text-ink/90">
              Na aba <strong>“Vender”</strong>: selecione a rede <strong>Solana</strong>, o token <strong>USDC</strong> e
              digite o valor que quer vender. <strong>Valor mínimo:</strong>{" "}
              <span className="rounded-full bg-emerald px-2 py-0.5 text-sm font-bold text-surface">R$ 50,00</span>.
              Aplique o cupom no campo indicado.
            </p>
            <Shots cols={2} items={[["p10-0", "Cupom aplicado no campo"], ["p10-1", "Rede Solana · USDC · cupom aplicado"]]} />

            <Callout tone="soft">
              <strong>Preencha com calma e confira cada dado.</strong> É esse cadastro que garante que o Pix caia
              certinho na sua conta. Um dado errado pode atrasar ou devolver o pagamento.
            </Callout>

            <Sub n="5.3">Preencher os dados da venda</Sub>
            <p className="mt-4 leading-relaxed text-ink/90">
              Preencha nome, email, telefone, CPF e a <strong>chave Pix</strong> que vai receber. Use o CPF do{" "}
              <strong>titular da conta Pix</strong>, pagamento para titular diferente é devolvido.
            </p>

            <Sub n="5.4">Confirmar e copiar o endereço de depósito</Sub>
            <p className="mt-4 leading-relaxed text-ink/90">
              Revise tudo na tela <strong>“Importante!”</strong> (chave Pix, valor a receber) e clique em “Solicitar
              conversão”. A 4P mostra o endereço da carteira <strong>4Pay</strong> e fica “Aguardando pagamento”.{" "}
              <strong>Copie esse endereço</strong>, você vai usá-lo no próximo passo.
            </p>
            <Shots
              items={[
                ["p11-0", "5.3 · Formulário da venda"],
                ["p11-1", "5.4 · Tela “Importante!”", true],
                ["p11-2", "5.4 · Aguardando pagamento", true],
              ]}
            />

            <Sub n="5.5">Enviar o USDC pela Phantom</Sub>
            <p className="mt-4 leading-relaxed text-ink/90">
              Na Phantom, toque no <strong>USDC → “Send”</strong>. Cole o endereço da 4Pay, use <strong>“Max”</strong>{" "}
              e “Next”. Confira e clique em <strong>“Send”</strong>. Aparece <strong className="text-emerald">“Sent!”</strong>,
              em minutos os reais caem no seu Pix.
            </p>
            <Callout tone="ok">
              A <strong>taxa da rede (SOL) já está coberta</strong>: você guardou um pouquinho no Passo 4, então o envio
              completa sozinho, sem depender de ninguém.
            </Callout>
            <Shots
              cols={4}
              items={[
                ["p12-0", "USDC → Send"],
                ["p12-1", "Colar endereço · Max"],
                ["p12-2", "Confirmar envio"],
                ["p12-3", "Enviado! O Pix cai em minutos"],
              ]}
            />
          </section>

          {/* Troubleshooting */}
          <section className="border-t-2 border-green-dark/10 py-16" id="deu-errado">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald">Deu errado?</p>
            <h2 className="mt-2 font-heading text-3xl font-black uppercase tracking-tight text-ink [font-stretch:118%] sm:text-4xl">
              Respira, quase tudo tem solução
            </h2>
            <Callout tone="danger" title="Muito importante">
              Na dúvida, <strong>pare e confira</strong> antes de confirmar qualquer envio. Cripto não tem estorno:
              sempre cheque o começo e o fim do endereço.
            </Callout>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ["Não recebi o Pix", <>Costuma cair em poucos minutos. Confirme que a chave Pix cadastrada é do <strong>seu CPF</strong>. Passou de 1 hora? Fale com o <Ext href={FOUR_P_SUPPORT}>suporte da 4P</Ext> (abaixo) ou comigo.</>],
                ["Enviei o USDC e não apareceu na 4P", <>A confirmação leva de segundos a poucos minutos. Confira que enviou na rede <strong>Solana</strong> e pro endereço copiado da própria 4P (começo e fim iguais). Se demorar, chame o <Ext href={FOUR_P_SUPPORT}>suporte da 4P</Ext>.</>],
                ["Aparece “saldo insuficiente de SOL”", <>Faltou o “gás”. Volte ao <a href="#passo-4" className="font-bold underline underline-offset-4">Passo 4</a> e troque cerca de <strong>$1</strong> de USDG por SOL; depois é só enviar normalmente.</>],
                ["Meu saldo não aparece na Phantom", <>Confira se está na rede <strong>Solana</strong> e no token certo (USDG ou USDC). Às vezes é só puxar a tela pra baixo pra atualizar.</>],
                ["A câmera não abre na verificação da 4P", <>Libere a câmera no <strong>cadeado</strong> ao lado do endereço do site. Se preferir, faça esse cadastro pelo <strong>celular</strong>. A verificação chega por SMS.</>],
              ].map(([title, body], i) => (
                <div key={i} className={`rounded-2xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker ${i === 4 ? "sm:col-span-2" : ""}`}>
                  <h3 className="font-heading text-lg font-black text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/80 sm:text-base">{body}</p>
                </div>
              ))}
            </div>
            <a
              href={FOUR_P_SUPPORT}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center gap-4 rounded-2xl border-2 border-emerald/40 bg-emerald/10 px-5 py-4 text-ink transition-colors hover:bg-emerald/20"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald font-heading text-sm font-black text-surface">4P</span>
              <span className="text-sm sm:text-base">
                Suporte oficial da 4P (venda e Pix): <strong className="text-emerald underline underline-offset-4">WhatsApp +55 11 5128 9991</strong>
              </span>
              <ArrowUpRightIcon size={16} weight="bold" className="ml-auto shrink-0 text-emerald" aria-hidden />
            </a>
          </section>
        </article>
      </div>

      <section className="px-4 pb-4 pt-16 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-4xl rounded-3xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker sm:p-10">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald">Fim do guia</p>
          <h2 className="mt-4 font-heading font-black uppercase leading-[0.95] tracking-tight text-ink">
            <span className="inline-block -rotate-1 bg-yellow px-3 py-1 text-4xl text-green-dark [font-stretch:120%] sm:text-6xl">Pronto!</span>
            <span className="mt-3 block text-3xl [font-stretch:118%] sm:text-5xl">Grant recebida, reais na conta.</span>
          </h2>
          <p className="mt-5 max-w-xl leading-relaxed text-ink/80 sm:text-lg">
            Depois do primeiro saque, o processo inteiro leva menos de <strong className="text-ink">10 minutos</strong>. Ficou
            com dúvida em algum passo? Me chama:
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {[
              ["WhatsApp", "@Foka", "https://wa.me/5511958526267", <WhatsappLogoIcon key="w" size={18} weight="bold" aria-hidden />],
              ["Telegram", "@soufoka", "https://t.me/soufoka", <TelegramLogoIcon key="t" size={18} weight="bold" aria-hidden />],
              ["X", "@sou_foka", "https://twitter.com/sou_foka", <XLogoIcon key="x" size={18} weight="bold" aria-hidden />],
            ].map(([label, handle, href, icon]) => (
              <a
                key={label as string}
                href={href as string}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border-2 border-green-dark bg-surface-raised px-4 py-2.5 text-sm font-bold text-ink transition-colors duration-200 hover:bg-green-dark hover:text-surface"
              >
                {icon}
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">{label}</span>
                {handle}
                <ArrowUpRightIcon size={14} weight="bold" aria-hidden />
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
