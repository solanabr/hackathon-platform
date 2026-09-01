import Link from "next/link";
import Image from "next/image";
import { COLOSSEUM_SLUG, WHATSAPP_COMMUNITY_URL } from "./pre-registro/constants";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { CountUp, Reveal } from "@/components/ui/reveal";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { Tilt } from "@/components/ui/tilt";


export const metadata = {
  title: "Colosseum Global Hackathon 2026",
  description:
    "O próximo time a captar milhões pode ser o seu. Cadastre-se para o Colosseum, o hackathon global da Solana: 100% remoto, prêmios milionários e capital anjo.",
  openGraph: {
    title: "O próximo time a captar milhões pode ser o seu · Colosseum 2026",
    description:
      "Hackathon global da Solana, 100% remoto, de 14 set a 17 out. Cadastre-se com o Superteam Brasil.",
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
  { date: "14 set", title: "Início da competição", body: "Colosseum no ar: times se formam e os projetos começam.", highlight: true },
  { date: "set a out", title: "Workshops e mentorias", body: "Conteúdo ao vivo e suporte da comunidade durante toda a campanha." },
  { date: "17 out", title: "Deadline de envio", body: "Submissões fecham no Colosseum, trilhas Brasil e Global." },
  { date: "Em breve", title: "Anúncio dos vencedores", body: "Resultado das trilhas Brasil e Global. Avisamos por e-mail e WhatsApp." },
];

const RESOURCES = [
  { label: "Grupo do WhatsApp", href: "https://chat.whatsapp.com/HPIu1YV3mri5QOGf0gUMTO" },
  { label: "Aulas no YouTube", href: "https://www.youtube.com/@SuperteamBrasil" },
  { label: "Wiki do Superteam", href: "https://wiki.superteam.com.br" },
  { label: "Superteam Earn", href: "https://superteam.fun/earn/s/superteambr" },
  { label: "Academy", href: "https://www.st.academy/" },
  { label: "Discord", href: "https://discord.gg/superteambrasil" },
];

const FAQS = [
  {
    q: "Preciso ter um time pronto para participar?",
    a: "Não. Você pode entrar sozinho, conhecer pessoas na comunidade e montar sua equipe ao longo da campanha e dentro do Colosseum.",
  },
  {
    q: "Quanto custa participar?",
    a: "Nada. O cadastro, a comunidade e o hackathon são gratuitos.",
  },
  {
    q: "Quando envio os dados do projeto no Colosseum?",
    a: "As inscrições e submissões abrem em breve na plataforma do Colosseum. Quem fez o cadastro é avisado na hora por e-mail e WhatsApp.",
  },
  {
    q: "O Superteam Brasil ajuda durante o hackathon?",
    a: "Sim. Mentorias, workshops ao vivo, formação de times e suporte na comunidade durante toda a campanha.",
  },
  {
    q: "Preciso saber blockchain para começar?",
    a: "Não. Os workshops e a comunidade existem justamente para te levar do zero até a submissão.",
  },
];

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
  return (
    <div className="bg-surface text-ink">
      {/* Hero: centered launch-announcement stack, the cheque as the single
          visual below it with room to read like a real cheque. */}
      <section className="relative flex min-h-[88dvh] flex-col justify-center overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* Yellow field under the desk's left side, emerald behind its right. */}
          <div
            className="morth animate-float-a absolute hidden bg-yellow sm:block sm:-left-28 sm:top-[42%] sm:h-[22rem] sm:w-[22rem] md:h-[26rem] md:w-[26rem] lg:-left-44 lg:top-[38%] lg:h-[34rem] lg:w-[34rem]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-07.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-07.svg)", transform: "rotate(14deg)" }}
          />
          <div
            className="morth animate-float-b absolute hidden bg-[#008c4c] sm:block sm:-right-40 sm:top-[44%] sm:h-[18rem] sm:w-[18rem] lg:-right-56 lg:top-[7%] lg:h-[26rem] lg:w-[26rem] 2xl:-right-48 2xl:h-[30rem] 2xl:w-[30rem]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-12.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)", transform: "rotate(-9deg)" }}
          />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 py-10 text-center sm:px-6 lg:py-12 lg:[@media(max-height:820px)]:py-6">
          <h1 className="font-heading font-black uppercase leading-[1.04] tracking-tight text-ink [font-stretch:108%]">
            <span className="block text-balance text-[clamp(2rem,9vw,3rem)] lg:text-[3.6rem] xl:text-[4.2rem]">O próximo time a captar</span>
            <span className="mt-1 block text-balance text-[clamp(2rem,9vw,3rem)] lg:text-[3.6rem] xl:text-[4.2rem]">
              <span className="inline-block -rotate-1 border-2 border-green-dark bg-yellow px-3 text-green-dark">milhões</span> pode ser o seu.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-ink/80 sm:text-lg">
            O Colosseum é o maior hackathon online do mundo: prêmios milionários e capital anjo
            para as melhores equipes.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <TrackedCta
              href="/pre-registro"
              event="cta_clicked"
              properties={{ cta: "cadastro", location: "hero" }}
              className="whitespace-nowrap rounded-full border-2 border-green-dark bg-yellow px-7 py-3.5 text-sm font-bold text-green-dark transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:px-10 sm:text-lg"
            >
              Fazer cadastro
            </TrackedCta>
            <a
              href="#jornada"
              className="whitespace-nowrap rounded-full border-2 border-green-dark bg-surface-raised px-6 py-3.5 text-sm font-bold text-ink transition-colors duration-200 hover:bg-green-dark hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:px-9 sm:text-lg"
            >
              Como funciona
            </a>
          </div>

          {/* The desk: the cheque is the main sticker, the facts are stickers
              around it. The cheque fills itself out on load (globals.css). */}
          <div className="mx-auto mt-10 w-full max-w-xl lg:max-w-none">
          <Tilt max={5} className="relative pt-11 text-left lg:h-[26rem] lg:pt-0">
            <div aria-hidden className="relative w-full lg:absolute lg:left-1/2 lg:top-8 lg:w-[40rem] lg:-translate-x-1/2">
            <div className="relative sm:[transform:rotate(-3deg)] lg:[transform:rotate(-4deg)]">
              <div aria-hidden className="absolute inset-0 translate-y-6 rounded-xl bg-green-dark/25 blur-2xl" />
              <div aria-hidden className="cheque-perf absolute inset-0 translate-x-3.5 translate-y-3.5 rounded-xl bg-green-dark" />
              <div className="cheque-perf relative overflow-hidden rounded-xl border-4 border-green-dark bg-[linear-gradient(105deg,#eef3e2_0%,#fffdf6_40%,#fbf1d6_100%)]">
                <div className="absolute inset-y-0 left-0 w-3 bg-yellow" />
                <svg
                  viewBox="0 0 140 100"
                  className="absolute right-10 top-1/2 h-36 w-auto -translate-y-1/2 text-green-dark opacity-[0.06]"
                  aria-hidden
                >
                  <path d="M30 0 H140 L110 26 H0 Z" fill="currentColor" />
                  <path d="M0 37 H110 L140 63 H30 Z" fill="currentColor" />
                  <path d="M30 74 H140 L110 100 H0 Z" fill="currentColor" />
                </svg>
                <div className="pointer-events-none absolute inset-2 rounded-lg border border-green-dark/15" />

                <div className="relative p-4 pl-7 sm:px-7 sm:py-4 sm:pl-9">
                  <div className="flex items-start justify-between gap-4">
                    <p className="min-w-0 font-heading text-lg font-black uppercase leading-none text-ink [font-stretch:118%] sm:text-xl">
                      Colosseum
                      <span className="mt-1.5 block font-mono text-[9px] font-bold tracking-widest text-green-dark/60 sm:text-[10px]">
                        Global Hackathon
                      </span>
                    </p>
                    <div className="shrink-0 whitespace-nowrap text-right font-mono text-[9px] font-bold uppercase tracking-widest text-green-dark/70 sm:text-[10px]">
                      <p>Nº 001417</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-end gap-3 sm:mt-4 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-green-dark/70 sm:text-[10px]">
                        Pague ao
                      </p>
                      <div className="border-b-2 border-dotted border-green-dark/50 pb-1">
                        <p className="cheque-payee font-heading text-xl font-black uppercase leading-none text-ink [font-stretch:115%] sm:text-2xl">
                          Seu time
                        </p>
                      </div>
                    </div>
                    <div className="cheque-amount flex shrink-0 items-baseline gap-1.5 rounded-lg border-2 border-green-dark bg-yellow px-3 py-1.5 sm:px-4 sm:py-2">
                      <span className="font-heading text-lg font-black leading-none tracking-tight text-green-dark sm:text-xl">USD 250k</span>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-green-dark/70 sm:text-[10px]">
                      A quantia de
                    </p>
                    <p className="border-b-2 border-dotted border-green-dark/50 pb-1 font-heading text-[0.75rem] font-black uppercase text-ink sm:text-base">
                      <span className="cheque-quantia block">Milhões em prêmios e capital anjo</span>
                    </p>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-4">
                    <p className="whitespace-nowrap font-mono text-[9px] tracking-[0.28em] text-green-dark/60 sm:text-xs sm:tracking-[0.35em]">
                      ⑆001417 ⑆0914 ⑈1710 2026⑈
                    </p>
                    <div className="shrink-0 text-right">
                      <svg viewBox="0 0 120 28" className="cheque-sign ml-auto h-5 w-24 text-ink" aria-hidden>
                        <path
                          d="M4 20 C 18 4, 26 26, 38 14 S 58 4, 66 16 S 88 26, 96 10 S 110 14, 116 8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <p className="border-t-2 border-green-dark/30 pt-1 font-mono text-[8px] font-bold uppercase tracking-widest text-green-dark/60">
                        Assinatura
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
            <div className="left-1 top-0 [transform:rotate(-6deg)_translateZ(44px)] lg:left-[6%] lg:top-10 absolute whitespace-nowrap rounded-xl border-[3px] border-green-dark px-3 py-2 font-heading text-xs font-black uppercase shadow-[6px_6px_0_rgba(27,35,29,0.9)] lg:px-5 lg:py-3.5 lg:text-xl bg-yellow text-green-dark">
              100% online
            </div>
            <div className="right-1 top-1 [transform:rotate(6deg)_translateZ(56px)] lg:right-[4%] lg:top-8 absolute whitespace-nowrap rounded-xl border-[3px] border-green-dark px-3 py-2 font-heading text-xs font-black uppercase shadow-[6px_6px_0_rgba(27,35,29,0.9)] lg:px-5 lg:py-3.5 lg:text-xl bg-surface-raised text-ink hidden sm:block">
              14 set a 17 out
            </div>
            <div className="-bottom-4 right-1 [transform:rotate(-4deg)_translateZ(64px)] lg:bottom-auto lg:right-[2%] lg:top-[62%] absolute whitespace-nowrap rounded-xl border-[3px] border-green-dark px-3 py-2 font-heading text-xs font-black uppercase shadow-[6px_6px_0_rgba(27,35,29,0.9)] lg:px-5 lg:py-3.5 lg:text-xl bg-emerald text-surface">
              <span className="lg:hidden">R$15M+ captados</span>
              <span className="hidden lg:inline">R$15M+ captados por brasileiros</span>
            </div>
            <div className="hidden lg:block lg:left-[10%] lg:top-[64%] [transform:rotate(6deg)_translateZ(36px)] absolute whitespace-nowrap rounded-xl border-[3px] border-green-dark px-3 py-2 font-heading text-xs font-black uppercase shadow-[6px_6px_0_rgba(27,35,29,0.9)] lg:px-5 lg:py-3.5 lg:text-xl bg-green-dark text-yellow">
              Solana
            </div>
          </Tilt>
          </div>
        </div>
      </section>

      {/* Why Solana: plain typographic stats, no boxes — the numbers carry it. */}
      <section className="px-4 pt-24 sm:px-6 lg:px-8" aria-label="O que é a Solana">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="max-w-3xl text-balance font-heading text-4xl font-black leading-[1.15] tracking-tight [font-stretch:105%] sm:text-5xl">
              Uma nova infraestrutura financeira.{" "}
              <span className="inline-block -rotate-1 border-2 border-green-dark bg-yellow px-3 text-green-dark">Global.</span>
            </h2>
            <p className="mt-6 max-w-3xl text-pretty text-base leading-relaxed text-ink/80 sm:text-lg lg:text-xl">
              A Solana é a rede blockchain mais rápida do mundo: milhares de transações por segundo
              com taxas de frações de centavo. Em poucos anos virou a plataforma número 1 para
              startups e grandes corporações construírem os produtos financeiros do futuro.
            </p>
          </Reveal>

          <Reveal delay={150}>
            <div className="mt-12 rounded-2xl border-2 border-green-dark bg-green-dark p-7 shadow-sticker sm:p-10">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-surface/15">
                {SOLANA_STATS.map((stat, i) => (
                  <Reveal key={stat.value} delay={i * 130} className="lg:px-8 lg:first:pl-0 lg:last:pr-0">
                    <dd className="font-heading text-4xl font-black uppercase leading-none tracking-tight text-yellow [font-stretch:115%] sm:text-5xl">
                      <CountUp value={stat.value} />
                    </dd>
                    <dt className="mt-3 text-pretty text-sm leading-snug text-surface/70">{stat.label}</dt>
                  </Reveal>
                ))}
              </dl>

              <p className="mt-9 border-t border-surface/15 pt-5 text-pretty text-sm leading-relaxed text-surface/60">
                Não é só hype:{" "}
                <span className="font-semibold text-surface">Visa, PayPal, BlackRock, J.P. Morgan e Western Union</span>{" "}
                já emitem e liquidam ativos na rede.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* O hackathon global: the credibility section, real cases, no filler. */}
      <section className="px-4 pt-24 sm:px-6 lg:px-8" aria-label="O hackathon global">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-2xl">
            <h2 className="font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
              O hackathon global
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-ink/80">
              Todo ano, a Solana coloca builders do mundo inteiro para competir, 100% remoto, com
              prêmios em dinheiro e investimento anjo direto para os melhores times.{" "}
              <strong className="text-ink">
                Nas duas últimas edições, times brasileiros saíram de lá com capital confirmado.
              </strong>
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {CASES.map((c, i) => (
              <Reveal key={c.name} delay={i * 150}>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full rounded-2xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker transition-transform duration-200 hover:-translate-y-1 sm:p-8"
              >
                <div className="flex items-center gap-4">
                  <Image
                    src={c.logo}
                    alt={`Logo da ${c.name}`}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-2xl border-2 border-green-dark/10 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-heading text-2xl font-bold group-hover:underline">{c.name}</p>
                    <p className="text-sm text-muted">{c.tagline}</p>
                  </div>
                </div>
                <p className="mt-4 inline-block -rotate-1 bg-yellow px-2.5 py-1 text-sm font-bold text-green-dark">
                  {c.result}
                </p>
                <p className="mt-4 text-pretty leading-relaxed text-green-dark/70">{c.body}</p>
              </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* A Jornada: mirrors the /pre-registro stepper, numbered like /h's steps. */}
      <section id="jornada" className="px-4 pt-24 sm:px-6 lg:px-8" aria-label="Como participar">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="max-w-2xl text-balance font-heading text-4xl font-black leading-[1.1] tracking-tight [font-stretch:105%] sm:text-5xl">
              Entre no hackathon em 3 passos.
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-ink/80">
              Faça o cadastro, registre-se no hackathon pelo Colosseum e entre na comunidade para
              receber suporte, workshops e contexto durante toda a campanha.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Reveal className="h-full">
              <div className="flex h-full flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker sm:p-7">
                <span className="inline-flex w-fit rounded-lg border-2 border-green-dark bg-yellow px-2.5 py-1 font-mono text-sm font-bold text-green-dark">
                  01
                </span>
                <h3 className="mt-4 font-heading text-xl font-bold">Faça seu cadastro</h3>
                <p className="mb-5 mt-2 text-pretty text-sm leading-relaxed text-green-dark/70">
                  Leva dois minutos. Você recebe tudo que precisa sobre o hackathon e não perde
                  nenhuma data importante.
                </p>
                <TrackedCta
                  href="/pre-registro"
                  event="cta_clicked"
                  properties={{ cta: "cadastro", location: "jornada" }}
                  className="mt-auto inline-block w-fit whitespace-nowrap rounded-full border-2 border-green-dark bg-yellow px-6 py-2.5 text-sm font-bold text-green-dark transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Fazer cadastro
                </TrackedCta>
              </div>
            </Reveal>

            <Reveal delay={130} className="h-full">
              <div className="flex h-full flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker sm:p-7">
                <span className="inline-flex w-fit rounded-lg border-2 border-green-dark bg-yellow px-2.5 py-1 font-mono text-sm font-bold text-green-dark">
                  02
                </span>
                <h3 className="mt-4 font-heading text-xl font-bold">Registre-se no hackathon</h3>
                <p className="mb-5 mt-2 text-pretty text-sm leading-relaxed text-green-dark/70">
                  Crie sua conta no Colosseum e clique em &quot;Register Now&quot; para entrar na
                  competição. É por lá que seu time submete o projeto.
                </p>
                {colosseum?.external_url ? (
                  <TrackedCta
                    href={registered ? colosseum.external_url : "/pre-registro"}
                    event={registered ? "campaign_link_clicked" : "cta_clicked"}
                    properties={
                      registered
                        ? { target: "colosseum", location: "lp" }
                        : { cta: "cadastro", location: "jornada_colosseum" }
                    }
                    className="mt-auto inline-block w-fit whitespace-nowrap rounded-full border-2 border-green-dark bg-green-dark px-6 py-2.5 text-sm font-bold text-yellow transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    Abrir Colosseum
                  </TrackedCta>
                ) : (
                  <p className="mt-auto font-mono text-xs font-bold uppercase tracking-widest text-muted">
                    Inscrições abrem em breve
                  </p>
                )}
              </div>
            </Reveal>

            <Reveal delay={260} className="h-full">
              <div className="flex h-full flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker sm:p-7">
                <span className="inline-flex w-fit rounded-lg border-2 border-green-dark bg-yellow px-2.5 py-1 font-mono text-sm font-bold text-green-dark">
                  03
                </span>
                <h3 className="mt-4 font-heading text-xl font-bold">Entre na comunidade</h3>
                <p className="mb-5 mt-2 text-pretty text-sm leading-relaxed text-green-dark/70">
                  Entre no grupo do WhatsApp para acompanhar workshops, falar com mentores e
                  construir com suporte.
                </p>
                <TrackedCta
                  href={WHATSAPP_COMMUNITY_URL}
                  event="campaign_link_clicked"
                  properties={{ target: "whatsapp", location: "lp" }}
                  className="mt-auto inline-block w-fit whitespace-nowrap rounded-full border-2 border-green-dark px-6 py-2.5 text-sm font-bold text-ink transition-colors duration-200 hover:bg-green-dark hover:text-surface"
                >
                  Entrar no WhatsApp
                </TrackedCta>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Calendário: one schedule sheet, rows instead of a card grid. */}
      <section className="px-4 pt-24 sm:px-6 lg:px-8" aria-label="Calendário do hackathon">
        <div className="mx-auto max-w-6xl">
          <Reveal>
          <h2 className="font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
            Calendário do hackathon
          </h2>
          </Reveal>

          <Reveal delay={150}>
          <ol className="mt-10 divide-y-2 divide-green-dark/15 overflow-hidden rounded-2xl border-2 border-green-dark bg-surface-raised shadow-sticker">
            {CALENDAR.map((item) => (
              <li
                key={item.title}
                className={`grid gap-1 px-6 py-5 sm:grid-cols-12 sm:items-baseline sm:gap-6 sm:px-8 sm:py-6 ${
                  item.highlight ? "bg-yellow" : ""
                }`}
              >
                <p className="font-heading text-2xl font-black uppercase leading-none text-ink [font-stretch:115%] sm:col-span-3 sm:text-3xl">
                  {item.date}
                </p>
                <div className="sm:col-span-9">
                  <p className="font-heading text-lg font-bold text-ink">
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer" className="underline decoration-yellow decoration-4 underline-offset-4 hover:text-emerald">
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </p>
                  <p className={`mt-0.5 text-pretty text-sm leading-snug ${item.highlight ? "text-green-dark/80" : "text-muted"}`}>
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          </Reveal>
        </div>
      </section>

      {/* Side tracks: compact cards, no empty cover art. */}
      <section className="px-4 pt-24 sm:px-6 lg:px-8" aria-label="Trilha Brasil">
        <div className="mx-auto max-w-6xl">
          <Reveal>
          <h2 className="font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
            Trilha Brasil
          </h2>
          <p className="mt-3 max-w-xl text-pretty leading-relaxed text-green-dark/70">
            Além dos prêmios e investimentos da competição Global, os brasileiros têm uma trilha extra com prêmios adicionais. Você pode participar dela e da Global ao mesmo tempo, e concorrer a ainda mais prêmios.
          </p>
          </Reveal>

          <div className="mt-10 grid gap-6">
            <Reveal className="max-w-3xl">
            <TrackedCta
              href="https://superteam.fun/earn/s/superteambr"
              event="campaign_link_clicked"
              properties={{ target: "earn", location: "lp" }}
              className="group flex h-full flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:p-7"
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
                Prêmios extras para times brasileiros, publicados na plataforma Superteam Earn. Complete os desafios da trilha e concorra além da competição Global, com apoio da Superteam Brasil do cadastro à submissão.
              </p>
              <p className="mt-auto pt-4 text-sm font-bold text-emerald group-hover:underline">
                Ver oportunidades no Earn
              </p>
            </TrackedCta>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Recursos: link pills, plus where to follow. */}
      <section className="px-4 pt-24 sm:px-6 lg:px-8" aria-label="Recursos">
        <div className="mx-auto max-w-6xl">
          <Reveal>
          <h2 className="font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
            Recursos
          </h2>
          <p className="mt-3 max-w-xl text-pretty text-lg leading-relaxed text-ink/80">
            Tudo que você precisa para chegar pronto na arena.
          </p>

          <ul className="mt-8 flex flex-wrap gap-3">
            {RESOURCES.map((r) =>
              r.href ? (
                <li key={r.label}>
                  <TrackedCta
                    href={r.href}
                    event="campaign_link_clicked"
                    properties={{ target: r.label, location: "recursos" }}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-green-dark bg-surface-raised px-5 py-2.5 text-sm font-bold text-ink transition-colors duration-200 hover:bg-green-dark hover:text-surface"
                  >
                    {r.label}
                    <ArrowUpRightIcon size={14} weight="bold" aria-hidden />
                  </TrackedCta>
                </li>
              ) : (
                <li
                  key={r.label}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-green-dark/30 px-5 py-2.5 text-sm font-bold text-muted"
                >
                  {r.label}
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest">em breve</span>
                </li>
              ),
            )}
          </ul>
          </Reveal>
        </div>
      </section>

      {/* FAQ: native accordions, sticker cards. */}
      <section className="px-4 pt-24 sm:px-6 lg:px-8" aria-label="Perguntas frequentes">
        <div className="mx-auto max-w-6xl">
          <Reveal>
          <h2 className="font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
            Perguntas frequentes
          </h2>
          </Reveal>
          <Reveal delay={120}>
          <div className="mt-8 space-y-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border-2 border-green-dark bg-surface-raised shadow-sticker"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-heading text-base font-bold text-ink sm:p-6 sm:text-lg [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-green-dark font-mono text-sm font-bold transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-pretty leading-relaxed text-green-dark/80 sm:px-6 sm:pb-6">{f.a}</p>
              </details>
            ))}
          </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 pb-0 pt-24 text-center sm:px-6" aria-label="Hackathons da Superteam Brasil">
        <p className="text-sm text-muted">
          Procurando os hackathons da Superteam Brasil?{" "}
          <Link
            href="/h"
            className="font-bold text-ink underline decoration-yellow decoration-4 underline-offset-4 transition-colors hover:text-emerald"
          >
            Conheça nossos hackathons
          </Link>
        </p>
      </section>
    </div>
  );
}
