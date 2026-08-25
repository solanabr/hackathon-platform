import Link from "next/link";
import Image from "next/image";
import { listHackathons, editionStage, isRegistrationOpen } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EditionGallery } from "@/components/home/edition-gallery";
import type { EditionCardData } from "@/components/layout/edition-card";
import type { Hackathon } from "@/types/db";

export const dynamic = "force-dynamic";

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const RANGE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

const CLOSES = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function clean(s: string): string {
  return s.replace(/\./g, "");
}

const STEPS = [
  {
    title: "Competir",
    body: "Garanta sua vaga em uma edição com inscrições abertas. É grátis.",
  },
  {
    title: "Construir",
    body: "Monte seu time de 1 a 4 builders, assista às aulas e desenvolva o projeto.",
  },
  {
    title: "Vencer",
    body: "Envie deck, demo e código. Os finalistas disputam o Pitch Day.",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const initialFilter = f === "running" || f === "upcoming" || f === "finished" ? f : "todos";
  const hackathons = await listHackathons();
  const supabase = await createServerSupabaseClient();

  // Public-view counts for the hero stats band. Anon-safe (the views are
  // whitelisted in 00032); a missing view or a failing query just reads zero.
  const { count: projectCount } = await supabase
    .from("public_submissions")
    .select("*", { count: "exact", head: true });
  const { count: builderCount } = await supabase
    .from("public_profiles")
    .select("*", { count: "exact", head: true });

  const editions: EditionCardData[] = hackathons.map((h: Hackathon) => {
    const start = new Date(h.starts_at);
    const end = new Date(h.presential_at ?? h.submission_deadline_at);
    return {
      slug: h.slug,
      name: h.name,
      tagline: h.tagline,
      coverUrl: h.cover_image_path
        ? h.cover_image_path.startsWith("/")
          ? h.cover_image_path
          : supabase.storage.from("hackathon-covers").getPublicUrl(h.cover_image_path).data.publicUrl
        : null,
      stage: editionStage(h),
      registrationOpen: isRegistrationOpen(h) && editionStage(h) !== "finished",
      startDay: Number(
        new Intl.DateTimeFormat("pt-BR", { day: "numeric", timeZone: "America/Sao_Paulo" }).format(start),
      ),
      startMonth: MONTHS[Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "America/Sao_Paulo" }).format(start)) - 1],
      dateRange: `${clean(RANGE.format(start))} a ${clean(RANGE.format(end))}`,
      locationName: h.location_name,
      locationCity: h.location_city,
      prizeSummary: h.prize_summary,
      registrationClosesLabel: h.registration_closes_at ? CLOSES.format(new Date(h.registration_closes_at)) : null,
    };
  });

  const live = editions.filter((e) => e.registrationOpen);
  const liveCount = live.length;

  const stats = [
    { label: "Hackathons", value: editions.length },
    { label: "Projetos", value: projectCount ?? 0 },
    { label: "Participantes", value: builderCount ?? 0 },
    { label: "Prêmios", value: "US$ 3.000" },
  ];

  return (
    <div>
      <section className="relative overflow-hidden px-4 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-6 h-[24rem] w-40 opacity-[0.08] sm:h-[30rem] sm:w-52">
            <Image
              src="/brand/stbr/elements/morth-01.svg"
              alt=""
              fill
              className="object-contain"
              sizes="208px"
            />
          </div>
          <div className="absolute -right-20 top-16 h-64 w-72 opacity-[0.08] sm:h-80 sm:w-96">
            <Image
              src="/brand/stbr/elements/morth-05.svg"
              alt=""
              fill
              className="object-contain"
              sizes="384px"
            />
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl">
          <header className="max-w-3xl">
            {liveCount > 0 && (
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/10 px-4 py-1.5 text-sm font-semibold text-emerald">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald/60" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald" />
                </span>
                {liveCount === 1 ? "1 hackathon com inscrições abertas" : `${liveCount} hackathons com inscrições abertas`}
              </p>
            )}
            <h1 className="mt-6 text-balance font-heading text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl">
              Entre na{" "}
              <span className="bg-gradient-to-r from-emerald to-yellow bg-clip-text text-transparent">
                arena
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Inscrição, formação de time e submissão de projeto em um só lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={live[0] ? `/h/${live[0].slug}` : "/auth"}
                className="btn-primary px-8 text-base"
              >
                {live[0] ? "Ver edição" : "Participar"}
              </Link>
            </div>
          </header>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8" aria-label="Estatísticas">
        <div className="mx-auto max-w-6xl">
          <dl className="mt-14 grid gap-4 sm:grid-cols-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col justify-between gap-4 rounded-3xl border border-emerald/30 bg-surface-raised p-6"
              >
                <dt className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                  {s.label}
                </dt>
                <dd className="font-heading text-4xl font-bold tabular-nums text-ink">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-4 pt-16 sm:px-6 lg:px-8" aria-label="Hackathons">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald">Hackathons</h2>
          <EditionGallery editions={editions} initialFilter={initialFilter} />
        </div>
      </section>

      <section className="px-4 pt-20 sm:px-6 lg:px-8" aria-label="Como funciona">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald">Como funciona</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.title}
                className="relative overflow-hidden rounded-2xl border border-white-10 bg-surface-raised p-7"
              >
                <h3 className="font-heading text-2xl font-bold uppercase tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pt-20 sm:px-6 lg:px-8" aria-label="Participe">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl bg-green-dark px-8 py-14 sm:px-14">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 90% 120% at 15% 20%, rgba(255,210,63,0.14) 0%, rgba(0,140,76,0.10) 45%, transparent 75%)",
              }}
            />
            <div className="relative flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-heading text-3xl font-bold text-ink sm:text-4xl">
                  Participe do próximo
                </h2>
                <p className="mt-3 max-w-md leading-relaxed text-muted">
                  Inscrições abertas. Entre, monte seu time e comece.
                </p>
              </div>
              <Link
                href={live[0] ? `/h/${live[0].slug}` : "/auth"}
                className="btn-primary shrink-0 whitespace-nowrap px-8 text-base"
              >
                {live[0] ? "Quero participar" : "Entrar"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
