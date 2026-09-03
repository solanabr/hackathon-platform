import { publicStorageUrl } from "@/lib/storage";
import { listHackathons, editionStage, isRegistrationOpen } from "@/lib/hackathon";
import type { Hackathon } from "@/types/db";
import { HeroDeck, type DeckCard } from "@/components/home/hero-deck";
import { DAY_MONTH, DAY_NUMERIC, stripPeriods } from "@/lib/dates";
import { EditionGallery } from "@/components/home/edition-gallery";
import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { WHATSAPP_COMMUNITY_URL } from "../pre-registro/constants";

export const dynamic = "force-dynamic";

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const DAY_OF_MONTH = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  timeZone: "America/Sao_Paulo",
});
const MONTH_NUMBER = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  timeZone: "America/Sao_Paulo",
});

function clean(s: string): string {
  return stripPeriods(s).toUpperCase();
}

type CardData = {
  slug: string;
  name: string;
  coverUrl: string | null;
  stage: "upcoming" | "running" | "finished";
  registrationOpen: boolean;
  startDay: number;
  startMonth: string;
  dateRange: string;
  locationCity: string | null;
  prizeSummary: string | null;
  registrationClosesLabel: string | null;
  externalUrl?: string;
};

const STEPS = [
  {
    title: "Inscreva-se",
    body: "Garanta sua vaga em uma edição aberta. É grátis e leva dois minutos.",
    action: { label: "Ver edições", href: "#edicoes", primary: true },
  },
  {
    title: "Monte o time e construa",
    body: "Cada edição define o tamanho do time. Aulas, mentorias e o grupo da comunidade durante toda a fase online.",
    action: { label: "Entrar na comunidade", href: WHATSAPP_COMMUNITY_URL, primary: false },
  },
  {
    title: "Submeta e dispute os prêmios",
    body: "Deck, vídeo demo e repositório até o prazo. As melhores equipes apresentam para a banca.",
    action: { label: "Como receber o prêmio", href: "/guias/do-earn-ao-pix", primary: false },
  },
];

export default async function HomePage() {
  // An empty gallery on a transient read failure beats the error boundary;
  // the throw inside the cached read only keeps the failure out of the cache.
  const hackathons = await listHackathons().catch(() => []);

  const editions: CardData[] = hackathons.map((h: Hackathon) => {
    const start = new Date(h.starts_at);
    const end = new Date(h.presential_at ?? h.submission_deadline_at);
    return {
      slug: h.slug,
      name: h.name,
      coverUrl: h.cover_image_path
        ? publicStorageUrl("hackathon-covers", h.cover_image_path)
        : null,
      stage: editionStage(h),
      registrationOpen: isRegistrationOpen(h) && editionStage(h) !== "finished",
      startDay: Number(DAY_OF_MONTH.format(start)),
      startMonth: MONTHS[Number(MONTH_NUMBER.format(start)) - 1],
      dateRange: `${clean(DAY_MONTH.format(start))} A ${clean(DAY_MONTH.format(end))}`,
      locationCity: h.location_city,
      prizeSummary: h.prize_summary,
      registrationClosesLabel: h.registration_closes_at ? DAY_NUMERIC.format(new Date(h.registration_closes_at)) : null,
      externalUrl: h.external_url ?? undefined,
    };
  });


  const live = hackathons.find((h) => isRegistrationOpen(h) && editionStage(h) !== "finished") ?? null;

  // The deck leads with what's happening now, then what's coming — external
  // editions (like the Universitário) included.
  const STAGE_ORDER = { running: 0, upcoming: 1, finished: 2 } as const;
  const deck: DeckCard[] = [...editions]
    .sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage])
    .slice(0, 3)
    .map((e) => ({
      key: e.slug,
      href: e.externalUrl ?? `/h/${e.slug}`,
      label: e.name,
      meta: `${e.dateRange}${e.locationCity ? ` · ${e.locationCity}` : ""}`,
      coverUrl: e.coverUrl,
    }));
  while (deck.length < 3) {
    deck.push({
      key: `brand-${deck.length}`,
      href: null,
      label: "Superteam Brasil",
      meta: "Novas edições em breve",
      coverUrl: null,
    });
  }

  return (
    <div className="bg-surface text-ink">
      {/* Hero: the morth shapes are the canvas, DoraHacks-style, in LP paint */}
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* Three shapes, corners only. No dark fills on cream, no confetti. */}
          <div
            className="morth animate-float-a absolute hidden bg-yellow sm:-left-28 sm:top-[14%] sm:block sm:h-[34rem] sm:w-[34rem]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-07.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-07.svg)", transform: "rotate(14deg)" }}
          />
          <div
            className="morth animate-float-b absolute -right-20 top-[4%] h-48 w-48 bg-[#008c4c] sm:-right-24 sm:top-[6%] sm:h-[30rem] sm:w-[30rem]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-12.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)", transform: "rotate(-9deg)" }}
          />
          <div
            className="morth animate-float-c absolute bottom-4 right-4 h-40 w-40 bg-[#2f6b3f] sm:bottom-10 sm:right-10 sm:h-72 sm:w-72"
            style={{ maskImage: "url(/brand/stbr/elements/morth-18.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-18.svg)", transform: "rotate(24deg)" }}
          />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl flex-1 content-center gap-14 px-4 pb-10 pt-24 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            {live && (
              <p className="hidden items-center gap-2.5 rounded-full bg-green-dark px-4 py-2 text-sm font-semibold text-surface sm:inline-flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-yellow/70" />
                  <span className="relative h-2 w-2 rounded-full bg-yellow" />
                </span>
                Inscrições abertas
              </p>
            )}

            <h1 className="text-balance font-heading font-black uppercase leading-[0.92] tracking-tight sm:mt-6">
              <span className="block text-[clamp(2rem,10vw,3rem)] [font-stretch:122%] sm:text-6xl lg:text-7xl">Hackathons</span>
              <span className="mt-3 inline-block -rotate-1 bg-green-dark px-3 py-1.5 text-[clamp(1.25rem,6vw,1.875rem)] text-yellow [font-stretch:110%] sm:px-4 sm:text-4xl lg:text-5xl">
                Superteam Brasil
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-ink/80">
              Competições reais no ecossistema Solana. Inscrição, time e submissão em um só lugar, do
              primeiro commit ao demo.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3 sm:gap-4">
              <a
                href="#edicoes"
                className="whitespace-nowrap rounded-full border-2 border-green-dark bg-yellow px-6 py-3 text-sm font-bold sm:text-base text-green-dark transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:px-8"
              >
                Explorar edições
              </a>
              <a
                href="#como-funciona"
                className="whitespace-nowrap rounded-full border-2 border-green-dark bg-surface-raised px-5 py-3 text-sm font-bold sm:text-base text-ink transition-colors duration-200 hover:bg-green-dark hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:px-7"
              >
                Como funciona
              </a>
            </div>
          </div>

          <div className="relative order-first min-w-0 lg:order-none lg:col-span-5">
            <HeroDeck cards={deck} />
          </div>
        </div>
      </section>


      {/* The hub: DoraHacks structure in LP skin */}
      <section id="edicoes" className="px-4 pt-16 sm:px-6 lg:px-8" aria-label="Edições">
        <div className="mx-auto max-w-6xl">
          <EditionGallery editions={editions} />
        </div>
      </section>

      {/* Como funciona: the campaign LP's jornada, one action per step. */}
      <section id="como-funciona" className="px-4 pt-20 sm:px-6 lg:px-8 lg:pt-24" aria-label="Como funciona">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="max-w-2xl text-balance font-heading text-4xl font-black leading-[1.1] tracking-tight [font-stretch:105%] sm:text-5xl">
              Do cadastro à submissão em três passos.
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-ink/80">
              Inscreva-se em uma edição, monte o time com a comunidade e envie o projeto. Tudo pela
              plataforma, com mentorias e workshops no caminho.
            </p>
          </Reveal>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const external = step.action.href.startsWith("http");
              const cls = step.action.primary
                ? "mt-auto inline-block w-fit whitespace-nowrap rounded-full border-2 border-green-dark bg-yellow px-6 py-2.5 text-sm font-bold text-green-dark transition-transform duration-200 hover:-translate-y-0.5"
                : "mt-auto inline-block w-fit whitespace-nowrap rounded-full border-2 border-green-dark bg-surface-raised px-6 py-2.5 text-sm font-bold text-ink transition-colors duration-200 hover:bg-green-dark hover:text-surface";
              return (
                <Reveal key={step.title} delay={i * 130} className="h-full">
                  <li className="flex h-full flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker sm:p-7">
                    <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald">
                      Passo {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-4 font-heading text-xl font-bold">{step.title}</h3>
                    <p className="mb-5 mt-2 text-pretty text-sm leading-relaxed text-green-dark/70">{step.body}</p>
                    {external ? (
                      <a href={step.action.href} target="_blank" rel="noopener noreferrer" className={cls}>
                        {step.action.label}
                      </a>
                    ) : (
                      <Link href={step.action.href} className={cls}>
                        {step.action.label}
                      </Link>
                    )}
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Closing CTA: the LP hero's language on cream, shapes as paint. */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-label="Participe">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="morth animate-float-a absolute hidden bg-yellow sm:-left-24 sm:top-[10%] sm:block sm:h-[22rem] sm:w-[22rem] lg:-left-32 lg:h-[30rem] lg:w-[30rem]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-07.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-07.svg)", transform: "rotate(14deg)" }}
          />
          <div
            className="morth animate-float-b absolute hidden bg-emerald sm:-right-28 sm:-bottom-24 sm:block sm:h-[20rem] sm:w-[20rem] lg:-right-36 lg:h-[26rem] lg:w-[26rem]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-12.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)", transform: "rotate(-9deg)" }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="rounded-3xl border-2 border-green-dark bg-surface-raised px-6 py-12 shadow-sticker sm:px-12 sm:py-16 lg:px-16">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="min-w-0 lg:col-span-8">
                <h2 className="text-balance font-heading text-4xl font-black uppercase leading-[1.1] tracking-tight text-ink [font-stretch:110%] sm:text-5xl lg:text-6xl">
                  Escolha uma edição e comece a{" "}
                  <span className="inline-block -rotate-1 border-2 border-green-dark bg-yellow px-3 text-green-dark">
                    construir
                  </span>
                  .
                </h2>
                <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-ink/80">
                  Inscrição grátis, comunidade no WhatsApp e mentorias durante toda a edição.
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 lg:col-span-4 lg:items-end">
                <a
                  href="#edicoes"
                  className="whitespace-nowrap rounded-full border-2 border-green-dark bg-yellow px-9 py-4 text-lg font-bold text-green-dark shadow-sticker transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  Ver edições abertas
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
