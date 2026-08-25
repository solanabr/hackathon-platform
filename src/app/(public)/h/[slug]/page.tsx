import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  getHackathonBySlug,
  isRegistrationOpen,
  isFinalistsVisible,
  phaseBoundaries,
} from "@/lib/hackathon";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { PhaseTimeline, type Phase } from "@/components/edition/phase-timeline";
import { Countdown } from "@/components/ui/countdown";
import type { HackathonContent } from "@/types/db";
import { TickerStrip } from "@/components/layout/ticker-strip";

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

const EYEBROW = "text-xs font-bold uppercase tracking-wider text-emerald";

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

  // teams has no anon select policy, so the public results list goes through
  // the service role — this stays server-side and never reaches the browser.
  let finalists: Array<{ teamId: string; teamName: string; placement: number | null }> = [];
  if (isFinalistsVisible(hackathon)) {
    const sr = await createServiceRoleClient();
    const { data: rows } = await sr
      .from("teams")
      .select("id, name, placement")
      .eq("hackathon_id", hackathon.id)
      .eq("is_finalist", true)
      .order("placement", { ascending: true, nullsFirst: false });
    finalists = ((rows as Array<{ id: string; name: string; placement: number | null }> | null) ??
      []).map((r) => ({ teamId: r.id, teamName: r.name, placement: r.placement }));
  }

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

  const T_DAY = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
  const T_TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const up = (v: string) => v.replace(/\./g, "").toUpperCase();
  const tickerItems = [
    hackathon.registration_closes_at
      ? `Inscrições até ${up(T_DAY.format(new Date(hackathon.registration_closes_at)))}`
      : null,
    `Submissão até ${up(T_DAY.format(new Date(hackathon.submission_deadline_at)))}, ${T_TIME.format(new Date(hackathon.submission_deadline_at))}`,
    hackathon.presential_at
      ? `Pitch Day ${up(T_DAY.format(new Date(hackathon.presential_at)))}${hackathon.location_city ? ` em ${hackathon.location_city}` : ""}`
      : null,
    "US$ 3.000 em prêmios",
  ].filter((v): v is string => Boolean(v));

  return (
    <div>
      <section className="relative overflow-hidden px-4 pt-10 sm:px-6 lg:px-8" aria-label={hackathon.name}>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-emerald/20 to-transparent" />
          <div className="absolute -left-24 top-8 h-[24rem] w-44 opacity-[0.08] sm:w-56">
            <Image
              src="/brand/stbr/elements/morth-01.svg"
              alt=""
              fill
              className="object-contain"
              sizes="224px"
            />
          </div>
          <div className="absolute -right-20 bottom-0 h-64 w-80 opacity-[0.08]">
            <Image
              src="/brand/stbr/elements/morth-05.svg"
              alt=""
              fill
              className="object-contain"
              sizes="320px"
            />
          </div>
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          <div>
            <p
              className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${
                open
                  ? "border border-emerald/30 bg-emerald/10 text-emerald"
                  : "border border-white-10 bg-surface-raised text-muted"
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

            <h1 className="mt-5 text-balance font-heading text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl">
              {hackathon.name}
            </h1>
            {hackathon.tagline && (
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{hackathon.tagline}</p>
            )}

            <div className="mt-8">
              {registered ? (
                <Link href={`/h/${hackathon.slug}/dashboard`} className="btn-primary">
                  Acessar painel
                </Link>
              ) : open ? (
                <Link href={`/h/${hackathon.slug}/register`} className="btn-primary">
                  Fazer inscrição
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-primary cursor-not-allowed opacity-60"
                >
                  Inscrições encerradas
                </button>
              )}
            </div>

            {open && hackathon.registration_closes_at && (
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white-10 bg-surface-raised px-4 py-1.5 text-sm text-muted">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Inscrições encerram em
                </span>
                <Countdown
                  deadlineIso={hackathon.registration_closes_at}
                  variant="compact"
                  className="font-mono font-bold tabular-nums text-ink"
                />
              </p>
            )}
          </div>

          {coverUrl && (
            <div className="relative overflow-hidden rounded-3xl border border-white-10 bg-green-dark shadow-[0_16px_48px_rgba(0,140,76,0.18)]">
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

      <TickerStrip items={tickerItems} />

      <section className="px-4 pb-8 sm:px-6 lg:px-8" aria-label="Informações da edição">
        <div className="mx-auto max-w-6xl">
          <dl className="flex flex-wrap gap-x-12 gap-y-4 border-t border-green/15 pt-8">
            <div>
              <dt className="text-sm font-semibold text-muted">Quando</dt>
              <dd className="mt-1 font-heading text-lg font-bold">
                {clean(DAY.format(new Date(hackathon.starts_at)))} a{" "}
                {clean(
                  DAY.format(new Date(hackathon.presential_at ?? hackathon.submission_deadline_at)),
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">Onde</dt>
              <dd className="mt-1 font-heading text-lg font-bold">
                {hackathon.location_city ?? "Online"}
              </dd>
            </div>
            {hackathon.prize_summary && (
              <div>
                <dt className="text-sm font-semibold text-muted">Prêmios</dt>
                <dd className="mt-1 font-heading text-lg font-bold text-emerald">
                  US$ 3.000 e mais
                </dd>
              </div>
            )}
          </dl>
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
              <div>
                <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">
                  Programação da Fase 1
                </h2>
              </div>
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
                    className="flex gap-5 rounded-2xl border border-white-10 bg-surface-raised p-5"
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
          <p className={EYEBROW}>Entregáveis</p>
          <h2 className="mt-3 font-heading text-3xl font-bold leading-tight sm:text-4xl">
            O que seu time entrega
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-muted">
            Até {DAY_LONG.format(new Date(hackathon.submission_deadline_at))} às{" "}
            {TIME.format(new Date(hackathon.submission_deadline_at))}.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {DELIVERABLES.map((d) => (
              <div
                key={d.label}
                className="rounded-2xl border border-white-10 bg-surface-raised p-6"
              >
                <p className="font-mono text-4xl font-bold leading-none tabular-nums text-emerald">
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
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-yellow">
                  Prêmios
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold text-ink sm:text-4xl">
                  Premiação
                </h2>
                <ul className="mt-6 grid gap-x-10 gap-y-3 text-muted sm:grid-cols-2">
                  {hackathon.prize_summary.split("·").map((prize, i) => (
                    <li key={prize} className="flex gap-3 leading-relaxed">
                      <span
                        aria-hidden
                        className="mt-0.5 shrink-0 font-mono text-sm font-bold tabular-nums text-yellow"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{prize.trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {finalists.length > 0 && (
        <section className="px-4 pb-20 sm:px-6 lg:px-8" aria-label="Finalistas">
          <div className="mx-auto max-w-6xl">
            <p className={EYEBROW}>Finalistas</p>
            <h2 className="mt-3 font-heading text-3xl font-bold leading-tight sm:text-4xl">
              Finalistas
            </h2>
            <p className="mt-3 max-w-xl leading-relaxed text-muted">
              As equipes classificadas para a fase final.
            </p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {finalists.map((f) => (
                <li
                  key={f.teamId}
                  className="rounded-2xl border border-white-10 bg-surface-raised p-6"
                >
                  {f.placement !== null && (
                    <p className="font-mono text-sm font-bold tabular-nums text-yellow">
                      {f.placement}º lugar
                    </p>
                  )}
                  <h3 className="mt-1 font-heading text-lg font-bold">{f.teamName}</h3>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="px-4 pb-24 sm:px-6 lg:px-8" aria-label="Realização">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl bg-green-dark px-8 py-10 sm:px-12">
            <h2 className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
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
