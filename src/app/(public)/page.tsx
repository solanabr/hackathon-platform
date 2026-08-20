import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { GradientBackground } from "@/components/layout/background";
import { Countdown } from "@/components/ui/countdown";
import { getActiveHackathon } from "@/lib/hackathon";
import { resolveAuthenticatedUserState } from "@/lib/user-state";

export const dynamic = "force-dynamic";

const LUMA_URL = "https://luma.com/2teevtax";
const WHATSAPP_URL = "https://chat.whatsapp.com/Fv8LZlRBaSLChmau315sWy";
const MAP_URL =
  "https://www.google.com/maps?q=Espa%C3%A7o%20Orbi%20Av.%20Pres.%20Ant%C3%B4nio%20Carlos%20681%20Belo%20Horizonte%20MG&output=embed";
const MAP_LINK =
  "https://www.google.com/maps/search/?api=1&query=Espa%C3%A7o%20Orbi%20Av.%20Pres.%20Ant%C3%B4nio%20Carlos%20681%20Belo%20Horizonte%20MG";
const DEFAULT_SUBMISSION_DEADLINE_AT = "2026-05-16T23:59:00-03:00";
const SECTION_SPACING = "px-4 py-20 sm:px-6 sm:py-24 lg:px-8";

const SCHEDULE = [
  {
    date: "13 mai",
    day: "Quarta",
    title: "Kickoff e abertura oficial",
    mode: "Online",
  },
  { date: "14 mai", day: "Quinta", title: "Construção", mode: "Online" },
  { date: "15 mai", day: "Sexta", title: "Construção", mode: "Online" },
  {
    date: "16 mai",
    day: "Sábado",
    title: "Últimos ajustes e entrega final",
    mode: "Online · prazo final",
  },
  {
    date: "17 mai",
    day: "Domingo",
    title: "Apresentações, julgamento e premiação",
    mode: "Presencial",
    highlight: true,
  },
];

type RuleIcon = "team" | "age" | "single" | "calendar" | "code" | "ticket";

const RULES: Array<{ icon: RuleIcon; title: string; description: string }> = [
  {
    icon: "team",
    title: "Times de 1 a 4 integrantes",
    description:
      "Equipes compactas para garantir foco e ritmo durante os cinco dias.",
  },
  {
    icon: "age",
    title: "Maiores de 18 anos",
    description:
      "Todos os integrantes precisam ter ao menos 18 anos para participar.",
  },
  {
    icon: "single",
    title: "Um time por participante",
    description:
      "Cada pessoa pode integrar apenas uma equipe inscrita na trilha.",
  },
  {
    icon: "calendar",
    title: "Construção entre 13 e 17 de maio",
    description:
      "Os projetos devem ser desenvolvidos integralmente durante o período.",
  },
  {
    icon: "code",
    title: "Execução sobre a rede Solana",
    description:
      "Tema livre, com obrigatoriedade de execução sobre a rede Solana.",
  },
  {
    icon: "ticket",
    title: "Cadastro no Luma",
    description: "Todos os integrantes inscritos no Luma oficial do evento.",
  },
];

const RULE_ICONS: Record<RuleIcon, React.ReactNode> = {
  team: (
    <path
      d="M16 14a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 0a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-8 1.7-8 5v3h11v-3a6.6 6.6 0 0 1 1.8-4.4A12.9 12.9 0 0 0 8 16Zm8 0a8.6 8.6 0 0 0-2 .3 5.5 5.5 0 0 1 2 4.7v3h8v-3c0-3.3-4.7-5-8-5Z"
      fill="currentColor"
    />
  ),
  age: (
    <path
      d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 15-4-4 1.4-1.4L11 14.2l5.6-5.6L18 10l-7 7Z"
      fill="currentColor"
    />
  ),
  single: (
    <path
      d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Z"
      fill="currentColor"
    />
  ),
  calendar: (
    <path
      d="M19 4h-2V2h-2v2H9V2H7v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14Zm0-12H5V6h14Z"
      fill="currentColor"
    />
  ),
  code: (
    <path
      d="m9.4 16.6-4.6-4.6 4.6-4.6L8 6 2 12l6 6Zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6Z"
      fill="currentColor"
    />
  ),
  ticket: (
    <path
      d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 1 0 4v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 1 0-4Zm-7 6h-2v-2h2Zm0-4h-2v-2h2Zm0-4h-2V6h2Z"
      fill="currentColor"
    />
  ),
};

const DELIVERABLES = [
  {
    title: "Repositório Git privado",
    description:
      "Acesso liberado exclusivamente para os jurados da SuperteamBR.",
  },
  {
    title: "Vídeo demonstrativo",
    description:
      "Até 3 minutos, contemplando o problema endereçado, a solução proposta e o estado atual da implementação.",
  },
  {
    title: "Deck do projeto",
    description:
      "Problema, solução, arquitetura técnica, status atual e próximos passos.",
  },
];

const CRITERIA = [
  "Execução técnica",
  "Inovação",
  "Impacto e relevância",
  "Qualidade da apresentação",
];

const PRIZES = [
  { place: "1º lugar", amount: "USD 1.200" },
  { place: "2º lugar", amount: "USD 700" },
  { place: "3º lugar", amount: "USD 500" },
  { place: "4º, 5º e 6º", amount: "USD 200" },
];

function formatDeadline(deadlineIso: string) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(deadlineIso));
  return `${formatted} (horário de Brasília)`;
}

export default async function LandingPage() {
  const hackathon = await getActiveHackathon();
  let authState = null;
  try {
    authState = await resolveAuthenticatedUserState();
  } catch {
    // Keep the event page public even when Supabase auth cookies are stale.
  }

  const primaryHref = authState?.redirectPath ?? "/auth";
  const primaryLabel = authState ? "Continuar submissão" : "Iniciar submissão";
  const lumaUrl = hackathon?.luma_url ?? LUMA_URL;
  const deadlineIso =
    hackathon?.submission_deadline_at ?? DEFAULT_SUBMISSION_DEADLINE_AT;
  const deadlineLabel = formatDeadline(deadlineIso);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-bh-bg">
      <div className="relative z-10">
        <Header
          isAuthenticated={!!authState}
          primaryHref={primaryHref}
          revealOnScroll
        />

        <section className="relative isolate min-h-[100svh] overflow-x-hidden lg:min-h-[100svh] lg:overflow-hidden">
          <GradientBackground />
          <div className="relative z-10 px-4 pb-16 pt-24 sm:px-6 sm:pt-24 lg:flex lg:h-full lg:items-center lg:justify-center lg:px-8 lg:pb-28 lg:pt-40">
            <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
              <div>
                <div>
                  <h1 className="max-w-4xl font-heading text-4xl font-bold leading-[0.95] tracking-tight min-[390px]:text-5xl sm:text-6xl lg:text-6xl xl:text-7xl">
                    Hackathon BH Onchain
                    <span className="block gradient-text">
                      Trilha SuperteamBR
                    </span>
                  </h1>
                  <p className="mt-6 max-w-2xl text-base leading-7 text-bh-muted sm:text-lg sm:leading-8 lg:text-[1.15rem]">
                    Uma trilha de cinco dias que conecta desenvolvedores,
                    designers e empreendedores ao ecossistema Solana, com
                    curadoria e premiação da SuperteamBR. A construção acontece
                    online e a final é presencial, em Belo Horizonte.
                  </p>
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href={primaryHref}>
                    <Button variant="primary" className="px-7 py-4 text-base">
                      {primaryLabel}
                    </Button>
                  </Link>
                  <a href={lumaUrl} target="_blank" rel="noreferrer">
                    <Button variant="secondary" className="px-7 py-4 text-base">
                      Inscrever-se no Luma
                    </Button>
                  </a>
                </div>
              </div>

              <Card className="relative overflow-hidden rounded-[2rem] border-stbr-yellow/30 bg-bh-surface/70 p-6 shadow-[0_24px_90px_rgba(124,58,237,0.28)] lg:p-7">
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-stbr-yellow shadow-[0_0_12px_rgba(255,210,63,0.9)]" />
                    <p className="pulse-eyebrow font-heading text-sm font-semibold uppercase tracking-[0.24em] text-stbr-yellow">
                      Submissões encerram em
                    </p>
                  </div>
                  <div className="mt-5 rounded-3xl border border-bh-violet/40 bg-bh-bg/80 p-6 sm:p-7">
                    <Countdown deadlineIso={deadlineIso} variant="segments" />
                    <p className="mt-5 text-sm text-bh-muted">
                      Prazo oficial:{" "}
                      <span className="text-bh-text">{deadlineLabel}</span>
                    </p>
                  </div>
                  <div className="mt-6 space-y-3 text-sm text-bh-muted">
                    <p>
                      <strong className="text-bh-text">
                        Critério de elegibilidade:
                      </strong>{" "}
                      projetos desenvolvidos integralmente entre 13 e 17 de
                      maio, executados sobre a rede Solana.
                    </p>
                    <p>
                      <strong className="text-bh-text">
                        Motivos de desclassificação:
                      </strong>{" "}
                      submissão incompleta, projeto pré-existente ou ausência de
                      representante na apresentação presencial.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 hidden border-t border-bh-border/40 bg-bh-bg/30 px-8 py-3 backdrop-blur-sm lg:block">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-stbr-yellow">
                  Organização
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <Image
                    src="/brand/bh/wordmark.png"
                    alt="BH Onchain"
                    width={150}
                    height={60}
                    className="h-8 w-auto object-contain"
                  />
                  <span className="h-6 w-px bg-bh-border" aria-hidden="true" />
                  <Image
                    src="/brand/vega-lockup-wine.png"
                    alt="Vega Crypto"
                    width={170}
                    height={47}
                    className="h-8 w-auto object-contain brightness-0 invert"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-stbr-yellow">
                  Em parceria com
                </p>
                <Image
                  src="/brand/stbr/logo/horizontal-fwhite.svg"
                  alt="Solana Superteam Brasil"
                  width={210}
                  height={48}
                  className="h-8 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        <section className={SECTION_SPACING}>
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <Badge tone="emerald">Sobre a trilha</Badge>
              <h2 className="mt-5 font-heading text-4xl font-bold leading-tight sm:text-5xl">
                A trilha de construção
                <span className="block gradient-text">do BH Onchain.</span>
              </h2>
              <p className="mt-5 text-bh-muted">
                A trilha reúne desenvolvedores, designers e empreendedores em um
                processo guiado de cinco dias. Ao final, cada time entrega um
                projeto completo, apresentado presencialmente em Belo Horizonte
                e avaliado pela SuperteamBR.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {RULES.map((rule) => (
                <div
                  key={rule.title}
                  className="flex gap-4 rounded-2xl border border-bh-border bg-bh-surface/70 p-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stbr-yellow/10 text-stbr-yellow">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      {RULE_ICONS[rule.icon]}
                    </svg>
                  </span>
                  <div>
                    <p className="font-heading text-base font-semibold text-bh-text">
                      {rule.title}
                    </p>
                    <p className="mt-1 text-sm text-bh-muted">
                      {rule.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={SECTION_SPACING}>
          <div className="mx-auto max-w-5xl">
            <SectionHeader
              eyebrow="Cronograma"
              title="Cinco dias de construção, com encerramento presencial em Belo Horizonte."
              description="As etapas de construção acontecem online. No domingo, ao menos um integrante de cada time deve estar presente em Belo Horizonte para a apresentação final."
            />
            <div className="mt-12 overflow-hidden rounded-[1.75rem] border border-bh-border bg-bh-surface/65">
              {SCHEDULE.map((item, index) => (
                <div
                  key={item.date}
                  className={`grid gap-4 border-b border-bh-border px-5 py-5 last:border-b-0 sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:px-7 ${
                    item.highlight ? "bg-stbr-yellow/10" : ""
                  }`}
                >
                  <div>
                    <p className="font-heading text-xl font-bold text-bh-text">
                      {item.date}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-bh-muted">
                      {item.day}
                    </p>
                  </div>
                  <div>
                    <p className="font-heading text-lg font-semibold text-bh-text">
                      {item.title}
                    </p>
                    {index === 4 && (
                      <p className="mt-1 text-sm text-stbr-yellow">
                        Presença obrigatória de ao menos um representante do
                        time para concorrer à premiação.
                      </p>
                    )}
                  </div>
                  <Badge tone={item.highlight ? "yellow" : "neutral"}>
                    {item.mode}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={SECTION_SPACING}>
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
            <div>
              <Badge tone="yellow">Submissão</Badge>
              <h2 className="mt-5 font-heading text-4xl font-bold leading-tight">
                O que o time precisa entregar
              </h2>
              <div className="mt-8 space-y-5">
                {DELIVERABLES.map((item, index) => (
                  <div
                    key={item.title}
                    className="flex gap-5 border-t border-bh-border pt-5"
                  >
                    <span className="font-heading text-3xl font-bold text-stbr-yellow">
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="font-heading text-xl font-semibold text-bh-text">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-bh-muted">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="relative overflow-hidden rounded-[2rem] border-stbr-yellow/20 bg-stbr-dark-green/35 p-8">
              <img
                src="/brand/stbr/logo/symbol-yellow.svg"
                alt=""
                className="absolute right-6 top-6 h-16 w-16 opacity-25"
              />
              <Badge tone="emerald">Julgamento</Badge>
              <h2 className="mt-5 font-heading text-4xl font-bold leading-tight text-bh-text">
                Avaliação técnica pela SuperteamBR
              </h2>
              <p className="mt-4 text-bh-muted">
                Os jurados indicados pela SuperteamBR avaliam o projeto
                submetido, a clareza da apresentação e a profundidade da
                execução técnica. Em caso de empate, prevalece o critério de
                execução técnica.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {CRITERIA.map((criterion) => (
                  <div
                    key={criterion}
                    className="rounded-2xl border border-stbr-yellow/20 bg-bh-bg/45 px-4 py-3 text-sm font-semibold text-bh-text"
                  >
                    {criterion}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className={SECTION_SPACING}>
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow="Premiação"
              title="USD 3.000 distribuídos entre os seis melhores projetos"
              description="A divisão interna do prêmio é de responsabilidade de cada time. O anúncio dos vencedores acontece ao final das apresentações, no domingo."
            />
            <div className="mt-12 grid gap-4 lg:grid-cols-4">
              {PRIZES.map((prize, index) => (
                <div
                  key={prize.place}
                  className={`rounded-[1.5rem] border p-6 ${
                    index === 0
                      ? "border-stbr-yellow/50 bg-stbr-yellow text-stbr-dark-green"
                      : "border-bh-border bg-bh-surface/70"
                  }`}
                >
                  <p className="text-sm font-semibold uppercase tracking-wider opacity-80">
                    {prize.place}
                  </p>
                  <p className="mt-8 font-heading text-3xl font-bold">
                    {prize.amount}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={SECTION_SPACING}>
          <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-bh-border bg-bh-surface/70 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="p-7 sm:p-10">
              <Badge tone="fuchsia">Final presencial</Badge>
              <h2 className="mt-5 font-heading text-4xl font-bold leading-tight">
                A final acontece no Espaço Orbi, em Belo Horizonte.
              </h2>
              <p className="mt-4 text-bh-muted">
                No dia 17 de maio, cada time apresenta seu projeto
                presencialmente para os jurados da SuperteamBR. A ausência de
                representante no local implica desclassificação automática.
              </p>
              <div className="mt-7 space-y-3 text-sm">
                <p className="font-semibold text-bh-text">Espaço Orbi</p>
                <p className="text-bh-muted">
                  Av. Pres. Antônio Carlos, 681 — Lagoinha, Belo Horizonte/MG,
                  31210-010
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                  <Button variant="secondary">Comunidade no WhatsApp</Button>
                </a>
                <a href={MAP_LINK} target="_blank" rel="noreferrer">
                  <Button variant="ghost">Ver localização</Button>
                </a>
              </div>
            </div>
            <iframe
              title="Mapa do Espaço Orbi"
              src={MAP_URL}
              className="min-h-[22rem] w-full border-0 lg:min-h-full"
              loading="lazy"
            />
          </div>
        </section>

        <section className={SECTION_SPACING}>
          <div className="mx-auto max-w-4xl text-center">
            <Card className="relative overflow-hidden rounded-[2rem] border-stbr-yellow/30 bg-gradient-to-br from-bh-violet/25 via-bh-surface to-stbr-dark-green/35 p-8 sm:p-12">
              <div className="relative">
                <Badge tone="yellow">Plataforma oficial de submissão</Badge>
                <h2 className="mt-5 font-heading text-4xl font-bold leading-tight sm:text-5xl">
                  Forme o time, registre a submissão e finalize antes do prazo.
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-bh-muted">
                  O líder do time cria a submissão e convida até três
                  integrantes. Qualquer membro aceito pode editar o conteúdo até
                  o bloqueio final.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href={primaryHref}>
                    <Button variant="primary" className="px-8 py-4">
                      {primaryLabel}
                    </Button>
                  </Link>
                  <a href={lumaUrl} target="_blank" rel="noreferrer">
                    <Button variant="yellow" className="px-8 py-4">
                      Inscrição no Luma
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Badge tone="emerald">{eyebrow}</Badge>
      <h2 className="mt-5 font-heading text-4xl font-bold leading-tight sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-bh-muted">{description}</p>
    </div>
  );
}
