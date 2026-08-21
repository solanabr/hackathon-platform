import Link from "next/link";
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
    title: "Entre com GitHub",
    body: "Uma conta só, para todos os hackathons. Seu perfil e seus times ficam com você.",
  },
  {
    title: "Confirme sua inscrição",
    body: "Cada edição tem sua inscrição no Luma. Você confirma na plataforma e libera o conteúdo.",
  },
  {
    title: "Monte seu time",
    body: "Crie o time como líder e adicione integrantes pelo e-mail. De 1 a 4 pessoas.",
  },
  {
    title: "Aprenda, construa e submeta",
    body: "Aulas e mentorias dentro da plataforma. No prazo, o líder submete deck, demo e repositório.",
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

  const editions: EditionCardData[] = hackathons.map((h: Hackathon) => {
    const start = new Date(h.starts_at);
    const end = new Date(h.presential_at ?? h.submission_deadline_at);
    return {
      slug: h.slug,
      name: h.name,
      tagline: h.tagline,
      coverUrl: h.cover_image_path
        ? supabase.storage.from("hackathon-covers").getPublicUrl(h.cover_image_path).data.publicUrl
        : null,
      stage: editionStage(h),
      registrationOpen: isRegistrationOpen(h) && editionStage(h) !== "finished",
      startDay: Number(
        new Intl.DateTimeFormat("pt-BR", { day: "numeric", timeZone: "America/Sao_Paulo" }).format(start),
      ),
      startMonth: MONTHS[Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "America/Sao_Paulo" }).format(start)) - 1],
      dateRange: `${clean(RANGE.format(start))} — ${clean(RANGE.format(end))}`,
      locationName: h.location_name,
      locationCity: h.location_city,
      prizeSummary: h.prize_summary,
      registrationClosesLabel: h.registration_closes_at ? CLOSES.format(new Date(h.registration_closes_at)) : null,
    };
  });

  const liveCount = editions.filter((e) => e.registrationOpen).length;

  return (
    <div className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
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
          <h1 className="mt-5 text-balance font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Hackathons da
            <span className="block text-emerald">Superteam Brasil</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Aprenda com quem constrói em Solana, monte seu time e apresente seu projeto. Tudo em um
            lugar: aulas, submissão e Pitch Day.
          </p>
        </header>

        <section className="mt-12" aria-label="Hackathons">
          <h2 className="sr-only">Hackathons</h2>
          <EditionGallery editions={editions} initialFilter={initialFilter} />
        </section>

        <section className="mt-28 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-label="Como funciona">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald">Como funciona</p>
            <h2 className="mt-3 text-balance font-heading text-3xl font-bold leading-tight sm:text-4xl">
              Da inscrição ao palco, sem fricção.
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
              A plataforma acompanha cada etapa da sua participação — e mostra exatamente o que falta
              entregar e até quando.
            </p>
          </div>

          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-5 rounded-2xl border border-green/15 bg-surface-raised/70 p-6 backdrop-blur-sm"
              >
                <span className="font-heading text-3xl font-bold leading-none text-emerald/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-heading text-lg font-bold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-28" aria-label="Participe">
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
                <h2 className="font-heading text-3xl font-bold text-surface sm:text-4xl">
                  Pronto para construir?
                </h2>
                <p className="mt-3 max-w-md leading-relaxed text-surface/70">
                  Entre com sua conta do GitHub e garanta seu lugar na próxima edição.
                </p>
              </div>
              <Link href="/auth" className="btn-primary shrink-0 whitespace-nowrap px-8 text-base">
                Entrar com GitHub
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
