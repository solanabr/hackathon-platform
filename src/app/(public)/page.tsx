import Link from "next/link";
import Image from "next/image";


export const metadata = {
  title: "Colosseum Global Hackathon 2026",
  description:
    "O Brasil entra na arena. Pré-cadastre-se para o Colosseum, o hackathon global da Solana: 100% remoto, milhões em prêmios e capital semente para os melhores times.",
  openGraph: {
    title: "O Brasil entra na arena · Colosseum Global Hackathon 2026",
    description:
      "Pré-cadastre-se para o hackathon global da Solana: 100% remoto, milhões em prêmios e capital semente.",
    images: [{ url: "/brand/og-colosseum.png", width: 1200, height: 630 }],
  },
};

const STAT_CHIPS = [
  "[CONFIRMAR] em prêmios",
  "80K+ participantes globais",
  "R$10M+ captados por times brasileiros na última edição",
];

const CASES = [
  {
    name: "Cloak",
    url: "https://www.cloak.ag/",
    logo: "/brand/cases/cloak.png",
    result: "Captou R$1,5 milhão",
    tagline: "Infraestrutura financeira privada na Solana",
    body: "Time brasileiro que passou pelo hackathon global da Solana e saiu com investimento confirmado.",
  },
  {
    name: "Bido",
    url: "https://www.usebido.com/",
    logo: "/brand/cases/bido.png",
    result: "Captou R$10 milhões",
    tagline: "Compras direto do ChatGPT, Claude e Instagram",
    body: "Participou da última edição e virou um dos cases mais citados de captação pós-hackathon no ecossistema.",
  },
];

const JOURNEY = [
  {
    title: "Pré-cadastro",
    body: "Garanta sua vaga agora. Leva dois minutos e te avisamos de cada próximo passo.",
  },
  {
    title: "Comunidade",
    body: "Entre no grupo oficial: novidades, times se formando e conteúdo pra chegar pronto.",
  },
  {
    title: "Lets Build",
    body: "30 dias de imersão presencial em São Paulo, com US$50 mil em jogo pro time vencedor.",
  },
  {
    title: "Colosseum",
    body: "Inscrições abrem em breve. Quem já se cadastrou é avisado primeiro.",
    badge: "Em breve",
  },
];

export default function HomePage() {
  return (
    <div className="bg-surface text-ink">
      {/* Hero: the campaign's own identity. Arena rings instead of morths, one
          golden admission ticket instead of the /h photo deck. */}
      <section className="relative flex min-h-[92dvh] flex-col overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* Three shapes, corners only. No dark fills on cream, no confetti. */}
          <div
            className="morth animate-float-a absolute hidden bg-yellow sm:-left-28 sm:top-[14%] sm:block sm:h-[30rem] sm:w-[30rem] xl:-left-40"
            style={{ maskImage: "url(/brand/stbr/elements/morth-07.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-07.svg)", transform: "rotate(14deg)" }}
          />
          <div
            className="morth animate-float-b absolute hidden bg-[#008c4c] sm:-right-28 sm:top-[2%] sm:block sm:h-[24rem] sm:w-[24rem] xl:-right-36"
            style={{ maskImage: "url(/brand/stbr/elements/morth-12.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)", transform: "rotate(-9deg)" }}
          />
          <div
            className="morth animate-float-c absolute hidden bg-[#2f6b3f] sm:bottom-12 sm:right-10 sm:block sm:h-44 sm:w-44"
            style={{ maskImage: "url(/brand/stbr/elements/morth-18.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-18.svg)", transform: "rotate(24deg)" }}
          />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl flex-1 content-center gap-12 px-4 pb-12 pt-24 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-6">
          <div className="min-w-0 lg:col-span-7">
            <p className="inline-flex items-center gap-2.5 rounded-full bg-green-dark px-4 py-2 text-sm font-semibold text-surface">
              <span className="relative flex h-2 w-2">
                <span className="absolute h-full w-full animate-ping rounded-full bg-yellow/70" />
                <span className="relative h-2 w-2 rounded-full bg-yellow" />
              </span>
              Colosseum ✦ pré-cadastro aberto
            </p>

            <h1 className="mt-6 text-balance font-heading font-black uppercase leading-[0.9] tracking-tight text-ink [font-stretch:122%]">
              <span className="block sm:whitespace-nowrap text-[clamp(2rem,9vw,2.7rem)] sm:text-5xl lg:text-6xl">O Brasil entra</span>
              <span className="block sm:whitespace-nowrap text-[clamp(2rem,9vw,2.7rem)] sm:text-5xl lg:text-6xl">
                na <span className="inline-block -rotate-1 bg-yellow px-2 text-green-dark">arena</span>.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-ink/80">
              O Colosseum é o hackathon global da Solana: 100% remoto, milhões em prêmios e capital
              semente para os melhores times do planeta.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href="/pre-registro"
                className="whitespace-nowrap rounded-full border-2 border-green-dark bg-yellow px-6 py-3 text-sm font-bold text-green-dark transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:px-8 sm:text-base"
              >
                Fazer pré-cadastro
              </Link>
              <a
                href="#jornada"
                className="whitespace-nowrap rounded-full border-2 border-green-dark bg-surface-raised px-5 py-3 text-sm font-bold text-ink transition-colors duration-200 hover:bg-green-dark hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:px-7 sm:text-base"
              >
                Como funciona
              </a>
            </div>

          </div>

          {/* The admission ticket: one object, punched, perforated, tilted.
              Hover straightens it like picking it up. */}
          <div aria-hidden className="relative order-first mx-auto w-[88%] max-w-sm min-w-0 lg:order-none lg:col-span-5 lg:w-full lg:max-w-none">
            <div className="animate-float-a transition-transform duration-500 [transform:rotate(5deg)] hover:[transform:rotate(1deg)_translateY(-6px)] lg:ml-6">
              <div
                className="relative rounded-3xl border-4 border-green-dark bg-yellow p-7 shadow-[14px_14px_0_rgba(27,35,29,0.9)] sm:p-9"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 0 62%, var(--color-surface) 0 14px, transparent 15px), radial-gradient(circle at 100% 62%, var(--color-surface) 0 14px, transparent 15px)",
                }}
              >
                <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-widest text-green-dark/80">
                  <span>Colosseum ✦ 2026</span>
                  <span>100% remoto</span>
                </div>

                <p className="mt-6 font-heading text-3xl font-black uppercase leading-[0.95] text-green-dark [font-stretch:118%] sm:text-4xl">
                  Global
                  <br />
                  Hackathon
                </p>
                <p className="mt-3 font-mono text-xs font-bold uppercase tracking-widest text-green-dark/70">
                  Solana · o mundo inteiro compete
                </p>

                <div className="mt-7 border-t-2 border-dashed border-green-dark/40 pt-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-green-dark/70">
                        Admite
                      </p>
                      <p className="font-heading text-xl font-black uppercase text-green-dark">
                        Um builder brasileiro
                      </p>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-green-dark px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-yellow">
                      Brasil
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-4 pt-2 sm:px-6" aria-label="Números da campanha">
        <ul className="mx-auto flex max-w-6xl flex-wrap gap-3 lg:px-2">
          {STAT_CHIPS.map((stat, i) => (
            <li
              key={stat}
              className={`rounded-xl border-2 border-green-dark bg-surface-raised px-4 py-2 text-sm font-bold text-ink shadow-sticker ${i % 2 === 0 ? "-rotate-1" : "rotate-1"}`}
            >
              {stat}
            </li>
          ))}
        </ul>
      </section>

      {/* O hackathon global: the credibility section , real cases, no filler. */}
      <section className="px-4 pt-20 sm:px-6 lg:px-8" aria-label="O hackathon global">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
              O hackathon global
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-green-dark/70">
              Todo ano, a Solana coloca builders do mundo inteiro para competir, 100% remoto.
            Os melhores times levam <strong className="text-ink">prêmios em dinheiro</strong> e{" "}
            <strong className="text-ink">investimento anjo direto</strong>. E times brasileiros já
            saíram de lá com <strong className="text-ink">capital confirmado</strong>.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {CASES.map((c) => (
              <a
                key={c.name}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker transition-transform duration-200 hover:-translate-y-1 sm:p-8"
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
                    <p className="truncate text-sm text-muted">{c.tagline}</p>
                  </div>
                </div>
                <p className="mt-4 inline-block -rotate-1 bg-yellow px-2.5 py-1 text-sm font-bold text-green-dark">
                  {c.result}
                </p>
                <p className="mt-4 text-pretty leading-relaxed text-green-dark/70">{c.body}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* A Jornada: mirrors the /pre-registro stepper, numbered like /h's steps. */}
      <section id="jornada" className="px-4 pt-20 sm:px-6 lg:px-8" aria-label="A jornada">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
            A jornada
          </h2>

          <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
            <div
              aria-hidden
              className="absolute left-6 top-8 hidden h-0.5 right-6 border-t-2 border-dashed border-green-dark/30 md:block"
            />
            {JOURNEY.map((step, i) => {
              const soon = Boolean(step.badge);
              return (
                <li key={step.title} className="relative flex gap-4 md:block">
                  <span
                    className={`z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 font-heading text-2xl font-black md:mb-5 ${
                      soon
                        ? "border-dashed border-green-dark/40 bg-surface text-muted"
                        : "border-green-dark bg-yellow text-green-dark shadow-sticker"
                    } ${i % 2 === 0 ? "-rotate-2" : "rotate-2"}`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 pt-1 md:pt-0">
                    <h3 className="flex flex-wrap items-center gap-2 font-heading text-xl font-bold">
                      {step.title}
                      {step.badge && (
                        <span className="rounded-full bg-green-dark px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-yellow">
                          {step.badge}
                        </span>
                      )}
                    </h3>
                    <p className="mt-2 text-pretty text-sm leading-relaxed text-green-dark/70">{step.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <Link
            href="/pre-registro"
            className="mt-4 inline-block whitespace-nowrap rounded-full border-2 border-green-dark bg-yellow px-8 py-3.5 text-base font-bold text-green-dark shadow-sticker transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Fazer pré-cadastro
          </Link>
        </div>
      </section>

      {/* Side tracks: edition-style cards, type-driven covers in the ticket
          language since neither program has usable art. */}
      <section className="px-4 pt-20 sm:px-6 lg:px-8" aria-label="Side tracks">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
            Side tracks
          </h2>
          <p className="mt-3 max-w-xl text-pretty leading-relaxed text-green-dark/70">
            Dois caminhos extras para times brasileiros dentro da campanha.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <a
              href="https://superteam.fun/earn/s/superteambr"
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-2xl border-2 border-green-dark bg-surface-raised shadow-sticker transition-transform duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <div className="relative flex aspect-video flex-col justify-between overflow-hidden border-b-2 border-green-dark bg-green-dark p-6">
                <div
                  aria-hidden
                  className="morth absolute -right-10 -top-10 h-40 w-40 bg-emerald/50 transition-transform duration-300 group-hover:scale-110"
                  style={{ maskImage: "url(/brand/stbr/elements/morth-12.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)" }}
                />
                <p className="relative font-mono text-xs font-bold uppercase tracking-widest text-yellow">
                  Superteam Earn ✦ Brasil
                </p>
                <div className="relative">
                  <Image
                    src="/brand/stbr/logo/symbol-fwhite.png"
                    alt=""
                    width={44}
                    height={43}
                    className="mb-3 h-11 w-auto opacity-90"
                  />
                  <p className="font-heading text-4xl font-black uppercase leading-[0.95] text-surface [font-stretch:118%]">
                    Trilha
                    <br />
                    Brasil
                  </p>
                </div>
              </div>
              <div className="p-6">
                <p className="text-pretty text-sm leading-relaxed text-green-dark/70">
                  Oportunidades e prêmios dedicados aos times brasileiros, com apoio da Superteam
                  Brasil do pré-cadastro à submissão.
                </p>
                <p className="mt-4 text-sm font-bold text-emerald group-hover:underline">
                  Ver oportunidades no Earn
                </p>
              </div>
            </a>

            <a
              href="https://stoxs.club/en/lets-build"
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-2xl border-2 border-green-dark bg-surface-raised shadow-sticker transition-transform duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <div className="relative flex aspect-video flex-col justify-between overflow-hidden border-b-2 border-green-dark bg-yellow p-6">
                <div
                  aria-hidden
                  className="morth absolute -bottom-12 -right-8 h-44 w-44 bg-green-dark/15 transition-transform duration-300 group-hover:scale-110"
                  style={{ maskImage: "url(/brand/stbr/elements/morth-18.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-18.svg)" }}
                />
                <div className="relative flex items-center justify-between font-mono text-xs font-bold uppercase tracking-widest text-green-dark/80">
                  <span>STOXS ✦ 30 dias</span>
                  <span>São Paulo</span>
                </div>
                <div className="relative">
                  <Image
                    src="/brand/tracks/stoxs.png"
                    alt="STOXS"
                    width={44}
                    height={44}
                    className="mb-3 h-11 w-11 rounded-xl border-2 border-green-dark/20"
                  />
                  <p className="font-heading text-4xl font-black uppercase leading-[0.95] text-green-dark [font-stretch:118%]">
                    Lets
                    <br />
                    Build
                  </p>
                </div>
              </div>
              <div className="p-6">
                <p className="text-pretty text-sm leading-relaxed text-green-dark/70">
                  Incubação com imersão presencial em São Paulo e{" "}
                  <strong className="text-ink">US$50 mil para o time vencedor</strong>.
                </p>
                <p className="mt-4 text-sm font-bold text-emerald group-hover:underline">
                  Conhecer o Lets Build
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Points existing hackathon-platform visitors at the edições hub. */}
      <section className="px-4 pb-0 pt-20 text-center sm:px-6" aria-label="Hackathons da Superteam Brasil">
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
