import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  getHackathonBySlug,
  isRegistrationOpen,
  isFinalistsVisible,
  phaseBoundaries,
  prizePoolLabel,
} from "@/lib/hackathon";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { resolveRoleState } from "@/lib/roles";
import { listSections } from "@/lib/sections";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { type Phase } from "@/components/edition/phase-timeline";
import { SectionRenderer, type ScheduleRow } from "@/components/edition/sections";
import { Countdown } from "@/components/ui/countdown";
import type { HackathonSection } from "@/types/db";

export const dynamic = "force-dynamic";

const DAY = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

const TIME = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

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

  const roles = viewer ? await resolveRoleState() : null;
  const canEdit =
    (roles?.isAdmin ?? false) || (roles?.adminFor.includes(hackathon.id) ?? false);

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

  // Sections drive the page body. Before migration 00036 lands (or for an
  // edition nobody customized) the table is empty, so fall back to the same
  // four blocks the page always rendered.
  const stored = await listSections(hackathon.id);
  const sections: Array<
    Pick<HackathonSection, "id" | "kind" | "title" | "subtitle" | "body_md" | "config">
  > =
    stored.length > 0
      ? stored
      : [
          {
            id: "default-phases",
            kind: "phases",
            title: "Como o hackathon acontece",
            subtitle: `Duas fases. A primeira online, a segunda presencial em ${hackathon.location_city}.`,
            body_md: null,
            config: {},
          },
          {
            id: "default-schedule",
            kind: "schedule",
            title: "Programação da Fase 1",
            subtitle: "As gravações ficam disponíveis na plataforma depois de cada encontro.",
            body_md: null,
            config: {},
          },
          {
            id: "default-deliverables",
            kind: "deliverables",
            title: "O que seu time entrega",
            subtitle: null,
            body_md: null,
            config: { items: DELIVERABLES },
          },
          {
            id: "default-prizes",
            kind: "prizes",
            title: "Premiação",
            subtitle: null,
            body_md: null,
            config: {},
          },
        ];

  // The hero counts down to whatever comes next in the edition's life:
  // inscriptions, then submissions, then Pitch Day. Null once it is all over.
  const nowMs = Date.now();
  const countdownTarget =
    hackathon.registration_closes_at && new Date(hackathon.registration_closes_at).getTime() > nowMs
      ? { label: "Inscrições encerram em", iso: hackathon.registration_closes_at }
      : new Date(hackathon.submission_deadline_at).getTime() > nowMs
        ? { label: "Submissões encerram em", iso: hackathon.submission_deadline_at }
        : hackathon.presential_at && new Date(hackathon.presential_at).getTime() > nowMs
          ? { label: "Pitch Day em", iso: hackathon.presential_at }
          : null;

  return (
    <div>
      <section className="relative px-4 pb-6 pt-14 sm:px-6 lg:px-8 lg:pt-24" aria-label={hackathon.name}>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
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

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              {registered ? (
                <Link
                  href={`/h/${hackathon.slug}/dashboard`}
                  className="btn-primary px-10 py-4 text-lg shadow-[6px_6px_0_#1b231d]"
                >
                  Acessar painel
                </Link>
              ) : open ? (
                <Link
                  href={`/h/${hackathon.slug}/register`}
                  className="btn-primary px-10 py-4 text-lg shadow-[6px_6px_0_#1b231d]"
                >
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

            {countdownTarget && (
              <div className="inline-block rounded-2xl border-2 border-green-dark bg-surface-raised px-5 py-3 shadow-[6px_6px_0_#1b231d]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald">
                  {countdownTarget.label}
                </p>
                <Countdown
                  deadlineIso={countdownTarget.iso}
                  variant="segments"
                  size="md"
                  className="mt-1.5 !justify-start !gap-3"
                />
              </div>
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
                className="h-auto w-full"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 pb-8 pt-16 sm:px-6 lg:px-8" aria-label="Informações da edição">
        <div className="mx-auto max-w-6xl">
          <dl className="flex flex-wrap gap-x-12 gap-y-4 border-t-2 border-green-dark/10 pt-8">
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-emerald">Quando</dt>
              <dd className="mt-1 font-heading text-lg font-bold">
                {clean(DAY.format(new Date(hackathon.starts_at)))} a{" "}
                {clean(
                  DAY.format(new Date(hackathon.presential_at ?? hackathon.submission_deadline_at)),
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-emerald">Onde</dt>
              <dd className="mt-1 font-heading text-lg font-bold">
                {hackathon.location_city ?? "Online"}
              </dd>
            </div>
            {prizePoolLabel(hackathon.prize_summary) && (
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-emerald">Prêmios</dt>
                <dd className="mt-1 font-heading text-lg font-bold text-emerald">
                  {prizePoolLabel(hackathon.prize_summary)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {sections.map((section) => (
        <div key={section.id} className="relative">
          {canEdit && (
            <div className="pointer-events-none absolute inset-x-4 top-6 z-20 sm:inset-x-6 lg:inset-x-8">
              <div className="mx-auto flex max-w-6xl justify-end">
                <Link
                  href={
                    section.kind === "schedule"
                      ? `/admin/h/${hackathon.slug}/content`
                      : `/admin/h/${hackathon.slug}/sections#s-${section.id}`
                  }
                  className="pointer-events-auto rounded-full border-2 border-green-dark bg-surface-raised px-3.5 py-1 text-xs font-bold text-ink transition-colors hover:bg-green-dark hover:text-surface"
                >
                  Editar ✎
                </Link>
              </div>
            </div>
          )}
          <SectionRenderer
            section={section}
            ctx={{ hackathon, phases, now, schedule }}
          />
        </div>
      ))}

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

      <section className="px-4 pb-24 sm:px-6 lg:px-8" aria-label="Realização e apoiadores">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl bg-green-dark px-8 py-12 shadow-[10px_10px_0_rgba(27,35,29,0.25)] sm:px-12">
            <h2 className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-surface/50">
              Realização
            </h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-14 gap-y-8 sm:gap-x-20">
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

            {supporters.length > 0 && (
              <>
                <div aria-hidden className="mx-auto mt-10 h-px max-w-xl bg-surface/15" />
                <h2 className="mt-10 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-surface/50">
                  Apoiadores
                </h2>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16">
                  {supporters.map((sp) => (
                    <Image
                      key={sp.name}
                      src={sp.src}
                      alt={sp.name}
                      width={sp.w}
                      height={sp.h}
                      loading="lazy"
                      className={`w-auto opacity-80 ${sp.cls}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
