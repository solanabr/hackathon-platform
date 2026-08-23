import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getHackathonBySlug, isRegistrationOpen, phaseBoundaries } from "@/lib/hackathon";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PhaseTimeline, type Phase } from "@/components/edition/phase-timeline";
import type { HackathonContent } from "@/types/db";

export const dynamic = "force-dynamic";

const DAY = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

const DAY_LONG = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

const WEEKDAY = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  timeZone: "America/Sao_Paulo",
});

const TIME = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const KIND_LABEL: Record<string, string> = {
  aula: "Aula",
  workshop: "Workshop",
  mentoria: "Mentoria",
  material: "Material",
  link: "Link",
  evento: "Evento",
};

const DELIVERABLES = [
  { value: "10", unit: "slides", label: "Pitch deck", note: "Quem passar do limite é desclassificado." },
  { value: "3", unit: "minutos", label: "Vídeo demo", note: "Mostre o produto funcionando." },
  { value: "1", unit: "repositório", label: "Código no GitHub", note: "Pode ser privado, com acesso para os jurados." },
];

const PARTNERS = [
  { src: "/brand/events/solana-light.png", name: "Solana", w: 2584, h: 384 },
  { src: "/brand/events/cursor-light.png", name: "Cursor", w: 6717, h: 1597 },
  { src: "/brand/stbr/logo/horizontal-offwhite.svg", name: "Superteam Brasil", w: 600, h: 112 },
];

type ScheduleRow = Pick<
  HackathonContent,
  "id" | "kind" | "title" | "speaker" | "description" | "scheduled_at" | "location" | "position"
>;

function clean(s: string): string {
  return s.replace(/\./g, "");
}

export default async function EditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("public_schedule")
    .select("id, kind, title, speaker, description, scheduled_at, location, position")
    .eq("hackathon_id", hackathon.id)
    .order("position", { ascending: true });
  const schedule = (data as ScheduleRow[] | null) ?? [];

  const open = isRegistrationOpen(hackathon);
  const now = Date.now();

  const viewer = await resolveAuthenticatedUserState();
  const registered =
    viewer !== null && isRegistrationComplete(await getRegistration(viewer.userId, hackathon.id));

  const coverUrl = hackathon.cover_image_path
    ? hackathon.cover_image_path.startsWith("/")
      ? hackathon.cover_image_path
      : supabase.storage.from("hackathon-covers").getPublicUrl(hackathon.cover_image_path).data
          .publicUrl
    : null;

  const bounds = phaseBoundaries(hackathon);
  const phases: Phase[] = [
    {
      ...bounds.fase1,
      key: "fase1",
      label: "Fase 1, capacitação",
      when: `${clean(DAY.format(new Date(hackathon.starts_at)))} a ${clean(DAY.format(new Date(bounds.fase1.endsAt - 1)))}`,
      detail: "Minicursos e conteúdos preparatórios para nivelar todo mundo. Monte seu time nesse período.",
    },
    {
      ...bounds.submissao,
      key: "submissao",
      label: "Desenvolvimento e submissão",
      when: `${clean(DAY.format(new Date(bounds.submissao.startsAt)))} a ${clean(DAY.format(new Date(hackathon.submission_deadline_at)))}, ${TIME.format(new Date(hackathon.submission_deadline_at))}`,
      detail: "Mentoria no dia 5. O líder envia deck, vídeo e repositório até o prazo.",
    },
    ...(bounds.selecao && hackathon.finalists_announced_at
      ? [
          {
            ...bounds.selecao,
            key: "selecao",
            label: "Seleção",
            when: clean(DAY.format(new Date(hackathon.finalists_announced_at))),
            detail: hackathon.finalists_count
              ? `Os ${hackathon.finalists_count} finalistas são anunciados por e-mail.`
              : "As equipes classificadas são anunciadas por e-mail.",
          },
        ]
      : []),
    ...(bounds.fase2 && hackathon.presential_at
      ? [
          {
            ...bounds.fase2,
            key: "fase2",
            label: "Fase 2, presencial",
            when: clean(DAY.format(new Date(hackathon.presential_at))),
            detail: "Pitch Day, apresentação para a banca e premiação.",
          },
        ]
      : []),
  ];

  const online = schedule.filter((s) => s.kind !== "evento");

  return (
    <div>
      <section className="px-4 pt-10 sm:px-6 lg:px-8" aria-label={hackathon.name}>
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          <div>
            <p
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${
                open
                  ? "border border-emerald/30 bg-emerald/10 text-emerald"
                  : "border border-green/20 bg-surface-raised text-muted"
              }`}
            >
              {open && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald/60" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald" />
                </span>
              )}
              {open ? "Inscrições abertas" : "Inscrições encerradas"}
            </p>

            <h1 className="mt-5 text-balance font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              {hackathon.name}
            </h1>
            {hackathon.tagline && (
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{hackathon.tagline}</p>
            )}

            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Quando</dt>
                <dd className="mt-1 font-heading text-lg font-bold">
                  {clean(DAY.format(new Date(hackathon.starts_at)))} a{" "}
                  {clean(
                    DAY.format(
                      new Date(hackathon.presential_at ?? hackathon.submission_deadline_at),
                    ),
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Onde</dt>
                <dd className="mt-1 font-heading text-lg font-bold">
                  {hackathon.location_city ?? "Online"}
                </dd>
              </div>
              {hackathon.prize_summary && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Prêmios
                  </dt>
                  <dd className="mt-1 font-heading text-lg font-bold text-emerald">
                    US$ 3.000 e mais
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-8">
              {registered ? (
                <Link href={`/h/${hackathon.slug}/dashboard`} className="btn-primary">
                  Acessar painel
                </Link>
              ) : (
                <Link href={`/h/${hackathon.slug}/register`} className="btn-primary">
                  {open ? "Fazer inscrição" : "Ver detalhes"}
                </Link>
              )}
            </div>
          </div>

          {coverUrl && (
            <div className="relative overflow-hidden rounded-3xl border border-green/20 bg-green-dark shadow-[0_16px_48px_rgba(0,140,76,0.18)]">
              <Image
                src={coverUrl}
                alt={`Arte do ${hackathon.name}`}
                width={1080}
                height={1080}
                priority
                className="h-full w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8" aria-label="Etapas">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-balance font-heading text-3xl font-bold leading-tight sm:text-4xl">
            Como o hackathon acontece
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-muted">
            Duas fases. A primeira online, a segunda presencial em {hackathon.location_city}.
          </p>
          <div className="mt-8">
            <PhaseTimeline phases={phases} now={now} />
          </div>
        </div>
      </section>

      {online.length > 0 && (
        <section className="px-4 pb-20 sm:px-6 lg:px-8" aria-label="Programação">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">
                Programação da Fase 1
              </h2>
              <p className="text-sm text-muted">
                As gravações ficam disponíveis na plataforma depois de cada encontro.
              </p>
            </div>

            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {online.map((item) => {
                const at = item.scheduled_at ? new Date(item.scheduled_at) : null;
                return (
                  <li
                    key={item.id}
                    className="flex gap-5 rounded-2xl border border-green/15 bg-surface-raised p-5"
                  >
                    <div className="w-16 shrink-0 text-center">
                      {at ? (
                        <>
                          <p className="font-heading text-2xl font-bold leading-none">
                            {new Intl.DateTimeFormat("pt-BR", {
                              day: "2-digit",
                              timeZone: "America/Sao_Paulo",
                            }).format(at)}
                          </p>
                          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-emerald">
                            {clean(WEEKDAY.format(at))}
                          </p>
                          <p className="mt-1 text-[11px] text-muted">{TIME.format(at)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted">a definir</p>
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        {KIND_LABEL[item.kind] ?? item.kind}
                      </span>
                      <h3 className="mt-1 font-heading text-lg font-bold leading-tight">
                        {item.title}
                      </h3>
                      {item.speaker && (
                        <p className="mt-0.5 text-sm font-semibold text-emerald">{item.speaker}</p>
                      )}
                      {item.description && (
                        <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <section className="px-4 pb-20 sm:px-6 lg:px-8" aria-label="Entregáveis">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">
            O que seu time entrega
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-muted">
            Até {DAY_LONG.format(new Date(hackathon.submission_deadline_at))} às{" "}
            {TIME.format(new Date(hackathon.submission_deadline_at))}.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {DELIVERABLES.map((d) => (
              <div key={d.label} className="rounded-2xl border border-green/15 bg-surface-raised p-6">
                <p className="font-heading text-4xl font-bold leading-none text-emerald">
                  {d.value}
                  <span className="ml-1.5 align-middle text-sm font-semibold text-muted">
                    {d.unit}
                  </span>
                </p>
                <h3 className="mt-4 font-heading text-lg font-bold">{d.label}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{d.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {hackathon.prize_summary && (
        <section className="px-4 pb-20 sm:px-6 lg:px-8" aria-label="Premiação">
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-3xl bg-green-dark px-8 py-12 sm:px-12">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 120% at 10% 10%, rgba(255,210,63,0.16) 0%, rgba(0,140,76,0.10) 45%, transparent 75%)",
                }}
              />
              <div className="relative">
                <h2 className="font-heading text-3xl font-bold text-surface sm:text-4xl">
                  Premiação
                </h2>
                <ul className="mt-6 grid gap-x-10 gap-y-3 text-surface/85 sm:grid-cols-2">
                  {hackathon.prize_summary.split("·").map((prize) => (
                    <li key={prize} className="flex gap-3 leading-relaxed">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow" />
                      <span>{prize.trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="px-4 pb-24 sm:px-6 lg:px-8" aria-label="Realização">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl bg-green-dark px-8 py-10 sm:px-12">
            <h2 className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-surface/50">
              Realização
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-14 gap-y-8 sm:gap-x-20">
              {PARTNERS.map((p) => (
                <Image
                  key={p.name}
                  src={p.src}
                  alt={p.name}
                  width={p.w}
                  height={p.h}
                  loading="lazy"
                  className="h-7 w-auto opacity-90 sm:h-8"
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
