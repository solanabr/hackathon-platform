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

type SupporterLogo = { src: string; name: string; w: number; h: number; cls: string };

const SUPPORTERS: Record<string, SupporterLogo[] | undefined> = {
  "solana-cursor-passo-fundo-2026": [
    { src: "/brand/events/upf-light.png", name: "UPF", w: 308, h: 240, cls: "h-10 sm:h-12" },
    { src: "/brand/events/upf-parque-light.png", name: "UPF Parque", w: 603, h: 240, cls: "h-9 sm:h-10" },
    { src: "/brand/events/passo-fundo-valley-light.png", name: "Passo Fundo Valley", w: 697, h: 240, cls: "h-8 sm:h-9" },
    { src: "/brand/events/apollo-light.png", name: "Apollo", w: 925, h: 240, cls: "h-7 sm:h-8" },
    { src: "/brand/events/vertice-light.png", name: "Vértice", w: 998, h: 240, cls: "h-7 sm:h-8" },
  ],
};

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

  const supporters = SUPPORTERS[hackathon.slug] ?? [];

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

  return (
    <div>
      <section className="relative overflow-hidden px-4 pt-10 sm:px-6 lg:px-8" aria-label={hackathon.name}>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="morth animate-float-a absolute -left-28 top-[10%] h-[22rem] w-[22rem] bg-yellow sm:h-[28rem] sm:w-[28rem]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-07.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-07.svg)", transform: "rotate(14deg)" }}
          />
          <div
            className="morth animate-float-b absolute -right-24 -top-16 h-[18rem] w-[18rem] bg-emerald sm:h-[24rem] sm:w-[24rem]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-12.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)", transform: "rotate(-9deg)" }}
          />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          <div>
            <p
              className={`mt-5 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-semibold ${
                open ? "bg-green-dark text-surface" : "border-2 border-green-dark/20 bg-surface-raised text-muted"
              }`}
            >
              {open && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-yellow/70" />
                  <span className="relative h-2 w-2 rounded-full bg-yellow" />
                </span>
              )}
              {open ? "Inscrições abertas" : "Inscrições encerradas"}
            </p>

            <h1 className="mt-5 font-heading font-black uppercase leading-[0.95] tracking-tight">
              <span className="block text-4xl [font-stretch:120%] sm:text-6xl">
                {hackathon.name.split(" ")[0]}
              </span>
              {hackathon.name.split(" ").length > 1 && (
                <span className="mt-3 inline-block -rotate-1 bg-green-dark px-4 py-1.5 text-2xl text-yellow [font-stretch:110%] sm:text-4xl">
                  {hackathon.name.split(" ").slice(1).join(" ")}
                </span>
              )}
            </h1>
            {hackathon.tagline && (
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{hackathon.tagline}</p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
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

            {open && hackathon.registration_closes_at && (
              <p className="inline-flex items-center gap-2 rounded-full border-2 border-green-dark px-4 py-2 text-sm text-ink">
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
          </div>

          {coverUrl && (
            <div className="relative rotate-2 rounded-2xl border-4 border-green-dark bg-green-dark shadow-[14px_14px_0_rgba(27,35,29,0.9)] transition-transform duration-300 hover:rotate-0">
              <div
                aria-hidden
                className="absolute -top-4 left-1/2 z-10 h-8 w-28 -translate-x-1/2 -rotate-2 rounded-sm bg-yellow/90 shadow-sm"
              />
              <div className="overflow-hidden rounded-xl">
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
            </div>
          )}
        </div>
      </section>

      <section className="px-4 pb-8 pt-14 sm:px-6 lg:px-8" aria-label="Informações da edição">
        <dl className="mx-auto grid max-w-6xl grid-cols-1 divide-y-2 divide-green-dark/10 border-y-2 border-green-dark sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0">
          <div className="px-2 py-6 text-center">
            <dt className="text-xs font-bold uppercase tracking-widest text-emerald">Quando</dt>
            <dd className="mt-2 font-heading text-2xl font-black uppercase tabular-nums [font-stretch:112%] sm:text-3xl">
              {clean(DAY.format(new Date(hackathon.starts_at)))} a{" "}
              {clean(
                DAY.format(new Date(hackathon.presential_at ?? hackathon.submission_deadline_at)),
              )}
            </dd>
          </div>
          <div className="px-2 py-6 text-center">
            <dt className="text-xs font-bold uppercase tracking-widest text-emerald">Onde</dt>
            <dd className="mt-2 font-heading text-2xl font-black uppercase [font-stretch:112%] sm:text-3xl">
              {hackathon.location_city ?? "Online"}
            </dd>
          </div>
          <div className="px-2 py-6 text-center">
            <dt className="text-xs font-bold uppercase tracking-widest text-emerald">Prêmios</dt>
            <dd className="mt-2 font-heading text-2xl font-black uppercase tabular-nums text-emerald [font-stretch:112%] sm:text-3xl">
              US$ 3.000<span className="ml-1.5 align-middle font-body text-sm font-semibold normal-case text-muted">e mais</span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8" aria-label="Etapas">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-balance font-heading text-3xl font-black uppercase leading-tight tracking-tight [font-stretch:118%] sm:text-4xl">
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
                <h2 className="font-heading text-3xl font-black uppercase leading-tight tracking-tight [font-stretch:118%] sm:text-4xl">
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
                    className="flex gap-5 rounded-2xl border-2 border-green-dark/15 bg-surface-raised p-5"
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
          <h2 className="mt-3 font-heading text-3xl font-black uppercase leading-tight tracking-tight [font-stretch:118%] sm:text-4xl">
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
                className="rounded-2xl border-2 border-green-dark/15 bg-surface-raised p-6"
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
            <div className="relative overflow-hidden rounded-3xl bg-green-dark px-8 py-12 shadow-[10px_10px_0_rgba(27,35,29,0.25)] sm:px-12">
              <div
                aria-hidden
                className="morth absolute -right-20 -top-24 h-72 w-72 bg-emerald/30"
                style={{ maskImage: "url(/brand/stbr/elements/morth-12.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)", transform: "rotate(-12deg)" }}
              />
              <div className="relative">
                <h2 className="font-heading text-3xl font-black uppercase tracking-tight text-surface [font-stretch:118%] sm:text-4xl">
                  Premiação
                </h2>
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {hackathon.prize_summary
                    .split("·")
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .map((prize) => {
                      const [place, ...rest] = prize.split(" - ");
                      const detail = rest.join(" - ");
                      return (
                        <li
                          key={prize}
                          className="rounded-2xl border-2 border-surface/15 bg-surface/[0.04] p-5 transition-colors duration-200 hover:border-yellow/50"
                        >
                          <p className="font-heading text-xl font-black uppercase tracking-tight text-yellow [font-stretch:112%]">
                            {detail ? place : "Prêmio"}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-surface/80">{detail || place}</p>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

{finalists.length > 0 && (
        <section className="px-4 pb-20 sm:px-6 lg:px-8" aria-label="Finalistas">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-heading text-3xl font-black uppercase leading-tight tracking-tight [font-stretch:118%] sm:text-4xl">
              Finalistas
            </h2>
            <p className="mt-3 max-w-xl leading-relaxed text-muted">
              As equipes classificadas para a fase final.
            </p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {finalists.map((f) => (
                <li
                  key={f.teamId}
                  className="rounded-2xl border-2 border-green-dark/15 bg-surface-raised p-6"
                >
                  {f.placement !== null && (
                    <p className="font-mono text-sm font-bold tabular-nums text-emerald">
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

      <section
        className={`px-4 sm:px-6 lg:px-8 ${supporters.length > 0 ? "pb-4" : "pb-24"}`}
        aria-label="Realização"
      >
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

      {supporters.length > 0 && (
        <section className="px-4 pb-24 sm:px-6 lg:px-8" aria-label="Apoiadores">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl bg-green-dark px-8 py-10 sm:px-12">
              <h2 className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-surface/50">
                Apoiadores
              </h2>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-14 gap-y-8 sm:gap-x-20">
                {supporters.map((s) => (
                  <Image
                    key={s.name}
                    src={s.src}
                    alt={s.name}
                    width={s.w}
                    height={s.h}
                    loading="lazy"
                    className={`w-auto opacity-90 ${s.cls}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
