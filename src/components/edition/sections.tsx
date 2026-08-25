import ReactMarkdown from "react-markdown";
import { PhaseTimeline, type Phase } from "@/components/edition/phase-timeline";
import type { Hackathon, HackathonContent, HackathonSection, SectionKind } from "@/types/db";

const WEEKDAY = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  timeZone: "America/Sao_Paulo",
});

const TIME = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const DAY_NUM = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const DAY_LONG = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
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

function clean(s: string): string {
  return s.replace(/\./g, "");
}

const H2 =
  "text-balance font-heading text-3xl font-black uppercase leading-tight tracking-tight [font-stretch:118%] sm:text-4xl";

export type ScheduleRow = Pick<
  HackathonContent,
  "id" | "kind" | "title" | "speaker" | "description" | "scheduled_at" | "location" | "position"
>;

export type SectionContext = {
  hackathon: Hackathon;
  phases: Phase[];
  now: number;
  schedule: ScheduleRow[];
};

type DeliverableItem = { value: string; unit: string; label: string; note: string };

/**
 * One renderer per section kind. Every kind reproduces the block the page
 * hardcoded before sections existed, so the seeded rows render pixel-equal;
 * `markdown` is the free-form kind future editions compose with.
 */
export function SectionRenderer({
  section,
  ctx,
}: {
  section: Pick<HackathonSection, "kind" | "title" | "subtitle" | "body_md" | "config">;
  ctx: SectionContext;
}) {
  switch (section.kind as SectionKind) {
    case "markdown":
      return <MarkdownSection section={section} />;
    case "phases":
      return <PhasesSection section={section} ctx={ctx} />;
    case "schedule":
      return <ScheduleSection section={section} ctx={ctx} />;
    case "deliverables":
      return <DeliverablesSection section={section} ctx={ctx} />;
    case "prizes":
      return <PrizesSection section={section} ctx={ctx} />;
    default:
      return null;
  }
}

function SectionShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:px-8" aria-label={label}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function MarkdownSection({
  section,
}: {
  section: Pick<HackathonSection, "title" | "subtitle" | "body_md">;
}) {
  if (!section.body_md && !section.title) return null;
  return (
    <SectionShell label={section.title ?? "Seção"}>
      {section.title && <h2 className={H2}>{section.title}</h2>}
      {section.subtitle && (
        <p className="mt-3 max-w-xl leading-relaxed text-muted">{section.subtitle}</p>
      )}
      {section.body_md && (
        <div className="prose-lp mt-6 max-w-3xl">
          <ReactMarkdown>{section.body_md}</ReactMarkdown>
        </div>
      )}
    </SectionShell>
  );
}

function PhasesSection({
  section,
  ctx,
}: {
  section: Pick<HackathonSection, "title" | "subtitle" | "config">;
  ctx: SectionContext;
}) {
  // config.items may override the copy of a phase by key: [{key, label, detail}]
  const overrides = Array.isArray(section.config.items)
    ? (section.config.items as Array<{ key: string; label?: string; detail?: string }>)
    : [];
  const phases = ctx.phases.map((p) => {
    const o = overrides.find((x) => x.key === p.key);
    return o ? { ...p, label: o.label ?? p.label, detail: o.detail ?? p.detail } : p;
  });

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8" aria-label={section.title ?? "Etapas"}>
      <div className="mx-auto max-w-6xl">
        <h2 className={H2}>{section.title ?? "Como o hackathon acontece"}</h2>
        {section.subtitle && (
          <p className="mt-3 max-w-xl leading-relaxed text-muted">{section.subtitle}</p>
        )}
        <div className="mt-8">
          <PhaseTimeline phases={phases} now={ctx.now} />
        </div>
      </div>
    </section>
  );
}

function ScheduleSection({
  section,
  ctx,
}: {
  section: Pick<HackathonSection, "title" | "subtitle">;
  ctx: SectionContext;
}) {
  const online = ctx.schedule.filter((s) => s.kind !== "evento");
  if (online.length === 0) return null;

  return (
    <SectionShell label={section.title ?? "Programação"}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className={H2}>{section.title ?? "Programação"}</h2>
        {section.subtitle && <p className="text-sm text-muted">{section.subtitle}</p>}
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
                      {DAY_NUM.format(at)}
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
                <h3 className="mt-1 font-heading text-lg font-bold leading-tight">{item.title}</h3>
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
    </SectionShell>
  );
}

function DeliverablesSection({
  section,
  ctx,
}: {
  section: Pick<HackathonSection, "title" | "subtitle" | "config">;
  ctx: SectionContext;
}) {
  const items = Array.isArray(section.config.items)
    ? (section.config.items as DeliverableItem[])
    : [];
  if (items.length === 0) return null;

  const deadline = new Date(ctx.hackathon.submission_deadline_at);

  return (
    <SectionShell label={section.title ?? "Entregáveis"}>
      <p className="text-xs font-bold uppercase tracking-wider text-emerald">Entregáveis</p>
      <h2 className={`mt-3 ${H2}`}>{section.title ?? "O que seu time entrega"}</h2>
      <p className="mt-3 max-w-xl leading-relaxed text-muted">
        {section.subtitle ?? `Até ${DAY_LONG.format(deadline)} às ${TIME.format(deadline)}.`}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {items.map((d) => (
          <div
            key={d.label}
            className="rounded-2xl border-2 border-green-dark/15 bg-surface-raised p-6"
          >
            <p className="font-mono text-4xl font-bold leading-none tabular-nums text-emerald">
              {d.value}
              <span className="ml-1.5 align-middle text-sm font-semibold text-muted">{d.unit}</span>
            </p>
            <h3 className="mt-4 font-heading text-lg font-bold">{d.label}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{d.note}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function PrizesSection({
  section,
  ctx,
}: {
  section: Pick<HackathonSection, "title">;
  ctx: SectionContext;
}) {
  const summary = ctx.hackathon.prize_summary;
  if (!summary) return null;

  return (
    <SectionShell label={section.title ?? "Premiação"}>
      <div className="relative overflow-hidden rounded-3xl bg-green-dark px-8 py-12 shadow-[10px_10px_0_rgba(27,35,29,0.25)] sm:px-12">
        <div
          aria-hidden
          className="morth absolute -right-20 -top-24 h-72 w-72 bg-emerald/30"
          style={{
            maskImage: "url(/brand/stbr/elements/morth-12.svg)",
            WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)",
            transform: "rotate(-12deg)",
          }}
        />
        <div className="relative">
          <h2 className="font-heading text-3xl font-black uppercase tracking-tight text-surface [font-stretch:118%] sm:text-4xl">
            {section.title ?? "Premiação"}
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summary
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
                    <p className="mt-2 text-sm leading-relaxed text-surface/80">
                      {detail || place}
                    </p>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}
