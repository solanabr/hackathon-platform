import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  classifyTable,
  docCellHasTime,
  extractOutline,
  nextDateIndex,
  resolveDocDate,
  splitSections,
  type DocBlock,
  type OutlineEntry,
  type TableBlock,
} from "@/lib/page-doc";
import { DAY_ONLY, TIME_HM, WEEKDAY_SHORT, stripPeriods } from "@/lib/dates";
import type { SponsorLogo } from "@/lib/sponsors";
import type { SponsorTier } from "@/types/db";

const H2 =
  "text-balance font-heading text-3xl font-black uppercase leading-tight tracking-tight [font-stretch:118%] sm:text-4xl";

const EYEBROW = "font-mono text-[11px] font-bold uppercase tracking-[0.2em]";

// Every section after the first opens with a hairline. The space around it is
// roughly double the largest gap inside a section, so the rule confirms a
// boundary the spacing has already made.
const SECTION_GAP = "mt-14 border-t border-green-dark/15 pt-12";

const TH =
  "border-b-2 border-green-dark/15 py-3 pr-6 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald";
const TD = "border-b border-green-dark/10 py-3 pr-6 align-top leading-relaxed";

export type Finalist = { teamId: string; teamName: string; placement: number | null };

export type DocContext = {
  sponsors: Record<SponsorTier, SponsorLogo[]>;
  finalists: Finalist[];
  finalistsVisible: boolean;
  // The document writes "31/08" with no year; this anchors it to the edition,
  // which is what lets a schedule card show a weekday and a timeline know
  // which milestone is next.
  startsAt: string;
};

/**
 * The page body is the edition's markdown document. Prose stays prose; a table
 * is drawn in the shape its own columns imply — a ranking becomes a podium, a
 * dated list becomes a timeline — so the organizer keeps writing plain markdown
 * and never has to learn a layout syntax. Anything unrecognised stays a table,
 * which is why that fallback has to keep looking good.
 *
 * Only two things are not the document's to write: the finalists grid (appears
 * once the announcement date passes) and the sponsor band from Marcas.
 */
export function EditionPageDoc({ doc, ctx }: { doc: string; ctx: DocContext }) {
  const showFinalists = ctx.finalistsVisible && ctx.finalists.length > 0;
  const showPartners =
    ctx.sponsors.realizacao.length > 0 || ctx.sponsors.apoiador.length > 0;

  const outline: OutlineEntry[] = [
    ...extractOutline(doc),
    ...(showFinalists ? [{ id: "finalistas", text: "Finalistas" }] : []),
  ];
  const withNav = outline.length >= 2;
  const sections = splitSections(doc);

  return (
    <div className="px-4 pb-20 sm:px-6 lg:px-8">
      <div
        className={`mx-auto max-w-6xl ${
          withNav ? "lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:items-start lg:gap-12" : ""
        }`}
      >
        {withNav && <OutlineNav outline={outline} />}

        <div className="min-w-0">
          {sections.map((section, i) => (
            <section
              key={section.id || `sem-titulo-${i}`}
              aria-labelledby={section.heading ? section.id : undefined}
              className={i > 0 ? SECTION_GAP : undefined}
            >
              {section.heading && (
                <h2 id={section.id} className={`${H2} scroll-mt-28`}>
                  <Inline md={section.heading} />
                </h2>
              )}
              {/* The heading and what follows it are one unit; the blocks
                  under them breathe. That difference is what tells a reader
                  where a section starts. */}
              <div className="mt-3 space-y-7">
                {section.blocks.map((block, j) => (
                  <Block key={j} block={block} startsAt={ctx.startsAt} />
                ))}
              </div>
            </section>
          ))}
          {showFinalists && (
            <FinalistsSection finalists={ctx.finalists} divided={sections.length > 0} />
          )}
          {showPartners && <PartnersSection sponsors={ctx.sponsors} />}
        </div>
      </div>
    </div>
  );
}

function Block({ block, startsAt }: { block: DocBlock; startsAt: string }) {
  if (block.kind === "markdown") return <ProseDoc md={block.md} />;
  if (block.kind === "callout") return <CalloutBlock md={block.md} />;

  const rows = block.rows.filter((r) => r.some((c) => c !== ""));
  switch (classifyTable(block)) {
    case "podium":
      return <PodiumBlock rows={rows} />;
    case "timeline":
      return <TimelineBlock rows={rows} startsAt={startsAt} />;
    case "schedule":
      return <ScheduleBlock rows={rows} startsAt={startsAt} />;
    case "agenda":
      return <AgendaBlock rows={rows} />;
    case "cards":
      return <CardsBlock rows={rows} />;
    default:
      return <DataTable table={block} />;
  }
}

// Anything that could mean something to markdown inline: emphasis, code,
// links, strikethrough, entities, raw HTML, escapes, GFM autolinks.
const HAS_MARKUP = /[*_`~[\]<>\\&]|https?:\/\//;

/**
 * Cell and heading text keep their inline markdown — bold, links, code.
 *
 * The plain-text shortcut is not a micro-optimisation: this component renders
 * once per cell, and the page editor re-renders the whole document on every
 * keystroke. Spinning up a remark pipeline sixty times for strings like
 * "10 slides" pushed a keystroke past the frame budget on its own.
 */
function Inline({ md }: { md: string }) {
  if (!HAS_MARKUP.test(md)) return <>{md}</>;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{ p: ({ children }) => <>{children}</> }}
    >
      {md}
    </ReactMarkdown>
  );
}

/**
 * A blockquote reads as the one thing in its section a visitor must not miss —
 * a deadline, a limit, a warning. Dark rather than yellow: on this page yellow
 * is the reward, and a constraint that borrowed it would dilute both.
 */
function CalloutBlock({ md }: { md: string }) {
  return (
    <p className="w-fit max-w-3xl rounded-2xl bg-green-dark px-6 py-4 font-heading text-lg font-bold leading-snug text-surface shadow-sticker">
      <Inline md={md} />
    </p>
  );
}

/**
 * Places as descending steps: each bar is narrower than the one above it, so
 * the ranking reads from the silhouette before a word is parsed. The step is
 * capped, and the whole thing squares up to full width below sm — narrow bars
 * on a phone would only cramp the prize text.
 */
function PodiumBlock({ rows }: { rows: string[][] }) {
  const step = Math.min(15, 45 / Math.max(rows.length - 1, 1));

  return (
    <ol className="space-y-3">
      {rows.map((row, i) => {
        const lead = i === 0;
        return (
          <li
            key={i}
            style={{ "--stair": `${100 - i * step}%` } as React.CSSProperties}
            className={`flex w-full items-center gap-4 rounded-2xl border-2 px-6 sm:w-[var(--stair)] sm:gap-6 ${
              lead
                ? "border-green-dark bg-yellow py-6 shadow-sticker"
                : "border-green-dark/15 bg-surface-raised py-4"
            }`}
          >
            <p
              className={`w-24 shrink-0 font-heading text-[13px] font-black uppercase leading-tight sm:w-32 ${
                lead ? "text-green-dark/75" : "text-emerald"
              }`}
            >
              <Inline md={row[0] ?? ""} />
            </p>
            <p
              className={`min-w-0 font-heading text-base font-bold leading-snug sm:text-lg ${
                lead ? "text-green-dark" : ""
              }`}
            >
              <Inline md={row[1] ?? ""} />
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Phases on a rail: the date leads, the phase names it, the description
 * explains. The rail is a desktop affordance — below lg the nodes stack and
 * the connecting line would only add noise.
 */
function TimelineBlock({ rows, startsAt }: { rows: string[][]; startsAt: string }) {
  const next = nextDateIndex(
    rows.map((r) => r[1] ?? ""),
    startsAt,
  );

  return (
    <div className="rounded-3xl bg-green-dark px-6 py-10 shadow-[10px_10px_0_rgba(27,35,29,0.25)] sm:px-10">
      <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row, i) => {
          const isNext = i === next;
          return (
            <li key={i} className="relative pt-8">
              {i < rows.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-0 top-[7px] hidden h-0.5 w-[calc(100%+2rem)] bg-surface/15 lg:block"
                />
              )}
              <span
                aria-hidden
                className={`absolute left-0 top-0 h-3.5 w-3.5 rounded-full ${
                  isNext ? "bg-yellow" : "border-2 border-emerald bg-green-dark"
                }`}
              />
              <p
                className={`font-heading text-xl font-black leading-tight ${
                  isNext ? "text-yellow" : "text-surface"
                }`}
              >
                <Inline md={row[1] ?? ""} />
              </p>
              <h3 className="mt-2 text-sm font-bold leading-snug text-surface/80">
                <Inline md={row[0] ?? ""} />
              </h3>
              {row[2] && (
                <p className="mt-2 text-sm leading-relaxed text-surface/55">
                  <Inline md={row[2]} />
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * The full session card: date rail on the left, then kind, title, who and
 * what. Every field past the date is optional — an encounter with no speaker
 * or no description yet simply renders shorter, never with a placeholder.
 */
function ScheduleBlock({ rows, startsAt }: { rows: string[][]; startsAt: string }) {
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {rows.map((row, i) => {
        const at = resolveDocDate(row[0] ?? "", startsAt);
        return (
          <li
            key={i}
            className="flex gap-5 rounded-2xl border-2 border-green-dark/10 bg-surface-raised p-6"
          >
            <div className="w-12 shrink-0 text-center">
              {at ? (
                <>
                  <p className="font-heading text-2xl font-black leading-none tabular-nums">
                    {DAY_ONLY.format(at)}
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                    {stripPeriods(WEEKDAY_SHORT.format(at))}
                  </p>
                  {docCellHasTime(row[0] ?? "") && (
                    <p className="mt-1.5 font-mono text-[11px] tabular-nums text-muted">
                      {TIME_HM.format(at)}
                    </p>
                  )}
                </>
              ) : (
                <p className="font-mono text-[11px] font-bold uppercase text-muted">
                  <Inline md={row[0] ?? ""} />
                </p>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {row[1] && (
                <p className={`${EYEBROW} text-muted`}>
                  <Inline md={row[1]} />
                </p>
              )}
              {row[2] && (
                <h3 className="mt-1.5 font-heading text-lg font-bold leading-snug">
                  <Inline md={row[2]} />
                </h3>
              )}
              {row[3] && (
                <p className="mt-1 text-sm font-semibold leading-snug text-emerald">
                  <Inline md={row[3]} />
                </p>
              )}
              {row[4] && (
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  <Inline md={row[4]} />
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AgendaBlock({ rows }: { rows: string[][] }) {
  return (
    <ul className="space-y-3">
      {rows.map((row, i) => (
        <li
          key={i}
          className="flex flex-col gap-1.5 rounded-2xl border-2 border-green-dark/15 bg-surface-raised p-5 sm:flex-row sm:items-baseline sm:gap-7"
        >
          <p className={`${EYEBROW} shrink-0 text-emerald sm:w-28`}>
            <Inline md={row[0] ?? ""} />
          </p>
          <p className="leading-relaxed">
            <Inline md={row[1] ?? ""} />
          </p>
        </li>
      ))}
    </ul>
  );
}

function CardsBlock({ rows }: { rows: string[][] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row, i) => (
        <li
          key={i}
          className="flex flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker"
        >
          <h3 className="font-heading text-lg font-bold leading-tight">
            <Inline md={row[0] ?? ""} />
          </h3>
          {row[1] && (
            <p className="mt-3 w-fit rounded-full border border-emerald/30 bg-emerald/12 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-emerald">
              <Inline md={row[1]} />
            </p>
          )}
          {row[2] && (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              <Inline md={row[2]} />
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function DataTable({ table }: { table: TableBlock }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full max-w-3xl border-collapse text-left text-sm">
        <thead>
          <tr>
            {table.headers.map((cell, i) => (
              <th key={i} className={TH}>
                <Inline md={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={TD}>
                  <Inline md={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OutlineNav({ outline }: { outline: OutlineEntry[] }) {
  return (
    <nav aria-label="Nesta página" className="sticky top-24 hidden self-start lg:block">
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
  );
}

function ProseDoc({ md }: { md: string }) {
  return (
    <div className="prose-lp max-w-3xl [&>:first-child]:mt-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mt-4 max-w-2xl leading-relaxed text-muted">{children}</p>
          ),
          table: ({ children }) => (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full max-w-3xl border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => <th className={TH}>{children}</th>,
          td: ({ children }) => <td className={TD}>{children}</td>,
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}

function FurnitureHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className={`${H2} scroll-mt-28`}>
      {children}
    </h2>
  );
}

function FinalistsSection({
  finalists,
  divided,
}: {
  finalists: Finalist[];
  divided: boolean;
}) {
  return (
    <section aria-label="Finalistas" className={divided ? SECTION_GAP : undefined}>
      <FurnitureHeading id="finalistas">Finalistas</FurnitureHeading>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted">
        As equipes classificadas para a fase final.
      </p>
      <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </section>
  );
}

function SponsorImage({ sponsor, className }: { sponsor: SponsorLogo; className: string }) {
  // Width/height reserve the box so the band doesn't reflow as logos land.
  // eslint-disable-next-line @next/next/no-img-element
  const img = (
    <img
      src={sponsor.src}
      alt={sponsor.name ?? ""}
      loading="lazy"
      decoding="async"
      width={190}
      height={64}
      className={`h-auto w-auto object-contain ${className}`}
    />
  );
  return sponsor.url ? (
    <a href={sponsor.url} target="_blank" rel="noopener noreferrer">
      {img}
    </a>
  ) : (
    img
  );
}

function PartnersSection({ sponsors }: { sponsors: Record<SponsorTier, SponsorLogo[]> }) {
  const { realizacao, apoiador } = sponsors;
  // The band is its own object on the page, so it takes the section's
  // breathing room without the rule — a dark block is already a boundary.
  return (
    <section aria-label="Realização e apoiadores" className="mt-14">
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
    </section>
  );
}
