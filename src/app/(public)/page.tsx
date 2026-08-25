import Link from "next/link";
import Image from "next/image";
import { listHackathons, editionStage, isRegistrationOpen } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Hackathon } from "@/types/db";

export const dynamic = "force-dynamic";

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const RANGE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
const CLOSES = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
const TICKER_DAY = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
const TICKER_TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function clean(s: string): string {
  return s.replace(/\./g, "").toUpperCase();
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
    body: "De 2 a 4 builders por time. Aulas, mentorias e o grupo da comunidade durante toda a fase online.",
  },
  {
    title: "Submeta e dispute o Pitch Day",
    body: "Deck, vídeo demo e repositório até o prazo. As melhores equipes apresentam ao vivo para a banca.",
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
      dateRange: `${clean(RANGE.format(start))} A ${clean(RANGE.format(end))}`,
      locationCity: h.location_city,
      prizeSummary: h.prize_summary,
      registrationClosesLabel: h.registration_closes_at ? CLOSES.format(new Date(h.registration_closes_at)) : null,
    };
  });

  const live = hackathons.find((h) => isRegistrationOpen(h) && editionStage(h) !== "finished") ?? null;

  const counts: Record<string, number> = { todos: editions.length };
  for (const e of editions) counts[e.stage] = (counts[e.stage] ?? 0) + 1;
  const filtered = filter === "todos" ? editions : editions.filter((e) => e.stage === filter);

  // The ticker carries only real deadlines from the live edition.
  const tickerItems = live
    ? [
        live.registration_closes_at
          ? `INSCRIÇÕES ATÉ ${clean(TICKER_DAY.format(new Date(live.registration_closes_at)))}`
          : "INSCRIÇÕES ABERTAS",
        `SUBMISSÃO ATÉ ${clean(TICKER_DAY.format(new Date(live.submission_deadline_at)))}, ${TICKER_TIME.format(new Date(live.submission_deadline_at))}`,
        live.presential_at
          ? `PITCH DAY ${clean(TICKER_DAY.format(new Date(live.presential_at)))}${live.location_city ? ` EM ${live.location_city.toUpperCase()}` : ""}`
          : null,
        "US$ 3.000 EM PRÊMIOS",
      ].filter((s): s is string => Boolean(s))
    : [];

  return (
    <div className="bg-[#f7eacb] text-[#1b231d]">
      {/* Hero: the morth shapes are the canvas, DoraHacks-style, in LP paint */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="morth animate-float-a absolute -left-28 -top-24 h-[30rem] w-[30rem] bg-[#ffd23f] sm:h-[38rem] sm:w-[38rem]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-07.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-07.svg)", transform: "rotate(14deg)" }}
          />
          <div
            className="morth animate-float-b absolute -right-24 top-8 h-[26rem] w-[26rem] bg-[#008c4c] sm:h-[34rem] sm:w-[34rem]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-12.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)", transform: "rotate(-9deg)" }}
          />
          <div
            className="morth animate-float-c absolute -bottom-36 left-[52%] h-72 w-72 bg-[#2f6b3f] sm:h-96 sm:w-96"
            style={{ maskImage: "url(/brand/stbr/elements/morth-18.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-18.svg)", transform: "rotate(24deg)" }}
          />
          <div
            className="morth absolute right-[30%] -top-10 h-40 w-40 bg-[#1b231d]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-03.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-03.svg)", transform: "rotate(-18deg)" }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 lg:pb-20 lg:pt-20">
          <div className="max-w-3xl">
            {live && (
              <p className="inline-flex items-center gap-2.5 rounded-full bg-[#1b231d] px-4 py-2 text-sm font-semibold text-[#f7eacb]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-[#ffd23f]/70" />
                  <span className="relative h-2 w-2 rounded-full bg-[#ffd23f]" />
                </span>
                Inscrições abertas
              </p>
            )}

            <h1 className="mt-6 text-balance font-heading font-black uppercase leading-[0.92] tracking-tight">
              <span className="block text-5xl [font-stretch:122%] sm:text-6xl lg:text-7xl">Hackathons</span>
              <span className="mt-3 inline-block -rotate-1 bg-[#1b231d] px-4 py-1.5 text-3xl text-[#ffd23f] [font-stretch:110%] sm:text-4xl lg:text-5xl">
                da Superteam Brasil
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-[#1b231d]/80">
              Competições reais no ecossistema Solana. Inscrição, time e submissão em um só lugar, do
              primeiro commit ao Pitch Day.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#edicoes"
                className="rounded-full bg-[#ffd23f] px-8 py-3.5 text-base font-bold text-[#1b231d] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b231d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7eacb]"
              >
                Explorar edições
              </a>
              <a
                href="#como-funciona"
                className="rounded-full border-2 border-[#1b231d] px-7 py-3 text-base font-bold text-[#1b231d] transition-colors duration-200 hover:bg-[#1b231d] hover:text-[#f7eacb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b231d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7eacb]"
              >
                Como funciona
              </a>
            </div>
          </div>
        </div>

        {tickerItems.length > 0 && (
          <div aria-hidden className="relative overflow-hidden border-y-4 border-[#1b231d] bg-[#1b231d] py-3">
            <div className="animate-marquee flex w-max whitespace-nowrap">
              {[0, 1].map((half) => (
                <div key={half} className="flex">
                  {tickerItems.map((item) => (
                    <span
                      key={`${half}-${item}`}
                      className="px-8 font-heading text-sm font-bold uppercase tracking-[0.14em] text-[#ffd23f] [font-stretch:110%]"
                    >
                      {item}
                      <span className="ml-16 inline-block h-2 w-2 rounded-full bg-[#008c4c] align-middle" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>


      {/* The next hackathon, featured */}
      {live && (
        <section className="px-4 pt-16 sm:px-6 lg:px-8" aria-label="Em destaque">
          <div className="mx-auto max-w-6xl">
            <div className="grid overflow-hidden rounded-3xl border-2 border-[#1b231d] bg-[#fffdf6] shadow-[8px_8px_0_#1b231d] lg:grid-cols-12">
              <div className="relative min-h-64 border-b-2 border-[#1b231d] bg-[#1b231d] lg:col-span-5 lg:border-b-0 lg:border-r-2">
                {editions[0]?.coverUrl && (
                  <Image
                    src={editions[0].coverUrl}
                    alt={`Arte da edição ${editions[0].name}`}
                    fill
                    priority
                    sizes="(min-width: 1024px) 460px, 100vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex flex-col justify-center gap-5 p-8 sm:p-10 lg:col-span-7">
                <p className="inline-flex w-fit items-center rounded-full bg-[#ffd23f] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#1b231d]">
                  Próximo hackathon
                </p>
                <h2 className="text-balance font-heading text-3xl font-black uppercase tracking-tight [font-stretch:115%] sm:text-4xl">
                  {live.name}
                </h2>
                <p className="text-pretty leading-relaxed text-[#1b231d]/75">
                  {live.tagline ?? "Duas fases: online e presencial. Times de 2 a 4 builders."}
                </p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t-2 border-[#1b231d]/10 pt-5 sm:grid-cols-4">
                  {[
                    { dt: "Início", dd: editions[0]?.dateRange.split(" A ")[0] ?? "" },
                    { dt: "Pitch Day", dd: live.presential_at ? clean(TICKER_DAY.format(new Date(live.presential_at))) : "A definir" },
                    { dt: "Onde", dd: live.location_city ?? "Online" },
                    { dt: "Prêmios", dd: "US$ 3.000" },
                  ].map((i) => (
                    <div key={i.dt} className="min-w-0">
                      <dt className="text-xs font-bold uppercase tracking-widest text-[#008c4c]">{i.dt}</dt>
                      <dd className="mt-1 truncate font-heading text-lg font-bold tabular-nums">{i.dd}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <Link
                    href={`/h/${live.slug}`}
                    className="rounded-full bg-[#1b231d] px-7 py-3 text-base font-bold text-[#f7eacb] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b231d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf6]"
                  >
                    Ver edição
                  </Link>
                  {editions[0]?.registrationClosesLabel && (
                    <p className="text-sm font-bold text-[#008c4c]">
                      Inscrições até {editions[0].registrationClosesLabel}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* The hub: DoraHacks structure in LP skin */}
      <section id="edicoes" className="px-4 pt-16 sm:px-6 lg:px-8" aria-label="Edições">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
              Edições
            </h2>
            <nav aria-label="Filtrar edições" className="flex flex-wrap gap-2">
              {FILTERS.map((opt) => {
                const active = filter === opt.key;
                const count = counts[opt.key] ?? 0;
                return (
                  <Link
                    key={opt.key}
                    href={opt.key === "todos" ? "/" : `/?f=${opt.key}`}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full border-2 border-[#1b231d] px-4 py-1.5 text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b231d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7eacb] ${
                      active ? "bg-[#1b231d] text-[#f7eacb]" : "text-[#1b231d] hover:bg-[#1b231d]/10"
                    }`}
                  >
                    {opt.label}
                    <span className={`ml-1.5 tabular-nums ${active ? "text-[#ffd23f]" : "text-[#1b231d]/50"}`}>{count}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-10 rounded-2xl border-2 border-dashed border-[#1b231d]/30 p-10 text-center text-[#1b231d]/60">
              Nenhuma edição aqui ainda.
            </p>
          ) : (
            <ul className="mt-10 grid gap-8 lg:grid-cols-2">
              {filtered.map((e) => (
                <li key={e.slug} className="min-w-0">
                  <Link
                    href={`/h/${e.slug}`}
                    className="group block overflow-hidden rounded-2xl border-2 border-[#1b231d] bg-[#fffdf6] shadow-[6px_6px_0_#1b231d] transition-transform duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[9px_9px_0_#1b231d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b231d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7eacb]"
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
                        <span className="absolute right-4 top-4 rounded-full bg-[#ffd23f] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#1b231d]">
                          Inscrições abertas
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-5 p-6">
                      <div className="shrink-0 text-center">
                        <p className="font-heading text-4xl font-black leading-none tabular-nums [font-stretch:118%]">
                          {e.startDay}
                        </p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#008c4c]">{e.startMonth}</p>
                      </div>
                      <div className="min-w-0 flex-1 border-l-2 border-[#1b231d]/10 pl-5">
                        <h3 className="truncate font-heading text-xl font-bold">{e.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-[#1b231d]/60">
                          {e.dateRange}
                          {e.locationCity ? ` · ${e.locationCity}` : ""}
                        </p>
                        {e.prizeSummary && (
                          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[#1b231d]/75">{e.prizeSummary}</p>
                        )}
                        <p className="mt-4 text-sm font-bold text-[#008c4c]">
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
            <p className="mt-4 max-w-sm text-pretty leading-relaxed text-[#1b231d]/70">
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
                  <p className="mt-2 max-w-lg text-pretty leading-relaxed text-[#1b231d]/70">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA: one dark contrast block, morth inside */}
      <section className="px-4 py-20 sm:px-6 lg:px-8" aria-label="Participe">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#1b231d] px-8 py-16 sm:px-14">
          <div
            aria-hidden
            className="morth absolute -right-16 -top-16 h-72 w-72 bg-[#008c4c]/40 sm:h-96 sm:w-96"
            style={{ maskImage: "url(/brand/stbr/elements/morth-21.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-21.svg)", transform: "rotate(12deg)" }}
          />
          <div className="relative flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <h2 className="max-w-md text-balance font-heading text-3xl font-black uppercase leading-tight text-[#f7eacb] [font-stretch:115%] sm:text-4xl">
              O próximo vencedor ainda não se inscreveu
            </h2>
            <Link
              href={live ? `/h/${live.slug}` : "/auth"}
              className="shrink-0 whitespace-nowrap rounded-full bg-[#ffd23f] px-8 py-3.5 text-base font-bold text-[#1b231d] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b231d]"
            >
              {live ? "Garantir minha vaga" : "Entrar"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
