import ReactMarkdown from "react-markdown";
import { PhaseTimeline, type Phase } from "@/components/edition/phase-timeline";
import {
  parsePageDoc,
  extractOutline,
  parseBlockBody,
  slugifyHeading,
  type BlockName,
} from "@/lib/page-doc";
import type { SponsorLogo } from "@/lib/sponsors";
import type { Hackathon, HackathonContent, SponsorTier } from "@/types/db";

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

export type Finalist = { teamId: string; teamName: string; placement: number | null };

export type DocContext = {
  hackathon: Hackathon;
  phases: Phase[];
  now: number;
  schedule: ScheduleRow[];
  sponsors: Record<SponsorTier, SponsorLogo[]>;
  finalists: Finalist[];
  finalistsVisible: boolean;
};

/**
 * Renders an edition's page_md document: prose runs are markdown with
 * anchored ## headings; fenced blocks pull live data from ctx. The outline
 * sidebar lists the ## headings and follows the reader on lg+.
 */
export function EditionPageDoc({ doc, ctx }: { doc: string; ctx: DocContext }) {
  const segments = parsePageDoc(doc);
  const outline = extractOutline(doc);
  const withNav = outline.length >= 2;

  return (
    <div className="px-4 pb-20 sm:px-6 lg:px-8">
      <div
        className={`mx-auto max-w-6xl ${
          withNav ? "lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:items-start lg:gap-12" : ""
        }`}
      >
        {withNav && (
          <nav
            aria-label="Nesta página"
            className="sticky top-24 hidden self-start lg:block"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              Nesta página
            </p>
            <ul className="mt-3 space-y-1 border-l-2 border-green-dark/10">
              {outline.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className="-ml-0.5 block border-l-2 border-transparent py-1 pl-4 text-sm font-semibold text-muted transition-colors hover:border-emerald hover:text-ink"
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="min-w-0 space-y-14">
          {segments.map((seg, i) =>
            seg.type === "prose" ? (
              <ProseSegment key={i} md={seg.md} />
            ) : (
              <BlockSegment key={i} name={seg.name} body={seg.body} ctx={ctx} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function ProseSegment({ md }: { md: string }) {
  return (
    <div className="prose-lp max-w-3xl">
      <ReactMarkdown
        components={{
          h2: ({ children }) => {
            const text = (Array.isArray(children) ? children : [children])
              .filter((c): c is string => typeof c === "string")
              .join(" ");
            return (
              <h2 id={slugifyHeading(text)} className={`${H2} scroll-mt-28 [&:not(:first-child)]:mt-14`}>
                {children}
              </h2>
            );
          },
          p: ({ children }) => (
            <p className="mt-4 max-w-xl leading-relaxed text-muted">{children}</p>
          ),
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}

function BlockSegment({
  name,
  body,
  ctx,
}: {
  name: BlockName;
  body: string;
  ctx: DocContext;
}) {
  switch (name) {
    case "phases":
      return <PhasesBlock body={body} ctx={ctx} />;
    case "schedule":
      return <ScheduleBlock ctx={ctx} />;
    case "deliverables":
      return <DeliverablesBlock body={body} />;
    case "prizes":
      return <PrizesBlock ctx={ctx} />;
    case "finalists":
      return <FinalistsBlock ctx={ctx} />;
    case "partners":
      return <PartnersBlock ctx={ctx} />;
    default:
      return null;
  }
}

function PhasesBlock({ body, ctx }: { body: string; ctx: DocContext }) {
  // Dates always come from the hackathon row; the JSON body only overrides copy.
  const overrides =
    parseBlockBody<Array<{ key: string; label?: string; detail?: string }>>(body) ?? [];
  const phases = ctx.phases.map((p) => {
    const o = overrides.find((x) => x.key === p.key);
    return o ? { ...p, label: o.label ?? p.label, detail: o.detail ?? p.detail } : p;
  });
  return <PhaseTimeline phases={phases} now={ctx.now} />;
}

function ScheduleBlock({ ctx }: { ctx: DocContext }) {
  const online = ctx.schedule.filter((s) => s.kind !== "evento");
  if (online.length === 0) return null;

  return (
    <ul className="grid gap-4 md:grid-cols-2">
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
  );
}

type DeliverableItem = { value: string; unit: string; label: string; note: string };

function DeliverablesBlock({ body }: { body: string }) {
  const items = parseBlockBody<DeliverableItem[]>(body) ?? [];
  if (items.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
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
  );
}

function PrizesBlock({ ctx }: { ctx: DocContext }) {
  const summary = ctx.hackathon.prize_summary;
  if (!summary) return null;

  return (
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
      <ul className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <p className="mt-2 text-sm leading-relaxed text-surface/80">{detail || place}</p>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

/**
 * Self-contained (heading included) because it only exists near the end of
 * the edition's life — while hidden, no stray prose heading is left behind.
 */
function FinalistsBlock({ ctx }: { ctx: DocContext }) {
  if (!ctx.finalistsVisible || ctx.finalists.length === 0) return null;

  return (
    <section aria-label="Finalistas">
      <h2 className={H2}>Finalistas</h2>
      <p className="mt-3 max-w-xl leading-relaxed text-muted">
        As equipes classificadas para a fase final.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ctx.finalists.map((f) => (
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
    </section>
  );
}

function SponsorImage({ sponsor, className }: { sponsor: SponsorLogo; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={sponsor.src} alt={sponsor.name ?? ""} loading="lazy" className={className} />;
  return sponsor.url ? (
    <a href={sponsor.url} target="_blank" rel="noopener noreferrer">
      {img}
    </a>
  ) : (
    img
  );
}

function PartnersBlock({ ctx }: { ctx: DocContext }) {
  const { realizacao, apoiador } = ctx.sponsors;
  if (realizacao.length === 0 && apoiador.length === 0) return null;

  return (
    <div className="rounded-3xl bg-green-dark px-8 py-12 shadow-[10px_10px_0_rgba(27,35,29,0.25)] sm:px-12">
      {realizacao.length > 0 && (
        <>
          <h2 className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-surface/50">
            Realização
          </h2>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-14 gap-y-8 sm:gap-x-20">
            {realizacao.map((p) => (
              <SponsorImage
                key={p.id}
                sponsor={p}
                className="max-h-7 w-auto max-w-[190px] opacity-90 sm:max-h-8 sm:max-w-[218px]"
              />
            ))}
          </div>
        </>
      )}

      {apoiador.length > 0 && (
        <>
          {realizacao.length > 0 && (
            <div aria-hidden className="mx-auto mt-10 h-px max-w-xl bg-surface/15" />
          )}
          <h2 className="mt-10 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-surface/50">
            Apoiadores
          </h2>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16">
            {apoiador.map((sp) => (
              <SponsorImage
                key={sp.id}
                sponsor={sp}
                className="max-h-9 w-auto max-w-[112px] opacity-80 sm:max-h-10 sm:max-w-[128px]"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
