import Link from "next/link";
import Image from "next/image";
import { listHackathons, editionStage, isRegistrationOpen } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Hackathon } from "@/types/db";
import { HeroDeck, type DeckCard } from "@/components/home/hero-deck";
import { DAY_MONTH, DAY_NUMERIC, stripPeriods } from "@/lib/dates";

export const dynamic = "force-dynamic";

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

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
};

const FILTERS = [
  { key: "todos", label: "Todas" },
  { key: "running", label: "Acontecendo" },
  { key: "upcoming", label: "Em breve" },
  { key: "finished", label: "Encerradas" },
] as const;

const STEPS = [
  {
    title: "Inscreva-se",
    body: "Garanta sua vaga em uma edição aberta. É grátis e leva dois minutos.",
  },
  {
    title: "Monte o time e construa",
    body: "Cada edição define o tamanho do time. Aulas, mentorias e o grupo da comunidade durante toda a fase online.",
  },
  {
    title: "Submeta e dispute os prêmios",
    body: "Deck, vídeo demo e repositório até o prazo. As melhores equipes apresentam para a banca.",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const filter = f === "running" || f === "upcoming" || f === "finished" ? f : "todos";

  const hackathons = await listHackathons();
  const supabase = await createServerSupabaseClient();

  const editions: CardData[] = hackathons.map((h: Hackathon) => {
    const start = new Date(h.starts_at);
    const end = new Date(h.presential_at ?? h.submission_deadline_at);
    return {
      slug: h.slug,
      name: h.name,
      coverUrl: h.cover_image_path
        ? h.cover_image_path.startsWith("/")
          ? h.cover_image_path
          : supabase.storage.from("hackathon-covers").getPublicUrl(h.cover_image_path).data.publicUrl
        : null,
      stage: editionStage(h),
      registrationOpen: isRegistrationOpen(h) && editionStage(h) !== "finished",
      startDay: Number(new Intl.DateTimeFormat("pt-BR", { day: "numeric", timeZone: "America/Sao_Paulo" }).format(start)),
      startMonth:
        MONTHS[Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "America/Sao_Paulo" }).format(start)) - 1],
      dateRange: `${clean(DAY_MONTH.format(start))} A ${clean(DAY_MONTH.format(end))}`,
      locationCity: h.location_city,
      prizeSummary: h.prize_summary,
      registrationClosesLabel: h.registration_closes_at ? DAY_NUMERIC.format(new Date(h.registration_closes_at)) : null,
    };
  });

  const live = hackathons.find((h) => isRegistrationOpen(h) && editionStage(h) !== "finished") ?? null;

  const counts: Record<string, number> = { todos: editions.length };
  for (const e of editions) counts[e.stage] = (counts[e.stage] ?? 0) + 1;
  const filtered = filter === "todos" ? editions : editions.filter((e) => e.stage === filter);

  const deck: DeckCard[] = editions.slice(0, 3).map((e) => ({
    key: e.slug,
    href: `/h/${e.slug}`,
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
            className="morth animate-float-c absolute -bottom-20 -right-14 h-48 w-48 bg-[#2f6b3f] sm:-bottom-32 sm:-right-16 sm:h-96 sm:w-96"
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
                className="whitespace-nowrap rounded-full bg-yellow px-6 py-3.5 text-sm font-bold sm:text-base text-green-dark transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:px-8"
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
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
              Edições
            </h2>
            <nav
              aria-label="Filtrar edições"
              className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0"
            >
              {FILTERS.map((opt) => {
                const active = filter === opt.key;
                const count = counts[opt.key] ?? 0;
                return (
                  <Link
                    key={opt.key}
                    href={opt.key === "todos" ? "/" : `/?f=${opt.key}`}
                    aria-current={active ? "page" : undefined}
                    className={`whitespace-nowrap rounded-full border-2 border-[#1b231d] px-4 py-1.5 text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b231d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7eacb] ${
                      active ? "bg-[#1b231d] text-[#f7eacb]" : "text-green-dark hover:bg-[#1b231d]/10"
                    }`}
                  >
                    {opt.label}
                    <span className={`ml-1.5 tabular-nums ${active ? "text-[#ffd23f]" : "text-green-dark/50"}`}>{count}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-10 rounded-2xl border-2 border-dashed border-[#1b231d]/30 p-10 text-center text-green-dark/60">
              Nenhuma edição aqui ainda.
            </p>
          ) : (
            <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
              {filtered.map((e) => (
                <li key={e.slug} className="w-[85%] min-w-0 shrink-0 snap-center sm:w-auto sm:shrink">
                  <Link
                    href={`/h/${e.slug}`}
                    className="group block overflow-hidden rounded-2xl border-2 border-[#1b231d] bg-[#fffdf6] shadow-sticker transition-transform duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sticker focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b231d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7eacb]"
                  >
                    <div className="relative aspect-video overflow-hidden border-b-2 border-[#1b231d] bg-[#1b231d]">
                      {e.coverUrl ? (
                        <Image
                          src={e.coverUrl}
                          alt=""
                          fill
                          loading="lazy"
                          sizes="(min-width: 1024px) 550px, 100vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div
                          aria-hidden
                          className="morth absolute inset-8 bg-[#008c4c]"
                          style={{ maskImage: "url(/brand/stbr/elements/morth-11.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-11.svg)" }}
                        />
                      )}
                      {e.registrationOpen && (
                        <span className="absolute right-4 top-4 rounded-full bg-[#ffd23f] px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-dark">
                          Inscrições abertas
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-4 p-4">
                      <div className="shrink-0 text-center">
                        <p className="font-heading text-2xl font-black leading-none tabular-nums [font-stretch:118%]">
                          {e.startDay}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#008c4c]">{e.startMonth}</p>
                      </div>
                      <div className="min-w-0 flex-1 border-l-2 border-[#1b231d]/10 pl-4">
                        <h3 className="truncate font-heading text-base font-bold">{e.name}</h3>
                        <p className="mt-0.5 truncate text-xs font-semibold text-green-dark/60">
                          {e.dateRange}
                          {e.locationCity ? ` · ${e.locationCity}` : ""}
                        </p>
                        <p className="mt-2.5 text-xs font-bold text-[#008c4c]">
                          {e.registrationOpen && e.registrationClosesLabel
                            ? `Inscrições até ${e.registrationClosesLabel}`
                            : e.stage === "finished"
                              ? "Ver projetos"
                              : "Ver detalhes"}
                          <span aria-hidden className="ml-1 inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Como funciona: numbered, asymmetric, no card trio */}
      <section id="como-funciona" className="px-4 pt-20 sm:px-6 lg:px-8" aria-label="Como funciona">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
              Como funciona
            </h2>
            <p className="mt-4 max-w-sm text-pretty leading-relaxed text-green-dark/70">
              Três passos entre o cadastro e o palco. Todo o resto acontece na plataforma.
            </p>
          </div>
          <ol className="lg:col-span-8">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="group flex gap-6 border-b-2 border-[#1b231d]/15 py-8 first:pt-0 last:border-b-0 sm:gap-10"
              >
                <span
                  aria-hidden
                  className="text-outline-green shrink-0 font-heading text-6xl font-black leading-none tabular-nums [font-stretch:125%] transition-colors duration-200 group-hover:text-[#ffd23f] sm:text-7xl"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 pt-1">
                  <h3 className="font-heading text-2xl font-bold">{step.title}</h3>
                  <p className="mt-2 max-w-lg text-pretty leading-relaxed text-green-dark/70">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA: the hero's language, inverted */}
      <section className="px-4 py-20 sm:px-6 lg:px-8" aria-label="Participe">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-green-dark px-8 py-16 shadow-[10px_10px_0_rgba(27,35,29,0.25)] sm:px-14 sm:py-20">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              className="morth animate-float-b absolute -right-24 -top-28 h-[22rem] w-[22rem] bg-emerald sm:h-[28rem] sm:w-[28rem]"
              style={{ maskImage: "url(/brand/stbr/elements/morth-12.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)", transform: "rotate(-14deg)" }}
            />
            <div
              className="morth animate-float-c absolute -bottom-24 right-[26%] h-52 w-52 bg-yellow/90 sm:h-64 sm:w-64"
              style={{ maskImage: "url(/brand/stbr/elements/morth-03.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-03.svg)", transform: "rotate(18deg)" }}
            />
            <div
              className="morth absolute -left-16 -bottom-20 h-56 w-56 bg-green/60"
              style={{ maskImage: "url(/brand/stbr/elements/morth-18.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-18.svg)", transform: "rotate(-24deg)" }}
            />
          </div>

          <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="min-w-0 lg:col-span-8">
              <h2 className="text-balance font-heading text-4xl font-black uppercase leading-[1.22] tracking-tight text-surface [font-stretch:118%] sm:text-5xl">
                O próximo{" "}
                <span className="inline-block -rotate-1 bg-yellow px-3 text-green-dark">
                  vencedor
                </span>{" "}
                ainda não se inscreveu
              </h2>
            </div>

            <div className="flex flex-col items-start gap-4 lg:col-span-4 lg:items-end">
              <a
                href="#edicoes"
                className="rounded-full bg-yellow px-9 py-4 text-lg font-bold text-green-dark shadow-sticker transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-green-dark"
              >
                Garantir minha vaga
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
