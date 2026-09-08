import type { ReactNode } from "react";
import Image from "next/image";
import { COLOSSEUM_DEADLINE_FALLBACK, COLOSSEUM_SLUG, WHATSAPP_COMMUNITY_URL } from "./pre-registro/constants";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { withPlatformUtm } from "@/lib/attribution";
import {
  BookOpenIcon,
  CheckIcon,
  CoinsIcon,
  DiscordLogoIcon,
  GraduationCapIcon,
  WhatsappLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Countdown } from "@/components/ui/countdown";
import { CountUp, Reveal } from "@/components/ui/reveal";
import { FaqAside } from "@/components/home/faq-aside";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { ColosseumBackdrop } from "@/components/home/colosseum-backdrop";
import { NetworkHalo } from "@/components/home/network-halo";
import { MobileCtaBar } from "@/components/campaign/mobile-cta-bar";
import { StepGlyph } from "@/components/home/step-glyph";
import { MobileSteps } from "@/components/campaign/mobile-steps";
import { EventTicket } from "@/components/campaign/event-ticket";
import { CasesRail } from "@/components/home/cases-rail";


export const metadata = {
  title: "Colosseum Crypto World's Fair 2026",
  description:
    "O próximo time a captar milhões pode ser o seu. Cadastre-se para o Colosseum, o hackathon global da Solana: 100% remoto, prêmios milionários e capital anjo.",
  openGraph: {
    title: "O próximo time a captar milhões pode ser o seu · Colosseum 2026",
    description:
      "Hackathon global da Solana, 100% remoto, de 14 set a 12 out. Cadastre-se com o Superteam Brasil.",
    images: [{ url: "/brand/og-colosseum.png", width: 1200, height: 630 }],
  },
};

const CASES = [
  {
    name: "Cloak",
    url: "https://www.cloak.ag/",
    logo: "/brand/cases/cloak.png",
    result: "R$1,5 milhão de investimento anjo",
    tagline: "Infraestrutura de privacidade para empresas que usam blockchain",
    body: (
      <>
        Time brasileiro formado só por <strong className="text-ink">alunos universitários</strong>. Saíram do
        hackathon com investimento anjo de R$1,5 milhão e se formaram com a startup já rodando.
      </>
    ),
  },
  {
    name: "Bido",
    url: "https://www.usebido.com/",
    logo: "/brand/cases/bido.png",
    result: "Rodada de R$10 milhões",
    tagline: "Camada de pagamentos para agentes de IA",
    body: "Dois amigos de vinte e poucos anos. Chegaram ao último hackathon sem ideia, participaram de todas as mentorias, pivotaram e saíram direto para uma das melhores incubadoras do Vale do Silício.",
  },
];

const SOLANA_STATS = [
  { value: "33B", label: "transações em 2025, mais que todas as outras redes combinadas" },
  { value: "70M", label: "carteiras ativas mensais em média durante 2025" },
  { value: "$700K", label: "em taxas num único dia, mais que 30+ redes combinadas" },
  { value: "$972B", label: "em volume de stablecoins em fevereiro de 2026" },
];

type CalendarItem = {
  date: string;
  title: string;
  body: string;
  highlight?: boolean;
  href?: string;
};

const CALENDAR: CalendarItem[] = [
  { date: "Agora", title: "Registro aberto no Colosseum", body: "Crie sua conta e registre-se. Não precisa de ideia nem de time, e dá para começar a construir já.", highlight: true },
  { date: "14 set", title: "Início da competição", body: "Abre o cadastro de projeto e time na plataforma. Só o que for construído a partir daqui conta." },
  { date: "set a out", title: "Workshops e mentorias", body: "Conteúdo ao vivo e suporte da comunidade durante toda a campanha." },
  { date: "12 out", title: "Deadline de envio", body: "Submissões fecham às 23h59 no horário da Califórnia, 3h59 do dia 13 em Brasília. Trilhas Brasil e Global." },
  { date: "Em breve", title: "Anúncio dos vencedores", body: "Resultado das trilhas Brasil e Global. Avisamos por e-mail e WhatsApp." },
];

const RESOURCES = [
  { label: "Grupo do WhatsApp", href: WHATSAPP_COMMUNITY_URL, icon: WhatsappLogoIcon },
  { label: "Aulas no YouTube", href: "https://www.youtube.com/@SuperteamBrasil", icon: YoutubeLogoIcon },
  { label: "Wiki do Superteam", href: "https://wiki.superteam.com.br", icon: BookOpenIcon },
  {
    label: "Superteam Earn",
    href: withPlatformUtm("https://superteam.fun/earn/s/superteambr", { content: "lp_recursos", campaign: "colosseum-2026" }),
    icon: CoinsIcon,
  },
  { label: "Academy", href: "https://www.st.academy/", icon: GraduationCapIcon },
  { label: "Discord", href: "https://discord.gg/superteambrasil", icon: DiscordLogoIcon },
];
const FAQ_GROUPS = [
  {
    title: "Antes de entrar",
    items: [
      {
        q: "Preciso me cadastrar aqui e no Colosseum?",
        a: "Sim, nos dois. Aqui você entra nas mentorias, na comunidade e na Trilha Brasil. No Colosseum é onde o projeto é enviado e julgado, e cada membro do time precisa de uma conta lá, com Solana marcada no registro. A conta também libera o diretório de cofundadores e o Discord deles. Para a Trilha Brasil, o mesmo projeto vai para o Superteam Earn.",
      },
      {
        q: "Preciso ter ideia ou time pronto?",
        a: "Não. Registre-se no Colosseum agora: o cadastro de projeto e time abre na plataforma em 14 de setembro, e dá para entrar num time que já existe. O time pode ser montado na nossa comunidade ou no diretório de cofundadores. A regra é um projeto por pessoa.",
      },
      {
        q: "Preciso saber blockchain ou Rust?",
        a: "Não. Os workshops levam do zero até a submissão, e boa parte do trabalho é produto, front-end e negócio. O Colosseum não exige linguagem nem framework: quer ver integração onchain de verdade e um time com quem constrói e quem vende.",
      },
      {
        q: "Quanto custa?",
        a: "Nada. Cadastro, comunidade e hackathon são gratuitos.",
      },
    ],
  },
  {
    title: "Durante o hackathon",
    items: [
      {
        q: "É 100% online? Quanto tempo dura?",
        a: "Sim, de qualquer lugar do Brasil. São quatro semanas, de 14 de setembro a 12 de outubro. A partir do dia 14 você cadastra projeto e time no Colosseum e pode submeter a qualquer momento até o prazo.",
      },
      {
        q: "Preciso falar inglês?",
        a: "A submissão no Colosseum é em inglês: vídeo de pitch de dois a três minutos, demo técnica de até três minutos, repositório no GitHub e um formulário com produto, time e estratégia de mercado. Toda a Trilha Brasil, as mentorias e o suporte são em português.",
      },
      {
        q: "Posso usar um projeto que já existe?",
        a: "Pode, desde que a startup não tenha captado capital relevante. Você pode começar antes e reaproveitar código, mas só o que for construído entre 14 de setembro e 12 de outubro conta, e todo o histórico precisa ser declarado no formulário. Omitir isso desclassifica o time.",
      },
      {
        q: "Como os projetos são avaliados?",
        a: "Seis critérios: time certo para o mercado, um insight que os outros não têm, produto funcionando e ritmo de entrega, tamanho do mercado, clareza na comunicação e viabilidade como negócio. No repositório, o que importa é trabalho relevante feito pelo próprio time durante o hackathon, com integração onchain de verdade.",
      },
    ],
  },
  {
    title: "Prêmios e depois",
    items: [
      {
        q: "O que o vencedor ganha?",
        a: "Na última edição foram USD 250 mil em prêmios diretos: USD 30 mil para o campeão global e USD 10 mil para cada um dos 20 melhores, com prêmios extras para times universitários. Os melhores ainda são chamados para o acelerador do Colosseum: USD 250 mil de investimento pré-seed e oito semanas de programa, duas em São Francisco e seis remotas. Entrar no acelerador é opcional.",
      },
      {
        q: "O que é a Trilha Brasil?",
        a: "Premiação e mentoria do Superteam Brasil só para times brasileiros, por cima do que o Colosseum paga. Para concorrer, além de enviar o projeto no Colosseum, você submete o mesmo projeto no desafio da Trilha Brasil no Superteam Earn. Foi por aqui que Cloak e Bido saíram do hackathon com investimento anjo.",
      },
    ],
  },
];

// Shared stage width for section containers so the LP stops looking like a
// narrow mobile column once there's room at xl/2xl — narrow text measures
// (max-w-2xl paragraphs etc.) stay as they are.
const LP_CONTAINER = "mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[88rem]";
const LP_SECTION = "px-4 pt-24 sm:px-6 lg:px-8 lg:pt-28 xl:px-12 xl:pt-32";

function SectionHat({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  return (
    <p
      className={`flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink/45 ${centered ? "justify-center" : ""}`}
    >
      <span aria-hidden className="h-[7px] w-[18px] shrink-0 rounded-[2px] bg-emerald" />
      {children}
    </p>
  );
}

// One side of the Solana hub: cards on the outside, dotted wire running in
// towards the centre. Below lg the wires disappear and the four cards fall
// back into a plain grid.
function StatColumn({ stats, side }: { stats: typeof SOLANA_STATS; side: "left" | "right" }) {
  return (
    <dl className="grid grid-cols-2 gap-4 sm:gap-5 lg:flex lg:flex-col lg:gap-16">
      {stats.map((stat, i) => (
        <Reveal
          key={stat.value}
          delay={i * 120}
          className={i === 0 ? (side === "left" ? "lg:pl-12" : "lg:pr-12") : undefined}
        >
          <div className={`flex h-full items-center ${side === "right" ? "lg:flex-row-reverse" : ""}`}>
            <div className="h-full w-full rounded-xl border-2 border-green-dark bg-surface-raised px-5 py-4 shadow-sticker lg:w-[15rem] lg:shrink-0">
              <dt className="font-heading text-3xl font-black uppercase leading-none tracking-tight text-green-dark [font-stretch:115%] sm:text-4xl">
                <CountUp value={stat.value} />
              </dt>
              <dd className="mt-2 text-pretty text-xs leading-snug text-muted sm:text-sm">{stat.label}</dd>
            </div>
            <span
              aria-hidden
              className={`hidden flex-1 items-center lg:flex ${side === "right" ? "flex-row-reverse" : ""}`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full border-2 border-green-dark bg-yellow" />
              <span className="h-0 flex-1 border-t-2 border-dotted border-green-dark/30" />
            </span>
          </div>
        </Reveal>
      ))}
    </dl>
  );
}

export default async function HomePage() {
  const [colosseum, state] = await Promise.all([
    getHackathonBySlug(COLOSSEUM_SLUG).catch(() => null),
    resolveAuthenticatedUserState().catch(() => null),
  ]);

  // Step 2's button only goes straight to Colosseum for who already did the
  // cadastro; everyone else is routed through /pre-registro first.
  let registered = false;
  if (state && colosseum) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("hackathon_registrations")
      .select("hackathon_id")
      .eq("hackathon_id", colosseum.id)
      .eq("user_id", state.userId)
      .maybeSingle();
    // The landing page never dies on this lookup: an error just means the
    // button routes through /pre-registro, which is the safe default.
    if (error) logQueryError("home.checkRegistration", error);
    registered = Boolean(data);
  }
  // Logged-out visitors skip the /pre-registro round trip and land on the
  // login step with the deep link already attached.
  const cadastroHref = state ? "/pre-registro" : "/auth?next=/pre-registro";
  const submissionDeadline = colosseum?.submission_deadline_at ?? COLOSSEUM_DEADLINE_FALLBACK;

  const journey = [
    {
      marker: "Agora",
      glyph: "badge" as const,
      title: "Faça seu cadastro.",
      items: [
        "Leva dois minutos",
        "Você recebe as datas e o que fazer em cada uma",
        "Libera o acesso ao Colosseum",
      ],
      cta: (
        <TrackedCta
          href={cadastroHref}
          event="cta_clicked"
          properties={{ cta: "cadastro", location: "jornada" }}
          className="btn-cut inline-flex w-fit items-center whitespace-nowrap bg-yellow px-6 py-3 text-sm font-bold text-green-dark transition-colors duration-200 hover:bg-yellow-strong"
        >
          <span>Fazer cadastro</span>
        </TrackedCta>
      ),
    },
    {
      marker: "Em seguida",
      glyph: "arena" as const,
      title: "Registre-se no Colosseum.",
      items: [
        "Crie sua conta e clique em \u201cRegister now\u201d",
        "Não precisa ter ideia nem time ainda",
        "Projeto e time entram a partir de 14 de setembro",
      ],
      cta: colosseum?.external_url ? (
        <TrackedCta
          href={registered ? colosseum.external_url : cadastroHref}
          event={registered ? "campaign_link_clicked" : "cta_clicked"}
          properties={
            registered
              ? { target: "colosseum", location: "lp" }
              : { cta: "cadastro", location: "jornada_colosseum" }
          }
          className="btn-cut btn-cut-outline inline-flex w-fit items-center whitespace-nowrap px-6 py-3 text-sm font-bold text-ink transition-colors duration-200 hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]"
        >
          <span>{registered ? "Abrir Colosseum" : "Libera após o cadastro"}</span>
        </TrackedCta>
      ) : (
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Inscrições abrem em breve
        </p>
      ),
    },
    {
      marker: "Antes de 14 set",
      glyph: "community" as const,
      title: "Entre na comunidade.",
      items: [
        "Workshops e mentorias ao vivo",
        "Contato direto com o Superteam Brasil",
        "Onde quem chega sozinho encontra time",
      ],
      cta: (
        <TrackedCta
          href={WHATSAPP_COMMUNITY_URL}
          event="campaign_link_clicked"
          properties={{ target: "whatsapp", location: "lp" }}
          className="btn-cut btn-cut-outline inline-flex w-fit items-center whitespace-nowrap px-6 py-3 text-sm font-bold text-ink transition-colors duration-200 hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]"
        >
          <span>Entrar no WhatsApp</span>
        </TrackedCta>
      ),
    },
  ];

  return (
    <div className="bg-surface text-ink">
      {/* Hero: one centred stack on the cream, the amphitheatre rising out of
          the base and the cheque as the only object in front of it. */}
      <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col justify-center overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] sm:h-[52%]">
          <ColosseumBackdrop />
        </div>

        <div className={`relative ${LP_CONTAINER} px-4 py-10 text-center sm:px-6 lg:py-12 lg:[@media(max-height:860px)]:py-6`}>
          <h1 className="font-heading text-[clamp(1.7rem,7.7vw,3.2rem)] font-black uppercase leading-[1.02] tracking-tight text-ink [font-stretch:108%] lg:text-[4.2rem] xl:text-[5rem]">
            <span className="block">O próximo time</span>
            <span className="mt-1 block">
              a captar <span className="inline-block bg-yellow px-3 text-green-dark">milhões</span>
            </span>
            <span className="mt-1 block">pode ser o seu.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-ink/70 sm:text-lg lg:hidden">
            O maior hackathon online do mundo: prêmios milionários e capital anjo.
          </p>
          <p className="mx-auto mt-6 hidden max-w-2xl text-pretty text-base leading-relaxed text-ink/70 sm:text-lg lg:block">
            O Colosseum é o maior hackathon online do mundo: prêmios milionários e capital anjo
            para as melhores equipes.
          </p>

          <div id="hero-cta" className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <TrackedCta
              href={cadastroHref}
              event="cta_clicked"
              properties={{ cta: "cadastro", location: "hero" }}
              className="btn-cut inline-flex items-center whitespace-nowrap bg-emerald px-8 py-3.5 text-sm font-semibold text-surface transition-colors duration-200 hover:bg-emerald-deep sm:px-10 sm:text-base"
            >
              <span>Fazer cadastro</span>
            </TrackedCta>
            <a
              href="#jornada"
              className="btn-cut btn-cut-outline btn-cut-quiet hidden whitespace-nowrap px-8 py-3.5 text-sm font-semibold text-ink sm:px-9 sm:text-base lg:inline-flex lg:items-center"
            >
              <span>Como funciona</span>
            </a>
          </div>

          <MobileSteps
            whatsappUrl={WHATSAPP_COMMUNITY_URL}
            colosseumUrl={colosseum?.external_url ?? null}
            registered={registered}
          />

          <EventTicket />
        </div>
      </section>

      {/* Why Solana: the network drawn as a network — one hub, the numbers
          orbiting it on dotted wires. */}
      <section id="solana" className={LP_SECTION} aria-label="O que é a Solana">
        <div className={LP_CONTAINER}>
          <Reveal className="text-center">
            <SectionHat centered>Por que Solana</SectionHat>
            <h2 className="mx-auto mt-4 max-w-4xl text-balance font-heading text-4xl font-black leading-[1.1] tracking-tight [font-stretch:105%] sm:text-5xl">
              <span className="block text-ink/35">Uma nova infraestrutura financeira.</span>
              <span className="mt-2 block">
                <span className="inline-block -rotate-1 border-2 border-green-dark bg-yellow px-3 text-green-dark">
                  Global.
                </span>
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-ink/70 sm:text-lg">
              A Solana é a rede blockchain mais rápida do mundo: milhares de transações por segundo
              com taxas de frações de centavo. Em poucos anos virou a plataforma número 1 para
              startups e grandes corporações construírem os produtos financeiros do futuro.
            </p>
          </Reveal>

          <div className="relative mt-12 lg:mt-6">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-green-dark [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_84%,transparent)] lg:block"
            >
              <NetworkHalo className="h-[30rem] w-[30rem] xl:h-[33rem] xl:w-[33rem]" />
            </div>

            <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-x-0">
              <StatColumn stats={SOLANA_STATS.slice(0, 2)} side="left" />

              <Reveal className="order-first lg:order-none lg:px-6">
                <div className="mx-auto w-[16rem] rounded-3xl border-2 border-green-dark bg-green-dark p-3 shadow-sticker sm:w-[18rem]">
                  <div className="rounded-2xl border border-surface/15 bg-[radial-gradient(120%_130%_at_50%_0%,#2f6b3f_0%,#1b231d_72%)] px-6 py-10 text-center">
                    <Image
                      src="/brand/events/solana-light.png"
                      alt="Solana"
                      width={2584}
                      height={384}
                      className="mx-auto h-6 w-auto sm:h-7"
                    />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-yellow">
                      a rede mais rápida do mundo
                    </p>
                  </div>
                </div>
              </Reveal>

              <StatColumn stats={SOLANA_STATS.slice(2)} side="right" />
            </div>
          </div>

          <Reveal delay={120}>
            <p className="mx-auto mt-12 max-w-3xl text-pretty text-center text-sm leading-relaxed text-ink/70 sm:text-base lg:mt-14">
              Não é só hype:{" "}
              <span className="font-semibold text-ink">
                Visa, Mastercard, Stripe, PayPal, BlackRock, J.P. Morgan, Western Union, SpaceX e Kalshi
              </span>{" "}
              já emitem e liquidam ativos na rede. E a Solana está nas maiores bolsas do planeta, de
              Wall Street à B3.
            </p>
          </Reveal>
        </div>
      </section>

      {/* O hackathon global: the credibility section, real cases, no filler. */}
      <section id="cases" className={`${LP_SECTION} mt-24 bg-surface-kraft pb-24 lg:mt-28 lg:pb-28`} aria-label="O hackathon global">
        <div className={LP_CONTAINER}>
          <CasesRail cases={CASES}>
            <Reveal>
              <SectionHat>Colosseum</SectionHat>
              <h2 className="mt-4 font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
                O hackathon global
              </h2>
              <p className="mt-4 text-pretty leading-relaxed text-ink/80">
                Todo ano, a Solana coloca builders do mundo inteiro para competir, 100% remoto, com
                prêmios em dinheiro e investimento anjo direto para os melhores times.{" "}
                <strong className="text-ink">
                  Nas duas últimas edições, times brasileiros saíram de lá com capital confirmado.
                </strong>
              </p>
            </Reveal>
          </CasesRail>
        </div>
      </section>

      {/* A Jornada: trilho horizontal — pílula de tempo, marcador e cartão por passo. */}
      <section id="jornada" className={`${LP_SECTION} hidden lg:block`} aria-label="Como participar">
        <div className={LP_CONTAINER}>
          <Reveal>
            <SectionHat centered>Como participar</SectionHat>
            <h2 className="mx-auto mt-4 max-w-3xl text-balance text-center font-heading text-4xl font-black leading-[1.1] tracking-tight [font-stretch:105%] sm:text-5xl">
              Entre no hackathon em 3 passos.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-center text-lg leading-relaxed text-ink/80">
              Faça o cadastro, registre-se no Colosseum e entre na comunidade para receber suporte,
              workshops e contexto durante toda a campanha.
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-3 gap-6">
            {journey.map((step, i) => (
              <Reveal key={step.title} delay={i * 130} className="h-full">
                <div className="flex h-full flex-col">
                  <div className="flex justify-center">
                    <span
                      className={`inline-flex items-center rounded-full border-2 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] ${
                        i === 0
                          ? "border-green-dark bg-yellow text-green-dark"
                          : "border-green-dark/25 bg-surface-raised text-ink/55"
                      }`}
                    >
                      {step.marker}
                    </span>
                  </div>

                  <div className="relative mt-5 flex h-3 items-center justify-center">
                    {i > 0 && (
                      <span aria-hidden className="absolute left-[-12px] right-1/2 h-0 border-t-2 border-dotted border-green-dark/30" />
                    )}
                    {i < journey.length - 1 && (
                      <span aria-hidden className="absolute left-1/2 right-[-12px] h-0 border-t-2 border-dotted border-green-dark/30" />
                    )}
                    <span
                      aria-hidden
                      className={`relative h-3 w-3 rounded-full border-2 border-green-dark ${
                        i === 0 ? "bg-yellow" : "bg-surface"
                      }`}
                    />
                  </div>

                  <div className="card-cut mt-5 flex flex-1 flex-col p-6 sm:p-7">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink/40">
                      Passo {`0${i + 1}`}
                    </p>
                    <div className="mt-4 border-y border-green-dark/15 py-4 text-green-dark">
                      <StepGlyph shape={step.glyph} className="mx-auto h-32 w-auto" />
                    </div>
                    <h3 className="mt-6 font-heading text-xl font-bold">{step.title}</h3>
                    <ul className="mb-6 mt-4 space-y-2.5">
                      {step.items.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2.5 text-pretty text-sm leading-relaxed text-green-dark/70"
                        >
                          <CheckIcon
                            aria-hidden
                            weight="bold"
                            className="mt-[3px] h-4 w-4 shrink-0 text-emerald"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto">{step.cta}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Informações: bento — calendário em cima, trilha e recursos embaixo. */}
      <section id="informacoes" className={LP_SECTION} aria-label="Informações">
        <div className={LP_CONTAINER}>
          <Reveal>
            <SectionHat>Antes de começar</SectionHat>
            <h2 className="mt-4 font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
              Informações
            </h2>
            <p className="mt-3 max-w-2xl text-pretty text-lg leading-relaxed text-ink/80">
              As datas que não podem passar batido, a trilha extra para brasileiros e tudo que você precisa para chegar pronto na arena.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Reveal delay={100} className="lg:col-span-2">
              <article className="overflow-hidden rounded-2xl border-2 border-green-dark bg-surface-kraft shadow-sticker">
                <header className="px-6 pt-5 sm:px-8 sm:pt-6">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/60">
                    Calendário
                  </p>
                  <h3 className="mt-1.5 font-heading text-xl font-black uppercase text-ink [font-stretch:115%] sm:text-2xl">
                    Calendário do hackathon
                  </h3>
                  <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-relaxed text-green-dark/70">
                    Da abertura do Colosseum ao anúncio dos vencedores.
                  </p>
                </header>
                <ol className="mx-6 mt-5 overflow-hidden rounded-t-2xl border-2 border-b-0 border-green-dark bg-surface-raised divide-y-2 divide-green-dark/15 sm:mx-16 sm:mt-6 lg:mx-28 xl:mx-40">
                  {CALENDAR.map((item) => (
                    <li
                      key={item.title}
                      className={`grid gap-0.5 px-5 py-3.5 sm:grid-cols-12 sm:items-baseline sm:gap-6 sm:px-6 sm:py-4 ${
                        item.highlight ? "bg-green text-surface" : "text-ink"
                      }`}
                    >
                      <p className={`font-heading text-xl font-black uppercase leading-none [font-stretch:115%] sm:col-span-3 sm:text-2xl ${item.highlight ? "text-yellow" : ""}`}>
                        {item.date}
                      </p>
                      <div className="sm:col-span-9">
                        <p className="font-heading text-base font-bold">
                          {item.href ? (
                            <a href={item.href} target="_blank" rel="noopener noreferrer" className="underline decoration-yellow decoration-4 underline-offset-4 hover:text-emerald">
                              {item.title}
                            </a>
                          ) : (
                            item.title
                          )}
                        </p>
                        <p className={`mt-0.5 text-pretty text-sm leading-snug ${item.highlight ? "text-surface/85" : "text-muted"}`}>
                          {item.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </article>
            </Reveal>

            <Reveal delay={150} className="h-full">
              <TrackedCta
                href={withPlatformUtm("https://superteam.fun/earn/s/superteambr", { content: "lp_trilha_brasil", campaign: "colosseum-2026" })}
                event="campaign_link_clicked"
                properties={{ target: "earn", location: "lp" }}
                className="group flex h-full flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:p-8"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-green-dark bg-green-dark">
                      <Image
                        src="/brand/stbr/logo/symbol-fwhite.png"
                        alt=""
                        width={26}
                        height={25}
                        className="h-6 w-auto"
                      />
                    </span>
                    <p className="truncate font-heading text-2xl font-black uppercase text-ink [font-stretch:115%]">
                      Trilha Brasil
                    </p>
                  </div>
                  <span className="hidden shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/60 sm:block">
                    Superteam Earn
                  </span>
                </div>
                <p className="mt-4 text-pretty text-sm leading-relaxed text-green-dark/70">
                  Além dos prêmios e investimentos da competição Global, os brasileiros têm uma trilha extra com prêmios adicionais, publicados no Superteam Earn. Dá para concorrer nas duas ao mesmo tempo, com apoio da Superteam Brasil do cadastro à submissão.
                </p>
                <p className="mt-auto pt-6 text-sm font-bold text-emerald group-hover:underline">
                  Ver oportunidades no Earn
                </p>
              </TrackedCta>
            </Reveal>

            <Reveal delay={200} className="h-full">
              <article className="flex h-full flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker sm:p-8">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/60">
                  Recursos
                </p>
                <h3 className="mt-2 font-heading text-2xl font-black uppercase text-ink [font-stretch:115%]">
                  Onde aprender e pedir ajuda
                </h3>
                <ul className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                  {RESOURCES.map((r) => {
                    const Icon = r.icon;
                    return (
                      <li key={r.label}>
                        <TrackedCta
                          href={r.href}
                          event="campaign_link_clicked"
                          properties={{ target: r.label, location: "recursos" }}
                          className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-green-dark/25 bg-surface px-3 py-4 text-center text-[13px] font-bold text-ink transition-colors duration-200 hover:border-emerald hover:bg-emerald hover:text-surface sm:inline-flex sm:h-auto sm:flex-row sm:gap-2.5 sm:rounded-full sm:px-5 sm:py-2.5 sm:text-left sm:text-sm"
                        >
                          <Icon size={22} weight="bold" aria-hidden className="sm:size-[18px]" />
                          {r.label}
                        </TrackedCta>
                      </li>
                    );
                  })}
                </ul>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ: a manila folder on the cream — a tab sticking out at the top and
          the darker sheet bleeding to the edges. */}
      <section id="faq" aria-label="Perguntas frequentes" className="mt-24 lg:mt-28">
        <div className={`${LP_CONTAINER} px-4 sm:px-6 lg:px-8 xl:px-12`}>
          <span className="ml-4 inline-block rounded-t-xl bg-surface-kraft px-10 pb-1 pt-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-green-dark/70 sm:ml-[8%]">
            FAQ
          </span>
        </div>

        <div className="bg-surface-kraft">
          <div className={`${LP_CONTAINER} grid gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20 lg:px-8 lg:pb-28 lg:pt-12 xl:px-12`}>
            <FaqAside>
              <Reveal>
                <SectionHat>Alguma dúvida?</SectionHat>
                <h2 className="mt-5 font-heading text-[clamp(2.4rem,6.4vw,3.6rem)] font-black uppercase leading-[0.95] tracking-tight text-ink [font-stretch:112%] xl:text-[4rem]">
                  Perguntas
                  <br />
                  frequentes
                </h2>
                <p className="mt-5 max-w-sm text-pretty leading-relaxed text-green-dark/70">
                  O que todo time pergunta antes de entrar. Ficou faltando alguma?
                </p>
                <TrackedCta
                  href={WHATSAPP_COMMUNITY_URL}
                  event="campaign_link_clicked"
                  properties={{ target: "whatsapp", location: "faq" }}
                  className="mt-6 inline-flex items-center gap-4 rounded-xl border-2 border-green-dark bg-surface-raised p-1.5 pr-6 text-sm font-bold text-ink shadow-sticker transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <span aria-hidden className="flex size-9 items-center justify-center rounded-lg bg-yellow text-green-dark">
                    <WhatsappLogoIcon size={18} weight="bold" />
                  </span>
                  Pergunta no WhatsApp
                </TrackedCta>
                <StepGlyph shape="question" className="mt-12 hidden w-full max-w-[17rem] text-ink lg:block" />
              </Reveal>
            </FaqAside>

            <div className="space-y-12 border-y border-dashed border-green-dark/30 py-10 sm:border-x sm:px-8">
              {FAQ_GROUPS.map((g, i) => {
                const offset = FAQ_GROUPS.slice(0, i).reduce((n, prev) => n + prev.items.length, 0);
                return (
                  <Reveal key={g.title} delay={i * 80}>
                    <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-green-dark/45">
                      {g.title}
                    </p>
                    {g.items.map((f, j) => (
                      <details key={f.q} className="group border-t border-dashed border-green-dark/35">
                        <summary className="flex cursor-pointer list-none items-start gap-4 py-5 sm:gap-6 [&::-webkit-details-marker]:hidden">
                          <span
                            aria-hidden
                            className="mt-1.5 w-7 shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-green-dark/40"
                          >
                            Q{offset + j + 1}
                          </span>
                          <span className="flex-1 text-pretty font-heading text-lg font-bold leading-snug text-ink transition-colors group-hover:text-emerald sm:text-xl">
                            {f.q}
                          </span>
                          <span
                            aria-hidden
                            className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border-2 border-green-dark/60 text-green-dark transition-colors duration-200 group-hover:border-green-dark group-hover:bg-yellow"
                          >
                            <span className="h-[2px] w-3 rounded-full bg-current" />
                            <span className="absolute h-3 w-[2px] rounded-full bg-current transition-transform duration-200 group-open:scale-y-0" />
                          </span>
                        </summary>
                        <p className="faq-answer max-w-2xl pb-6 pl-11 pr-10 text-pretty leading-relaxed text-green-dark/75 sm:pl-13">
                          {f.a}
                        </p>
                      </details>
                    ))}
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* -mb-24 cancels the footer's mt-24: the green band has to run straight
          into the footer, so the extra pb replaces the padding the footer
          then covers. */}
      <section
        className={`${LP_SECTION} -mb-24 overflow-hidden bg-emerald-deep pb-48 lg:pb-52`}
        aria-label="Fazer cadastro"
      >
        <div className={`${LP_CONTAINER} relative pt-[clamp(5rem,18vw,15rem)]`}>
          <Countdown
            deadlineIso={submissionDeadline}
            variant="backdrop"
            className="pointer-events-none absolute inset-x-0 top-0 text-center text-[clamp(3.5rem,16vw,13rem)] text-surface/25"
          />
          <Reveal>
            <div className="relative rounded-2xl border-2 border-green-dark bg-surface-raised p-7 text-center shadow-sticker sm:p-12">
              <SectionHat centered>Última chamada</SectionHat>
              <h2 className="mt-5 mx-auto max-w-3xl font-heading font-black uppercase leading-[1.06] tracking-tight text-ink [font-stretch:108%]">
                <span className="block text-balance text-[clamp(1.75rem,7vw,2.75rem)] lg:text-[3.2rem]">
                  O próximo time a captar
                </span>
                <span className="mt-1 block text-balance text-[clamp(1.75rem,7vw,2.75rem)] lg:text-[3.2rem]">
                  <span className="inline-block -rotate-1 border-2 border-green-dark bg-yellow px-3 text-green-dark">
                    milhões
                  </span>{" "}
                  pode ser o seu.
                </span>
              </h2>

              <TrackedCta
                href={cadastroHref}
                event="cta_clicked"
                properties={{ cta: "cadastro", location: "fechamento" }}
                className="mt-9 inline-block whitespace-nowrap rounded-full border-2 border-green-dark bg-yellow px-7 py-3.5 text-sm font-bold text-green-dark transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:px-10 sm:text-lg"
              >
                Fazer cadastro
              </TrackedCta>
              <p className="mt-4 text-sm text-muted">Leva dois minutos · e-mail ou Google</p>
            </div>
          </Reveal>
        </div>
      </section>

      {!registered && (
        <>
          <div aria-hidden className="h-[calc(5.5rem+env(safe-area-inset-bottom))] lg:hidden" />
          <MobileCtaBar
            watchId="hero-cta"
            href={cadastroHref}
            label="Fazer cadastro"
          />
        </>
      )}
    </div>
  );
}
